'use server';

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/server/firebaseAdmin';
import { normalizeUrl } from '@/lib/product-ingest/normalizeUrl';
import { extractFromHtml } from '@/lib/product-ingest/extractFromHtml';
import { extractFromDiffbot } from '@/lib/product-ingest/extractFromDiffbot';
import { extractFromBrightData } from '@/lib/product-ingest/extractFromBrightData';
import { mergePreviews, scorePreview } from '@/lib/product-ingest/mergeAndScore';
import { ProductPreview } from '@/lib/product-ingest/types';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const TTL_DAYS = 30;
const RATE_LIMIT_PER_HOUR = 30;

function buildError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

async function verifyAuth(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    throw new Error('missing_token');
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid;
  } catch (err) {
    console.error('Auth verification failed', err);
    throw new Error('invalid_token');
  }
}

async function checkRateLimit(userId: string) {
  const now = new Date();
  const bucket = `${now.getUTCFullYear()}${now.getUTCMonth() + 1}${now.getUTCDate()}${now.getUTCHours()}`;
  const ref = adminDb.collection('productIngestRateLimits').doc(`${userId}_${bucket}`);

  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const count = snap.exists ? (snap.data()?.count || 0) : 0;
    if (count >= RATE_LIMIT_PER_HOUR) {
      return false;
    }
    tx.set(ref, { userId, bucket, count: count + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return true;
  });
}

function isWeakPreview(preview: ProductPreview): boolean {
  return !preview.title || !preview.image || preview.price === undefined || !preview.currency;
}

async function getCachedPreview(hash: string): Promise<ProductPreview | null> {
  const ref = adminDb.collection('productPreviews').doc(hash);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data() as any;
  if (data.expiresAt?.toDate && data.expiresAt.toDate() < new Date()) {
    return null;
  }
  const preview = data.preview as ProductPreview;
  // If cached preview is missing critical fields, treat as cache miss to re-enrich
  if (isWeakPreview(preview)) return null;
  return preview;
}

async function cachePreview(hash: string, normalizedUrl: string, preview: ProductPreview) {
  const ref = adminDb.collection('productPreviews').doc(hash);
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000);

  // Firestore rejects undefined values; strip them out
  const cleanPreview = Object.fromEntries(
    Object.entries(preview).filter(([, value]) => value !== undefined)
  ) as ProductPreview;

  await ref.set({
    normalizedUrl,
    hash,
    preview: cleanPreview,
    createdAt: now,
    expiresAt,
  });
}

function needsBetterData(preview: ProductPreview, threshold: number) {
  const missingCritical = !preview.title || !preview.image || preview.price === undefined || !preview.currency;
  return preview.confidence < threshold || missingCritical;
}

export async function POST(req: NextRequest) {
  let userId: string | null = null;
  try {
    userId = await verifyAuth(req);
  } catch (err: any) {
    if (err.message === 'missing_token' || err.message === 'invalid_token') {
      return buildError(401, 'Unauthorized');
    }
    return buildError(500, 'Auth verification failed');
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return buildError(400, 'Invalid JSON');
  }

  const url = body?.url;
  if (!url || typeof url !== 'string') {
    return buildError(400, 'Missing url');
  }

  let normalizedUrl: string;
  let hash: string;
  let hostname: string;
  try {
    const norm = normalizeUrl(url);
    normalizedUrl = norm.normalized;
    hash = norm.hash;
    hostname = norm.hostname;
  } catch {
    return buildError(400, 'Invalid URL');
  }

  // Rate limit
  const allowed = await checkRateLimit(userId!);
  if (!allowed) {
    return buildError(429, 'Rate limit exceeded. Please try again later.');
  }

  // Cache
  const cached = await getCachedPreview(hash);
  if (cached) {
    return NextResponse.json(cached);
  }

  // Stage 1: HTML
  let { preview } = await extractFromHtml(normalizedUrl);
  preview = scorePreview(preview);

  // Stage 2: Diffbot if needed
  if (needsBetterData(preview, 0.75)) {
    const diffbot = await extractFromDiffbot(normalizedUrl);
    preview = scorePreview(mergePreviews(preview, diffbot.preview));
  }

  // Stage 3: Bright Data for Amazon/Walmart when key fields missing/low confidence
  if (hostname.includes('amazon.') || hostname.includes('walmart.')) {
    if (needsBetterData(preview, 0.95)) {
      const bright = await extractFromBrightData(normalizedUrl, hostname);
      preview = scorePreview(mergePreviews(preview, bright.preview));
    }
  }

  // Finalize and cache
  if (!preview.title && !preview.image && preview.price === undefined) {
    return buildError(500, 'Unable to retrieve product data');
  }

  await cachePreview(hash, normalizedUrl, preview);

  return NextResponse.json(preview);
}

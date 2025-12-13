'use server';

import { NextResponse } from 'next/server';

interface UnfurlResult {
  title?: string;
  description?: string;
  image?: string;
  price?: string;
  currency?: string;
  url: string;
}

function extractMeta(html: string, key: string): string | undefined {
  const regex = new RegExp(
    `<meta[^>]+(?:property|name)=[\"']${key}[\"'][^>]*content=[\"']([^\"']+)[\"'][^>]*>`,
    'i'
  );
  const match = html.match(regex);
  return match?.[1];
}

function extractJsonLdProduct(html: string): { price?: string; currency?: string; name?: string; description?: string; image?: string } | null {
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const json = JSON.parse(match[1].trim());
      const products = Array.isArray(json) ? json : [json];
      for (const entry of products) {
        if (entry['@type'] === 'Product' || (Array.isArray(entry['@type']) && entry['@type'].includes('Product'))) {
          const offers = Array.isArray(entry.offers) ? entry.offers[0] : entry.offers;
          return {
            price: offers?.price,
            currency: offers?.priceCurrency,
            name: entry.name,
            description: entry.description,
            image: Array.isArray(entry.image) ? entry.image[0] : entry.image,
          };
        }
      }
    } catch {
      // ignore parse errors
    }
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const url = body?.url as string | undefined;
    if (!url) {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ error: 'Invalid protocol' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(parsed.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ListyBot/1.0)',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch url' }, { status: 400 });
    }

    const html = await res.text();

    const title = extractMeta(html, 'og:title') || extractMeta(html, 'title');
    const description = extractMeta(html, 'og:description') || extractMeta(html, 'description');
    const image = extractMeta(html, 'og:image');
    const metaPrice = extractMeta(html, 'product:price:amount') || extractMeta(html, 'og:price:amount');
    const metaCurrency = extractMeta(html, 'product:price:currency') || extractMeta(html, 'og:price:currency');

    const product = extractJsonLdProduct(html);

    const rawImage = product?.image || image;
    const sanitizedImage = rawImage && /logo|favicon/i.test(rawImage) && product?.image ? product.image : rawImage;

    const result: UnfurlResult = {
      url: parsed.toString(),
      title: product?.name || title || undefined,
      description: product?.description || description || undefined,
      image: sanitizedImage || undefined,
      price: product?.price || metaPrice || undefined,
      currency: product?.currency || metaCurrency || undefined,
    };

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timed out' }, { status: 408 });
    }
    console.error('Unfurl error:', err);
    return NextResponse.json({ error: 'Unable to fetch URL' }, { status: 500 });
  }
}

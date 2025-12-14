import { ProductPreview } from './types';

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_MS = 45000;

interface BrightDataSnapshot {
  status: string;
  status_message?: string;
  completed?: number;
  total?: number;
}

function getDatasetId(hostname: string): string | null {
  if (hostname.includes('amazon.')) {
    return process.env.BRIGHTDATA_AMAZON_DATASET_ID || null;
  }
  if (hostname.includes('walmart.')) {
    return process.env.BRIGHTDATA_WALMART_DATASET_ID || null;
  }
  return null;
}

export async function extractFromBrightData(url: string, hostname: string): Promise<{ preview: ProductPreview | null; warnings: string[] }> {
  const apiKey = process.env.BRIGHTDATA_API_KEY;
  const datasetId = getDatasetId(hostname);
  const warnings: string[] = [];

  if (!apiKey || !datasetId) {
    warnings.push('Bright Data not configured for this host');
    return { preview: null, warnings };
  }

  const triggerRes = await fetch(`https://api.brightdata.com/datasets/v3/trigger?dataset_id=${datasetId}&format=json`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{ url }]),
  });

  if (!triggerRes.ok) {
    warnings.push(`Bright Data trigger failed (${triggerRes.status})`);
    return { preview: null, warnings };
  }

  const triggerJson = await triggerRes.json();
  const snapshotId = triggerJson?.snapshot_id || triggerJson?.id;
  if (!snapshotId) {
    warnings.push('Bright Data snapshot id missing');
    return { preview: null, warnings };
  }

  const start = Date.now();
  let progress: BrightDataSnapshot | null = null;

  while (Date.now() - start < MAX_POLL_MS) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const progressRes = await fetch(`https://api.brightdata.com/datasets/v3/progress/${snapshotId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!progressRes.ok) continue;
    progress = await progressRes.json();
    if (progress?.status === 'completed') break;
  }

  if (!progress || progress.status !== 'completed') {
    warnings.push('Bright Data did not complete in time');
    return { preview: null, warnings };
  }

  const dataRes = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!dataRes.ok) {
    warnings.push(`Bright Data download failed (${dataRes.status})`);
    return { preview: null, warnings };
  }

  const dataJson = await dataRes.json();
  const first = Array.isArray(dataJson) ? dataJson[0] : dataJson?.[0];
  if (!first) {
    warnings.push('Bright Data returned empty dataset');
    return { preview: null, warnings };
  }

  const normalizeNum = (v: any): number | undefined => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
      const num = Number(v.replace(/[^0-9.]/g, ''));
      return Number.isFinite(num) ? num : undefined;
    }
    return undefined;
  };

  const extractPrice = (...vals: any[]): number | undefined => {
    // Priority order: buybox/current/sale/offer, then base/list/original
    const priority = vals.map(normalizeNum).filter((n) => n !== undefined) as number[];
    if (priority.length > 0) return priority[0];

    // Fallback: pick median of all numeric fields to avoid extreme outliers
    const nums: number[] = [];
    vals.forEach((v) => {
      const n = normalizeNum(v);
      if (n !== undefined) nums.push(n);
    });
    if (nums.length === 0) return undefined;
    nums.sort((a, b) => a - b);
    return nums[Math.floor(nums.length / 2)];
  };

  const priceNumber = extractPrice(
    first.buybox_price_value,
    first.buybox_price,
    first.current_price,
    first.sale_price,
    first.offer_price,
    first.price,
    first.price_value,
    first.price_raw,
    first.price_str,
    first.buybox_price_str,
    first.original_price,
    first.list_price,
    first.list_price_value,
    first.retail_price,
    first.retail_price_value,
    first.was_price,
    first.was_price_value,
    first.current_price_value
  );

  const currency =
    first.buybox_currency ||
    first.price_currency ||
    first.currency ||
    first.currency_symbol ||
    first.price_symbol ||
    first.current_price_currency ||
    first.list_price_currency;

  const preview: ProductPreview = {
    url,
    canonicalUrl: first.url || first.product_url || first.link,
    title: first.title || first.name,
    description:
      first.description ||
      first.summary ||
      first.about ||
      first.product_description ||
      (Array.isArray(first.feature_bullets) ? first.feature_bullets.join(' • ') : undefined) ||
      (Array.isArray(first.bullet_points) ? first.bullet_points.join(' • ') : undefined),
    price: Number.isFinite(priceNumber) ? priceNumber : undefined,
    currency,
    image:
      first.main_image ||
      first.image ||
      (Array.isArray(first.images) ? first.images[0] : undefined) ||
      first.image_url ||
      first.hero_image ||
      first.main_image_highres ||
      first.image_highres ||
      first.primary_image,
    images: Array.isArray(first.images) ? first.images : undefined,
    availability: first.availability || first.stock_status || first.availability_message || first.buybox_availability,
    source: 'brightdata',
    confidence: 0,
    warnings,
  };

  return { preview, warnings };
}

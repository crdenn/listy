import { ProductPreview } from './types';

const DIFFBOT_URL = 'https://api.diffbot.com/v3/analyze';
const FETCH_TIMEOUT_MS = 20000;

export async function extractFromDiffbot(url: string): Promise<{ preview: ProductPreview | null; warnings: string[] }> {
  const token = process.env.DIFFBOT_TOKEN;
  const warnings: string[] = [];

  if (!token) {
    warnings.push('Diffbot token not configured');
    return { preview: null, warnings };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`${DIFFBOT_URL}?token=${token}&url=${encodeURIComponent(url)}`, {
      method: 'GET',
      signal: controller.signal,
    });

    if (!res.ok) {
      warnings.push(`Diffbot request failed (${res.status})`);
      return { preview: null, warnings };
    }

    const data = await res.json();
    const objects = data?.objects;
    if (!Array.isArray(objects) || objects.length === 0) {
      warnings.push('Diffbot returned no objects');
      return { preview: null, warnings };
    }

    const obj = objects[0] || {};
    const product: ProductPreview = {
      url,
      canonicalUrl: obj.pageUrl || obj.resolvedPageUrl,
      title: obj.title,
      description: obj.text,
      price: typeof obj.offerPrice === 'number' ? obj.offerPrice : Number(obj.offerPrice) || undefined,
      currency: obj.offerCurrency,
      image: obj.images?.[0]?.url,
      images: obj.images?.map((img: any) => img.url).filter(Boolean) || [],
      availability: obj.availability,
      source: 'diffbot',
      confidence: 0,
      warnings,
    };

    return { preview: product, warnings };
  } catch (err) {
    warnings.push(`Diffbot fetch error: ${String(err)}`);
    return { preview: null, warnings };
  } finally {
    clearTimeout(timeout);
  }
}

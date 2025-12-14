import { ProductPreview } from './types';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const FETCH_TIMEOUT_MS = 12000;

function parseMetaTags(html: string): Record<string, string> {
  const meta: Record<string, string> = {};
  const metaRegex = /<meta[^>]+(?:name|property)=["']?([^"'>\s]+)["']?[^>]+content=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = metaRegex.exec(html)) !== null) {
    const key = match[1].toLowerCase();
    const value = match[2].trim();
    if (!meta[key]) {
      meta[key] = value;
    }
  }
  return meta;
}

function extractJsonLd(html: string): any[] {
  const scripts: any[] = [];
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const json = JSON.parse(match[1].trim());
      scripts.push(json);
    } catch {
      // ignore invalid JSON-LD
    }
  }
  return scripts.flat();
}

function pickProductFromJsonLd(jsonLd: any[]): {
  name?: string;
  description?: string;
  image?: string | string[];
  offers?: {
    price?: string | number;
    lowPrice?: string | number;
    highPrice?: string | number;
    priceCurrency?: string;
    availability?: string;
    priceSpecification?: { price?: string | number; priceCurrency?: string };
  } | Array<{
    price?: string | number;
    lowPrice?: string | number;
    highPrice?: string | number;
    priceCurrency?: string;
    availability?: string;
    priceSpecification?: { price?: string | number; priceCurrency?: string };
  }>;
} | null {
  for (const entry of jsonLd) {
    if (!entry) continue;
    if (Array.isArray(entry)) {
      const product = pickProductFromJsonLd(entry);
      if (product) return product;
      continue;
    }
    if (typeof entry === 'object' && entry['@type']) {
      const types = Array.isArray(entry['@type']) ? entry['@type'] : [entry['@type']];
      if (types.includes('Product')) {
        return entry;
      }
    }
  }
  return null;
}

function normalizePrice(raw?: string | number): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'number') return raw;
  const cleaned = raw.replace(/[^0-9.,]/g, '').replace(/,/g, '');
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : undefined;
}

function extractAmazonBuyBoxPrice(html: string): number | undefined {
  // Amazon-specific buy box price extraction patterns

  // Pattern 1: a-offscreen in buy box (most reliable)
  const offscreenMatch = html.match(/<span[^>]*class="[^"]*a-offscreen[^"]*"[^>]*>\$?([0-9,]+\.?[0-9]*)<\/span>/i);
  if (offscreenMatch) {
    const price = Number(offscreenMatch[1].replace(/,/g, ''));
    if (Number.isFinite(price) && price > 0) return price;
  }

  // Pattern 2: corePriceDisplay or priceToPay data attributes
  const coreMatch = html.match(/"corePriceDisplay"\s*:\s*{\s*"price"\s*:\s*"?\$?([0-9,]+\.?[0-9]*)"/i);
  if (coreMatch) {
    const price = Number(coreMatch[1].replace(/,/g, ''));
    if (Number.isFinite(price) && price > 0) return price;
  }

  // Pattern 3: apex_desktop price
  const apexMatch = html.match(/"apex_desktop"\s*:\s*"?\$?([0-9,]+\.?[0-9]*)"/i);
  if (apexMatch) {
    const price = Number(apexMatch[1].replace(/,/g, ''));
    if (Number.isFinite(price) && price > 0) return price;
  }

  // Pattern 4: buyingPrice in JavaScript
  const buyingPriceMatch = html.match(/buyingPrice["\s:]+\$?([0-9,]+\.?[0-9]*)/i);
  if (buyingPriceMatch) {
    const price = Number(buyingPriceMatch[1].replace(/,/g, ''));
    if (Number.isFinite(price) && price > 0) return price;
  }

  return undefined;
}

function regexFindPrice(html: string): number | undefined {
  // Try Amazon-specific extraction first
  const amazonPrice = extractAmazonBuyBoxPrice(html);
  if (amazonPrice) return amazonPrice;

  // Try to find prices in common ecommerce patterns, preferring actual price over list price
  const prices: { value: number; context: string; index: number }[] = [];

  // Look for dollar amounts with context
  const dollarRegex = /\$\s*([0-9]{1,3}(?:[0-9,]{0,})?(?:\.[0-9]{2})?)/g;
  let m: RegExpExecArray | null;
  while ((m = dollarRegex.exec(html)) !== null) {
    const num = Number(m[1].replace(/,/g, ''));
    if (Number.isFinite(num) && num > 0) {
      // Get surrounding context (50 chars before and after)
      const start = Math.max(0, m.index - 50);
      const end = Math.min(html.length, m.index + m[0].length + 50);
      const context = html.substring(start, end).toLowerCase();

      prices.push({ value: num, context, index: m.index });
    }
  }

  // Look for JSON price fields
  const jsonPriceRegex = /"(?:price|lowPrice|buyingPrice)"\s*:\s*"?([0-9.,]+)"?/gi;
  while ((m = jsonPriceRegex.exec(html)) !== null) {
    const num = Number(m[1].replace(/,/g, ''));
    if (Number.isFinite(num) && num > 0) {
      const start = Math.max(0, m.index - 50);
      const end = Math.min(html.length, m.index + m[0].length + 50);
      const context = html.substring(start, end).toLowerCase();

      prices.push({ value: num, context, index: m.index });
    }
  }

  if (prices.length === 0) return undefined;

  // Filter out prices that look like list/MSRP/original prices
  const filteredPrices = prices.filter(p => {
    const isListPrice = p.context.includes('list') ||
                       p.context.includes('msrp') ||
                       p.context.includes('was') ||
                       p.context.includes('original') ||
                       p.context.includes('typical') ||
                       p.context.includes('strikethrough');
    return !isListPrice;
  });

  // If we filtered everything out, use all prices
  const candidatePrices = filteredPrices.length > 0 ? filteredPrices : prices;

  // Prefer prices that appear earlier in the HTML (more likely to be main price)
  // and look for sale/current price indicators
  const scored = candidatePrices.map(p => {
    let score = 0;

    // Prefer prices earlier in the document
    score += (1 - (p.index / html.length)) * 10;

    // Boost if context suggests it's a buy box or current price
    if (p.context.includes('buybox') ||
        p.context.includes('buying') ||
        p.context.includes('apex')) {
      score += 30;
    }

    // Boost if context suggests it's a sale/current price
    if (p.context.includes('sale') ||
        p.context.includes('now') ||
        p.context.includes('current') ||
        p.context.includes('offer') ||
        p.context.includes('deal')) {
      score += 20;
    }

    // Slight penalty for very high prices (likely list/original)
    if (p.value > 1000) {
      score -= 5;
    }

    return { ...p, score };
  });

  // Sort by score (highest first) and return the best match
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.value;
}

export async function extractFromHtml(url: string): Promise<{ preview: ProductPreview; warnings: string[] }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const warnings: string[] = [];

  let html = '';
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      cache: 'no-store',
    });
    html = await res.text();
  } catch (err) {
    clearTimeout(timeout);
    warnings.push(`HTML fetch failed: ${String(err)}`);
    return { preview: { url, source: 'html', confidence: 0, warnings }, warnings };
  } finally {
    clearTimeout(timeout);
  }

  const meta = parseMetaTags(html);
  const jsonLdRaw = extractJsonLd(html);
  const productLd = pickProductFromJsonLd(jsonLdRaw);

  const title =
    meta['og:title'] ||
    meta['twitter:title'] ||
    productLd?.name ||
    (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim());

  const description =
    meta['og:description'] ||
    meta['description'] ||
    productLd?.description;

  // Extract image with fallbacks
  let rawImage =
    meta['og:image'] ||
    meta['twitter:image'] ||
    (Array.isArray(productLd?.image) ? productLd?.image[0] : productLd?.image);

  // Amazon-specific: Look for main product image in HTML if meta tags don't have it
  if (!rawImage && html.includes('amazon.com')) {
    const imgMatch = html.match(/"hiRes":"([^"]+)"/i) ||
                    html.match(/"large":"([^"]+)"/i) ||
                    html.match(/data-old-hires="([^"]+)"/i) ||
                    html.match(/id="landingImage"[^>]+src="([^"]+)"/i);
    if (imgMatch) {
      rawImage = imgMatch[1];
    }
  }

  const offers = productLd?.offers;
  const firstOffer = Array.isArray(offers) ? offers[0] : offers;
  // Prioritize lowPrice (sale price) over regular price
  const price =
    normalizePrice((firstOffer as any)?.lowPrice) ??
    normalizePrice(firstOffer?.price) ??
    normalizePrice(firstOffer?.priceSpecification?.price) ??
    normalizePrice((firstOffer as any)?.highPrice);
  const currency =
    firstOffer?.priceCurrency ||
    firstOffer?.priceSpecification?.priceCurrency ||
    meta['product:price:currency'] ||
    meta['og:price:currency'] ||
    meta['price:currency'] ||
    meta['product:price:currency:minor'] ||
    meta['twitter:data1']; // some sites stash currency here
  const availability = firstOffer?.availability;

  const preview: ProductPreview = {
    url,
    canonicalUrl: meta['og:url'],
    title: title?.trim(),
    description: description?.trim(),
    price:
      price ??
      normalizePrice(meta['product:price:amount']) ??
      normalizePrice(meta['og:price:amount']) ??
      normalizePrice(meta['price']) ??
      regexFindPrice(html),
    currency,
    image: rawImage,
    images: rawImage ? [rawImage] : [],
    availability,
    source: 'html',
    confidence: 0,
    warnings,
  };

  return { preview, warnings };
}

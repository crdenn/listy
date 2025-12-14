'use server';

import { NextResponse } from 'next/server';
import axios from 'axios';

interface UnfurlResult {
  title?: string;
  description?: string;
  image?: string;
  price?: string;
  currency?: string;
  url: string;
}

function extractMetaAll(html: string, key: string): string[] {
  const regex = new RegExp(
    `<meta[^>]+(?:property|name)=[\"']${key}[\"'][^>]*content=[\"']([^\"']+)[\"'][^>]*>`,
    'gi'
  );
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    matches.push(m[1]);
  }
  return matches;
}

function extractMeta(html: string, key: string): string | undefined {
  return extractMetaAll(html, key)[0];
}

function extractTitle(html: string): string | undefined {
  // Try various title patterns
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch?.[1]?.trim();
  if (!title) return undefined;

  // Clean up common prefixes
  return title
    .replace(/^Amazon\.com:\s*/i, '')
    .replace(/^Walmart\.com:\s*/i, '')
    .replace(/^Target:\s*/i, '')
    .replace(/\s*\|\s*Amazon\.com$/i, '')
    .replace(/\s*-\s*Walmart\.com$/i, '')
    .replace(/\s*:\s*Target$/i, '')
    .trim();
}

// Use ScraperAPI to fetch pages with bot protection
async function fetchWithScraperAPI(url: string): Promise<{ html: string; title?: string; price?: string; image?: string; description?: string }> {
  const apiKey = process.env.SCRAPERAPI_KEY;

  if (!apiKey) {
    console.log('ScraperAPI key not configured, falling back to basic fetch');
    throw new Error('ScraperAPI key not configured');
  }

  console.log('Using ScraperAPI to fetch:', url);

  // ScraperAPI endpoint with recommended parameters
  // render=true: Enable JavaScript rendering (costs 10 credits)
  // premium=true: Use residential/mobile IPs for better success (costs additional 10 credits, 25 total with render)
  // country_code=us: Route through US proxies
  const scraperUrl = `https://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(url)}&render=true&premium=true&country_code=us`;

  try {
    const response = await axios.get(scraperUrl, {
      timeout: 70000, // ScraperAPI recommends 70 seconds for optimal success
    });

    const html = response.data;
    console.log('ScraperAPI fetch successful, HTML length:', html.length);

    // Extract data using meta tags and JSON-LD which are most reliable
    const extractFromHtml = (html: string) => {
      let title = '';
      let price = '';
      let image = '';
      let description = '';

      // 1. Try to extract from JSON-LD first (most reliable)
      const jsonLdMatch = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
      if (jsonLdMatch) {
        try {
          const jsonData = JSON.parse(jsonLdMatch[1]);
          if (jsonData['@type'] === 'Product' || (Array.isArray(jsonData) && jsonData.some((item: any) => item['@type'] === 'Product'))) {
            const product = Array.isArray(jsonData) ? jsonData.find((item: any) => item['@type'] === 'Product') : jsonData;
            title = product.name || '';
            description = product.description || '';
            image = Array.isArray(product.image) ? product.image[0] : product.image || '';
            const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
            price = offers?.price?.toString() || '';
          }
        } catch (e) {
          // Continue to meta tags
        }
      }

      // 2. Extract from meta tags (fallback)
      if (!title) {
        const titleMatch = html.match(/<meta\s+(?:property="og:title"|name="og:title")\s+content="([^"]+)"/i) ||
                          html.match(/<meta\s+(?:property="twitter:title"|name="twitter:title")\s+content="([^"]+)"/i);
        if (titleMatch) {
          title = titleMatch[1]
            .replace(/^Amazon\.com:\s*/i, '')
            .replace(/\s*-\s*Amazon\.com$/i, '')
            .replace(/\s*\|\s*.*$/i, '')
            .trim();
        }
      }

      if (!image) {
        // Try multiple image meta tag formats
        const imageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i) ||
                          html.match(/<meta\s+name="og:image"\s+content="([^"]+)"/i) ||
                          html.match(/<meta\s+property="twitter:image"\s+content="([^"]+)"/i);
        if (imageMatch) {
          const imgUrl = imageMatch[1];
          // Amazon sometimes returns image URLs without extensions, so be less strict
          if (imgUrl && (imgUrl.includes('image') || imgUrl.includes('img') || /\.(jpg|jpeg|png|webp|gif)/i.test(imgUrl))) {
            image = imgUrl;
          }
        }
      }

      if (!description) {
        const descMatch = html.match(/<meta\s+(?:property="og:description"|name="description")\s+content="([^"]+)"/i);
        if (descMatch) {
          description = descMatch[1].substring(0, 200);
        }
      }

      // 3. Extract price from meta tags or common patterns
      if (!price) {
        const priceMetaMatch = html.match(/<meta\s+(?:property="product:price:amount"|name="product:price:amount")\s+content="([^"]+)"/i);
        if (priceMetaMatch) {
          price = priceMetaMatch[1].replace(/,/g, '');
        }
      }

      // 4. Last resort: look for price in specific Amazon/Walmart structures
      if (!price) {
        const priceMatch = html.match(/<span[^>]*class="[^"]*a-price-whole[^"]*"[^>]*>([0-9,]+)<\/span>/i) ||
                          html.match(/<span[^>]*class="[^"]*a-offscreen[^"]*"[^>]*>\$?([0-9,]+\.?[0-9]*)<\/span>/i) ||
                          html.match(/data-price[^>]*=["']([0-9,.]+)["']/i);
        if (priceMatch) {
          price = priceMatch[1].replace(/,/g, '');
        }
      }

      return { title, price, image, description };
    };

    const extracted = extractFromHtml(html);
    console.log('Extracted data from ScraperAPI HTML:', JSON.stringify(extracted));

    return { html, ...extracted };
  } catch (error) {
    console.error('ScraperAPI fetch failed:', error);
    throw error;
  }
}

function extractJsonLdProduct(html: string): { price?: string; currency?: string; name?: string; description?: string; image?: string | string[] } | null {
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const content = match[1].trim();

      // Skip if it looks like HTML instead of JSON
      if (content.startsWith('<!DOCTYPE') || content.startsWith('<html')) {
        continue;
      }

      const json = JSON.parse(content);
      const products = Array.isArray(json) ? json : [json];
      for (const entry of products) {
        if (entry['@type'] === 'Product' || (Array.isArray(entry['@type']) && entry['@type'].includes('Product'))) {
          const offers = Array.isArray(entry.offers) ? entry.offers[0] : entry.offers;
          return {
            price: offers?.price?.toString(),
            currency: offers?.priceCurrency,
            name: entry.name,
            description: entry.description,
            image: Array.isArray(entry.image) ? entry.image[0] : entry.image,
          };
        }
      }
    } catch (err) {
      // Silently ignore parse errors and continue to next script tag
      continue;
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
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(parsed.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch url' }, { status: 400 });
    }

    let html = await res.text();
    let scraperData: any = null;

    // Check if we should use ScraperAPI for known difficult sites
    const hostname = parsed.hostname.toLowerCase();
    const difficultSites = ['amazon.com', 'walmart.com', 'target.com', 'bose.com'];
    const isDifficultSite = difficultSites.some(site => hostname.includes(site));

    // Also check if we hit a simple bot block
    const hasBasicBotBlock = html.includes('Robot or human') || html.includes('Enter the characters');

    if (isDifficultSite || hasBasicBotBlock) {
      console.log(`Using ScraperAPI for ${hostname}...`);
      try {
        const result = await fetchWithScraperAPI(parsed.toString());
        html = result.html;
        scraperData = {
          title: result.title,
          price: result.price,
          image: result.image,
          description: result.description,
        };
      } catch (err) {
        console.error('ScraperAPI failed:', err);
        // Continue with basic extraction
      }
    }

    // Extract product structured data first (most reliable)
    const product = extractJsonLdProduct(html);
    console.log('Extracted product JSON-LD:', JSON.stringify(product));

    // Extract meta tags with multiple fallbacks
    const ogTitle = extractMeta(html, 'og:title');
    const twitterTitle = extractMeta(html, 'twitter:title');
    const htmlTitle = extractTitle(html);

    const ogDesc = extractMeta(html, 'og:description');
    const twitterDesc = extractMeta(html, 'twitter:description');
    const metaDesc = extractMeta(html, 'description');

    // Try multiple image sources
    const ogImages = extractMetaAll(html, 'og:image');
    const twitterImages = extractMetaAll(html, 'twitter:image');
    const ogImageSecure = extractMeta(html, 'og:image:secure_url');
    const twitterImageSrc = extractMeta(html, 'twitter:image:src');

    console.log('Image sources:', { ogImages, twitterImages, ogImageSecure, twitterImageSrc });

    // Try multiple price sources
    const ogPrice = extractMeta(html, 'og:price:amount');
    const productPrice = extractMeta(html, 'product:price:amount');
    const ogCurrency = extractMeta(html, 'og:price:currency');
    const productCurrency = extractMeta(html, 'product:price:currency');

    // Amazon-specific: Try to extract price from meta tags
    const amazonPrice = extractMeta(html, 'twitter:data1');  // Amazon often puts price here

    console.log('Price sources:', { ogPrice, productPrice, amazonPrice });

    // Combine all image sources
    const productImages = product?.image
      ? Array.isArray(product.image)
        ? product.image
        : [product.image]
      : [];
    const candidateImages = [
      ...productImages,
      ...ogImages,
      ...twitterImages,
      ogImageSecure,
      twitterImageSrc,
    ].filter(Boolean) as string[];

    // Filter out logos, favicons, and small images
    const sanitizedImage = candidateImages.find((src) => {
      if (!src) return false;
      const lower = src.toLowerCase();
      return !(/logo|favicon|sprite|icon/i.test(lower)) &&
             !src.includes('1x1') &&
             !src.includes('pixel');
    });

    // Build result with best available data
    let finalTitle = product?.name || ogTitle || twitterTitle || htmlTitle || undefined;

    // Clean up title from common site prefixes/suffixes
    if (finalTitle) {
      finalTitle = finalTitle
        .replace(/^Amazon\.com:\s*/i, '')
        .replace(/^Walmart\.com:\s*/i, '')
        .replace(/^Target:\s*/i, '')
        .replace(/\s*\|\s*Amazon\.com$/i, '')
        .replace(/\s*-\s*Walmart\.com$/i, '')
        .replace(/\s*:\s*Target$/i, '')
        .trim();
    }

    // Build description - prefer product description, but avoid if it's just the title
    let finalDescription = product?.description || ogDesc || twitterDesc || metaDesc || undefined;
    if (finalDescription && finalTitle && finalDescription.toLowerCase().includes(finalTitle.toLowerCase()) && finalDescription.length < finalTitle.length + 50) {
      // Description is just the title or very similar, try alternates
      finalDescription = ogDesc || twitterDesc || metaDesc || undefined;
    }

    // Build price - try product data first, then meta tags, then Amazon-specific
    let finalPrice = product?.price || productPrice || ogPrice || amazonPrice || undefined;

    // Clean up price if it has currency symbols or extra text
    if (finalPrice) {
      // Extract just the numeric part with decimal
      const priceMatch = finalPrice.match(/[\d,]+\.?\d*/);
      if (priceMatch) {
        finalPrice = priceMatch[0].replace(/,/g, '');
      }
    }

    // Use ScraperAPI data if available, otherwise use extracted data
    const result: UnfurlResult = {
      url: parsed.toString(),
      title: scraperData?.title || finalTitle,
      description: scraperData?.description || finalDescription,
      image: scraperData?.image || sanitizedImage || undefined,
      price: scraperData?.price || finalPrice,
      currency: product?.currency || productCurrency || ogCurrency || 'USD',
    };

    console.log('Final result:', JSON.stringify(result));

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timed out' }, { status: 408 });
    }
    console.error('Unfurl error:', err);
    return NextResponse.json({ error: 'Unable to fetch URL' }, { status: 500 });
  }
}

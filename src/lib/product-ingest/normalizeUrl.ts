import crypto from 'crypto';

const trackingParams = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
  'mc_cid',
  'mc_eid',
  'igshid',
  'msclkid',
]);

export function normalizeUrl(input: string): { normalized: string; hash: string; hostname: string } {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    // If scheme missing, try adding https
    try {
      url = new URL(`https://${input}`);
    } catch {
      throw new Error('Invalid URL');
    }
  }

  // Force https
  url.protocol = 'https:';

  // Strip tracking params
  for (const param of [...url.searchParams.keys()]) {
    if (trackingParams.has(param) || param.startsWith('utm_')) {
      url.searchParams.delete(param);
    }
  }

  // Normalize Amazon URLs to /dp/<ASIN>
  if (url.hostname.match(/amazon\./i)) {
    const asinMatch = url.pathname.match(/\/([A-Z0-9]{10})(?:[/?]|$)/i);
    if (asinMatch) {
      const asin = asinMatch[1].toUpperCase();
      url.pathname = `/dp/${asin}`;
      url.search = '';
    }
  }

  // Remove trailing slash (except root)
  if (url.pathname !== '/' && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1);
  }

  const normalized = url.toString();
  const hash = crypto.createHash('sha256').update(normalized).digest('hex');

  return { normalized, hash, hostname: url.hostname.toLowerCase() };
}

import { ProductPreview } from './types';

function pick<T>(current: T | undefined, incoming: T | undefined): T | undefined {
  return incoming !== undefined && incoming !== null && incoming !== ''
    ? incoming
    : current;
}

const cleanTitleText = (t?: string) =>
  t
    ?.replace(/^Amazon\.com:\s*/i, '')
    ?.replace(/\s*\|\s*Amazon\.com$/i, '')
    ?.replace(/\s*-\s*Amazon\.com$/i, '')
    ?.trim();

export function mergePreviews(base: ProductPreview, overlay?: ProductPreview | null): ProductPreview {
  if (!overlay) {
    return {
      ...base,
      title: cleanTitleText(base.title),
      description: cleanTitleText(base.description),
    };
  }

  return {
    url: base.url,
    canonicalUrl: pick(base.canonicalUrl, overlay.canonicalUrl),
    title: cleanTitleText(pick(base.title, overlay.title)),
    description: cleanTitleText(pick(base.description, overlay.description)),
    price: pick(base.price, overlay.price),
    currency: pick(base.currency, overlay.currency),
    image: pick(base.image, overlay.image || (overlay.images && overlay.images[0])),
    images: overlay.images?.length ? overlay.images : base.images,
    availability: pick(base.availability, overlay.availability),
    source: overlay.source || base.source,
    confidence: base.confidence, // will be recomputed
    warnings: [...(base.warnings || []), ...(overlay.warnings || [])],
  };
}

export function scorePreview(preview: ProductPreview): ProductPreview {
  let confidence = 0;

  if (preview.title) confidence += 0.35;
  if (preview.image) confidence += 0.25;
  if (preview.price !== undefined && preview.currency) confidence += 0.25;
  if (preview.description) confidence += 0.1;

  // Cap at 1
  confidence = Math.min(1, confidence);

  const warnings = preview.warnings ? [...preview.warnings] : [];
  if (!preview.image) warnings.push('Missing product image');
  if (preview.price === undefined || !preview.currency) warnings.push('Missing price or currency');
  if (!preview.title) warnings.push('Missing title');
  if (preview.description && preview.title && preview.description.trim() === preview.title.trim()) {
    // Remove duplicate descriptions that are just the title again
    preview = { ...preview, description: undefined };
  }

  return { ...preview, confidence, warnings };
}

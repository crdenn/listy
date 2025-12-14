export type ProductPreviewSource = 'html' | 'diffbot' | 'brightdata';

export interface ProductPreview {
  url: string;
  canonicalUrl?: string;
  title?: string;
  description?: string;
  price?: number;
  currency?: string;
  image?: string;
  images?: string[];
  availability?: string;
  source: ProductPreviewSource;
  confidence: number; // 0..1
  warnings?: string[];
}

export interface CachedProductPreview {
  normalizedUrl: string;
  hash: string;
  preview: ProductPreview;
  createdAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
}

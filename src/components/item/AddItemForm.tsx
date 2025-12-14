'use client';

/**
 * Add Item Form Component
 * 
 * A simple, accessible form for adding new items to a list.
 * Supports title and optional description.
 */

import { useState, useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AddItemFormProps {
  onAdd: (data: { title: string; description?: string; category?: string; price?: string; imageUrl?: string; productUrl?: string }) => Promise<boolean>;
  disabled?: boolean;
  showCategory?: boolean;
  showGiftFields?: boolean;
}

export function AddItemForm({ onAdd, disabled = false, showCategory = false, showGiftFields = false }: AddItemFormProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [isUnfurling, setIsUnfurling] = useState(false);
  const [unfurlError, setUnfurlError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const success = await onAdd({
      title: title.trim(),
      description: description.trim() || undefined,
      category: showCategory ? category.trim() || undefined : undefined,
      price: showGiftFields ? price.trim() || undefined : undefined,
      imageUrl: showGiftFields ? imageUrl.trim() || undefined : undefined,
      productUrl: showGiftFields ? productUrl.trim() || undefined : undefined,
    });

    if (success) {
      setTitle('');
      setDescription('');
      setCategory('');
      setPrice('');
      setImageUrl('');
      setProductUrl('');
      // Keep form open for adding more items
    }
    setIsSubmitting(false);
  };

  const handleCancel = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setPrice('');
    setImageUrl('');
    setProductUrl('');
    setImageError(null);
    setIsExpanded(false);
  };

  const handleUnfurl = async () => {
    if (!productUrl.trim()) return;
    setIsUnfurling(true);
    setUnfurlError(null);
    try {
      const res = await fetch('/api/unfurl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: productUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUnfurlError(data.error || 'Unable to fetch link');
        return;
      }
      if (data.title && !title) setTitle(data.title);
      if (data.description && !description) setDescription(data.description);
      if (data.price) setPrice(data.price);
      if (data.image) setImageUrl(data.image);
    } catch (err) {
      console.error('Unfurl error', err);
      setUnfurlError('Unable to fetch link');
    } finally {
      setIsUnfurling(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
    // Cmd/Ctrl + Enter to submit from textarea
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e);
    }
  };

  const handleImageUpload = (file?: File) => {
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      setImageError('Image too large (max ~1.5MB).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(typeof reader.result === 'string' ? reader.result : '');
      setImageError(null);
    };
    reader.onerror = () => setImageError('Failed to read image.');
    reader.readAsDataURL(file);
  };

  if (!isExpanded) {
    return (
      <Button
        variant="outline"
        className="w-full justify-start gap-2 h-12 text-muted-foreground hover:text-foreground"
        onClick={() => setIsExpanded(true)}
        disabled={disabled}
      >
        <Plus className="h-4 w-4" />
        Add an item
      </Button>
    );
  }

  return (
    <Card className="border-primary/50">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-3">
          <div className="space-y-2">
            <Input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Item title"
              disabled={isSubmitting}
              className="font-medium"
            />
            
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description, link, or notes (optional)"
              disabled={isSubmitting}
              rows={2}
              className="resize-none text-sm"
            />

            {showCategory && (
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Category (optional)"
                disabled={isSubmitting}
                className="text-sm"
              />
            )}

            {showGiftFields && (
              <div className="grid gap-2">
                <div className="grid sm:grid-cols-2 gap-2">
                  <Input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Price (optional)"
                    disabled={isSubmitting}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Input
                      value={productUrl}
                      onChange={(e) => setProductUrl(e.target.value)}
                      placeholder="Product link (optional)"
                      disabled={isSubmitting || isUnfurling}
                      className="text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleUnfurl}
                      disabled={!productUrl.trim() || isSubmitting || isUnfurling}
                    >
                      {isUnfurling ? 'Fetching...' : 'Fetch'}
                    </Button>
                  </div>
                </div>
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Image URL (optional)"
                  disabled={isSubmitting}
                  className="text-sm"
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={isSubmitting}
                    className="text-sm"
                    onChange={(e) => handleImageUpload(e.target.files?.[0])}
                  />
                  {imageUrl && (
                    <span className="text-xs text-muted-foreground">Image added</span>
                  )}
                </div>
                {imageError && (
                  <p className="text-xs text-destructive">{imageError}</p>
                )}
                {unfurlError && (
                  <p className="text-xs text-destructive">{unfurlError}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!title.trim() || isSubmitting}
              className="gap-1"
            >
              {isSubmitting ? (
                'Adding...'
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Item
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

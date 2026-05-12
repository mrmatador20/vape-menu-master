import { useState, useEffect, useMemo } from 'react';
import { Product } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ShoppingCart, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useFlavors, Flavor } from '@/hooks/useFlavors';
import { toast } from 'sonner';
import { cn, optimizedImage, imageSrcSet } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import ProductReviews from './ProductReviews';
import { useTrackProductView } from '@/hooks/useTrackProductView';

interface QuickViewSheetProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCart: (product: Product, flavor?: string, color?: string) => void;
}

export default function QuickViewSheet({
  product,
  open,
  onOpenChange,
  onAddToCart,
}: QuickViewSheetProps) {
  const { data: flavors } = useFlavors(product?.id);
  const [selectedFlavor, setSelectedFlavor] = useState<string | undefined>();
  const [selectedColor, setSelectedColor] = useState<string | undefined>();
  const [activeImage, setActiveImage] = useState(0);
  const [showReviews, setShowReviews] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  useTrackProductView(open ? product?.id : null, open);

  const baseGallery = product
    ? (product.images && product.images.length > 0
        ? product.images
        : product.image
        ? [product.image]
        : [])
    : [];

  const sizes = useMemo(() => {
    if (!flavors) return [] as { name: string; totalStock: number }[];
    const map = new Map<string, number>();
    flavors.forEach(f => map.set(f.name, (map.get(f.name) || 0) + f.stock));
    return Array.from(map.entries())
      .map(([name, totalStock]) => ({ name, totalStock }))
      .sort((a, b) => {
        if (a.totalStock > 0 && b.totalStock === 0) return -1;
        if (a.totalStock === 0 && b.totalStock > 0) return 1;
        return 0;
      });
  }, [flavors]);

  const colorsForSize = useMemo<Flavor[]>(() => {
    if (!flavors || !selectedFlavor) return [];
    return flavors.filter(f => f.name === selectedFlavor && f.color);
  }, [flavors, selectedFlavor]);

  const hasColors = colorsForSize.length > 0;

  const currentPrice = useMemo(() => {
    if (!product) return 0;
    if (flavors && flavors.length > 0 && selectedFlavor) {
      const exact = flavors.find(
        f => f.name === selectedFlavor && (hasColors ? f.color === selectedColor : true)
      );
      const fallback = flavors.find(f => f.name === selectedFlavor);
      const v = exact || fallback;
      if (v?.price) return Number(v.price);
    }
    return product.price;
  }, [flavors, selectedFlavor, selectedColor, hasColors, product]);

  // reset on open / product change
  useEffect(() => {
    if (!open) return;
    setActiveImage(0);
    setShowReviews(false);
    setDescExpanded(false);
    if (flavors && flavors.length > 0) {
      const inStock = flavors.find(f => f.stock > 0);
      setSelectedFlavor((inStock || flavors[0]).name);
    } else {
      setSelectedFlavor(undefined);
    }
    setSelectedColor(undefined);
  }, [open, product?.id, flavors]);

  useEffect(() => {
    if (hasColors) {
      const inStock = colorsForSize.find(f => f.stock > 0);
      setSelectedColor(inStock?.color || colorsForSize[0]?.color || undefined);
    } else {
      setSelectedColor(undefined);
    }
  }, [selectedFlavor, hasColors, colorsForSize]);

  if (!product) return null;

  const discountValue = product.discount_value || 0;
  const discountType = product.discount_type || 'percent';
  const finalPrice = discountType === 'percent'
    ? currentPrice * (1 - discountValue / 100)
    : currentPrice - discountValue;
  const hasDiscount = finalPrice < currentPrice;

  const isOutOfStock = flavors && flavors.length > 0
    ? flavors.every(f => f.stock === 0)
    : product.stock === 0;

  const selectedSizeOutOfStock = selectedFlavor
    ? (sizes.find(s => s.name === selectedFlavor)?.totalStock || 0) === 0
    : false;
  const selectedColorVariant = hasColors
    ? colorsForSize.find(f => f.color === selectedColor)
    : undefined;
  const isSelectedVariantOutOfStock = hasColors
    ? (selectedColorVariant ? selectedColorVariant.stock === 0 : true)
    : selectedSizeOutOfStock;

  const handleAdd = () => {
    if (isOutOfStock) return toast.error('Produto esgotado');
    if (flavors && flavors.length > 0 && !selectedFlavor) return toast.error('Selecione um tamanho');
    if (hasColors && !selectedColor) return toast.error('Selecione uma cor');
    if (isSelectedVariantOutOfStock) return toast.error('Variante esgotada');
    onAddToCart(product, selectedFlavor, hasColors ? selectedColor : undefined);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="space-y-1 text-left">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground capitalize">
            {product.category}{product.subcategory ? ` · ${product.subcategory}` : ''}
          </p>
          <SheetTitle className="font-serif text-3xl font-medium leading-tight">
            {product.name}
          </SheetTitle>
          {product.description && (
            <SheetDescription className="sr-only">{product.description}</SheetDescription>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="aspect-square overflow-hidden rounded-md bg-muted relative">
            {isOutOfStock && (
              <div className="absolute inset-0 bg-background/70 flex items-center justify-center z-10">
                <span className="text-foreground text-xl font-light tracking-widest">ESGOTADO</span>
              </div>
            )}
            {(() => {
              const variantImages = (selectedColorVariant?.image_urls && selectedColorVariant.image_urls.length > 0)
                ? selectedColorVariant.image_urls
                : selectedColorVariant?.image_url
                  ? [selectedColorVariant.image_url]
                  : [];
              const gallery = variantImages.length > 0 ? variantImages : baseGallery;
              const heroSrc = gallery[activeImage] || gallery[0] || product.image;
              return (
                <img
                  src={optimizedImage(heroSrc, { width: 1024, quality: 80 })}
                  srcSet={imageSrcSet(heroSrc, [480, 768, 1024, 1280])}
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  alt={product.name}
                  decoding="async"
                  className="w-full h-full object-cover transition-opacity"
                />
              );
            })()}
          </div>

          {(() => {
            const variantImages = (selectedColorVariant?.image_urls && selectedColorVariant.image_urls.length > 0)
              ? selectedColorVariant.image_urls
              : selectedColorVariant?.image_url
                ? [selectedColorVariant.image_url]
                : [];
            const gallery = variantImages.length > 0 ? variantImages : baseGallery;
            return gallery.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto">
                {gallery.map((url, i) => (
                  <button
                    key={url + i}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    className={cn(
                      'flex-shrink-0 h-16 w-16 rounded border overflow-hidden transition-all',
                      i === activeImage ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'
                    )}
                  >
                    <img src={optimizedImage(url, { width: 160, quality: 70 })} loading="lazy" decoding="async" alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null;
          })()}

          {gallery.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {gallery.map((url, i) => (
                <button
                  key={url + i}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={cn(
                    'flex-shrink-0 h-16 w-16 rounded border overflow-hidden transition-all',
                    i === activeImage ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'
                  )}
                >
                  <img src={optimizedImage(url, { width: 160, quality: 70 })} loading="lazy" decoding="async" alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="flex items-baseline gap-3">
            {hasDiscount && (
              <span className="text-sm text-muted-foreground line-through">
                R$ {currentPrice.toFixed(2)}
              </span>
            )}
            <span className="text-3xl font-light tracking-tight text-foreground">
              R$ {finalPrice.toFixed(2)}
            </span>
          </div>

          {product.description && (
            <div className="space-y-2">
              <div
                className={cn(
                  'relative text-sm text-muted-foreground whitespace-pre-line leading-relaxed transition-all',
                  !descExpanded && 'max-h-[5.5rem] overflow-hidden'
                )}
              >
                {product.description}
                {!descExpanded && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background to-transparent" />
                )}
              </div>
              <button
                type="button"
                onClick={() => setDescExpanded(v => !v)}
                className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.15em] text-foreground/80 hover:text-foreground transition-colors"
              >
                {descExpanded ? 'Mostrar menos' : 'Ler descrição completa'}
                {descExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}

          {sizes.length > 0 && !isOutOfStock && (
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Tamanho</label>
              <Select value={selectedFlavor} onValueChange={setSelectedFlavor}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {sizes.map(size => (
                    <SelectItem key={size.name} value={size.name} disabled={size.totalStock === 0}>
                      {size.name} {size.totalStock === 0 ? '(Esgotado)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {hasColors && !isOutOfStock && (
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                Cor <span className="text-foreground/70 normal-case tracking-normal">— {selectedColor}</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {colorsForSize.map(variant => {
                  const isSelected = variant.color === selectedColor;
                  const out = variant.stock === 0;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      title={`${variant.color}${out ? ' (Esgotado)' : ''}`}
                      disabled={out}
                      onClick={() => setSelectedColor(variant.color || undefined)}
                      className={cn(
                        'relative h-9 w-9 rounded-full border-2 transition-all',
                        isSelected
                          ? 'border-primary ring-2 ring-primary/30 scale-110'
                          : 'border-border hover:border-primary/60',
                        out && 'opacity-40 cursor-not-allowed'
                      )}
                      style={{ backgroundColor: variant.color_hex || '#ccc' }}
                    >
                      {isSelected && (
                        <Check
                          className="absolute inset-0 m-auto h-4 w-4 drop-shadow"
                          style={{
                            color: variant.color_hex && /^#(fff|ffffff|f{6})$/i.test(variant.color_hex) ? '#000' : '#fff',
                          }}
                        />
                      )}
                      {out && (
                        <span className="absolute inset-0 m-auto block h-px w-[140%] rotate-45 bg-destructive" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Button
            onClick={handleAdd}
            disabled={isOutOfStock || isSelectedVariantOutOfStock}
            className="w-full h-12 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground tracking-widest uppercase text-xs"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            {isOutOfStock ? 'Esgotado' : 'Adicionar à sacola'}
          </Button>

          <Collapsible open={showReviews} onOpenChange={setShowReviews}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full text-xs uppercase tracking-[0.15em]">
                {showReviews ? 'Ocultar avaliações' : 'Ver avaliações'}
                {showReviews ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-3 max-h-[400px] overflow-y-auto">
                <ProductReviews productId={product.id} />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </SheetContent>
    </Sheet>
  );
}

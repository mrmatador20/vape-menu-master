import { useState } from 'react';
import { Product } from '@/context/CartContext';
import { Card } from '@/components/ui/card';
import { Eye } from 'lucide-react';
import { cn, optimizedImage, imageSrcSet, placeholderImage } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  onQuickView: (product: Product) => void;
  /** Se true, carrega com prioridade (acima da dobra). */
  priority?: boolean;
}

const ProductCard = ({ product, onQuickView, priority = false }: ProductCardProps) => {
  const [hovered, setHovered] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const gallery = (product.images && product.images.length > 0)
    ? product.images
    : (product.image ? [product.image] : []);
  const primary = gallery[0] || product.image;
  const secondary = gallery[1];

  const discountValue = product.discount_value || 0;
  const discountType = product.discount_type || 'percent';
  const finalPrice = discountType === 'percent'
    ? product.price * (1 - discountValue / 100)
    : product.price - discountValue;
  const hasDiscount = finalPrice < product.price;
  const isOutOfStock = product.stock === 0;

  const placeholder = placeholderImage(primary);

  return (
    <Card
      onClick={() => onQuickView(product)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'group cursor-pointer overflow-hidden border-0 bg-transparent shadow-none rounded-md transition-all duration-300',
        isOutOfStock && 'opacity-70'
      )}
    >
      <div
        className="overflow-hidden bg-muted relative rounded-md"
        style={{ aspectRatio: '1 / 1', contain: 'layout paint' }}
      >
        {isOutOfStock && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-10">
            <span className="text-foreground text-xs tracking-[0.3em] uppercase font-light">Esgotado</span>
          </div>
        )}

        {hasDiscount && !isOutOfStock && (
          <span className="absolute top-3 left-3 z-10 bg-primary/95 text-primary-foreground text-[10px] font-medium tracking-[0.15em] uppercase px-2 py-1 rounded-sm">
            −{discountValue}%
          </span>
        )}

        {/* Placeholder blur (LQIP) */}
        {placeholder && !loaded && (
          <img
            src={placeholder}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover scale-110 blur-lg"
          />
        )}

        <img
          src={optimizedImage(primary, { width: 480, quality: 65 })}
          srcSet={imageSrcSet(primary, [240, 360, 480, 720])}
          sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, 50vw"
          alt={product.name}
          loading={priority ? 'eager' : 'lazy'}
          // @ts-expect-error fetchpriority is valid HTML attribute
          fetchpriority={priority ? 'high' : 'low'}
          decoding="async"
          width={480}
          height={600}
          onLoad={() => setLoaded(true)}
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-500',
            loaded ? 'opacity-100' : 'opacity-0',
            hovered && secondary ? 'opacity-0' : ''
          )}
        />
        {secondary && hovered && (
          <img
            src={optimizedImage(secondary, { width: 480, quality: 65 })}
            srcSet={imageSrcSet(secondary, [240, 360, 480, 720])}
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, 50vw"
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            width={480}
            height={600}
            className="absolute inset-0 w-full h-full object-cover opacity-100 transition-opacity duration-500"
          />
        )}

        {!isOutOfStock && (
          <div
            className={cn(
              'absolute inset-x-3 bottom-3 z-10 transition-all duration-300 hidden md:block',
              hovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            )}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickView(product);
              }}
              className="w-full bg-background/95 text-foreground text-[11px] tracking-[0.2em] uppercase py-2.5 rounded-sm hover:bg-foreground hover:text-background transition-colors flex items-center justify-center gap-2"
            >
              <Eye className="h-3.5 w-3.5" />
              Visualização rápida
            </button>
          </div>
        )}
      </div>

      <div className="pt-4 px-1 space-y-1">
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground capitalize">
          {product.category}{product.subcategory ? ` · ${product.subcategory}` : ''}
        </p>
        <h3 className="font-serif text-base font-medium text-foreground leading-snug">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-2 pt-0.5">
          {hasDiscount && (
            <span className="text-xs text-muted-foreground line-through">
              R$ {product.price.toFixed(2)}
            </span>
          )}
          <span className="text-sm font-medium text-primary tracking-tight">
            R$ {finalPrice.toFixed(2)}
          </span>
        </div>
      </div>
    </Card>
  );
};

export default ProductCard;

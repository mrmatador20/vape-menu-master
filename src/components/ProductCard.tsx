import { useState } from 'react';
import { Product } from '@/context/CartContext';
import { Card } from '@/components/ui/card';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  onQuickView: (product: Product) => void;
}

const ProductCard = ({ product, onQuickView }: ProductCardProps) => {
  const [hovered, setHovered] = useState(false);
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
      <div className="aspect-[4/5] overflow-hidden bg-muted relative rounded-md">
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

        <img
          src={primary}
          alt={product.name}
          loading="lazy"
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-700',
            hovered && secondary ? 'opacity-0' : 'opacity-100'
          )}
        />
        {secondary && (
          <img
            src={secondary}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className={cn(
              'absolute inset-0 w-full h-full object-cover transition-opacity duration-700',
              hovered ? 'opacity-100' : 'opacity-0'
            )}
          />
        )}

        {!isOutOfStock && (
          <div
            className={cn(
              'absolute inset-x-3 bottom-3 z-10 transition-all duration-300',
              hovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            )}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onQuickView(product);
              }}
              className="w-full bg-background/95 backdrop-blur text-foreground text-[11px] tracking-[0.2em] uppercase py-2.5 rounded-sm hover:bg-foreground hover:text-background transition-colors flex items-center justify-center gap-2"
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
          <span className="text-sm font-medium text-foreground tracking-tight">
            R$ {finalPrice.toFixed(2)}
          </span>
        </div>
      </div>
    </Card>
  );
};

export default ProductCard;

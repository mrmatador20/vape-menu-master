import { useState, useEffect, useMemo } from 'react';
import { Product } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ShoppingCart, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useFlavors, Flavor } from '@/hooks/useFlavors';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import ProductReviews from './ProductReviews';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, flavor?: string, color?: string) => void;
}

const ProductCard = ({ product, onAddToCart }: ProductCardProps) => {
  const [selectedFlavor, setSelectedFlavor] = useState<string | undefined>();
  const [selectedColor, setSelectedColor] = useState<string | undefined>();
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(product.price);
  const gallery = (product.images && product.images.length > 0)
    ? product.images
    : (product.image ? [product.image] : []);
  const [activeImage, setActiveImage] = useState(0);
  const { data: flavors } = useFlavors(product.id);

  // Tamanhos únicos (com soma de estoque entre cores)
  const sizes = useMemo(() => {
    if (!flavors) return [] as { name: string; totalStock: number }[];
    const map = new Map<string, number>();
    flavors.forEach(f => {
      map.set(f.name, (map.get(f.name) || 0) + f.stock);
    });
    return Array.from(map.entries()).map(([name, totalStock]) => ({ name, totalStock }));
  }, [flavors]);

  // Cores disponíveis para o tamanho selecionado
  const colorsForSize = useMemo<Flavor[]>(() => {
    if (!flavors || !selectedFlavor) return [];
    return flavors.filter(f => f.name === selectedFlavor && f.color);
  }, [flavors, selectedFlavor]);

  const hasColors = colorsForSize.length > 0;

  // Atualiza o preço quando as variantes/cor selecionada mudam
  useEffect(() => {
    if (flavors && flavors.length > 0) {
      if (selectedFlavor) {
        // Procura variante exata (tamanho + cor) ou só tamanho
        const exact = flavors.find(f =>
          f.name === selectedFlavor &&
          (hasColors ? f.color === selectedColor : true)
        );
        const fallback = flavors.find(f => f.name === selectedFlavor);
        const variant = exact || fallback;
        if (variant?.price) {
          setCurrentPrice(Number(variant.price));
        } else {
          setCurrentPrice(product.price);
        }
      } else {
        const firstFlavor = flavors[0];
        setSelectedFlavor(firstFlavor.name);
        if (firstFlavor.price) setCurrentPrice(Number(firstFlavor.price));
        else setCurrentPrice(product.price);
      }
    } else {
      setCurrentPrice(product.price);
    }
  }, [flavors, selectedFlavor, selectedColor, hasColors, product.price]);

  // Quando muda o tamanho, seleciona automaticamente a primeira cor disponível
  useEffect(() => {
    if (hasColors) {
      const inStock = colorsForSize.find(f => f.stock > 0);
      setSelectedColor(inStock?.color || colorsForSize[0].color || undefined);
    } else {
      setSelectedColor(undefined);
    }
  }, [selectedFlavor, hasColors, colorsForSize]);
  
  // Calculate only product individual discount (not global coupons)
  const discountValue = product.discount_value || 0;
  const discountType = product.discount_type || 'percent';
  
  const finalPrice = discountType === 'percent'
    ? currentPrice * (1 - discountValue / 100)
    : currentPrice - discountValue;
  
  const hasDiscount = finalPrice < currentPrice;
  const totalDiscountPercent = discountValue;
  
  const isOutOfStock = flavors && flavors.length > 0
    ? flavors.every(flavor => flavor.stock === 0)
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

  const handleAddToCart = () => {
    if (isOutOfStock) {
      toast.error('Produto esgotado');
      return;
    }
    if (flavors && flavors.length > 0 && !selectedFlavor) {
      toast.error('Por favor, selecione um tamanho');
      return;
    }
    if (hasColors && !selectedColor) {
      toast.error('Por favor, selecione uma cor');
      return;
    }
    if (isSelectedVariantOutOfStock) {
      toast.error('Variante esgotada');
      return;
    }
    onAddToCart(product, selectedFlavor, hasColors ? selectedColor : undefined);
  };

  return (
    <Card className={`overflow-hidden bg-gradient-card border-border transition-all duration-300 group ${isOutOfStock ? 'opacity-60 grayscale' : 'hover:border-primary hover:shadow-glow'}`}>
      <div className="aspect-square overflow-hidden bg-muted relative">
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
            <span className="text-white text-2xl font-bold">ESGOTADO</span>
          </div>
        )}
        {hasDiscount && !isOutOfStock && (
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-bold z-10">
            {totalDiscountPercent}% OFF
          </div>
        )}
        <img
          src={gallery[activeImage] || product.image}
          alt={product.name}
          className={`w-full h-full object-cover transition-transform duration-300 ${!isOutOfStock && 'group-hover:scale-110'}`}
        />
      </div>
      {gallery.length > 1 && (
        <div className="flex gap-1.5 px-3 pt-3 overflow-x-auto">
          {gallery.map((url, i) => (
            <button
              key={url + i}
              type="button"
              onClick={() => setActiveImage(i)}
              className={`flex-shrink-0 h-12 w-12 rounded border-2 overflow-hidden transition-all ${
                i === activeImage ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img src={url} alt={`${product.name} ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          {product.description && (
            <Collapsible open={isDescriptionOpen} onOpenChange={setIsDescriptionOpen}>
              <div className="mt-1">
                <CollapsibleContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{product.description}</p>
                </CollapsibleContent>
                {!isDescriptionOpen && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                )}
              </div>
              {product.description.length > 100 && (
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-auto p-0 mt-1 text-primary hover:text-primary/80">
                    {isDescriptionOpen ? (
                      <>Ver menos <ChevronUp className="h-3 w-3 ml-1" /></>
                    ) : (
                      <>Ver mais <ChevronDown className="h-3 w-3 ml-1" /></>
                    )}
                  </Button>
                </CollapsibleTrigger>
              )}
            </Collapsible>
          )}
        </div>
        
        <div className="space-y-3 min-h-[80px]">
          {sizes.length > 0 && !isOutOfStock && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Escolha:</label>
              <Select value={selectedFlavor} onValueChange={setSelectedFlavor}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um item" />
                </SelectTrigger>
                <SelectContent>
                  {sizes.map((size) => (
                    <SelectItem
                      key={size.name}
                      value={size.name}
                      disabled={size.totalStock === 0}
                    >
                      {size.name} {size.totalStock === 0 ? '(Esgotado)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {hasColors && !isOutOfStock && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Cor: <span className="text-muted-foreground font-normal">{selectedColor}</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {colorsForSize.map((variant) => {
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
                          ? 'border-primary ring-2 ring-primary/40 scale-110'
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
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            {hasDiscount && (
              <span className="text-sm text-muted-foreground line-through block">
                R$ {currentPrice.toFixed(2)}
              </span>
            )}
            <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              R$ {finalPrice.toFixed(2)}
            </span>
          </div>
          <Button
            onClick={handleAddToCart}
            size="sm"
            disabled={isOutOfStock || isSelectedVariantOutOfStock}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            {isOutOfStock ? 'Esgotado' : 'Adicionar'}
          </Button>
        </div>

        {!isOutOfStock && (
          <div className="pt-3 border-t border-border">
            <Collapsible open={showReviews} onOpenChange={setShowReviews}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-sm"
                >
                  {showReviews ? 'Ocultar avaliações' : 'Ver avaliações'}
                  {showReviews ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden transition-all duration-300 ease-in-out data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                <div className="mt-3 max-h-[400px] overflow-y-auto">
                  <ProductReviews productId={product.id} />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ProductCard;

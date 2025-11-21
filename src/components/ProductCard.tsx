import { useState, useEffect } from 'react';
import { Product } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ShoppingCart, ChevronDown, ChevronUp } from 'lucide-react';
import { useFlavors } from '@/hooks/useFlavors';
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

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, flavor?: string) => void;
}

const ProductCard = ({ product, onAddToCart }: ProductCardProps) => {
  const [selectedFlavor, setSelectedFlavor] = useState<string | undefined>();
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(product.price);
  const { data: flavors } = useFlavors(product.id);

  // Atualiza o preço quando as variantes ou flavor selecionado mudam
  useEffect(() => {
    if (flavors && flavors.length > 0) {
      if (selectedFlavor) {
        const flavor = flavors.find(f => f.name === selectedFlavor);
        if (flavor) {
          setCurrentPrice(flavor.price ? Number(flavor.price) : product.price);
        }
      } else {
        // Define primeira variante como padrão
        const firstFlavor = flavors[0];
        setSelectedFlavor(firstFlavor.name);
        setCurrentPrice(firstFlavor.price ? Number(firstFlavor.price) : product.price);
      }
    } else {
      setCurrentPrice(product.price);
    }
  }, [flavors, selectedFlavor, product.price]);
  
  // Calculate only product individual discount (not global coupons)
  const discountValue = product.discount_value || 0;
  const discountType = product.discount_type || 'percent';
  
  const finalPrice = discountType === 'percent'
    ? currentPrice * (1 - discountValue / 100)
    : currentPrice - discountValue;
  
  const hasDiscount = finalPrice < currentPrice;
  const totalDiscountPercent = discountValue;
  
  // Determine if product is out of stock based on whether it has flavors
  const isOutOfStock = flavors && flavors.length > 0
    ? flavors.every(flavor => flavor.stock === 0) // All flavors out of stock
    : product.stock === 0; // Product stock (no flavors)
  
  // Check if selected flavor is out of stock
  const selectedFlavorData = flavors?.find(f => f.name === selectedFlavor);
  const isSelectedFlavorOutOfStock = selectedFlavorData ? selectedFlavorData.stock === 0 : false;

  const handleAddToCart = () => {
    if (isOutOfStock) {
      toast.error('Produto esgotado');
      return;
    }
    if (flavors && flavors.length > 0 && !selectedFlavor) {
      toast.error('Por favor, selecione um sabor');
      return;
    }
    if (isSelectedFlavorOutOfStock) {
      toast.error('Sabor esgotado');
      return;
    }
    onAddToCart(product, selectedFlavor);
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
          src={product.image}
          alt={product.name}
          className={`w-full h-full object-cover transition-transform duration-300 ${!isOutOfStock && 'group-hover:scale-110'}`}
        />
      </div>
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
                      <>
                        Ver menos <ChevronUp className="h-3 w-3 ml-1" />
                      </>
                    ) : (
                      <>
                        Ver mais <ChevronDown className="h-3 w-3 ml-1" />
                      </>
                    )}
                  </Button>
                </CollapsibleTrigger>
              )}
            </Collapsible>
          )}
        </div>
        
        <div className="min-h-[80px]">
          {flavors && flavors.length > 0 && !isOutOfStock && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Escolha:</label>
              <Select value={selectedFlavor} onValueChange={setSelectedFlavor}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um item" />
                </SelectTrigger>
                <SelectContent>
                  {flavors.map((flavor) => (
                    <SelectItem 
                      key={flavor.id} 
                      value={flavor.name}
                      disabled={flavor.stock === 0}
                    >
                      {flavor.name} {flavor.stock === 0 ? '(Esgotado)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            disabled={isOutOfStock}
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

import { Product } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ShoppingCart } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  discountAmount?: number; // Novo campo para o desconto
}

const ProductCard = ({ product, onAddToCart, discountAmount = 0 }: ProductCardProps) => {
  // Calcular o preço com desconto
  const discountedPrice = discountAmount 
    ? product.price - discountAmount // Preço com desconto
    : product.price;

  return (
    <Card className="overflow-hidden bg-gradient-card border-border hover:border-primary transition-all duration-300 hover:shadow-glow group">
      <div className="aspect-square overflow-hidden bg-muted">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
      </div>
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
        </div>
        <div className="flex items-center justify-between">
          <div className="space-x-2 flex items-center">
            {discountAmount > 0 && (
              <span className="text-sm text-muted-foreground line-through">
                R$ {product.price.toFixed(2)} {/* Exibe o preço original com risco */}
              </span>
            )}
            <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              R$ {discountedPrice.toFixed(2)} {/* Exibe o preço com desconto */}
            </span>
          </div>
          <Button
            onClick={() => onAddToCart(product)}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ProductCard;

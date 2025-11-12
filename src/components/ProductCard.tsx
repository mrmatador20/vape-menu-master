import { Product } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ShoppingCart } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

const ProductCard = ({ product, onAddToCart }: ProductCardProps) => {
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
          <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            R$ {product.price.toFixed(2)}
          </span>
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

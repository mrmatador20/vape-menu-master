import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

const Header = () => {
  const { totalItems } = useCart();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div 
          className="flex items-center space-x-2 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <div className="h-8 w-8 rounded-lg bg-gradient-primary" />
          <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            VapeShop
          </span>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          className="relative border-primary/50 hover:bg-primary/10"
          onClick={() => navigate('/cart')}
        >
          <ShoppingCart className="h-5 w-5 text-primary" />
          {totalItems > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-secondary text-secondary-foreground">
              {totalItems}
            </Badge>
          )}
        </Button>
      </div>
    </header>
  );
};

export default Header;

import { ShoppingCart, Settings, Package, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

const Header = () => {
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const { data: role } = useUserRole();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;

      toast.success('Logout realizado com sucesso!');
      navigate('/auth');
    } catch (error: any) {
      toast.error('Erro ao fazer logout', {
        description: error.message
      });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div 
          className="flex items-center space-x-2 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <div className="h-8 w-8 rounded-lg bg-gradient-primary" />
          <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            NebulaVape
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {role === 'admin' && (
            <Button
              variant="outline"
              size="sm"
              className="border-primary/50 hover:bg-primary/10"
              onClick={() => navigate('/admin')}
            >
              <Settings className="h-5 w-5 text-primary" />
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            className="border-primary/50 hover:bg-primary/10"
            onClick={() => navigate('/my-orders')}
          >
            <Package className="h-5 w-5 text-primary" />
          </Button>
          
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

          {isLoggedIn && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="border-primary/50 hover:bg-primary/10"
                onClick={() => navigate('/profile')}
              >
                <User className="h-5 w-5 text-primary" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/50 hover:bg-destructive/10"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5 text-destructive" />
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

import { ShoppingCart, Settings, Package, LogOut, User, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const Header = () => {
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const { data: role } = useUserRole();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
      setIsMenuOpen(false);
    } catch (error: any) {
      toast.error('Erro ao fazer logout', {
        description: error.message
      });
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsMenuOpen(false);
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
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-2">
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

        {/* Mobile Menu */}
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button
              variant="outline"
              size="sm"
              className="relative border-primary/50 hover:bg-primary/10"
            >
              <Menu className="h-5 w-5 text-primary" />
              {totalItems > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-secondary text-secondary-foreground">
                  {totalItems}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] sm:w-[340px]">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-4 mt-6">
              {role === 'admin' && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 border-primary/50 hover:bg-primary/10 animate-fade-in"
                  style={{ animationDelay: '50ms' }}
                  onClick={() => handleNavigate('/admin')}
                >
                  <Settings className="h-5 w-5 text-primary" />
                  <span>Admin</span>
                </Button>
              )}
              
              <Button
                variant="outline"
                className="w-full justify-start gap-3 border-primary/50 hover:bg-primary/10 animate-fade-in"
                style={{ animationDelay: role === 'admin' ? '100ms' : '50ms' }}
                onClick={() => handleNavigate('/my-orders')}
              >
                <Package className="h-5 w-5 text-primary" />
                <span>Meus Pedidos</span>
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start gap-3 border-primary/50 hover:bg-primary/10 relative animate-fade-in"
                style={{ animationDelay: role === 'admin' ? '150ms' : '100ms' }}
                onClick={() => handleNavigate('/cart')}
              >
                <ShoppingCart className="h-5 w-5 text-primary" />
                <span>Carrinho</span>
                {totalItems > 0 && (
                  <Badge className="ml-auto h-5 w-5 flex items-center justify-center p-0 bg-secondary text-secondary-foreground">
                    {totalItems}
                  </Badge>
                )}
              </Button>

              {isLoggedIn && (
                <>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 border-primary/50 hover:bg-primary/10 animate-fade-in"
                    style={{ animationDelay: role === 'admin' ? '200ms' : '150ms' }}
                    onClick={() => handleNavigate('/profile')}
                  >
                    <User className="h-5 w-5 text-primary" />
                    <span>Perfil</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 border-destructive/50 hover:bg-destructive/10 animate-fade-in"
                    style={{ animationDelay: role === 'admin' ? '250ms' : '200ms' }}
                    onClick={handleLogout}
                  >
                    <LogOut className="h-5 w-5 text-destructive" />
                    <span>Sair</span>
                  </Button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default Header;

import { ShoppingCart, Settings, Package, LogOut, User, Menu, Sparkles, Droplet, Flame, ChevronDown, Grid3x3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState, useEffect, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useProducts } from '@/hooks/useProducts';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const categoryIcons: Record<string, any> = {
  v250: Sparkles,
  v400: Flame,
  seda: Package,
  default: Droplet,
};

const Header = () => {
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const { data: role } = useUserRole();
  const { data: products } = useProducts();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);

  // Extrai categorias únicas dos produtos
  const categories = useMemo(() => 
    Array.from(new Set(products?.map(p => p.category) || [])).sort(),
    [products]
  );

  // Função para obter subcategorias de uma categoria
  const getCategorySubcategories = (category: string) => {
    if (!products) return [];
    const subs = products
      .filter(p => p.category === category && p.subcategory)
      .map(p => p.subcategory as string);
    return Array.from(new Set(subs)).sort();
  };

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
    setIsCategoriesOpen(false);
  };

  const getCategoryIcon = (category: string) => {
    return categoryIcons[category] || categoryIcons.default;
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
          {/* Categories Dropdown */}
          <Popover open={isCategoriesOpen} onOpenChange={setIsCategoriesOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-primary/50 hover:bg-primary/10 gap-2"
              >
                <Grid3x3 className="h-4 w-4 text-primary" />
                <span>Categorias</span>
                <ChevronDown className="h-3 w-3 text-primary" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
              <div className="p-4">
                <h4 className="font-semibold mb-3">Todas as Categorias</h4>
                <Accordion type="single" collapsible className="w-full space-y-2">
                  {categories.map((category) => {
                    const Icon = getCategoryIcon(category);
                    const subcategories = getCategorySubcategories(category);
                    
                    return (
                      <AccordionItem 
                        key={category} 
                        value={category} 
                        className="border-none"
                      >
                        <AccordionTrigger className="hover:bg-primary/5 px-3 py-2 rounded-md hover:no-underline">
                          <div className="flex items-center gap-3">
                            <Icon className="h-4 w-4 text-primary" />
                            <span className="capitalize font-medium">{category}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-2 pt-1">
                          <div className="flex flex-col gap-1 pl-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-sm hover:bg-primary/10"
                              onClick={() => handleNavigate(`/?category=${category}`)}
                            >
                              Ver Todos
                            </Button>
                            {subcategories.map((subcat) => (
                              <Button
                                key={subcat}
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-sm hover:bg-primary/10"
                                onClick={() => handleNavigate(`/?category=${category}&subcategory=${subcat}`)}
                              >
                                <span className="capitalize">{subcat}</span>
                              </Button>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            </PopoverContent>
          </Popover>

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
        <div className="md:hidden">
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
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
          <SheetContent side="right" className="w-[280px] sm:w-[340px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            
            {/* Categories Section */}
            {categories.length > 0 && (
              <>
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-2">Categorias</h3>
                  <Accordion type="single" collapsible className="w-full space-y-2">
                    {categories.map((category, index) => {
                      const Icon = getCategoryIcon(category);
                      const subcategories = getCategorySubcategories(category);
                      
                      return (
                        <AccordionItem 
                          key={category} 
                          value={category} 
                          className="border-none animate-fade-in"
                          style={{ animationDelay: `${50 + index * 50}ms` }}
                        >
                          <AccordionTrigger className="hover:bg-primary/5 px-3 py-2 rounded-md hover:no-underline">
                            <div className="flex items-center gap-3">
                              <Icon className="h-4 w-4 text-primary" />
                              <span className="capitalize font-medium">{category}</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pb-2 pt-1">
                            <div className="flex flex-col gap-1 pl-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-sm hover:bg-primary/10"
                                onClick={() => handleNavigate(`/?category=${category}`)}
                              >
                                Ver Todos
                              </Button>
                              {subcategories.map((subcat) => (
                                <Button
                                  key={subcat}
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start text-sm hover:bg-primary/10"
                                  onClick={() => handleNavigate(`/?category=${category}&subcategory=${subcat}`)}
                                >
                                  <span className="capitalize">{subcat}</span>
                                </Button>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>
                <Separator className="my-4" />
              </>
            )}

            <div className="flex flex-col gap-4">
              {role === 'admin' && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 border-primary/50 hover:bg-primary/10 animate-fade-in"
                  style={{ animationDelay: `${50 + categories.length * 50}ms` }}
                  onClick={() => handleNavigate('/admin')}
                >
                  <Settings className="h-5 w-5 text-primary" />
                  <span>Admin</span>
                </Button>
              )}
              
              <Button
                variant="outline"
                className="w-full justify-start gap-3 border-primary/50 hover:bg-primary/10 animate-fade-in"
                style={{ animationDelay: `${(role === 'admin' ? 100 : 50) + categories.length * 50}ms` }}
                onClick={() => handleNavigate('/my-orders')}
              >
                <Package className="h-5 w-5 text-primary" />
                <span>Meus Pedidos</span>
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start gap-3 border-primary/50 hover:bg-primary/10 relative animate-fade-in"
                style={{ animationDelay: `${(role === 'admin' ? 150 : 100) + categories.length * 50}ms` }}
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
                    style={{ animationDelay: `${(role === 'admin' ? 200 : 150) + categories.length * 50}ms` }}
                    onClick={() => handleNavigate('/profile')}
                  >
                    <User className="h-5 w-5 text-primary" />
                    <span>Perfil</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 border-destructive/50 hover:bg-destructive/10 animate-fade-in"
                    style={{ animationDelay: `${(role === 'admin' ? 250 : 200) + categories.length * 50}ms` }}
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
      </div>
    </header>
  );
};

export default Header;

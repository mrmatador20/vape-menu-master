import {
  ShoppingBag,
  Settings,
  Package,
  LogOut,
  User,
  Menu,
  ChevronRight,
  ChevronLeft,
  LogIn,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState, useEffect, useMemo } from 'react';
import { useAuthState } from '@/context/AuthStateContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useProducts } from '@/hooks/useProducts';
import { useCategories, type Category } from '@/hooks/useCategories';
import { useDepartments, type Department } from '@/hooks/useDepartments';
import { useSubcategories } from '@/hooks/useSubcategories';
import { slugify } from '@/lib/slugify';
import { useSiteIdentity } from '@/hooks/useSiteIdentity';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const ICON_PROPS = { strokeWidth: 1.5 } as const;

const Header = () => {
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const { data: role } = useUserRole();
  const { data: products } = useProducts();
  const { data: allCategories = [] } = useCategories();
  const { data: departments = [] } = useDepartments();
  const { data: siteIdentity } = useSiteIdentity();
  const siteName = siteIdentity?.site_name ?? 'Fox Velour';
  const { isNavigationBlocked } = useAuthState();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openDeptMenu, setOpenDeptMenu] = useState<string | null>(null);
  const [activeCategoryView, setActiveCategoryView] = useState<Category | null>(null);
  const [isInResetFlow, setIsInResetFlow] = useState(false);
  const [mobileDeptView, setMobileDeptView] = useState<Department | null>(null);
  const [mobileCategoryView, setMobileCategoryView] = useState<Category | null>(null);

  // Products available in storefront
  const availableProducts = useMemo(
    () => (products || []).filter((p) => p.visible_in_all !== false && (p.stock ?? 0) > 0),
    [products],
  );

  // Map category name -> list of subcategory names (from products)
  const subsByCategoryName = useMemo(() => {
    const map: Record<string, string[]> = {};
    availableProducts.forEach((p) => {
      if (!p.subcategory) return;
      if (!map[p.category]) map[p.category] = [];
      if (!map[p.category].includes(p.subcategory)) map[p.category].push(p.subcategory);
    });
    Object.keys(map).forEach((k) => map[k].sort());
    return map;
  }, [availableProducts]);

  // Visible categories (those with available products)
  const visibleCategories = useMemo(() => {
    const availableCats = new Set(availableProducts.map((p) => p.category));
    return allCategories.filter((c) => availableCats.has(c.name));
  }, [allCategories, availableProducts]);

  // Categories grouped per department
  const categoriesByDept = useMemo(() => {
    const map: Record<string, Category[]> = {};
    visibleCategories.forEach((c) => {
      const key = c.department_id ?? '__none__';
      if (!map[key]) map[key] = [];
      map[key].push(c);
    });
    return map;
  }, [visibleCategories]);

  // Departments that actually have visible categories
  const visibleDepartments = useMemo(
    () => departments.filter((d) => (categoriesByDept[d.id] || []).length > 0),
    [departments, categoriesByDept],
  );

  useEffect(() => {
    if (!isMenuOpen) {
      setMobileDeptView(null);
      setMobileCategoryView(null);
    }
  }, [isMenuOpen]);

  useEffect(() => {
    const checkResetFlow = () => {
      const resetFlag = localStorage.getItem('password_reset_flow') === 'true';
      setIsInResetFlow(resetFlag);
    };
    checkResetFlow();
    const handleResetFlowChange = () => checkResetFlow();
    window.addEventListener('resetFlowChange', handleResetFlowChange);

    supabase.auth.getSession().then(({ data: { session } }) => {
      const resetFlag = localStorage.getItem('password_reset_flow') === 'true';
      setIsLoggedIn(!!session && !resetFlag);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const resetFlag = localStorage.getItem('password_reset_flow') === 'true';
      setIsLoggedIn(!!session && !resetFlag);
      setIsInResetFlow(resetFlag);
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('resetFlowChange', handleResetFlowChange);
    };
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Logout realizado com sucesso!');
      navigate('/auth');
      setIsMenuOpen(false);
    } catch (error: any) {
      toast.error('Erro ao fazer logout', { description: error.message });
    }
  };

  const handleNavigate = (path: string) => {
    if (isNavigationBlocked) {
      toast.error('Aguarde a conclusão do login', {
        description: 'Por favor, complete a autenticação antes de navegar.',
      });
      return;
    }
    navigate(path);
    setIsMenuOpen(false);
    setOpenDeptMenu(null);
    setActiveCategoryView(null);
  };

  if (isInResetFlow) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <span className="font-serif text-xl tracking-[0.2em] uppercase">{siteName}</span>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Recuperação de senha
          </div>
        </div>
      </header>
    );
  }

  const iconBtn =
    'h-10 w-10 inline-flex items-center justify-center rounded-full text-foreground/80 hover:text-primary transition-colors disabled:opacity-40 disabled:pointer-events-none';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-16 md:h-20 items-center justify-between gap-4">
        {/* Brand */}
        <button
          type="button"
          onClick={() => handleNavigate('/')}
          disabled={isNavigationBlocked}
          className="font-serif text-lg md:text-xl tracking-[0.25em] uppercase text-foreground hover:text-primary transition-colors disabled:opacity-40"
        >
          {siteName}
        </button>

        {/* Desktop nav: one entry per department */}
        <div className="hidden md:flex items-center gap-1">
          {visibleDepartments.map((dept) => (
            <Popover
              key={dept.id}
              open={openDeptMenu === dept.id}
              onOpenChange={(o) => {
                setOpenDeptMenu(o ? dept.id : null);
                if (!o) setActiveCategoryView(null);
              }}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'px-4 py-2 text-[11px] uppercase tracking-[0.25em] transition-colors',
                    openDeptMenu === dept.id ? 'text-primary' : 'text-foreground/80 hover:text-primary',
                  )}
                >
                  {dept.name}
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={12}
                className="w-[520px] max-w-[94vw] p-0 border-0 rounded-md bg-card shadow-[0_20px_60px_-15px_hsl(30_10%_12%_/_0.18)] overflow-hidden"
              >
                {activeCategoryView === null ? (
                  <div className="animate-fade-in">
                    <div className="px-10 pt-8 pb-4 flex items-baseline justify-between">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                        {dept.name}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleNavigate(`/c/${dept.slug}`)}
                        className="group inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-foreground hover:text-primary transition-colors"
                      >
                        <span className="border-b border-foreground/40 group-hover:border-primary pb-0.5">
                          Ver tudo
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" {...ICON_PROPS} />
                      </button>
                    </div>
                    <ul className="px-6 pb-6">
                      {(categoriesByDept[dept.id] || []).map((cat) => {
                        const subs = subsByCategoryName[cat.name] || [];
                        return (
                          <li key={cat.id}>
                            <button
                              type="button"
                              onClick={() =>
                                subs.length > 0
                                  ? setActiveCategoryView(cat)
                                  : handleNavigate(`/c/${dept.slug}/${cat.slug}`)
                              }
                              className="group w-full flex items-center justify-between px-4 py-4 text-left border-b border-border/30 last:border-0 hover:text-primary transition-colors"
                            >
                              <span className="text-sm font-medium tracking-wide capitalize">
                                {cat.name}
                              </span>
                              {subs.length > 0 && (
                                <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all" {...ICON_PROPS} />
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : (
                  <div className="animate-fade-in">
                    <div className="px-10 pt-8 pb-5 flex items-center justify-between border-b border-border/30">
                      <button
                        type="button"
                        onClick={() => setActiveCategoryView(null)}
                        className="group inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" {...ICON_PROPS} />
                        Voltar
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleNavigate(`/c/${dept.slug}/${activeCategoryView.slug}`)
                        }
                        className="text-[10px] uppercase tracking-[0.25em] text-foreground hover:text-primary transition-colors border-b border-foreground/40 hover:border-primary pb-0.5"
                      >
                        Ver tudo
                      </button>
                    </div>
                    <div className="px-10 pt-6 pb-10">
                      <h3 className="font-serif text-2xl capitalize text-foreground mb-6 leading-tight">
                        {activeCategoryView.name}
                      </h3>
                      <ul className="grid grid-cols-2 gap-x-10 gap-y-3.5">
                        {(subsByCategoryName[activeCategoryView.name] || []).map((sub) => (
                          <li key={sub}>
                            <button
                              type="button"
                              onClick={() =>
                                handleNavigate(
                                  `/c/${dept.slug}/${activeCategoryView.slug}/${slugify(sub)}`,
                                )
                              }
                              className="text-sm font-light tracking-wide capitalize text-foreground/80 hover:text-primary transition-colors"
                            >
                              {sub}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          ))}

          <div className="mx-2 h-4 w-px bg-border/60" />

          {/* Cart */}
          <button
            type="button"
            className={cn(iconBtn, 'relative')}
            onClick={() => handleNavigate('/cart')}
            disabled={isNavigationBlocked}
            aria-label="Sacola"
          >
            <ShoppingBag className="h-5 w-5" {...ICON_PROPS} />
            {totalItems > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-medium leading-none flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>

          {/* Account */}
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={iconBtn} aria-label="Conta">
                  <User className="h-5 w-5" {...ICON_PROPS} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={10} className="w-56 border-0 shadow-[0_20px_60px_-15px_hsl(30_10%_12%_/_0.18)] rounded-md">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-normal">
                  Minha conta
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleNavigate('/profile')} className="gap-2 text-sm">
                  <User className="h-4 w-4" {...ICON_PROPS} /> Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleNavigate('/my-orders')} className="gap-2 text-sm">
                  <Package className="h-4 w-4" {...ICON_PROPS} /> Meus pedidos
                </DropdownMenuItem>
                {role === 'admin' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-normal">
                      Administração
                    </DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleNavigate('/546498@18')} className="gap-2 text-sm">
                      <Settings className="h-4 w-4" {...ICON_PROPS} /> Painel administrativo
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="gap-2 text-sm text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" {...ICON_PROPS} /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              type="button"
              onClick={() => handleNavigate('/auth')}
              className="ml-1 inline-flex items-center gap-2 px-3 py-2 text-[11px] uppercase tracking-[0.25em] text-foreground hover:text-primary transition-colors"
            >
              <LogIn className="h-4 w-4" {...ICON_PROPS} />
              Entrar
            </button>
          )}
        </div>

        {/* Mobile */}
        <div className="md:hidden flex items-center gap-1">
          <button
            type="button"
            className={cn(iconBtn, 'relative')}
            onClick={() => handleNavigate('/cart')}
            aria-label="Sacola"
          >
            <ShoppingBag className="h-5 w-5" {...ICON_PROPS} />
            {totalItems > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-medium leading-none flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>

          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <button type="button" className={iconBtn} aria-label="Menu">
                <Menu className="h-5 w-5" {...ICON_PROPS} />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[360px] overflow-y-auto p-0">
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/40">
                <SheetTitle className="font-serif text-lg tracking-[0.2em] uppercase text-left">
                  {siteName}
                </SheetTitle>
              </SheetHeader>

              <div className="px-6 py-6">
                {/* Level 1: departments */}
                {mobileDeptView === null && mobileCategoryView === null && (
                  <div className="animate-fade-in">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
                      Coleção
                    </p>
                    <ul>
                      {visibleDepartments.length === 0 && (
                        <li className="py-3 text-xs text-muted-foreground tracking-wide">
                          Nenhum departamento disponível.
                        </li>
                      )}
                      {visibleDepartments.map((dept) => (
                        <li key={dept.id} className="border-b border-border/30 last:border-0">
                          <button
                            type="button"
                            onClick={() => setMobileDeptView(dept)}
                            className="w-full flex items-center justify-between py-3.5 text-left text-sm font-medium tracking-wide capitalize text-foreground hover:text-primary transition-colors"
                          >
                            <span>{dept.name}</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/60" {...ICON_PROPS} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Level 2: categories of selected department */}
                {mobileDeptView && mobileCategoryView === null && (
                  <div className="animate-fade-in">
                    <button
                      type="button"
                      onClick={() => setMobileDeptView(null)}
                      className="group inline-flex items-center gap-1.5 mb-5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:text-primary"
                    >
                      <ChevronLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" {...ICON_PROPS} />
                      Voltar
                    </button>
                    <div className="flex items-baseline justify-between mb-5">
                      <h3 className="font-serif text-2xl capitalize text-foreground leading-tight">
                        {mobileDeptView.name}
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleNavigate(`/c/${mobileDeptView.slug}`)}
                        className="text-[10px] uppercase tracking-[0.25em] text-foreground hover:text-primary transition-colors border-b border-foreground/40 hover:border-primary pb-0.5"
                      >
                        Ver tudo
                      </button>
                    </div>
                    <ul>
                      {(categoriesByDept[mobileDeptView.id] || []).map((cat) => {
                        const subs = subsByCategoryName[cat.name] || [];
                        return (
                          <li key={cat.id} className="border-b border-border/30 last:border-0">
                            <button
                              type="button"
                              onClick={() =>
                                subs.length > 0
                                  ? setMobileCategoryView(cat)
                                  : handleNavigate(`/c/${mobileDeptView.slug}/${cat.slug}`)
                              }
                              className="w-full flex items-center justify-between py-3.5 text-left text-sm font-medium tracking-wide capitalize text-foreground hover:text-primary transition-colors"
                            >
                              <span>{cat.name}</span>
                              {subs.length > 0 && (
                                <ChevronRight className="h-4 w-4 text-muted-foreground/60" {...ICON_PROPS} />
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* Level 3: subcategories */}
                {mobileDeptView && mobileCategoryView && (
                  <div className="animate-fade-in">
                    <button
                      type="button"
                      onClick={() => setMobileCategoryView(null)}
                      className="group inline-flex items-center gap-1.5 mb-5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:text-primary"
                    >
                      <ChevronLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" {...ICON_PROPS} />
                      Voltar
                    </button>
                    <div className="flex items-baseline justify-between mb-5">
                      <h3 className="font-serif text-2xl capitalize text-foreground leading-tight">
                        {mobileCategoryView.name}
                      </h3>
                      <button
                        type="button"
                        onClick={() =>
                          handleNavigate(`/c/${mobileDeptView.slug}/${mobileCategoryView.slug}`)
                        }
                        className="text-[10px] uppercase tracking-[0.25em] text-foreground hover:text-primary transition-colors border-b border-foreground/40 hover:border-primary pb-0.5"
                      >
                        Ver tudo
                      </button>
                    </div>
                    <ul className="space-y-3">
                      {(subsByCategoryName[mobileCategoryView.name] || []).map((sub) => (
                        <li key={sub}>
                          <button
                            type="button"
                            onClick={() =>
                              handleNavigate(
                                `/c/${mobileDeptView.slug}/${mobileCategoryView.slug}/${slugify(sub)}`,
                              )
                            }
                            className="text-sm font-light tracking-wide capitalize text-foreground/80 hover:text-primary transition-colors"
                          >
                            {sub}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-8 pt-6 border-t border-border/40 space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
                    Conta
                  </p>
                  {isLoggedIn ? (
                    <>
                      <MobileLink onClick={() => handleNavigate('/profile')} icon={<User className="h-4 w-4" {...ICON_PROPS} />}>
                        Perfil
                      </MobileLink>
                      <MobileLink onClick={() => handleNavigate('/my-orders')} icon={<Package className="h-4 w-4" {...ICON_PROPS} />}>
                        Meus pedidos
                      </MobileLink>
                      {role === 'admin' && (
                        <MobileLink onClick={() => handleNavigate('/546498@18')} icon={<Settings className="h-4 w-4" {...ICON_PROPS} />}>
                          Painel administrativo
                        </MobileLink>
                      )}
                      <MobileLink onClick={handleLogout} icon={<LogOut className="h-4 w-4" {...ICON_PROPS} />} destructive>
                        Sair
                      </MobileLink>
                    </>
                  ) : (
                    <MobileLink onClick={() => handleNavigate('/auth')} icon={<LogIn className="h-4 w-4" {...ICON_PROPS} />}>
                      Entrar
                    </MobileLink>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

const MobileLink = ({
  onClick,
  icon,
  children,
  destructive,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
  destructive?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'w-full flex items-center gap-3 py-2.5 text-sm tracking-wide transition-colors',
      destructive ? 'text-destructive hover:text-destructive/80' : 'text-foreground hover:text-primary',
    )}
  >
    {icon}
    {children}
  </button>
);

export default Header;

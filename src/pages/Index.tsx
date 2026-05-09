import { useState, useMemo, useEffect } from 'react';
import { useCart, Product } from '@/context/CartContext';
import { useProducts } from '@/hooks/useProducts';
import ProductCard from '@/components/ProductCard';
import QuickViewSheet from '@/components/QuickViewSheet';
import Header from '@/components/Header';
import ProductSearch from '@/components/ProductSearch';
import { CategorySidebar } from '@/components/CategorySidebar';
import { CategoryCarousel } from '@/components/CategoryCarousel';
import { BannerCarousel } from '@/components/BannerCarousel';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useSiteIdentity } from '@/hooks/useSiteIdentity';

const Index = () => {
  const { addToCart } = useCart();
  const { data: products, isLoading } = useProducts();
  const { data: siteIdentity } = useSiteIdentity();
  const [searchParams] = useSearchParams();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeSubcategory, setActiveSubcategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const subcategoryParam = searchParams.get('subcategory');
    if (categoryParam) {
      setActiveCategory(categoryParam);
      setActiveSubcategory(subcategoryParam || 'all');
    } else {
      setActiveCategory('all');
      setActiveSubcategory('all');
    }
  }, [searchParams]);

  const productCategories = useMemo(() => {
    if (!products) return [];
    return Array.from(new Set(products.map(p => p.category))).sort();
  }, [products]);

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setActiveSubcategory('all');
  };

  const filteredProducts = useMemo(() => {
    let filtered = activeCategory === 'all'
      ? (products || []).filter(p => p.visible_in_all !== false)
      : products?.filter(p => p.category === activeCategory) || [];

    if (activeSubcategory !== 'all') {
      filtered = filtered.filter(p => p.subcategory === activeSubcategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }

    return filtered.sort((a, b) => {
      if (a.stock > 0 && b.stock === 0) return -1;
      if (a.stock === 0 && b.stock > 0) return 1;
      return 0;
    });
  }, [products, activeCategory, activeSubcategory, searchQuery]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <BannerCarousel />

      {/* Hero — minimal, editorial */}
      <section className="py-24 md:py-32 px-4">
        <div className="container max-w-4xl text-center space-y-8">
          <p className="text-[11px] uppercase tracking-[0.4em] text-muted-foreground animate-in fade-in duration-700">
            Maison
          </p>
          <h1 className="font-serif text-5xl md:text-7xl font-normal tracking-[0.15em] uppercase text-foreground animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {siteIdentity?.site_hero_title ?? 'Fox Velour'}
          </h1>
          <div className="mx-auto h-px w-16 bg-primary/60" />
          <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed font-light whitespace-pre-line animate-in fade-in duration-1000 delay-200">
            {siteIdentity?.site_hero_subtitle ?? 'Fragrâncias e estilo premium, com a sutileza do luxo silencioso.'}
          </p>
        </div>
      </section>

      {/* Products */}
      <section className="pb-24">
        <div className="container max-w-7xl px-4 sm:px-6 md:px-10">
          {/* Discreet search */}
          <div className="border-y border-border/60 mb-10">
            <ProductSearch value={searchQuery} onChange={setSearchQuery} />
          </div>

          <div className="my-8 hidden md:block">
            <CategoryCarousel
              categories={productCategories}
              products={products || []}
              activeCategory={activeCategory}
              activeSubcategory={activeSubcategory}
              onCategoryChange={handleCategoryChange}
              onSubcategoryChange={setActiveSubcategory}
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-24">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <CategorySidebar
                categories={productCategories}
                products={products || []}
                activeCategory={activeCategory}
                activeSubcategory={activeSubcategory}
                onCategoryChange={handleCategoryChange}
                onSubcategoryChange={setActiveSubcategory}
              />

              <div className="transition-all duration-500">
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12 md:gap-x-10 md:gap-y-16">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onQuickView={setQuickViewProduct}
                    />
                  ))}
                </div>
                {filteredProducts.length === 0 && (
                  <div className="text-center py-24">
                    <p className="text-muted-foreground text-sm tracking-wide">
                      Nenhum produto encontrado.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      <QuickViewSheet
        product={quickViewProduct}
        open={!!quickViewProduct}
        onOpenChange={(o) => !o && setQuickViewProduct(null)}
        onAddToCart={addToCart}
      />
    </div>
  );
};

export default Index;

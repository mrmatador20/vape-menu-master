import { useState, useMemo, useEffect } from 'react';
import { useCart, Product } from '@/context/CartContext';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import ProductCard from '@/components/ProductCard';
import QuickViewSheet from '@/components/QuickViewSheet';
import Header from '@/components/Header';
import ProductSearch from '@/components/ProductSearch';
import { CategorySidebar } from '@/components/CategorySidebar';
import { CategoryCarousel } from '@/components/CategoryCarousel';
import { BannerCarousel } from '@/components/BannerCarousel';
import Footer from '@/components/Footer';
import { PromoBannerCarousel } from '@/components/PromoBannerCarousel';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useSiteIdentity } from '@/hooks/useSiteIdentity';
import { usePageMeta } from '@/hooks/usePageMeta';

const Index = () => {
  usePageMeta({
    title: 'Fox Velour | Fragrâncias e Estilo Premium',
    description: 'Compre perfumes, body splashes, difusores, sabonetes líquidos e moda fitness premium na Fox Velour. Estética minimalista e exclusiva.',
    path: '/',
  });
  const { addToCart } = useCart();
  const { data: products, isLoading } = useProducts();
  const { data: orderedCategories } = useCategories();
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
    const available = products.filter(
      p => p.visible_in_all !== false && (p.stock ?? 0) > 0
    );
    const availableSet = new Set(available.map(p => p.category));
    const ordered = (orderedCategories || [])
      .map(c => c.name)
      .filter(name => availableSet.has(name));
    const extras = Array.from(availableSet).filter(c => !ordered.includes(c)).sort();
    return [...ordered, ...extras];
  }, [products, orderedCategories]);

  const availableProducts = useMemo(
    () => (products || []).filter(p => p.visible_in_all !== false && (p.stock ?? 0) > 0),
    [products]
  );

  // Inject ItemList + Product JSON-LD for catalog rich results
  useEffect(() => {
    const id = 'catalog-jsonld';
    document.getElementById(id)?.remove();
    if (!availableProducts.length) return;
    const items = availableProducts.slice(0, 30).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: p.name,
        description: p.description,
        image: p.image,
        offers: {
          '@type': 'Offer',
          price: Number(p.price).toFixed(2),
          priceCurrency: 'BRL',
          availability: (p.stock ?? 0) > 0
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
          url: `https://foxvelour.com/?product=${p.id}`,
        },
      },
    }));
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = id;
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Catálogo Fox Velour',
      itemListElement: items,
    });
    document.head.appendChild(script);
    return () => { document.getElementById(id)?.remove(); };
  }, [availableProducts]);

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setActiveSubcategory('all');
  };

  const filteredProducts = useMemo(() => {
    const visible = (products || []).filter(p => p.visible_in_all !== false);
    let filtered = activeCategory === 'all'
      ? visible
      : visible.filter(p => p.category === activeCategory);

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
      <main>

      <BannerCarousel />

      {/* Hero — minimal, editorial */}
      <section
        className="relative py-24 md:py-32 px-4 bg-cover bg-center bg-no-repeat"
        style={
          siteIdentity?.site_hero_image_url
            ? { backgroundImage: `url(${siteIdentity.site_hero_image_url})` }
            : undefined
        }
      >
        {siteIdentity?.site_hero_image_url && (
          <div className="absolute inset-0 bg-background/70 backdrop-blur-[1px]" aria-hidden="true" />
        )}
        <div className="relative container max-w-4xl text-center space-y-8">
          {siteIdentity && (
            <>
              <h1 className="font-serif text-3xl sm:text-5xl md:text-7xl font-normal tracking-[0.08em] sm:tracking-[0.15em] leading-tight sm:leading-[1.1] uppercase text-foreground max-w-[14ch] sm:max-w-none mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000 [text-shadow:0_2px_12px_hsl(var(--background))]">
                {siteIdentity.site_hero_title ?? 'Bem-vindo à Fox Velour'}
              </h1>
              <div className="mx-auto h-px w-16 bg-primary/60" />
              <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed font-light whitespace-pre-line animate-in fade-in duration-1000 delay-200">
                {siteIdentity.site_hero_subtitle ?? 'Descubra uma curadoria exclusiva de moda e fragrâncias feitas para quem não abre mão da sofisticação. Explore nossa linha de perfumaria fina e vestuário.'}
              </p>
            </>
          )}
        </div>
      </section>


      {/* Promo Banner — full-width editorial carousel */}
      <PromoBannerCarousel />

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
              products={availableProducts}
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
                products={availableProducts}
                activeCategory={activeCategory}
                activeSubcategory={activeSubcategory}
                onCategoryChange={handleCategoryChange}
                onSubcategoryChange={setActiveSubcategory}
              />

              <div className="transition-all duration-500">
                {activeCategory === 'all' && !searchQuery.trim() ? (
                  <div className="space-y-20 md:space-y-28">
                    {productCategories.map((category, catIdx) => {
                      const items = filteredProducts.filter(p => p.category === category);
                      if (items.length === 0) return null;
                      const visibleItems = items.slice(0, 4);
                      const hasMore = items.length > 4;
                      return (
                        <section key={category}>
                          <header className="mb-8 md:mb-10">
                            <div className="flex items-end justify-between gap-4">
                              <div>
                                <h2 className="font-serif text-2xl md:text-3xl font-normal text-foreground capitalize tracking-wide">
                                  {category}
                                </h2>
                                <div className="mt-3 h-px w-16 bg-primary/70" />
                              </div>
                              {hasMore && (
                                <button
                                  type="button"
                                  onClick={() => handleCategoryChange(category)}
                                  className="hidden md:inline-flex items-center text-[11px] uppercase tracking-[0.25em] text-muted-foreground hover:text-primary border-b border-transparent hover:border-primary pb-1 transition-colors"
                                >
                                  Ver todos
                                </button>
                              )}
                            </div>
                          </header>
                          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12 md:gap-x-10 md:gap-y-16">
                            {visibleItems.map((product, idx) => (
                              <ProductCard
                                key={product.id}
                                product={product}
                                onQuickView={setQuickViewProduct}
                                priority={catIdx === 0 && idx < 4}
                              />
                            ))}
                          </div>
                          {hasMore && (
                            <div className="mt-10 flex justify-center">
                              <button
                                type="button"
                                onClick={() => handleCategoryChange(category)}
                                className="text-[11px] uppercase tracking-[0.3em] text-foreground border border-primary/60 hover:bg-primary hover:text-primary-foreground px-8 py-3 rounded-sm transition-colors"
                              >
                                Ver todos os <span className="capitalize">{category}</span>
                              </button>
                            </div>
                          )}
                        </section>
                      );
                    })}
                    {filteredProducts.length === 0 && (
                      <div className="text-center py-24">
                        <p className="text-muted-foreground text-sm tracking-wide">
                          Nenhum produto encontrado.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12 md:gap-x-10 md:gap-y-16">
                      {filteredProducts.map((product, idx) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onQuickView={setQuickViewProduct}
                          priority={idx < 4}
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
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      </main>

      <Footer />

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

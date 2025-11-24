import { useState, useMemo, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { useProducts } from '@/hooks/useProducts';
import ProductCard from '@/components/ProductCard';
import Header from '@/components/Header';
import ProductSearch from '@/components/ProductSearch';
import { CategorySidebar } from '@/components/CategorySidebar';
import { CategoryCarousel } from '@/components/CategoryCarousel';
import { BannerCarousel } from '@/components/BannerCarousel';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

const Index = () => {
  const { addToCart } = useCart();
  const { data: products, isLoading } = useProducts();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeSubcategory, setActiveSubcategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sincroniza estado com URL params
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const subcategoryParam = searchParams.get('subcategory');
    
    if (categoryParam) {
      setActiveCategory(categoryParam);
      setActiveSubcategory(subcategoryParam || 'all');
    } else {
      // Se não há parâmetro de categoria, mostra todos
      setActiveCategory('all');
      setActiveSubcategory('all');
    }
  }, [searchParams]);

  // Extrai categorias únicas dos produtos para fallback
  const productCategories = useMemo(() => {
    if (!products) return [];
    const uniqueCategories = Array.from(new Set(products.map(p => p.category)));
    return uniqueCategories.sort();
  }, [products]);

  // Handle category change and reset subcategory
  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setActiveSubcategory('all');
  };

  // Filtra produtos por categoria, subcategoria e busca
  const filteredProducts = useMemo(() => {
    let filtered = activeCategory === 'all' 
      ? products || []
      : products?.filter(p => p.category === activeCategory) || [];
    
    // Filtra por subcategoria se uma foi selecionada
    if (activeSubcategory !== 'all') {
      filtered = filtered.filter(p => p.subcategory === activeSubcategory);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.description.toLowerCase().includes(query)
      );
    }
    
    // Ordena produtos: com estoque primeiro, depois esgotados
    return filtered.sort((a, b) => {
      if (a.stock > 0 && b.stock === 0) return -1;
      if (a.stock === 0 && b.stock > 0) return 1;
      return 0;
    });
  }, [products, activeCategory, activeSubcategory, searchQuery]);

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Header />
      
      {/* Banner Carousel */}
      <BannerCarousel />
      
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container max-w-4xl text-center space-y-6">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-1000">
            Bem-vindo à NebulaVape
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-150">
            Aqui você encontra uma variedade de produtos de tabacaria com entrega rápida. Explore nossas categorias de vapers, acessórios, tabacos e muito mais.
          </p>
        </div>
      </section>

      {/* Products Section */}
      <section className="pb-20">
        <div className="container max-w-7xl px-2 sm:px-4">
          <ProductSearch value={searchQuery} onChange={setSearchQuery} />
          
          {/* Category Carousel - Desktop only */}
          <div className="my-6 md:my-8 hidden md:block">
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
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Sidebar - provides layout structure */}
              <CategorySidebar
                categories={productCategories}
                products={products || []}
                activeCategory={activeCategory}
                activeSubcategory={activeSubcategory}
                onCategoryChange={handleCategoryChange}
                onSubcategoryChange={setActiveSubcategory}
              />

              {/* Products Grid - responsive margin */}
              <div className="transition-all duration-500">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={addToCart}
                    />
                  ))}
                </div>
                {filteredProducts.length === 0 && (
                  <div className="text-center py-20">
                    <p className="text-muted-foreground text-lg">
                      Nenhum produto encontrado para esta categoria.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default Index;

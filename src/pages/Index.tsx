import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { useProducts } from '@/hooks/useProducts';
import ProductCard from '@/components/ProductCard';
import Header from '@/components/Header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { addToCart } = useCart();
  const { data: products, isLoading } = useProducts();
  const [activeCategory, setActiveCategory] = useState<'all' | 'v250' | 'v400'| 'seda'>('all');

  const filteredProducts = activeCategory === 'all' 
    ? products || []
    : products?.filter(p => p.category === activeCategory) || [];

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Header />
      
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container max-w-4xl text-center space-y-6">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-1000">
            Bem-vindo à NebulaVape
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-150">
            Os melhores vapers com entrega rápida. Escolha entre nossas categorias V250 e V400.
          </p>
        </div>
      </section>

      {/* Products Section */}
      <section className="pb-20 px-4">
        <div className="container">
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as any)} className="w-full">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-4 mb-12 bg-card border border-border">
                <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Todos
                </TabsTrigger>
                <TabsTrigger value="v250" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  V250
                </TabsTrigger>
                <TabsTrigger value="v400" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  V400
                </TabsTrigger>
                <TabsTrigger value="seda" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  seda
                </TabsTrigger>
              </TabsList>
              <TabsContent value={activeCategory} className="mt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={addToCart}
                    />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </section>
    </div>
  );
};

export default Index;

import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart, Product } from '@/context/CartContext';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useSubcategories } from '@/hooks/useSubcategories';
import ProductCard from '@/components/ProductCard';
import QuickViewSheet from '@/components/QuickViewSheet';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductSearch from '@/components/ProductSearch';
import { Loader2, ArrowLeft } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { Link } from 'react-router-dom';

export default function CategoryPage() {
  const { categorySlug, subcategorySlug } = useParams<{ categorySlug: string; subcategorySlug?: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { data: products, isLoading } = useProducts();
  const { data: categories = [] } = useCategories();

  const category = categories.find((c) => c.slug === categorySlug);
  const { data: subcategories = [] } = useSubcategories(category?.id, category?.name);
  const subcategory = subcategorySlug
    ? subcategories.find((s) => s.slug === subcategorySlug)
    : undefined;

  const [searchQuery, setSearchQuery] = useState('');
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  usePageMeta({
    title: category
      ? `${subcategory?.name ? subcategory.name + ' - ' : ''}${category.name} | Fox Velour`
      : 'Categoria | Fox Velour',
    description: category
      ? `Explore ${subcategory?.name ?? category.name} na Fox Velour.`
      : 'Catálogo Fox Velour',
    path: subcategorySlug ? `/c/${categorySlug}/${subcategorySlug}` : `/c/${categorySlug}`,
  });

  // 404 once categories load and slug doesn't match
  useEffect(() => {
    if (categories.length > 0 && !category) {
      // unknown category -> redirect home
      navigate('/', { replace: true });
    }
  }, [categories, category, navigate]);

  const filtered = useMemo(() => {
    if (!products || !category) return [];
    let list = products.filter(
      (p) => p.visible_in_all !== false && p.category === category.name,
    );
    if (subcategory) {
      list = list.filter((p) => p.subcategory === subcategory.name);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
      );
    }
    return list.sort((a, b) => {
      if (a.stock > 0 && b.stock === 0) return -1;
      if (a.stock === 0 && b.stock > 0) return 1;
      return (a.display_order || 0) - (b.display_order || 0);
    });
  }, [products, category, subcategory, searchQuery]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-7xl px-4 sm:px-6 md:px-10 py-10">
        <nav className="text-xs text-muted-foreground mb-6 flex items-center gap-2 flex-wrap">
          <Link to="/" className="hover:text-foreground">Início</Link>
          <span>/</span>
          {subcategory ? (
            <>
              <Link to={`/c/${categorySlug}`} className="hover:text-foreground capitalize">
                {category?.name}
              </Link>
              <span>/</span>
              <span className="text-foreground capitalize">{subcategory.name}</span>
            </>
          ) : (
            <span className="text-foreground capitalize">{category?.name}</span>
          )}
        </nav>

        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </button>

        <header className="mb-10">
          <h1 className="font-serif text-3xl md:text-4xl font-normal capitalize tracking-wide">
            {subcategory ? subcategory.name : category?.name}
          </h1>
          <div className="mt-3 h-px w-16 bg-primary/70" />
        </header>

        {category && subcategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <Link
              to={`/c/${category.slug}`}
              className={`text-[11px] uppercase tracking-[0.2em] px-4 py-2 rounded-sm border transition-colors ${
                !subcategory
                  ? 'bg-foreground text-background border-foreground'
                  : 'border-border hover:border-foreground'
              }`}
            >
              Todos
            </Link>
            {subcategories.map((s) => (
              <Link
                key={s.id}
                to={`/c/${category.slug}/${s.slug}`}
                className={`text-[11px] uppercase tracking-[0.2em] px-4 py-2 rounded-sm border transition-colors capitalize ${
                  subcategory?.id === s.id
                    ? 'bg-foreground text-background border-foreground'
                    : 'border-border hover:border-foreground'
                }`}
              >
                {s.name}
              </Link>
            ))}
          </div>
        )}

        <div className="border-y border-border/60 mb-10">
          <ProductSearch value={searchQuery} onChange={setSearchQuery} />
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-muted-foreground text-sm tracking-wide">Nenhum produto encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12 md:gap-x-10 md:gap-y-16">
            {filtered.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                onQuickView={setQuickViewProduct}
                priority={idx < 4}
              />
            ))}
          </div>
        )}
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
}

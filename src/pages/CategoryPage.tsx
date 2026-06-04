import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCart, Product } from '@/context/CartContext';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useSubcategories } from '@/hooks/useSubcategories';
import { useDepartments } from '@/hooks/useDepartments';
import ProductCard from '@/components/ProductCard';
import QuickViewSheet from '@/components/QuickViewSheet';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductSearch from '@/components/ProductSearch';
import { Loader2, ArrowLeft } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';

export default function CategoryPage() {
  const { departmentSlug, categorySlug, subcategorySlug } = useParams<{
    departmentSlug: string;
    categorySlug?: string;
    subcategorySlug?: string;
  }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { data: products, isLoading } = useProducts();
  const { data: departments = [] } = useDepartments();
  const { data: allCategories = [] } = useCategories();

  // Resolve department (or fallback: treat slug as legacy category slug)
  const department = departments.find((d) => d.slug === departmentSlug);
  const legacyCategory = !department
    ? allCategories.find((c) => c.slug === departmentSlug)
    : undefined;

  // Redirect legacy URLs (/c/<category>) → /c/<dept>/<category>
  useEffect(() => {
    if (!department && legacyCategory && legacyCategory.department_slug) {
      const sub = categorySlug ? `/${categorySlug}` : '';
      navigate(`/c/${legacyCategory.department_slug}/${legacyCategory.slug}${sub}`, {
        replace: true,
      });
    }
  }, [department, legacyCategory, categorySlug, navigate]);

  // 404 if neither resolves once data is loaded
  useEffect(() => {
    if (departments.length > 0 && allCategories.length > 0 && !department && !legacyCategory) {
      navigate('/', { replace: true });
    }
  }, [departments, allCategories, department, legacyCategory, navigate]);

  // Categories scoped to this department
  const deptCategories = useMemo(
    () => (department ? allCategories.filter((c) => c.department_id === department.id) : []),
    [allCategories, department],
  );
  const category = categorySlug ? deptCategories.find((c) => c.slug === categorySlug) : undefined;
  const { data: subcategories = [] } = useSubcategories(category?.id, category?.name);
  const subcategory = subcategorySlug
    ? subcategories.find((s) => s.slug === subcategorySlug)
    : undefined;

  const [searchQuery, setSearchQuery] = useState('');
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  const title = subcategory?.name || category?.name || department?.name || 'Catálogo';
  const path = [departmentSlug, categorySlug, subcategorySlug].filter(Boolean).join('/');
  usePageMeta({
    title: `${title} | Fox Velour`,
    description: `Explore ${title} na Fox Velour.`,
    path: `/c/${path}`,
  });

  const filtered = useMemo(() => {
    if (!products) return [];
    let list = products.filter((p) => p.visible_in_all !== false);

    if (category) {
      list = list.filter((p) => p.category === category.name);
    } else if (department) {
      // department-only: show products from all categories in the department
      const catNames = new Set(deptCategories.map((c) => c.name));
      list = list.filter((p) => catNames.has(p.category));
    }
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
  }, [products, department, deptCategories, category, subcategory, searchQuery]);

  const basePath = department ? `/c/${department.slug}` : '/';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-7xl px-4 sm:px-6 md:px-10 py-10">
        <nav className="text-xs text-muted-foreground mb-6 flex items-center gap-2 flex-wrap">
          <Link to="/" className="hover:text-foreground">Início</Link>
          {department && (
            <>
              <span>/</span>
              {category || subcategory ? (
                <Link to={basePath} className="hover:text-foreground capitalize">
                  {department.name}
                </Link>
              ) : (
                <span className="text-foreground capitalize">{department.name}</span>
              )}
            </>
          )}
          {category && (
            <>
              <span>/</span>
              {subcategory ? (
                <Link to={`${basePath}/${category.slug}`} className="hover:text-foreground capitalize">
                  {category.name}
                </Link>
              ) : (
                <span className="text-foreground capitalize">{category.name}</span>
              )}
            </>
          )}
          {subcategory && (
            <>
              <span>/</span>
              <span className="text-foreground capitalize">{subcategory.name}</span>
            </>
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
            {title}
          </h1>
          <div className="mt-3 h-px w-16 bg-primary/70" />
        </header>

        {/* Category chips (when viewing department) */}
        {department && !category && deptCategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {deptCategories.map((c) => (
              <Link
                key={c.id}
                to={`${basePath}/${c.slug}`}
                className="text-[11px] uppercase tracking-[0.2em] px-4 py-2 rounded-sm border border-border hover:border-foreground transition-colors capitalize"
              >
                {c.name}
              </Link>
            ))}
          </div>
        )}

        {/* Subcategory chips (when viewing category) */}
        {category && subcategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <Link
              to={`${basePath}/${category.slug}`}
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
                to={`${basePath}/${category.slug}/${s.slug}`}
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

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Product, useCart } from '@/context/CartContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, ShoppingBag } from 'lucide-react';
import { fetchStoreDiscount, resolveEffectiveDiscount } from '@/hooks/useStoreDiscount';
import { usePageMeta } from '@/hooks/usePageMeta';
import { optimizedImage, imageSrcSet } from '@/lib/utils';
import { useCategories } from '@/hooks/useCategories';

export default function ProductPage() {
  const { productSlug } = useParams<{ productSlug: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { data: categories = [] } = useCategories();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data, error }, storeDiscount] = await Promise.all([
        supabase.from('products').select('*').eq('slug', productSlug!).maybeSingle(),
        fetchStoreDiscount(),
      ]);
      if (cancelled) return;
      if (error || !data) {
        setProduct(null);
        setLoading(false);
        return;
      }
      const effective = resolveEffectiveDiscount(
        data.discount_value,
        data.discount_type as 'percent' | 'fixed' | undefined,
        storeDiscount,
      );
      setProduct({
        id: data.id,
        name: data.name,
        slug: (data as any).slug,
        category: data.category,
        subcategory: data.subcategory || undefined,
        price: Number(data.price),
        image: data.image,
        images: (data as any).images || (data.image ? [data.image] : []),
        description: data.description,
        stock: data.stock,
        min_stock: data.min_stock || 10,
        discount_value: effective.value,
        discount_type: effective.type,
        display_order: data.display_order || 0,
        visible_in_all: data.visible_in_all ?? true,
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [productSlug]);

  usePageMeta({
    title: product ? `${product.name} | Fox Velour` : 'Produto | Fox Velour',
    description: product?.description?.slice(0, 155) || 'Produto Fox Velour',
    path: `/p/${productSlug}`,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container max-w-3xl text-center py-32 px-4">
          <h1 className="font-serif text-2xl mb-4">Produto não encontrado</h1>
          <p className="text-muted-foreground mb-8">O produto que você procura não existe ou foi removido.</p>
          <Button onClick={() => navigate('/')}>Voltar à loja</Button>
        </div>
        <Footer />
      </div>
    );
  }

  const discountValue = product.discount_value || 0;
  const finalPrice = product.discount_type === 'percent'
    ? product.price * (1 - discountValue / 100)
    : product.price - discountValue;
  const hasDiscount = finalPrice < product.price;
  const isOutOfStock = product.stock === 0;

  const gallery = product.images && product.images.length > 0
    ? product.images
    : [product.image];
  const primary = gallery[activeImage] || product.image;

  const productCategory = categories.find(c => c.name === product.category);
  const categorySlug = productCategory?.slug;
  const departmentSlug = productCategory?.department_slug;
  const categoryHref = departmentSlug && categorySlug
    ? `/c/${departmentSlug}/${categorySlug}`
    : categorySlug
      ? `/c/${categorySlug}`
      : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-6xl px-4 sm:px-6 py-8 md:py-12">
        <nav className="text-xs text-muted-foreground mb-6 flex items-center gap-2 flex-wrap">
          <Link to="/" className="hover:text-foreground">Início</Link>
          <span>/</span>
          {departmentSlug && productCategory?.department_name && (
            <>
              <Link to={`/c/${departmentSlug}`} className="hover:text-foreground capitalize">{productCategory.department_name}</Link>
              <span>/</span>
            </>
          )}
          {categoryHref ? (
            <Link to={categoryHref} className="hover:text-foreground capitalize">{product.category}</Link>
          ) : (
            <span className="capitalize">{product.category}</span>
          )}

          <span>/</span>
          <span className="text-foreground truncate">{product.name}</span>
        </nav>

        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </button>

        <div className="grid md:grid-cols-2 gap-10 md:gap-16">
          <div>
            <div className="bg-muted rounded-md overflow-hidden" style={{ aspectRatio: '4 / 5' }}>
              <img
                src={optimizedImage(primary, { width: 900, quality: 75 })}
                srcSet={imageSrcSet(primary, [480, 720, 900, 1200])}
                sizes="(min-width: 768px) 50vw, 100vw"
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {gallery.length > 1 && (
              <div className="grid grid-cols-5 gap-2 mt-3">
                {gallery.slice(0, 10).map((img, i) => (
                  <button
                    key={img + i}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    className={`bg-muted rounded-sm overflow-hidden border ${i === activeImage ? 'border-primary' : 'border-transparent'}`}
                    style={{ aspectRatio: '1' }}
                  >
                    <img src={optimizedImage(img, { width: 160 })} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground capitalize">
                {product.category}{product.subcategory ? ` · ${product.subcategory}` : ''}
              </p>
              <h1 className="font-serif text-3xl md:text-4xl font-normal mt-2">{product.name}</h1>
            </div>

            <div className="flex items-baseline gap-3">
              {hasDiscount && (
                <span className="text-base text-muted-foreground line-through">
                  R$ {product.price.toFixed(2)}
                </span>
              )}
              <span className="text-2xl font-medium text-primary tracking-tight">
                R$ {finalPrice.toFixed(2)}
              </span>
              {hasDiscount && product.discount_type === 'percent' && (
                <span className="text-xs bg-primary/95 text-primary-foreground px-2 py-1 rounded-sm">
                  −{discountValue}%
                </span>
              )}
            </div>

            {product.description && (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            )}

            <Button
              size="lg"
              className="w-full"
              disabled={isOutOfStock}
              onClick={() => addToCart(product)}
            >
              <ShoppingBag className="h-4 w-4 mr-2" />
              {isOutOfStock ? 'Esgotado' : 'Adicionar ao carrinho'}
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

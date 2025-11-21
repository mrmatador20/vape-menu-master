import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, AlertCircle, DollarSign, Star, TrendingUp } from "lucide-react";
import { LowStockAlert } from "@/components/admin/LowStockAlert";
import { Progress } from "@/components/ui/progress";

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [productsRes, ordersRes] = await Promise.all([
        supabase.from('products').select('id, stock, min_stock'),
        supabase.from('orders').select('id, total_amount, status', { count: 'exact' }),
      ]);

      // Filtrar apenas pedidos confirmados ou entregues
      const validOrders = ordersRes.data?.filter(o => o.status === 'delivered' || o.status === 'confirmed') || [];
      
      // Contar produtos com estoque <= min_stock
      const lowStockItems = productsRes.data?.filter(p => p.stock <= (p.min_stock || 10)).length || 0;
      const totalRevenue = validOrders.reduce((sum, order) => sum + Number(order.total_amount), 0);

      return {
        totalProducts: productsRes.data?.length || 0,
        totalOrders: validOrders.length,
        lowStockItems,
        totalRevenue,
      };
    },
  });

  const { data: reviewStats } = useQuery({
    queryKey: ['admin-review-stats'],
    queryFn: async () => {
      // Buscar todas as avaliações
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('rating, product_id, products(name, image)');

      if (error) throw error;

      // Calcular média geral
      const totalReviews = reviews?.length || 0;
      const averageRating = totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

      // Distribuição por estrelas
      const distribution = [1, 2, 3, 4, 5].map(star => ({
        stars: star,
        count: reviews?.filter(r => r.rating === star).length || 0,
      }));

      // Produtos mais bem avaliados
      const productRatings = reviews?.reduce((acc, review) => {
        const productId = review.product_id;
        if (!acc[productId]) {
          acc[productId] = {
            productId,
            name: review.products?.name || 'Produto',
            image: review.products?.image,
            ratings: [],
          };
        }
        acc[productId].ratings.push(review.rating);
        return acc;
      }, {} as Record<string, { productId: string; name: string; image: string | null; ratings: number[] }>);

      const topProducts = Object.values(productRatings || {})
        .map(p => ({
          ...p,
          average: p.ratings.reduce((sum, r) => sum + r, 0) / p.ratings.length,
          count: p.ratings.length,
        }))
        .sort((a, b) => b.average - a.average)
        .slice(0, 5);

      return {
        totalReviews,
        averageRating,
        distribution,
        topProducts,
      };
    },
  });

  const statCards = [
    {
      title: "Total de Produtos",
      value: stats?.totalProducts || 0,
      icon: Package,
      description: "Produtos cadastrados",
    },
    {
      title: "Pedidos Recebidos",
      value: stats?.totalOrders || 0,
      icon: ShoppingCart,
      description: "Total de pedidos",
    },
    {
      title: "Estoque Baixo",
      value: stats?.lowStockItems || 0,
      icon: AlertCircle,
      description: "Produtos abaixo do nível mínimo",
      alert: (stats?.lowStockItems || 0) > 0,
    },
    {
      title: "Receita Total",
      value: `R$ ${(stats?.totalRevenue || 0).toFixed(2)}`,
      icon: DollarSign,
      description: "Valor total em vendas",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu e-commerce</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.alert ? 'text-destructive' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.alert ? 'text-destructive' : ''}`}>
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <LowStockAlert />

      {/* Estatísticas de Avaliações */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Estatísticas de Avaliações</h2>
        
        <div className="grid gap-4 md:grid-cols-2">
          {/* Média Geral */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                Avaliação Média
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold">
                  {reviewStats?.averageRating.toFixed(1) || '0.0'}
                </span>
                <span className="text-muted-foreground mb-1">/ 5.0</span>
              </div>
              <div className="flex items-center gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-5 w-5 ${
                      star <= Math.round(reviewStats?.averageRating || 0)
                        ? 'fill-primary text-primary'
                        : 'text-muted-foreground'
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Baseado em {reviewStats?.totalReviews || 0} avaliações
              </p>
            </CardContent>
          </Card>

          {/* Distribuição por Estrelas */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Avaliações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[...(reviewStats?.distribution || [])].reverse().map((dist) => (
                <div key={dist.stars} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-16">
                    <span className="text-sm font-medium">{dist.stars}</span>
                    <Star className="h-3 w-3 fill-primary text-primary" />
                  </div>
                  <Progress 
                    value={reviewStats && reviewStats.totalReviews > 0 ? (dist.count / reviewStats.totalReviews) * 100 : 0} 
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground w-12 text-right">
                    {dist.count}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Produtos Mais Bem Avaliados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Top 5 Produtos Mais Bem Avaliados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!reviewStats?.topProducts || reviewStats.topProducts.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Nenhuma avaliação disponível
              </p>
            ) : (
              <div className="space-y-4">
                {reviewStats.topProducts.map((product, index) => (
                  <div key={product.productId} className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-muted-foreground w-8">
                      #{index + 1}
                    </span>
                    {product.image && (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-12 w-12 rounded object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{product.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3 w-3 ${
                                star <= Math.round(product.average)
                                  ? 'fill-primary text-primary'
                                  : 'text-muted-foreground'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium">
                          {product.average.toFixed(1)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({product.count} {product.count === 1 ? 'avaliação' : 'avaliações'})
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

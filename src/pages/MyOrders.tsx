import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Package, Calendar, MapPin, CreditCard, ShoppingBag, RefreshCw, AlertCircle, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderStatusTimeline } from "@/components/OrderStatusTimeline";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PostDeliveryReviewDialog } from "@/components/PostDeliveryReviewDialog";
import { AsaasPaymentDialog } from "@/components/AsaasPaymentDialog";

export default function MyOrders() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const { addToCart } = useCart();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      setUserId(session.user.id);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUserId(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['my-orders', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            *,
            products(name, image)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Check for expired PIX orders and update status
      const now = new Date();
      for (const order of data || []) {
        if (
          order.payment_method === 'pix' &&
          order.status === 'pending_payment' &&
          order.expires_at &&
          new Date(order.expires_at) < now
        ) {
          await supabase
            .from('orders')
            .update({ status: 'expired' })
            .eq('id', order.id);
          order.status = 'expired';
        }
      }
      
      return data;
    },
    enabled: !!userId,
    refetchInterval: 30000, // Refetch every 30 seconds to check for expiration
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      pending: { variant: "secondary", label: "Pendente" },
      pending_payment: { variant: "secondary", label: "Aguardando Pagamento" },
      confirmed: { variant: "default", label: "Confirmado" },
      delivered: { variant: "outline", label: "Entregue" },
      cancelled: { variant: "destructive", label: "Cancelado" },
      expired: { variant: "destructive", label: "Expirado" },
    };
    
    const config = statusConfig[status] || { variant: "default", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      pix: "PIX",
      dinheiro: "Dinheiro",
    };
    return methods[method] || method;
  };

  const handleReorder = async (order: any) => {
    let successCount = 0;
    let errorCount = 0;

    for (const item of order.order_items || []) {
      if (!item.product_id) continue;

      try {
        // Buscar dados atualizados do produto
        const { data: product, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', item.product_id)
          .single();

        if (error || !product) {
          errorCount++;
          continue;
        }

        // Cast correto dos tipos para Product
        const productForCart = {
          id: product.id,
          name: product.name,
          category: product.category,
          subcategory: product.subcategory || undefined,
          price: Number(product.price),
          image: product.image || '',
          description: product.description || '',
          stock: product.stock,
          min_stock: product.min_stock || 10,
          discount_value: product.discount_value ? Number(product.discount_value) : undefined,
          discount_type: (product.discount_type === 'fixed' || product.discount_type === 'percent') 
            ? product.discount_type as 'fixed' | 'percent'
            : undefined,
          display_order: product.display_order || 0,
        };

        // Adicionar ao carrinho
        await addToCart(productForCart, item.flavor);
        successCount++;
      } catch (error) {
        console.error('Erro ao adicionar item:', error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} ${successCount === 1 ? 'item adicionado' : 'itens adicionados'} ao carrinho!`);
      navigate('/cart');
    }

    if (errorCount > 0) {
      toast.warning(`${errorCount} ${errorCount === 1 ? 'item não pôde' : 'itens não puderam'} ser adicionado${errorCount === 1 ? '' : 's'} (produto indisponível ou esgotado)`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8">
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <Package className="h-16 w-16 text-muted-foreground" />
            <h2 className="text-2xl font-semibold">Nenhum pedido encontrado</h2>
            <p className="text-muted-foreground text-center">
              Você ainda não realizou nenhum pedido.
            </p>
            <Button onClick={() => navigate('/')}>
              Voltar para o cardápio
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ShoppingBag className="h-8 w-8" />
              Meus Pedidos
            </h1>
            <p className="text-muted-foreground mt-2">
              Histórico completo dos seus pedidos
            </p>
          </div>

          <div className="grid gap-6">
            {orders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="bg-muted/50">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(order.created_at!).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </CardTitle>
                      <CardDescription className="font-mono text-xs">
                        Pedido #{order.id.slice(0, 8)}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(order.status)}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-6">
                  <div className="space-y-6">
                    {/* Items */}
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Itens do Pedido
                      </h3>
                      <div className="space-y-3">
                        {order.order_items?.map((item: any) => (
                          <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                            {item.products?.image && (
                              <img
                                src={item.products.image}
                                alt={item.products?.name}
                                className="h-16 w-16 rounded-md object-cover"
                              />
                            )}
                            <div className="flex-1">
                              <p className="font-medium">{item.products?.name}</p>
                              {item.flavor && (
                                <p className="text-sm text-muted-foreground">
                                  Sabor: {item.flavor}
                                </p>
                              )}
                              <p className="text-sm text-muted-foreground">
                                Quantidade: {item.quantity}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">
                                R$ {(Number(item.price) * item.quantity).toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                R$ {Number(item.price).toFixed(2)} cada
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Order Status Timeline */}
                    <div>
                      <OrderStatusTimeline 
                        statusHistory={[
                          { status: 'pending', changed_at: order.created_at || new Date().toISOString() },
                          ...(order.status !== 'pending' ? [{ status: order.status, changed_at: order.created_at || new Date().toISOString() }] : [])
                        ]}
                        currentStatus={order.status}
                      />
                    </div>

                    <Separator />

                    {/* Address and Payment */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Endereço de Entrega
                        </h3>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>{order.address_street}, {order.address_number}</p>
                          <p>{order.address_neighborhood}</p>
                          <p>{order.address_city}</p>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Pagamento
                        </h3>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>{getPaymentMethodLabel(order.payment_method)}</p>
                          {order.change_amount && (
                            <p>Troco para: R$ {Number(order.change_amount).toFixed(2)}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Motivo de Cancelamento */}
                    {order.status === 'cancelled' && order.cancellation_reason && (
                      <>
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Motivo do cancelamento:</strong> {order.cancellation_reason}
                          </AlertDescription>
                        </Alert>
                        <Separator />
                      </>
                    )}

                    {/* Total e Ações */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold">Total do Pedido:</span>
                        <span className="text-2xl font-bold text-primary">
                          R$ {Number(order.total_amount).toFixed(2)}
                        </span>
                      </div>
                      
                      {/* Ações para pedidos entregues ou cancelados */}
                      <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        {/* Botão Avaliar - disponível apenas para pedidos entregues */}
                        {order.status === 'delivered' && order.order_items && (
                          <PostDeliveryReviewDialog 
                            orderId={order.id}
                            orderItems={order.order_items}
                          />
                        )}
                        
                        {/* Botão Reordenar - disponível para pedidos entregues ou cancelados */}
                        {(order.status === 'delivered' || order.status === 'cancelled') && (
                          <Button
                            variant="outline"
                            onClick={() => handleReorder(order)}
                            className="w-full md:w-auto"
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Pedir Novamente
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

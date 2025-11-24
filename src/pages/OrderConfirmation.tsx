import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, MessageCircle, Package, MapPin, CreditCard, Home } from 'lucide-react';
import Header from '@/components/Header';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  flavor?: string;
}

interface OrderData {
  orderId: string;
  items: OrderItem[];
  totalAmount: number;
  shippingCost: number;
  address: {
    rua: string;
    numero: string;
    bairro: string;
    cidade: string;
    cep?: string;
  };
  paymentMethod: string;
  changeAmount?: number;
  whatsappMessage: string;
}

const OrderConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [orderData, setOrderData] = useState<OrderData | null>(null);

  useEffect(() => {
    const data = location.state as OrderData;
    if (!data || !data.orderId) {
      navigate('/');
      return;
    }
    setOrderData(data);
  }, [location.state, navigate]);

  if (!orderData) {
    return null;
  }

  const handleOpenWhatsApp = () => {
    const encodedMessage = encodeURIComponent(orderData.whatsappMessage);
    const whatsappUrl = `https://wa.me/5583996694806?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: { [key: string]: string } = {
      credit: 'Cartão de Crédito',
      debit: 'Cartão de Débito',
      pix: 'PIX',
      cash: 'Dinheiro'
    };
    return methods[method] || method;
  };

  const subtotal = orderData.totalAmount - orderData.shippingCost;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="mb-6 border-2 border-green-500/20 bg-green-500/5">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Pedido Confirmado!
                </h1>
                <p className="text-muted-foreground">
                  Pedido #{orderData.orderId.slice(-8).toUpperCase()}
                </p>
              </div>
              <Button
                onClick={handleOpenWhatsApp}
                size="lg"
                className="gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                Abrir WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Itens do Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {orderData.items.map((item, index) => (
                <div key={index} className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    {item.flavor && (
                      <p className="text-sm text-muted-foreground">
                        Sabor: {item.flavor}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Quantidade: {item.quantity}
                    </p>
                  </div>
                  <p className="font-medium">
                    R$ {(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Frete:</span>
                  <span>R$ {orderData.shippingCost.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>R$ {orderData.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Endereço de Entrega
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  {orderData.address.rua}, {orderData.address.numero}
                  <br />
                  {orderData.address.bairro}
                  <br />
                  {orderData.address.cidade}
                  {orderData.address.cep && (
                    <>
                      <br />
                      CEP: {orderData.address.cep}
                    </>
                  )}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium">
                  {getPaymentMethodLabel(orderData.paymentMethod)}
                </p>
                {orderData.changeAmount && Number(orderData.changeAmount) > 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Troco para: R$ {Number(orderData.changeAmount).toFixed(2)}
                    <br />
                    Troco a ser pago: R$ {(Number(orderData.changeAmount) - orderData.totalAmount).toFixed(2)}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="outline"
            onClick={() => navigate('/my-orders')}
            className="gap-2"
          >
            <Package className="w-4 h-4" />
            Ver Meus Pedidos
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <Home className="w-4 h-4" />
            Voltar ao Início
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;

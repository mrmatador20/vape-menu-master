import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, MessageCircle, Package, MapPin, CreditCard, Home } from 'lucide-react';
import Header from '@/components/Header';
import { z } from 'zod';
import { toast } from 'sonner';
import { AsaasPaymentDialog } from '@/components/AsaasPaymentDialog';

const orderItemSchema = z.object({
  name: z.string().min(1, 'Nome do produto é obrigatório'),
  quantity: z.number().int().positive('Quantidade deve ser maior que zero'),
  price: z.number().nonnegative('Preço deve ser não negativo'),
  flavor: z.string().optional(),
});

const orderDataSchema = z.object({
  orderId: z.string().uuid('ID do pedido inválido'),
  items: z.array(orderItemSchema).min(1, 'Pedido deve ter pelo menos um item'),
  totalAmount: z.number().positive('Valor total deve ser maior que zero'),
  shippingCost: z.number().nonnegative('Custo de frete deve ser não negativo'),
  address: z.object({
    rua: z.string().min(1, 'Rua é obrigatória'),
    numero: z.string().min(1, 'Número é obrigatório'),
    bairro: z.string().min(1, 'Bairro é obrigatório'),
    cidade: z.string().min(1, 'Cidade é obrigatória'),
    cep: z.string().optional(),
  }),
  paymentMethod: z.enum(['credit', 'debit', 'pix', 'dinheiro'], {
    errorMap: () => ({ message: 'Método de pagamento inválido' }),
  }),
  changeAmount: z.number().nonnegative('Valor de troco deve ser não negativo').optional(),
  cpf: z.string().optional(),
  whatsappMessage: z.string().min(1, 'Mensagem do WhatsApp é obrigatória'),
});

type OrderData = z.infer<typeof orderDataSchema>;

const OrderConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [showPixDialog, setShowPixDialog] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  useEffect(() => {
    const data = location.state;
    
    // Validate data exists
    if (!data) {
      console.error('[OrderConfirmation] No data provided in navigation state');
      toast.error('Dados do pedido não encontrados');
      navigate('/');
      return;
    }

    // Validate data format
    const validationResult = orderDataSchema.safeParse(data);
    
    if (!validationResult.success) {
      console.error('[OrderConfirmation] Invalid order data format:', validationResult.error.errors);
      toast.error('Formato de dados do pedido inválido. Por favor, tente novamente.');
      navigate('/');
      return;
    }

    setOrderData(validationResult.data);
    
    // Show Asaas dialog automatically for all online payments
    if (['pix', 'credit', 'debit'].includes(validationResult.data.paymentMethod)) {
      setShowPixDialog(true);
    } else {
      // For dinheiro, consider payment confirmed immediately
      setPaymentConfirmed(true);
    }
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
      dinheiro: 'Dinheiro'
    };
    return methods[method] || method;
  };

  // Calcular subtotal como soma dos itens (price já vem com desconto aplicado)
  const subtotal = orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

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
              {['pix', 'credit', 'debit'].includes(orderData.paymentMethod) && !paymentConfirmed ? (
                <Button
                  onClick={() => setShowPixDialog(true)}
                  size="lg"
                  className="gap-2"
                >
                  <CreditCard className="w-5 h-5" />
                  {orderData.paymentMethod === 'pix' ? 'Ver QR Code PIX' : 'Pagar com Cartão'}
                </Button>
              ) : (
                <Button
                  onClick={handleOpenWhatsApp}
                  size="lg"
                  className="gap-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  Abrir WhatsApp
                </Button>
              )}
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

      {/* MercadoPago PIX Dialog */}
      {orderData && orderData.paymentMethod === 'pix' && (
        <MercadoPagoPixDialog
          open={showPixDialog}
          onOpenChange={setShowPixDialog}
          orderId={orderData.orderId}
          amount={orderData.totalAmount}
          description={`Pedido #${orderData.orderId.slice(-8).toUpperCase()}`}
          payerCpf={orderData.cpf}
          onPaymentConfirmed={() => {
            setPaymentConfirmed(true);
            setShowPixDialog(false);
            toast.success('Pagamento confirmado! Você pode abrir o WhatsApp agora.');
          }}
        />
      )}
    </div>
  );
};

export default OrderConfirmation;

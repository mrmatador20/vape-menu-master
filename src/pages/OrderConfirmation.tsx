import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, MessageCircle, Package, MapPin, CreditCard, Home, QrCode, Copy } from 'lucide-react';
import Header from '@/components/Header';
import { z } from 'zod';
import { toast } from 'sonner';

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
  whatsappMessage: z.string().min(1, 'Mensagem do WhatsApp é obrigatória'),
  pixData: z.object({
    pixCode: z.string(),
    pixQrCodeUrl: z.string(),
    expiresAt: z.string(),
  }).optional(),
});

type OrderData = z.infer<typeof orderDataSchema>;

const OrderConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [orderData, setOrderData] = useState<OrderData | null>(null);

  useEffect(() => {
    const data = location.state;
    
    // Validate data exists
    if (!data) {
      console.error('[OrderConfirmation] No data provided in navigation state');
      toast.error('Dados do pedido não encontrados');
      navigate('/');
      return;
    }

    console.log('[OrderConfirmation] Received data:', JSON.stringify(data, null, 2));
    console.log('[OrderConfirmation] Payment method:', data.paymentMethod);
    console.log('[OrderConfirmation] Has pixData:', !!data.pixData);
    console.log('[OrderConfirmation] pixData details:', data.pixData);

    // Validate data format
    const validationResult = orderDataSchema.safeParse(data);
    
    if (!validationResult.success) {
      console.error('[OrderConfirmation] Invalid order data format:', validationResult.error.errors);
      console.error('[OrderConfirmation] Received data that failed validation:', data);
      toast.error('Formato de dados do pedido inválido. Por favor, tente novamente.');
      navigate('/');
      return;
    }

    console.log('[OrderConfirmation] Data validated successfully');
    console.log('[OrderConfirmation] Validated pixData:', validationResult.data.pixData);
    setOrderData(validationResult.data);
  }, [location.state, navigate]);

  if (!orderData) {
    return null;
  }

  const handleOpenWhatsApp = () => {
    const encodedMessage = encodeURIComponent(orderData.whatsappMessage);
    const whatsappUrl = `https://wa.me/5583996694806?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCopyPixCode = () => {
    if (orderData.pixData?.pixCode) {
      navigator.clipboard.writeText(orderData.pixData.pixCode);
      toast.success('Código PIX copiado!');
    }
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
              
              {/* QR Code PIX */}
              {orderData.paymentMethod === 'pix' && orderData.pixData && (
                <Card className="w-full max-w-md border-2 border-primary/20 bg-primary/5">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="flex items-center gap-2 text-primary">
                        <QrCode className="w-6 h-6" />
                        <h2 className="text-xl font-bold">Pagamento PIX</h2>
                      </div>
                      
                      {/* QR Code Image */}
                      <div className="bg-white p-4 rounded-lg">
                        <img 
                          src={orderData.pixData.pixQrCodeUrl} 
                          alt="QR Code PIX"
                          className="w-64 h-64 object-contain"
                        />
                      </div>
                      
                      {/* PIX Code */}
                      <div className="w-full space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Ou copie o código PIX:
                        </p>
                        <div className="flex gap-2">
                          <Input
                            value={orderData.pixData.pixCode}
                            readOnly
                            className="text-xs font-mono"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={handleCopyPixCode}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Expira em: {new Date(orderData.pixData.expiresAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
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

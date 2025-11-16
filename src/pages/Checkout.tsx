import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const checkoutSchema = z.object({
  rua: z.string().trim().min(1, 'Rua é obrigatória').max(100, 'Rua deve ter no máximo 100 caracteres'),
  numero: z.string().trim().min(1, 'Número é obrigatório').max(20, 'Número deve ter no máximo 20 caracteres'),
  bairro: z.string().trim().min(1, 'Bairro é obrigatório').max(100, 'Bairro deve ter no máximo 100 caracteres'),
  cidade: z.string().trim().min(1, 'Cidade é obrigatória').max(100, 'Cidade deve ter no máximo 100 caracteres'),
  paymentMethod: z.enum(['pix', 'dinheiro']),
  changeAmount: z.string().optional(),
  discountCode: z.string().optional(), // Campo para o código de desconto
});

const Checkout = () => {
  const { items, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0); // Armazena o valor do desconto

  const [formData, setFormData] = useState({
    rua: '',
    numero: '',
    bairro: '',
    cidade: '',
    paymentMethod: 'pix',
    changeAmount: '',
    discountCode: '', // Campo para código de desconto
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast.error('Você precisa estar logado para fazer um pedido');
        navigate('/auth');
      } else {
        setUserId(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUserId(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePaymentChange = (value: string) => {
    setFormData(prev => ({ ...prev, paymentMethod: value }));
  };

  const applyDiscount = async (e: React.MouseEvent) => {
    e.preventDefault(); // Evita que o botão submeta o formulário e redirecione para o WhatsApp.

    if (!formData.discountCode) {
      toast.error('Insira um código de desconto');
      return;
    }

    const { data, error } = await supabase
      .from('discounts')
      .select('value, type, valid_until')
      .eq('code', formData.discountCode)
      .eq('is_active', true)
      .single();  // Garantir que o desconto é único

    if (error || !data) {
      toast.error('Código de desconto inválido ou expirado');
      return;
    }

    // Verifica se o desconto é válido
    if (data.valid_until && new Date(data.valid_until) < new Date()) {
      toast.error('Código de desconto expirado');
      return;
    }

    // Aplicar o desconto dependendo do tipo
    const discount = data.type === 'percent'
      ? totalPrice * (data.value / 100)
      : data.value;

    setDiscountAmount(discount);  // Salva o desconto no estado
    toast.success('Desconto aplicado com sucesso!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      toast.error('Você precisa estar logado para fazer um pedido');
      navigate('/auth');
      return;
    }

    if (items.length === 0) {
      toast.error('Seu carrinho está vazio');
      return;
    }

    setIsSubmitting(true);

    try {
      const validatedData = checkoutSchema.parse(formData);

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Sessão expirada. Faça login novamente.');
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-order', {
        body: {
          items: items.map(item => ({
            id: item.id,
            quantity: item.quantity
          })),
          address: {
            street: validatedData.rua,
            number: validatedData.numero,
            neighborhood: validatedData.bairro,
            city: validatedData.cidade,
          },
          paymentMethod: validatedData.paymentMethod,
          changeAmount: validatedData.changeAmount,
          totalPrice: totalPrice - discountAmount, // Aplica o desconto ao total
        }
      });

      if (error) {
        toast.error('Erro ao processar pedido. Tente novamente.');
        return;
      }

      if (!data?.success) {
        toast.error('Erro ao processar pedido. Tente novamente.');
        return;
      }

      const order = data.order;

      const itemsList = order.items
        .map((item: any) => `${item.quantity}x ${item.name} - R$ ${item.price.toFixed(2)}`)
        .join('\n');
      
      const message = `*Novo Pedido #${order.id}*\n\n*Itens:*\n${itemsList}\n\n*Total: R$ ${order.total.toFixed(2)}*\n\n*Endereço de Entrega:*\n${validatedData.rua}, ${validatedData.numero}\n${validatedData.bairro} - ${validatedData.cidade}\n\n*Forma de Pagamento:* ${validatedData.paymentMethod === 'pix' ? 'PIX' : 'Dinheiro'}${validatedData.paymentMethod === 'dinheiro' && validatedData.changeAmount ? `\nTroco para: R$ ${validatedData.changeAmount}` : ''}`;

      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/5511999999999?text=${encodedMessage}`;

      clearCart();
      toast.success('Pedido realizado com sucesso!');
      window.open(whatsappUrl, '_blank');
      navigate('/');
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast.error(firstError.message);
      } else {
        toast.error('Erro ao processar pedido. Tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para o cardápio
          </Button>
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Seu carrinho está vazio</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/cart')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para o carrinho
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-6">Informações de Entrega</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="rua">Rua</Label>
                <Input
                  id="rua"
                  name="rua"
                  value={formData.rua}
                  onChange={handleInputChange}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  name="numero"
                  value={formData.numero}
                  onChange={handleInputChange}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  name="bairro"
                  value={formData.bairro}
                  onChange={handleInputChange}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  name="cidade"
                  value={formData.cidade}
                  onChange={handleInputChange}
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Campo de código de desconto */}
              <div>
                <Label htmlFor="discountCode">Código de Desconto</Label>
                <Input
                  id="discountCode"
                  name="discountCode"
                  value={formData.discountCode}
                  onChange={handleInputChange}
                  placeholder="Digite o código"
                  disabled={isSubmitting}
                />
                <Button 
                  onClick={applyDiscount}
                  className="mt-2"
                  disabled={isSubmitting}
                >
                  Aplicar Desconto
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <RadioGroup
                  value={formData.paymentMethod}
                  onValueChange={handlePaymentChange}
                  disabled={isSubmitting}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pix" id="pix" />
                    <Label htmlFor="pix" className="cursor-pointer">PIX</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dinheiro" id="dinheiro" />
                    <Label htmlFor="dinheiro" className="cursor-pointer">Dinheiro</Label>
                  </div>
                </RadioGroup>
              </div>

              {formData.paymentMethod === 'dinheiro' && (
                <div>
                  <Label htmlFor="changeAmount">Troco para quanto?</Label>
                  <Input
                    id="changeAmount"
                    name="changeAmount"
                    type="number"
                    step="0.01"
                    value={formData.changeAmount}
                    onChange={handleInputChange}
                    placeholder="R$ 0,00"
                    disabled={isSubmitting}
                  />
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  'Finalizar Pedido via WhatsApp'
                )}
              </Button>
            </form>
          </Card>

          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-6">Resumo do Pedido</h2>
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span className="line-through text-muted-foreground">
                    R$ {(item.price * item.quantity).toFixed(2)}
                  </span>
                  <span className="font-bold">
                    R$ {((item.price * item.quantity) - discountAmount).toFixed(2)}
                  </span>
                </div>
              ))}

              <div className="border-t pt-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>R$ {totalPrice.toFixed(2)}</span>
                </div>

                {/* Exibir desconto */}
                {discountAmount > 0 && (
                  <div className="flex justify-between font-bold text-lg text-red-500">
                    <span>Desconto</span>
                    <span>- R$ {discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between font-bold text-xl">
                  <span>Total com Desconto</span>
                  <span>R$ {(totalPrice - discountAmount).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Checkout;

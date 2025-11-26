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
import { useShippingRateByCep } from '@/hooks/useShippingRates';
import { useSettingByKey } from '@/hooks/useSettings';
import { useCepLookup } from '@/hooks/useCepLookup';
import { useSavedAddresses } from '@/hooks/useSavedAddresses';
import { SavedAddressSelector } from '@/components/SavedAddressSelector';
import { Tables } from '@/integrations/supabase/types';
import { Checkbox } from '@/components/ui/checkbox';

const checkoutSchema = z.object({
  rua: z.string().trim().min(1, 'Rua é obrigatória').max(100, 'Rua deve ter no máximo 100 caracteres'),
  numero: z.string().trim().min(1, 'Número é obrigatório').max(20, 'Número deve ter no máximo 20 caracteres'),
  bairro: z.string().trim().min(1, 'Bairro é obrigatório').max(100, 'Bairro deve ter no máximo 100 caracteres'),
  cidade: z.string().trim().min(1, 'Cidade é obrigatória').max(100, 'Cidade deve ter no máximo 100 caracteres'),
  cep: z.string().trim().min(8, 'CEP é obrigatório').max(9, 'CEP inválido'),
  paymentMethod: z.enum(['pix', 'dinheiro']),
  changeAmount: z.string().optional(),
});

const Checkout = () => {
  const { items, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    type: string;
    value: number;
    discountAmount: number;
  } | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [selectedSavedAddress, setSelectedSavedAddress] = useState<Tables<'saved_addresses'> | null>(null);
  const [saveAddress, setSaveAddress] = useState(false);
  const [addressLabel, setAddressLabel] = useState('');

  const [formData, setFormData] = useState({
    rua: '',
    numero: '',
    bairro: '',
    cidade: '',
    cep: '',
    paymentMethod: 'pix',
    changeAmount: '',
    discountCode: '',
  });

  const { createAddress } = useSavedAddresses();

  // Buscar taxa de entrega baseada no CEP
  const cleanCep = formData.cep.replace(/\D/g, '');
  const { data: shippingRate } = useShippingRateByCep(cleanCep);
  const baseShippingCost = shippingRate?.price ? Number(shippingRate.price) : null;
  
  // Buscar configuração de frete grátis
  const { data: freeShippingSetting } = useSettingByKey('free_shipping_min_value');
  const freeShippingMinValue = freeShippingSetting ? parseFloat(freeShippingSetting.value) : 0;

  // Hook para consulta de CEP
  const { isLoading: isLoadingCep, lookupCep } = useCepLookup();

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

  const handleSavedAddressSelect = (address: Tables<'saved_addresses'> | null) => {
    setSelectedSavedAddress(address);
    if (address) {
      setFormData(prev => ({
        ...prev,
        rua: address.street,
        numero: address.number,
        bairro: address.neighborhood,
        cidade: address.city,
        cep: address.cep,
      }));
      setSaveAddress(false); // Não precisa salvar se já está usando um endereço salvo
    } else {
      // Limpar formulário ao selecionar "Novo Endereço"
      setFormData(prev => ({
        ...prev,
        rua: '',
        numero: '',
        bairro: '',
        cidade: '',
        cep: '',
      }));
    }
  };

  const handleCepChange = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    const formatted = cleanCep.length > 5 
      ? `${cleanCep.slice(0, 5)}-${cleanCep.slice(5, 8)}`
      : cleanCep;
    
    setFormData(prev => ({ ...prev, cep: formatted }));

    // Consultar ViaCEP quando CEP tiver 8 dígitos
    if (cleanCep.length === 8) {
      const cepData = await lookupCep(cleanCep);
      
      if (cepData) {
        setFormData(prev => ({
          ...prev,
          rua: cepData.logradouro || prev.rua,
          bairro: cepData.bairro || prev.bairro,
          cidade: cepData.localidade || prev.cidade,
        }));
      }
    }
  };

  const handlePaymentChange = (value: string) => {
    setFormData(prev => ({ ...prev, paymentMethod: value }));
  };

  const handleApplyDiscount = async () => {
    const code = formData.discountCode.trim().toUpperCase();
    
    if (!code) {
      toast.error('Digite um código de desconto');
      return;
    }

    if (!userId) {
      toast.error('Você precisa estar logado para aplicar cupons');
      return;
    }

    setIsValidatingCode(true);

    try {
      const { data, error } = await supabase.rpc('validate_discount_code', {
        code_input: code
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error('Cupom não existe ou não está ativo');
        setAppliedDiscount(null);
        return;
      }

      const discount = data[0];

      // Verificar limite total de usos
      if (discount.max_uses) {
        const { count, error: countError } = await supabase
          .from('discount_usage')
          .select('*', { count: 'exact', head: true })
          .eq('discount_id', discount.id);

        if (countError) {
          console.error('Erro ao verificar uso do cupom:', countError);
          toast.error('Erro ao validar cupom');
          setAppliedDiscount(null);
          return;
        }

        if (count !== null && count >= discount.max_uses) {
          toast.error(`Cupom atingiu o limite de ${discount.max_uses} usos`);
          setAppliedDiscount(null);
          return;
        }
      }

      // Verificar se o usuário já usou este cupom
      const { data: existingUsage, error: usageError } = await supabase
        .from('discount_usage')
        .select('id')
        .eq('discount_id', discount.id)
        .eq('user_id', userId)
        .maybeSingle();

      if (usageError) {
        console.error('Erro ao verificar uso do cupom pelo usuário:', usageError);
        toast.error('Erro ao validar cupom');
        setAppliedDiscount(null);
        return;
      }

      if (existingUsage) {
        toast.error('Você já utilizou este cupom anteriormente');
        setAppliedDiscount(null);
        return;
      }

      let discountAmount = 0;

      if (discount.type === 'percent') {
        discountAmount = (totalPrice * discount.value) / 100;
      } else {
        discountAmount = discount.value;
      }

      // Não pode descontar mais que o total
      discountAmount = Math.min(discountAmount, totalPrice);

      setAppliedDiscount({
        code: discount.code,
        type: discount.type,
        value: discount.value,
        discountAmount
      });

      toast.success(`Cupom aplicado! Desconto de R$ ${discountAmount.toFixed(2)}`);
    } catch (error) {
      console.error('Erro ao validar cupom:', error);
      toast.error('Erro ao validar cupom');
      setAppliedDiscount(null);
    } finally {
      setIsValidatingCode(false);
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setFormData(prev => ({ ...prev, discountCode: '' }));
    toast.info('Cupom removido');
  };

  const subtotal = appliedDiscount 
    ? Math.max(0, totalPrice - appliedDiscount.discountAmount)
    : totalPrice;
  
  // Verificar se qualifica para frete grátis
  const qualifiesForFreeShipping = freeShippingMinValue > 0 && subtotal >= freeShippingMinValue;
  const shippingCost = qualifiesForFreeShipping ? 0 : baseShippingCost;
  
  const finalTotal = shippingCost !== null ? subtotal + shippingCost : subtotal;


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
            quantity: item.quantity,
            flavor: item.flavor
          })),
          address: {
            street: validatedData.rua,
            number: validatedData.numero,
            neighborhood: validatedData.bairro,
            city: validatedData.cidade,
          },
          cep: cleanCep,
          shippingCost: shippingCost || 0,
          paymentMethod: validatedData.paymentMethod,
          changeAmount: validatedData.changeAmount,
          discountCode: appliedDiscount?.code || undefined,
        }
      });

      if (error) {
        // Tentar extrair mensagem de erro específica do edge function
        let errorMessage = 'Erro ao processar pedido. Tente novamente.';
        
        try {
          // O erro do edge function pode vir no context
          if (error.context?.body) {
            const errorBody = typeof error.context.body === 'string' 
              ? JSON.parse(error.context.body) 
              : error.context.body;
            if (errorBody?.error) {
              errorMessage = errorBody.error;
            }
          } else if (error.message) {
            // Tentar parsear a mensagem se for JSON
            try {
              const parsed = JSON.parse(error.message);
              if (parsed?.error) {
                errorMessage = parsed.error;
              }
            } catch {
              // Se não for JSON, usar a mensagem direta
              errorMessage = error.message;
            }
          }
        } catch (parseError) {
          console.error('Erro ao parsear mensagem de erro:', parseError);
        }
        
        toast.error(errorMessage);
        return;
      }

      if (!data?.success) {
        toast.error(data?.error || 'Erro ao processar pedido. Tente novamente.');
        return;
      }

      const order = data.order;

      try {
        const itemsList = order.items
          .map((item: any) => {
            const flavorText = item.flavor ? ` (${item.flavor})` : '';
            return `${item.quantity}x ${item.name}${flavorText} - R$ ${item.price.toFixed(2)}`;
          })
          .join('\n');
        
        // Montando a mensagem para o WhatsApp
        let message = `*Novo Pedido #${order.id}*\n\n*Itens:*\n${itemsList}\n\n*Subtotal: R$ ${subtotal.toFixed(2)}*\n*Taxa de Entrega (CEP ${validatedData.cep}): R$ ${(shippingCost || 0).toFixed(2)}*\n*Total: R$ ${order.total.toFixed(2)}*\n\n*Endereço de Entrega:*\n${validatedData.rua}, ${validatedData.numero}\n${validatedData.bairro} - ${validatedData.cidade}\nCEP: ${validatedData.cep}\n\n*Forma de Pagamento:* ${validatedData.paymentMethod === 'pix' ? 'PIX' : 'Dinheiro'}`;

        // Se o pagamento for em dinheiro e houver troco
        if (validatedData.paymentMethod === 'dinheiro' && validatedData.changeAmount) {
          const changeAmount = parseFloat(validatedData.changeAmount);
          const changeToGive = changeAmount - order.total;
          message += `\nTroco para: R$ ${changeAmount.toFixed(2)}\nTroco a ser pago: R$ ${changeToGive.toFixed(2)}`;
        }

        // Codificando a mensagem para ser passada na URL do WhatsApp
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/5583996694806?text=${encodedMessage}`;

        clearCart();
        toast.success('Pedido realizado com sucesso! Abrindo WhatsApp...');
        
        // Salvar endereço se solicitado e não for um endereço salvo
        if (saveAddress && !selectedSavedAddress && addressLabel.trim()) {
          createAddress({
            label: addressLabel.trim(),
            street: validatedData.rua,
            number: validatedData.numero,
            neighborhood: validatedData.bairro,
            city: validatedData.cidade,
            cep: validatedData.cep,
            state: undefined,
            is_default: false,
          });
        }
        
        // Navegar para página de confirmação com os dados do pedido
        navigate('/order-confirmation', {
          state: {
            orderId: order.id,
            items: items.map(item => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              flavor: item.flavor
            })),
            totalAmount: Number(order.total),
            shippingCost: Number(shippingCost || 0),
            address: {
              rua: formData.rua,
              numero: formData.numero,
              bairro: formData.bairro,
              cidade: formData.cidade,
              cep: formData.cep
            },
            paymentMethod: formData.paymentMethod,
            changeAmount: validatedData.changeAmount ? Number(validatedData.changeAmount) : undefined,
            whatsappMessage: message
          }
        });
      } catch (whatsappError) {
        toast.error('Erro ao abrir WhatsApp. Por favor, entre em contato diretamente.');
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
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
            
            {/* Seletor de Endereços Salvos */}
            <div className="mb-6">
              <SavedAddressSelector
                onSelect={handleSavedAddressSelect}
                selectedAddressId={selectedSavedAddress?.id}
              />
            </div>

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

              <div>
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  name="cep"
                  value={formData.cep}
                  onChange={(e) => handleCepChange(e.target.value)}
                  placeholder="00000-000"
                  maxLength={9}
                  required
                  disabled={isSubmitting || isLoadingCep}
                />
                {cleanCep.length === 8 && (
                  baseShippingCost !== null ? (
                    qualifiesForFreeShipping ? (
                      <p className="text-sm text-green-600 mt-1">
                        ✓ Frete GRÁTIS! Pedido acima de R$ {freeShippingMinValue.toFixed(2)}
                      </p>
                    ) : (
                      <p className="text-sm text-green-600 mt-1">
                        ✓ Taxa de entrega: R$ {shippingCost?.toFixed(2)}
                        {freeShippingMinValue > 0 && (
                          <span className="block text-muted-foreground">
                            Falta R$ {(freeShippingMinValue - subtotal).toFixed(2)} para frete grátis
                          </span>
                        )}
                      </p>
                    )
                  ) : (
                    <p className="text-sm text-amber-600 mt-1">
                      ⚠ CEP não cadastrado. Entre em contato via WhatsApp para negociar o valor da entrega.
                    </p>
                  )
                )}
              </div>

              {/* Opção para salvar endereço */}
              {!selectedSavedAddress && (
                <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="saveAddress"
                      checked={saveAddress}
                      onCheckedChange={(checked) => setSaveAddress(checked as boolean)}
                      disabled={isSubmitting}
                    />
                    <Label
                      htmlFor="saveAddress"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Salvar este endereço para próximos pedidos
                    </Label>
                  </div>
                  
                  {saveAddress && (
                    <div>
                      <Label htmlFor="addressLabel" className="text-sm">Nome do endereço (ex: Casa, Trabalho)</Label>
                      <Input
                        id="addressLabel"
                        value={addressLabel}
                        onChange={(e) => setAddressLabel(e.target.value)}
                        placeholder="Ex: Casa, Trabalho, Apartamento"
                        maxLength={50}
                        disabled={isSubmitting}
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>
              )}

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

              <div>
                <Label htmlFor="discountCode">Código de Desconto (opcional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="discountCode"
                    name="discountCode"
                    value={formData.discountCode}
                    onChange={(e) => {
                      handleInputChange(e);
                      setAppliedDiscount(null);
                    }}
                    placeholder="Ex: DESCONTO10"
                    disabled={isSubmitting || isValidatingCode}
                    className="uppercase"
                  />
                  {appliedDiscount ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRemoveDiscount}
                      disabled={isSubmitting}
                    >
                      Remover
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleApplyDiscount}
                      disabled={isSubmitting || isValidatingCode || !formData.discountCode}
                    >
                      {isValidatingCode ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </>
                      ) : (
                        'Aplicar'
                      )}
                    </Button>
                  )}
                </div>
                {appliedDiscount && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ Cupom "{appliedDiscount.code}" aplicado - 
                    {appliedDiscount.type === 'percent' 
                      ? ` ${appliedDiscount.value}% de desconto`
                      : ` R$ ${appliedDiscount.value.toFixed(2)} de desconto`}
                  </p>
                )}
              </div>

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
              {items.map((item) => {
                const discountValue = item.discount_value || 0;
                const discountType = item.discount_type || 'percent';
                const finalItemPrice = discountType === 'percent'
                  ? item.price * (1 - discountValue / 100)
                  : item.price - discountValue;
                
                return (
                  <div key={`${item.id}-${item.flavor}`} className="flex justify-between">
                    <span>
                      {item.quantity}x {item.name}
                      {item.flavor && <span className="text-muted-foreground"> ({item.flavor})</span>}
                    </span>
                    <span className="font-bold">
                      R$ {(finalItemPrice * item.quantity).toFixed(2)}
                    </span>
                  </div>
                );
              })}

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal dos Produtos</span>
                  <span>R$ {totalPrice.toFixed(2)}</span>
                </div>
                {appliedDiscount && (
                  <div className="flex justify-between text-green-600">
                    <span>Desconto ({appliedDiscount.code})</span>
                    <span>- R$ {appliedDiscount.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {shippingCost !== null ? (
                  <div className="flex justify-between">
                    <span>Taxa de Entrega</span>
                    {qualifiesForFreeShipping ? (
                      <span className="text-green-600 font-semibold">GRÁTIS</span>
                    ) : (
                      <span>R$ {shippingCost.toFixed(2)}</span>
                    )}
                  </div>
                ) : cleanCep.length === 8 && (
                  <div className="flex justify-between text-amber-600 text-sm">
                    <span>Taxa de Entrega</span>
                    <span>A negociar</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xl border-t pt-2">
                  <span>Total</span>
                  <span>R$ {finalTotal.toFixed(2)}</span>
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

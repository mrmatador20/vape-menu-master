import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { useShippingRateByCep } from '@/hooks/useShippingRates';
import { useGlobalFreeShipping } from '@/hooks/useGlobalFreeShipping';
import { useCepLookup } from '@/hooks/useCepLookup';
import { useSavedAddresses } from '@/hooks/useSavedAddresses';
import { SavedAddressSelector } from '@/components/SavedAddressSelector';
import { Tables } from '@/integrations/supabase/types';
import { Checkbox } from '@/components/ui/checkbox';

const checkoutSchema = z.object({
  customerName: z.string().trim().min(2, 'Nome completo é obrigatório').max(120, 'Nome muito longo'),
  customerPhone: z.string().trim().refine((v) => v.replace(/\D/g, '').length >= 10 && v.replace(/\D/g, '').length <= 11, 'Telefone inválido'),
  rua: z.string().trim().min(1, 'Rua é obrigatória').max(100),
  numero: z.string().trim().min(1, 'Número é obrigatório').max(20),
  complemento: z.string().trim().max(100).optional(),
  bairro: z.string().trim().min(1, 'Bairro é obrigatório').max(100),
  cidade: z.string().trim().min(1, 'Cidade é obrigatória').max(100),
  estado: z.string().trim().max(2).optional(),
  cep: z.string().trim().refine((v) => v.replace(/\D/g, '').length === 8, 'CEP inválido'),
  paymentMethod: z.enum(['pix', 'credit', 'debit', 'dinheiro']),
  changeAmount: z.string().optional(),
  cpf: z.string().optional(),
}).refine((data) => {
  if (data.paymentMethod === 'pix' || data.paymentMethod === 'credit' || data.paymentMethod === 'debit') {
    const cleanCpf = data.cpf?.replace(/\D/g, '') || '';
    return cleanCpf.length === 11;
  }
  return true;
}, {
  message: 'CPF é obrigatório para pagamento online (PIX/Cartão)',
  path: ['cpf'],
});

const Checkout = () => {
  const { items, totalPrice, clearCart, getFinalPrice } = useCart();
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
  const [cepValidation, setCepValidation] = useState<'valid' | 'invalid' | 'idle'>('idle');
  const [rateLimitBlock, setRateLimitBlock] = useState<{ blocked: boolean; expiresAt: string | null }>({ blocked: false, expiresAt: null });
  const [remainingTime, setRemainingTime] = useState<string>('');

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    paymentMethod: 'pix',
    changeAmount: '',
    discountCode: '',
    cpf: '',
    referralCode: '',
  });

  const { createAddress } = useSavedAddresses();

  // Buscar taxa de entrega baseada no CEP
  const cleanCep = formData.cep.replace(/\D/g, '');
  const { data: shippingRate } = useShippingRateByCep(cleanCep);
  const { data: globalFreeShipping } = useGlobalFreeShipping();
  
  const baseShippingCost = shippingRate?.price ? Number(shippingRate.price) : null;
  
  // Verificar frete grátis: primeiro CEP específico, depois global
  const freeShippingMinValue = shippingRate?.free_shipping_min_value 
    ? Number(shippingRate.free_shipping_min_value)
    : globalFreeShipping?.free_shipping_min_value 
      ? Number(globalFreeShipping.free_shipping_min_value)
      : 0;

  // Hook para consulta de CEP
  const { isLoading: isLoadingCep, lookupCep } = useCepLookup();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        toast.error('Você precisa estar logado para fazer um pedido');
        navigate('/auth');
      } else {
        setUserId(session.user.id);
        // Pré-preencher nome e telefone com dados do perfil
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', session.user.id)
          .maybeSingle();
        if (profile) {
          setFormData(prev => ({
            ...prev,
            customerName: prev.customerName || profile.full_name || '',
            customerPhone: prev.customerPhone || profile.phone || '',
          }));
        }
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

  // Verificar rate limiting
  useEffect(() => {
    const checkRateLimit = async () => {
      if (!userId) return;

      const { data, error } = await supabase
        .from('rate_limit_tracking')
        .select('is_blocked, block_expires_at')
        .eq('identifier', userId)
        .eq('action_type', 'order_create')
        .maybeSingle();

      if (error) {
        console.error('Erro ao verificar rate limit:', error);
        return;
      }

      if (data?.is_blocked && data.block_expires_at) {
        const expiresAt = new Date(data.block_expires_at);
        const now = new Date();
        
        if (expiresAt > now) {
          setRateLimitBlock({ blocked: true, expiresAt: data.block_expires_at });
        } else {
          setRateLimitBlock({ blocked: false, expiresAt: null });
        }
      } else {
        setRateLimitBlock({ blocked: false, expiresAt: null });
      }
    };

    checkRateLimit();
    const interval = setInterval(checkRateLimit, 5000); // Verifica a cada 5 segundos

    return () => clearInterval(interval);
  }, [userId]);

  // Calcular tempo restante do bloqueio
  useEffect(() => {
    if (!rateLimitBlock.blocked || !rateLimitBlock.expiresAt) {
      setRemainingTime('');
      return;
    }

    const updateRemainingTime = () => {
      const expiresAt = new Date(rateLimitBlock.expiresAt!);
      const now = new Date();
      const diffMs = expiresAt.getTime() - now.getTime();

      if (diffMs <= 0) {
        setRemainingTime('');
        setRateLimitBlock({ blocked: false, expiresAt: null });
        return;
      }

      const minutes = Math.floor(diffMs / 60000);
      const seconds = Math.floor((diffMs % 60000) / 1000);
      setRemainingTime(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateRemainingTime();
    const interval = setInterval(updateRemainingTime, 1000);

    return () => clearInterval(interval);
  }, [rateLimitBlock]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSavedAddressSelect = (address: any | null) => {
    setSelectedSavedAddress(address);
    if (address) {
      setFormData(prev => ({
        ...prev,
        rua: address.street,
        numero: address.number,
        complemento: address.complement || '',
        bairro: address.neighborhood,
        cidade: address.city,
        estado: address.state || '',
        cep: address.cep,
      }));
      setSaveAddress(false);
    } else {
      setFormData(prev => ({
        ...prev,
        rua: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
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

    // Validação em tempo real do formato
    if (cleanCep.length === 0) {
      setCepValidation('idle');
    } else if (cleanCep.length === 8) {
      setCepValidation('valid');
      
      // Consultar ViaCEP quando CEP tiver 8 dígitos
      const cepData = await lookupCep(cleanCep);
      
      if (cepData) {
        setFormData(prev => ({
          ...prev,
          rua: cepData.logradouro || prev.rua,
          bairro: cepData.bairro || prev.bairro,
          cidade: cepData.localidade || prev.cidade,
        }));
      } else {
        setCepValidation('invalid');
      }
    } else {
      setCepValidation('invalid');
    }
  };

  const handlePaymentChange = (value: string) => {
    setFormData(prev => ({ ...prev, paymentMethod: value }));
  };

  const handleCpfChange = (cpf: string) => {
    const cleanCpf = cpf.replace(/\D/g, '');
    let formatted = cleanCpf;
    
    if (cleanCpf.length <= 11) {
      // Formato: 000.000.000-00
      if (cleanCpf.length > 9) {
        formatted = `${cleanCpf.slice(0, 3)}.${cleanCpf.slice(3, 6)}.${cleanCpf.slice(6, 9)}-${cleanCpf.slice(9, 11)}`;
      } else if (cleanCpf.length > 6) {
        formatted = `${cleanCpf.slice(0, 3)}.${cleanCpf.slice(3, 6)}.${cleanCpf.slice(6, 9)}`;
      } else if (cleanCpf.length > 3) {
        formatted = `${cleanCpf.slice(0, 3)}.${cleanCpf.slice(3, 6)}`;
      }
    }
    
    setFormData(prev => ({ ...prev, cpf: formatted }));
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

      // Verificar se é cupom de indicação do próprio usuário
      const { data: discountDetails, error: discountDetailsError } = await supabase
        .from('discounts')
        .select('user_id, is_referral_reward')
        .eq('code', code)
        .maybeSingle();

      if (discountDetailsError) {
        console.error('Erro ao verificar proprietário do cupom:', discountDetailsError);
        toast.error('Erro ao validar cupom');
        setAppliedDiscount(null);
        return;
      }

      // Se for cupom de indicação e pertencer ao usuário logado
      if (discountDetails?.is_referral_reward && discountDetails?.user_id === userId) {
        toast.error('Você não pode usar seu próprio cupom de indicação');
        setAppliedDiscount(null);
        return;
      }

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

      const response = await supabase.functions.invoke('create-order', {
        body: {
          items: items.map(item => ({
            id: item.id,
            quantity: item.quantity,
            flavor: item.flavor,
            price: getFinalPrice(item) // ✅ Enviar preço já com desconto aplicado
          })),
          address: {
            street: validatedData.rua,
            number: validatedData.numero,
            neighborhood: validatedData.bairro,
            city: validatedData.cidade,
          },
          cep: cleanCep.padStart(8, '0'), // Garantir 8 dígitos com zero à esquerda
          shippingCost: shippingCost || 0,
          paymentMethod: validatedData.paymentMethod,
          changeAmount: validatedData.changeAmount,
          discountCode: appliedDiscount?.code || undefined,
          referralCode: formData.referralCode.trim() || undefined,
        }
      });

      // ✅ CORREÇÃO: Tratamento completo de erros incluindo rate limiting
      if (response.error) {
        console.error('[Checkout] Edge function error:', response.error);
        
        let errorMessage = 'Erro ao processar pedido. Tente novamente.';
        let errorDetails = '';
        
        // Extrair mensagem específica do erro
        if (response.error.context?.body) {
          try {
            const errorBody = typeof response.error.context.body === 'string' 
              ? JSON.parse(response.error.context.body) 
              : response.error.context.body;
            
            if (errorBody?.error) {
              errorMessage = errorBody.error;
            }
            
            if (errorBody?.details) {
              errorDetails = Array.isArray(errorBody.details) 
                ? errorBody.details.join(', ')
                : String(errorBody.details);
            }
          } catch (e) {
            console.error('[Checkout] Error parsing response body:', e);
          }
        } else if (response.error.message) {
          errorMessage = response.error.message;
        }
        
        // Tratamento especial para rate limiting (status 429)
        const status = response.error.context?.status;
        if (status === 429) {
          console.log('[Checkout] Rate limit detected - status 429');
          // A mensagem do rate limiting já vem do backend, apenas garantir que seja exibida
          if (errorMessage.includes('bloqueada') || errorMessage.includes('tentativas')) {
            toast.error(errorMessage, { duration: 8000 }); // Duração maior para ler
            return;
          }
        }
        
        // Log detalhado para debug
        console.error('[Checkout] Error details:', {
          message: errorMessage,
          details: errorDetails,
          status: status,
          fullError: JSON.stringify(response.error, null, 2)
        });
        
        // Mostrar erro ao usuário
        if (errorDetails) {
          toast.error(`${errorMessage}: ${errorDetails}`, { duration: 6000 });
        } else {
          toast.error(errorMessage, { duration: 6000 });
        }
        
        return;
      }

      const data = response.data;

      // Verificar se a resposta tem erro mesmo sem error object
      if (data?.error && !data?.success) {
        toast.error(data.error);
        return;
      }

      if (!data?.success) {
        toast.error('Erro ao processar pedido. Tente novamente.');
        return;
      }

      const order = data.order;

      const itemsList = order.items
        .map((item: any) => {
          const flavorText = item.flavor ? ` (${item.flavor})` : '';
          return `${item.quantity}x ${item.name}${flavorText} - R$ ${item.price.toFixed(2)}`;
        })
        .join('\n');
      
      // Montando a mensagem para o WhatsApp
      const paymentLabels: Record<string, string> = { pix: 'PIX', credit: 'Cartão de Crédito', debit: 'Cartão de Débito', dinheiro: 'Dinheiro' };
      let message = `*Novo Pedido #${order.id}*\n\n*Itens:*\n${itemsList}\n\n*Subtotal: R$ ${subtotal.toFixed(2)}*\n*Taxa de Entrega (CEP ${validatedData.cep}): R$ ${(shippingCost || 0).toFixed(2)}*\n*Total: R$ ${order.total.toFixed(2)}*\n\n*Endereço de Entrega:*\n${validatedData.rua}, ${validatedData.numero}\n${validatedData.bairro} - ${validatedData.cidade}\nCEP: ${validatedData.cep}\n\n*Forma de Pagamento:* ${paymentLabels[validatedData.paymentMethod] || validatedData.paymentMethod}`;

      // Se o pagamento for em dinheiro e houver troco
      if (validatedData.paymentMethod === 'dinheiro' && validatedData.changeAmount) {
        const changeAmount = parseFloat(validatedData.changeAmount);
        const changeToGive = changeAmount - order.total;
        message += `\nTroco para: R$ ${changeAmount.toFixed(2)}\nTroco a ser pago: R$ ${changeToGive.toFixed(2)}`;
      }

      clearCart();
      
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
      
      toast.success('Pedido realizado com sucesso!');
      
      // Navegar direto para página de confirmação onde usuário clicará para abrir WhatsApp
      navigate('/order-confirmation', {
        state: {
          orderId: order.id,
          items: items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: getFinalPrice(item),
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
          cpf: validatedData.cpf ? validatedData.cpf.replace(/\D/g, '') : undefined,
          whatsappMessage: message
        }
      });
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
                <div className="relative">
                  <Input
                    id="cep"
                    name="cep"
                    value={formData.cep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                    required
                    disabled={isSubmitting || isLoadingCep}
                    className={`pr-10 ${
                      cepValidation === 'valid' ? 'border-green-500 focus-visible:ring-green-500' :
                      cepValidation === 'invalid' ? 'border-destructive focus-visible:ring-destructive' :
                      ''
                    }`}
                  />
                  {cepValidation !== 'idle' && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {cepValidation === 'valid' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                  )}
                </div>
                {cepValidation === 'invalid' && formData.cep.length > 0 && (
                  <p className="text-sm text-destructive mt-1">
                    CEP inválido ou não encontrado
                  </p>
                )}
                {cleanCep.length === 8 && cepValidation === 'valid' && (
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

              {/* Campo CPF - Obrigatório para pagamentos online */}
              {(() => {
                const onlinePay = ['pix', 'credit', 'debit'].includes(formData.paymentMethod);
                return (
                  <div>
                    <Label htmlFor="cpf">
                      CPF {onlinePay && <span className="text-destructive">*</span>}
                      {!onlinePay && <span className="text-muted-foreground text-xs">(opcional)</span>}
                    </Label>
                    <Input
                      id="cpf"
                      name="cpf"
                      value={formData.cpf}
                      onChange={(e) => handleCpfChange(e.target.value)}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      required={onlinePay}
                      disabled={isSubmitting}
                    />
                    {onlinePay && (
                      <p className="text-xs text-muted-foreground mt-1">
                        CPF necessário para processar o pagamento online via Asaas.
                      </p>
                    )}
                  </div>
                );
              })()}

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
                    <RadioGroupItem value="credit" id="credit" />
                    <Label htmlFor="credit" className="cursor-pointer">Cartão de Crédito</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="debit" id="debit" />
                    <Label htmlFor="debit" className="cursor-pointer">Cartão de Débito</Label>
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

              <div>
                <Label htmlFor="referralCode">Código de Indicação (opcional)</Label>
                <Input
                  id="referralCode"
                  name="referralCode"
                  value={formData.referralCode}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setFormData({ ...formData, referralCode: value });
                  }}
                  placeholder="Ex: NEB12345"
                  maxLength={8}
                  disabled={isSubmitting}
                  className="uppercase"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Se alguém te indicou, insira o código aqui para que essa pessoa ganhe pontos
                </p>
              </div>

              <Button
                type="submit" 
                className="w-full"
                disabled={isSubmitting || rateLimitBlock.blocked}
              >
                {rateLimitBlock.blocked ? (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Bloqueado por {remainingTime}
                  </>
                ) : isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  'Finalizar Pedido via WhatsApp'
                )}
              </Button>
              {rateLimitBlock.blocked && (
                <p className="text-sm text-center text-destructive mt-2">
                  Você atingiu o limite de tentativas. Aguarde {remainingTime} para tentar novamente.
                </p>
              )}
            </form>
          </Card>

          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-6">Resumo do Pedido</h2>
            <div className="space-y-4">
              {items.map((item) => {
                // Preço base com desconto calculado via getFinalPrice
                const finalPrice = getFinalPrice(item);
                return (
                  <div key={`${item.id}-${item.flavor}`} className="flex justify-between">
                    <span>
                      {item.quantity}x {item.name}
                      {item.flavor && <span className="text-muted-foreground"> ({item.flavor})</span>}
                    </span>
                    <span className="font-bold">
                      R$ {(finalPrice * item.quantity).toFixed(2)}
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

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header';

const Checkout = () => {
  const { items, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    rua: '',
    numero: '',
    bairro: '',
    cidade: '',
    paymentMethod: 'pix'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação dos campos obrigatórios
    if (!formData.rua || !formData.numero || !formData.bairro || !formData.cidade) {
      toast.error('Por favor, preencha todos os campos de endereço');
      return;
    }

    // Simular finalização do pedido
    toast.success('Pedido realizado com sucesso!', {
      description: `Pagamento: ${formData.paymentMethod === 'pix' ? 'PIX' : 'Dinheiro'}`
    });
    
    clearCart();
    navigate('/');
  };

  if (items.length === 0) {
    navigate('/');
    return null;
  }

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-hero py-8">
        <div className="container max-w-4xl">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/cart')}
            className="mb-6 text-primary hover:text-primary/90"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao carrinho
          </Button>

          <h1 className="text-3xl font-bold mb-6 text-foreground">Finalizar Pedido</h1>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Formulário de Endereço */}
            <Card className="p-6 bg-gradient-card border-border">
              <h2 className="text-xl font-semibold mb-4 text-foreground">Endereço de Entrega</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rua" className="text-foreground">Rua *</Label>
                  <Input
                    id="rua"
                    name="rua"
                    value={formData.rua}
                    onChange={handleInputChange}
                    required
                    className="bg-background border-border text-foreground"
                    placeholder="Nome da rua"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numero" className="text-foreground">Número *</Label>
                  <Input
                    id="numero"
                    name="numero"
                    value={formData.numero}
                    onChange={handleInputChange}
                    required
                    className="bg-background border-border text-foreground"
                    placeholder="Número da casa"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bairro" className="text-foreground">Bairro *</Label>
                  <Input
                    id="bairro"
                    name="bairro"
                    value={formData.bairro}
                    onChange={handleInputChange}
                    required
                    className="bg-background border-border text-foreground"
                    placeholder="Nome do bairro"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cidade" className="text-foreground">Cidade *</Label>
                  <Input
                    id="cidade"
                    name="cidade"
                    value={formData.cidade}
                    onChange={handleInputChange}
                    required
                    className="bg-background border-border text-foreground"
                    placeholder="Nome da cidade"
                  />
                </div>

                <div className="space-y-3 pt-4">
                  <Label className="text-foreground">Forma de Pagamento *</Label>
                  <RadioGroup
                    value={formData.paymentMethod}
                    onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pix" id="pix" />
                      <Label htmlFor="pix" className="cursor-pointer text-foreground">PIX</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="dinheiro" id="dinheiro" />
                      <Label htmlFor="dinheiro" className="cursor-pointer text-foreground">
                        Dinheiro (Troco)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow"
                  size="lg"
                >
                  Confirmar Pedido
                </Button>
              </form>
            </Card>

            {/* Resumo do Pedido */}
            <div className="space-y-4">
              <Card className="p-6 bg-gradient-card border-border">
                <h2 className="text-xl font-semibold mb-4 text-foreground">Resumo do Pedido</h2>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {item.quantity}x {item.name}
                      </span>
                      <span className="font-medium text-foreground">
                        R$ {(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-3 mt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span className="text-foreground">Total:</span>
                      <span className="bg-gradient-primary bg-clip-text text-transparent">
                        R$ {totalPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Checkout;

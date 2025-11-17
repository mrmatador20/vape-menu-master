import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Minus, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';

const Cart = () => {
  const { items, removeFromCart, updateQuantity, totalPrice } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <>
        <Header />
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-hero">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Seu carrinho está vazio</h2>
            <p className="text-muted-foreground">Adicione alguns produtos para continuar</p>
            <Button onClick={() => navigate('/')} className="bg-primary hover:bg-primary/90">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar às compras
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-hero py-8">
        <div className="container max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="text-primary hover:text-primary/90"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Continuar comprando
            </Button>
          </div>

          <h1 className="text-3xl font-bold mb-6 text-foreground">Meu Carrinho</h1>

          <div className="space-y-4">
            {items.map((item) => (
              <Card key={`${item.id}-${item.flavor}`} className="p-4 bg-gradient-card border-border">
                <div className="flex gap-4">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-24 h-24 object-cover rounded-lg bg-muted"
                  />
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold text-foreground">{item.name}</h3>
                    {item.flavor && (
                      <p className="text-sm text-primary font-medium">Sabor: {item.flavor}</p>
                    )}
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(`${item.id}-${item.flavor || 'no-flavor'}`, item.quantity - 1)}
                          className="h-8 w-8 p-0"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-medium text-foreground">
                          {item.quantity}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(`${item.id}-${item.flavor || 'no-flavor'}`, item.quantity + 1)}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-bold text-primary">
                          R$ {(item.price * item.quantity).toFixed(2)}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFromCart(`${item.id}-${item.flavor || 'no-flavor'}`)}
                          className="text-destructive hover:text-destructive/90"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="mt-6 p-6 bg-gradient-card border-border">
            <div className="space-y-4">
              <div className="flex justify-between text-lg">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-semibold text-foreground">R$ {totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-2xl font-bold">
                <span className="text-foreground">Total:</span>
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  R$ {totalPrice.toFixed(2)}
                </span>
              </div>
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow"
                size="lg"
                onClick={() => navigate('/checkout')}
              >
                Finalizar Pedido
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
};

export default Cart;

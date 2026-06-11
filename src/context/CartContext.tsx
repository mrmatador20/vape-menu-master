import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCartSync } from '@/hooks/useCartSync';
import { fetchStoreDiscount, resolveEffectiveDiscount } from '@/hooks/useStoreDiscount';


export interface Product {
  id: string;
  name: string;
  slug?: string;
  category: string;
  subcategory?: string;
  price: number;
  image: string;
  images?: string[];
  description: string;
  stock: number;
  min_stock: number;
  discount_value?: number;
  discount_type?: 'percent' | 'fixed';
  display_order?: number;
  visible_in_all?: boolean;
  sku?: string | null;
  image_position?: string;
}

export interface CartItem extends Product {
  quantity: number;
  flavor?: string;
  cartItemId?: string; // Identificador único para itens com sabores diferentes
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, flavor?: string, color?: string) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  getFinalPrice: (item: CartItem) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'vape-menu-cart';

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  // Carregar carrinho do localStorage na inicialização
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        return Array.isArray(parsedCart) ? parsedCart : [];
      }
    } catch (error) {
      console.error('Erro ao carregar carrinho do localStorage:', error);
    }
    return [];
  });

  // Salvar carrinho no localStorage sempre que mudar
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Erro ao salvar carrinho no localStorage:', error);
    }
  }, [items]);

  // ✅ CORREÇÃO 3: Sincronização periódica com servidor (apenas estoque)
  const handleStockChange = useCallback((productId: string, inStock: boolean) => {
    if (!inStock) {
      // Remove produtos esgotados do carrinho
      setItems(currentItems => currentItems.filter(item => item.id !== productId));
    }
  }, []);

  useCartSync({
    items,
    onPriceChange: () => {}, // ✅ Não faz nada - preço não deve ser alterado após adicionar ao carrinho
    onStockChange: handleStockChange,
    intervalMs: 30000, // Sincronizar a cada 30 segundos
  });

  const addToCart = async (product: Product, flavor?: string, color?: string) => {
    // ✅ CORREÇÃO 2: Validar estoque antes de adicionar ao carrinho
    
    // Buscar dados atualizados do produto
    const { data: currentProduct, error: productError } = await supabase
      .from('products')
      .select('stock, price, discount_value, discount_type')
      .eq('id', product.id)
      .single();

    if (productError || !currentProduct) {
      toast.error('Erro ao verificar disponibilidade do produto');
      return;
    }

    // Se tem sabor, busca o preço e estoque da variante (combinando nome + cor se houver)
    let variantPrice = Number(currentProduct.price);
    let stockToCheck = currentProduct.stock;

    // Identificador composto para o carrinho (preserva combinação tamanho + cor)
    const compositeFlavor = flavor
      ? (color ? `${flavor} • ${color}` : flavor)
      : undefined;

    if (flavor) {
      let flavorQuery = supabase
        .from('flavors')
        .select('*')
        .eq('product_id', product.id)
        .eq('name', flavor);

      if (color) {
        flavorQuery = flavorQuery.eq('color', color);
      }

      const { data: flavors, error: flavorError } = await flavorQuery;
      
      if (flavorError) {
        toast.error('Erro ao verificar variante');
        return;
      }

      if (flavors && flavors.length > 0) {
        const selectedFlavor = flavors[0];
        stockToCheck = selectedFlavor.stock;
        
        if (selectedFlavor.price) {
          variantPrice = Number(selectedFlavor.price);
        }
      } else {
        toast.error(`Variante "${compositeFlavor}" não encontrada`);
        return;
      }
    }

    // ✅ Aplicar desconto efetivo (próprio do produto ou desconto global da loja)
    const storeDiscount = await fetchStoreDiscount();
    const effective = resolveEffectiveDiscount(
      currentProduct.discount_value,
      currentProduct.discount_type as 'percent' | 'fixed' | undefined,
      storeDiscount,
    );
    let finalPrice = variantPrice;
    if (effective.value > 0) {
      if (effective.type === 'percent') {
        finalPrice = variantPrice * (1 - effective.value / 100);
      } else {
        finalPrice = variantPrice - effective.value;
      }
      finalPrice = Math.max(0, finalPrice);
    }


    // Verificar estoque disponível
    if (stockToCheck === 0) {
      toast.error(`${product.name}${flavor ? ` (${flavor})` : ''} está esgotado`);
      return;
    }

    setItems(currentItems => {
      const existingItem = currentItems.find(
        item => item.id === product.id && item.flavor === compositeFlavor
      );
      
      if (existingItem) {
        // Verificar se há estoque suficiente para mais uma unidade
        const newQuantity = existingItem.quantity + 1;
        if (newQuantity > stockToCheck) {
          toast.error(
            `Estoque insuficiente. Disponível: ${stockToCheck} unidade${stockToCheck > 1 ? 's' : ''}`
          );
          return currentItems; // Não atualiza o carrinho
        }

        toast.success('Quantidade atualizada no carrinho!');
        return currentItems.map(item =>
          item.id === product.id && item.flavor === compositeFlavor
            ? { ...item, quantity: newQuantity, price: finalPrice }
            : item
        );
      }
      
      // Novo item - verificar estoque mínimo de 1
      if (stockToCheck < 1) {
        toast.error(`${product.name}${compositeFlavor ? ` (${compositeFlavor})` : ''} está esgotado`);
        return currentItems;
      }

      const cartItemId = `${product.id}-${compositeFlavor || 'no-flavor'}`;
      toast.success('Produto adicionado ao carrinho!');
      
      // Criar produto com preço final (já com desconto aplicado)
      const productWithCorrectData = { 
        ...product, 
        price: finalPrice, // Preço já com desconto
        stock: stockToCheck,
        discount_value: undefined, // Não armazenar desconto no carrinho
        discount_type: undefined,
      };
      
      return [...currentItems, { ...productWithCorrectData, quantity: 1, flavor: compositeFlavor, cartItemId }];
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setItems(currentItems => currentItems.filter(item => 
      `${item.id}-${item.flavor || 'no-flavor'}` !== cartItemId
    ));
    toast.info('Produto removido do carrinho');
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    
    setItems(currentItems =>
      currentItems.map(item =>
        `${item.id}-${item.flavor || 'no-flavor'}` === cartItemId 
          ? { ...item, quantity } 
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  // Preço já vem com desconto aplicado do addToCart
  const getFinalPrice = (item: CartItem) => {
    return item.price;
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + getFinalPrice(item) * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        getFinalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};
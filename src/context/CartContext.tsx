import React, { createContext, useContext, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface Product {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  price: number;
  image: string;
  description: string;
  stock: number;
  min_stock: number;
  discount_value?: number;
  discount_type?: 'percent' | 'fixed';
}

export interface CartItem extends Product {
  quantity: number;
  flavor?: string;
  cartItemId?: string; // Identificador único para itens com sabores diferentes
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, flavor?: string) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  getFinalPrice: (item: CartItem) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = async (product: Product, flavor?: string) => {
    // Se tem sabor, busca o preço da variante
    let variantPrice = product.price;
    if (flavor) {
      const { data: flavors } = await supabase
        .from('flavors')
        .select('*')
        .eq('product_id', product.id)
        .eq('name', flavor);
      
      if (flavors && flavors.length > 0 && flavors[0].price) {
        variantPrice = Number(flavors[0].price);
      }
    }

    setItems(currentItems => {
      const existingItem = currentItems.find(
        item => item.id === product.id && item.flavor === flavor
      );
      
      if (existingItem) {
        toast.success('Quantidade atualizada no carrinho!');
        return currentItems.map(item =>
          item.id === product.id && item.flavor === flavor
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      
      const cartItemId = `${product.id}-${flavor || 'no-flavor'}`;
      toast.success('Produto adicionado ao carrinho!');
      // Atualiza o preço do produto com o preço da variante
      const productWithVariantPrice = { ...product, price: variantPrice };
      return [...currentItems, { ...productWithVariantPrice, quantity: 1, flavor, cartItemId }];
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

  // Helper function to calculate final price with individual product discount
  const getFinalPrice = (item: CartItem) => {
    const discountValue = item.discount_value || 0;
    const discountType = item.discount_type || 'percent';
    
    const finalPrice = discountType === 'percent'
      ? item.price * (1 - discountValue / 100)
      : item.price - discountValue;
    
    return Math.max(0, finalPrice);
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
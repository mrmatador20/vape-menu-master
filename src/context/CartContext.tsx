import React, { createContext, useContext, useState } from 'react';
import { toast } from 'sonner';

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
  discount_percent?: number;
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
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = (product: Product, flavor?: string) => {
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
      return [...currentItems, { ...product, quantity: 1, flavor, cartItemId }];
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

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

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
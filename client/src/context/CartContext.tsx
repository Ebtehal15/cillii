import {
  createContext,
  useCallback,
  useContext,
  type ReactNode,
} from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ClassRecord } from '../types';
import * as cartApi from '../api/cart';
import type { CartResponse } from '../api/cart';

interface CartContextValue {
  items: CartResponse['items'];
  totalItems: number;
  knownTotal: number;
  hasUnknownPrices: boolean;
  isLoading: boolean;
  addItem: (record: ClassRecord) => Promise<void>;
  updateQuantity: (classId: number, quantity: number) => Promise<void>;
  removeItem: (classId: number) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();

  // Sepeti getir
  const {
    data: cartData,
    isLoading,
  } = useQuery<CartResponse>({
    queryKey: ['cart'],
    queryFn: cartApi.fetchCart,
    staleTime: 0, // Her zaman fresh data al
    gcTime: 0, // Cache'i hemen temizle
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  // Sepete ürün ekle
  const addItemMutation = useMutation({
    mutationFn: (classId: number) => {
      console.log('🛒 Adding to cart:', classId);
      return cartApi.addToCart(classId);
    },
    onSuccess: (data) => {
      console.log('✅ Cart add success:', data);
      // Daha agresif cache invalidation
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.refetchQueries({ queryKey: ['cart'] });
      // Cache'i tamamen temizle ve yeniden fetch et
      queryClient.removeQueries({ queryKey: ['cart'] });
    },
    onError: (error) => {
      console.error('❌ Cart add error:', error);
      alert('Sepete ekleme başarısız! Lütfen tekrar deneyin.');
    },
  });

  // Sepetteki ürün miktarını güncelle
  const updateQuantityMutation = useMutation({
    mutationFn: ({ classId, quantity }: { classId: number; quantity: number }) =>
      cartApi.updateCartItem(classId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  // Sepetten ürün kaldır
  const removeItemMutation = useMutation({
    mutationFn: (classId: number) => cartApi.removeFromCart(classId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  // Sepeti temizle
  const clearCartMutation = useMutation({
    mutationFn: cartApi.clearCart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const addItem = useCallback(async (record: ClassRecord) => {
    await addItemMutation.mutateAsync(record.id);
  }, [addItemMutation]);

  const updateQuantity = useCallback(async (classId: number, quantity: number) => {
    await updateQuantityMutation.mutateAsync({ classId, quantity });
  }, [updateQuantityMutation]);

  const removeItem = useCallback(async (classId: number) => {
    await removeItemMutation.mutateAsync(classId);
  }, [removeItemMutation]);

  const clearCart = useCallback(async () => {
    await clearCartMutation.mutateAsync();
  }, [clearCartMutation]);

  const value: CartContextValue = {
    items: cartData?.items || [],
    totalItems: cartData?.totalItems || 0,
    knownTotal: cartData?.knownTotal || 0,
    hasUnknownPrices: cartData?.hasUnknownPrices || false,
    isLoading,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

// Custom hook for cart functionality  
function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

export { useCart };





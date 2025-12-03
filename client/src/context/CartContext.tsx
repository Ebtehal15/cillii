import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { ClassRecord, CartItem } from '../types';
import * as cartApi from '../api/cart';
import { LocalStorageCart, type LocalCartItem } from '../api/localStorage-cart';
import type { CartResponse } from '../api/cart';
import apiClient from '../api/client';

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
  replaceCart: (items: LocalCartItem[]) => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [localCartItems, setLocalCartItems] = useState<LocalCartItem[]>([]);
  const [enrichedCartItems, setEnrichedCartItems] = useState<CartItem[]>([]);
  const [isLoading] = useState(false);

  // LocalStorage'dan cart'ı yükle
  useEffect(() => {
    const items = LocalStorageCart.getItems();
    setLocalCartItems(items);
    console.log('📦 LocalStorage cart loaded:', items);
  }, []);

  // LocalStorage item'larını product bilgileriyle zenginleştir
  const { data: allClasses } = useQuery<ClassRecord[]>({
    queryKey: ['classes'],
    queryFn: async () => {
      const response = await apiClient.get<ClassRecord[]>('/api/classes');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 dakika cache
  });

  // LocalStorage cart'ını gerçek product bilgileriyle zenginleştir
  useEffect(() => {
    if (!allClasses || localCartItems.length === 0) {
      setEnrichedCartItems([]);
      return;
    }

    const enriched: CartItem[] = localCartItems
      .map(localItem => {
        const record = allClasses.find(cls => cls.id === localItem.classId);
        if (!record) {
          console.warn('Product not found for classId:', localItem.classId);
          return null;
        }
        return {
          record,
          quantity: localItem.quantity
        };
      })
      .filter((item): item is CartItem => item !== null);

    setEnrichedCartItems(enriched);
    console.log('✨ Cart enriched with product data:', enriched);
  }, [localCartItems, allClasses]);

  // LocalStorage'dan cart'ı yükle
  useEffect(() => {
    const items = LocalStorageCart.getItems();
    setLocalCartItems(items);
    console.log('📦 LocalStorage cart loaded:', items);
  }, []);

  // Sepete ürün ekle
  const addItemMutation = useMutation({
    mutationFn: async (classId: number) => {
      console.log('🛒 Adding to cart (localStorage):', classId);
      LocalStorageCart.addItem(classId);
      
      // API'ye de göndermeyi dene (arka planda)
      try {
        await cartApi.addToCart(classId);
        console.log('✅ Also synced to server');
      } catch (error) {
        console.log('⚠️ Server sync failed, but localStorage updated:', error);
      }
      
      return { success: true };
    },
    onSuccess: () => {
      // LocalStorage'dan güncel veriyi al
      const items = LocalStorageCart.getItems();
      setLocalCartItems([...items]); // Yeni array oluştur ki re-render olsun
      console.log('✅ Cart updated in localStorage:', items);
    },
    onError: (error) => {
      console.error('❌ Cart add error:', error);
      alert('Sepete ekleme başarısız! Lütfen tekrar deneyin.');
    },
  });

  // Sepetteki ürün miktarını güncelle
  const updateQuantityMutation = useMutation({
    mutationFn: async ({ classId, quantity }: { classId: number; quantity: number }) => {
      console.log('🔄 Updating cart quantity (localStorage):', classId, quantity);
      LocalStorageCart.updateItem(classId, quantity);
      
      // API'ye de göndermeyi dene
      try {
        await cartApi.updateCartItem(classId, quantity);
        console.log('✅ Also synced to server');
      } catch (error) {
        console.log('⚠️ Server sync failed, but localStorage updated:', error);
      }
      
      return { success: true };
    },
    onSuccess: () => {
      const items = LocalStorageCart.getItems();
      setLocalCartItems([...items]);
      console.log('✅ Cart quantity updated in localStorage:', items);
    },
  });

  // Sepetten ürün kaldır
  const removeItemMutation = useMutation({
    mutationFn: async (classId: number) => {
      console.log('🗑️ Removing from cart (localStorage):', classId);
      LocalStorageCart.removeItem(classId);
      
      // API'ye de göndermeyi dene
      try {
        await cartApi.removeFromCart(classId);
        console.log('✅ Also synced to server');
      } catch (error) {
        console.log('⚠️ Server sync failed, but localStorage updated:', error);
      }
      
      return { success: true };
    },
    onSuccess: () => {
      const items = LocalStorageCart.getItems();
      setLocalCartItems([...items]);
      console.log('✅ Item removed from localStorage cart:', items);
    },
  });

  // Sepeti temizle
  const clearCartMutation = useMutation({
    mutationFn: async () => {
      console.log('🧹 Clearing cart (localStorage)');
      LocalStorageCart.clear();
      
      // API'ye de göndermeyi dene
      try {
        await cartApi.clearCart();
        console.log('✅ Also synced to server');
      } catch (error) {
        console.log('⚠️ Server sync failed, but localStorage cleared:', error);
      }
      
      return { success: true };
    },
    onSuccess: () => {
      setLocalCartItems([]);
      console.log('✅ Cart cleared from localStorage');
    },
  });

  // Tüm sepeti verilen LocalCartItem listesiyle değiştir
  const replaceCartMutation = useMutation({
    mutationFn: async (newItems: LocalCartItem[]) => {
      console.log('🔁 Replacing cart (localStorage):', newItems);
      LocalStorageCart.setItems(newItems);

      // API tarafını da mümkün olduğunca senkronize etmeye çalış
      try {
        await cartApi.clearCart();
        await Promise.all(
          newItems.map((item) => cartApi.updateCartItem(item.classId, item.quantity)),
        );
        console.log('✅ Server cart replaced to match local cart');
      } catch (error) {
        console.log('⚠️ Server cart replace failed, but localStorage updated:', error);
      }

      return { success: true };
    },
    onSuccess: () => {
      const items = LocalStorageCart.getItems();
      setLocalCartItems([...items]);
      console.log('✅ Cart replaced from localStorage');
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

  const replaceCart = useCallback(async (items: LocalCartItem[]) => {
    await replaceCartMutation.mutateAsync(items);
  }, [replaceCartMutation]);

  // Toplam tutarı hesapla
  const { knownTotal, hasUnknownPrices } = useMemo(() => {
    let total = 0;
    let hasUnknown = false;

    enrichedCartItems.forEach(item => {
      if (item.record.classPrice !== null && item.record.classPrice !== undefined) {
        total += item.record.classPrice * item.quantity;
      } else {
        hasUnknown = true;
      }
    });

    return { knownTotal: total, hasUnknownPrices: hasUnknown };
  }, [enrichedCartItems]);

  const value: CartContextValue = {
    items: enrichedCartItems,
    totalItems: LocalStorageCart.getTotalItems(),
    knownTotal,
    hasUnknownPrices,
    isLoading,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    replaceCart,
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





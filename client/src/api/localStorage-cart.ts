// localStorage-based cart management
const CART_STORAGE_KEY = 'cillii-cart';

export interface LocalCartItem {
  classId: number;
  quantity: number;
}

export interface LocalCartData {
  items: LocalCartItem[];
  timestamp: number;
}

export class LocalStorageCart {
  private static getCartData(): LocalCartData {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as LocalCartData;
        // Check if data is less than 24 hours old
        const isValid = Date.now() - data.timestamp < 24 * 60 * 60 * 1000;
        if (isValid) {
          return data;
        }
      }
    } catch (error) {
      console.error('Error reading cart from localStorage:', error);
    }
    
    return { items: [], timestamp: Date.now() };
  }

  private static saveCartData(data: LocalCartData): void {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }

  static getItems(): LocalCartItem[] {
    return this.getCartData().items;
  }

  // Tüm sepeti dışarıdan verilen item listesiyle değiştir
  static setItems(items: LocalCartItem[]): void {
    const cartData: LocalCartData = {
      items,
      timestamp: Date.now(),
    };
    this.saveCartData(cartData);
    console.log('✅ LocalStorage cart replaced:', cartData.items);
  }

  static addItem(classId: number): void {
    const cartData = this.getCartData();
    const existingItem = cartData.items.find(item => item.classId === classId);
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cartData.items.push({ classId, quantity: 1 });
    }
    
    cartData.timestamp = Date.now();
    this.saveCartData(cartData);
    
    console.log('✅ LocalStorage cart updated:', cartData.items);
  }

  static updateItem(classId: number, quantity: number): void {
    const cartData = this.getCartData();
    const existingItem = cartData.items.find(item => item.classId === classId);
    
    if (existingItem) {
      if (quantity > 0) {
        existingItem.quantity = quantity;
      } else {
        cartData.items = cartData.items.filter(item => item.classId !== classId);
      }
    }
    
    cartData.timestamp = Date.now();
    this.saveCartData(cartData);
    
    console.log('✅ LocalStorage cart updated:', cartData.items);
  }

  static removeItem(classId: number): void {
    const cartData = this.getCartData();
    cartData.items = cartData.items.filter(item => item.classId !== classId);
    cartData.timestamp = Date.now();
    this.saveCartData(cartData);
    
    console.log('✅ LocalStorage cart updated:', cartData.items);
  }

  static clear(): void {
    localStorage.removeItem(CART_STORAGE_KEY);
    console.log('✅ LocalStorage cart cleared');
  }

  static getTotalItems(): number {
    return this.getItems().reduce((total, item) => total + item.quantity, 0);
  }
}

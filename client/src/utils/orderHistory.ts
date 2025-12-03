// Order History utilities
export type CustomerInfoState = {
  fullName: string;
  company: string;
  phone: string;
  salesPerson: string;
  // Optional for backwards compatibility with existing history entries
  notes?: string;
};

export type OrderHistoryItem = {
  orderId: number;
  createdAt: string;
  customerInfo: CustomerInfoState;
  items: {
    classId: number;
    quantity: number;
    specialId: string;
    quality: string | null;
    className: string;
    classNameArabic: string | null;
    classNameEnglish: string | null;
    classPrice: number | null;
  }[];
  knownTotal: number;
  totalItems: number;
  hasUnknownPrices: boolean;
  language: string;
};

export const ORDER_HISTORY_STORAGE_KEY = 'cillii-order-history';

export const getOrderHistory = (): OrderHistoryItem[] => {
  try {
    const raw = localStorage.getItem(ORDER_HISTORY_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as OrderHistoryItem[];
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load order history from localStorage:', error);
  }
  return [];
};

export const addOrderToHistory = (entry: OrderHistoryItem): void => {
  try {
    const current = getOrderHistory();
    const next = [entry, ...current].slice(0, 50); // max 50 kayıt tut
    localStorage.setItem(ORDER_HISTORY_STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to save order history to localStorage:', error);
  }
};

export const deleteOrderFromHistory = (orderId: number): void => {
  try {
    const current = getOrderHistory();
    const next = current.filter((entry) => entry.orderId !== orderId);
    localStorage.setItem(ORDER_HISTORY_STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to delete order from history:', error);
  }
};



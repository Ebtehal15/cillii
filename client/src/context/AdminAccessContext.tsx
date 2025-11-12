import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
} from 'react';
import type { ReactNode } from 'react';

interface AdminAccessContextValue {
  isAdmin: boolean;
  authorize: () => void;
  revoke: () => void;
}

const AdminAccessContext = createContext<AdminAccessContextValue | undefined>(undefined);

const STORAGE_KEY = 'adminAuthorized';

interface ProviderProps {
  children: ReactNode;
}

export const AdminAccessProvider = ({ children }: ProviderProps) => {
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  });

  useEffect(() => {
    if (isAdmin) {
      window.localStorage.setItem(STORAGE_KEY, 'true');
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [isAdmin]);

  const authorize = useCallback(() => {
    setIsAdmin(true);
  }, []);

  const revoke = useCallback(() => {
    setIsAdmin(false);
  }, []);

  const value = useMemo(() => ({
    isAdmin,
    authorize,
    revoke,
  }), [authorize, revoke, isAdmin]);

  return (
    <AdminAccessContext.Provider value={value}>
      {children}
    </AdminAccessContext.Provider>
  );
};

export const useAdminAccess = (): AdminAccessContextValue => {
  const context = useContext(AdminAccessContext);
  if (!context) {
    throw new Error('useAdminAccess must be used within an AdminAccessProvider');
  }
  return context;
};



import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type SupportedLanguage = 'en' | 'ar' | 'es';

interface LanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (next: SupportedLanguage) => void;
  toggleLanguage: () => void;
}

const STORAGE_KEY = 'appLanguage';

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const getInitialLanguage = (): SupportedLanguage => {
  if (typeof window === 'undefined') {
    return 'en';
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'ar' || stored === 'es' ? stored : 'en';
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<SupportedLanguage>(getInitialLanguage);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  const cycleLanguage = () => {
    setLanguage((prev) => {
      if (prev === 'en') {
        return 'ar';
      }
      if (prev === 'ar') {
        return 'es';
      }
      return 'en';
    });
  };

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage: (next: SupportedLanguage) => setLanguage(next),
    toggleLanguage: cycleLanguage,
  }), [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextValue => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};



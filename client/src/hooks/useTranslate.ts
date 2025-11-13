import { useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';

const useTranslate = () => {
  const { language, ...rest } = useLanguage();

  const t = useCallback(
    (english: string, arabic?: string, spanish?: string) => {
      if (language === 'ar') {
        return arabic ?? english;
      }
      if (language === 'es') {
        return spanish ?? english;
      }
      return english;
    },
    [language],
  );

  return { language, t, ...rest };
};

export default useTranslate;



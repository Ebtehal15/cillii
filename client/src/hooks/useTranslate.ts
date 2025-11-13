import { useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';

const useTranslate = () => {
  const { language, ...rest } = useLanguage();

  const t = useCallback(
    (english: string, arabic: string) => (language === 'ar' ? arabic : english),
    [language],
  );

  return { language, t, ...rest };
};

export default useTranslate;



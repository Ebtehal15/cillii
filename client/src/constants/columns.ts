import type { ColumnKey, ColumnVisibility } from '../types';
import type { SupportedLanguage } from '../context/LanguageContext';

const columnLabelMap: Record<ColumnKey, Record<SupportedLanguage, string>> = {
  specialId: {
    en: 'Special ID',
    ar: 'كود الصنف',
  },
  mainCategory: {
    en: 'Main Category',
    ar: 'الفئة الرئيسية',
  },
  quality: {
    en: 'Group',
    ar: 'المجموعة',
  },
  className: {
    en: 'Class Name',
    ar: 'اسم الصنف',
  },
  classNameArabic: {
    en: 'Class Name (Arabic)',
    ar: 'اسم الصنف (عربي)',
  },
  classFeatures: {
    en: 'Features',
    ar: 'المميزات',
  },
  classWeight: {
    en: 'Weight (kg)',
    ar: 'الوزن (كجم)',
  },
  classPrice: {
    en: 'Price',
    ar: 'السعر',
  },
  classVideo: {
    en: 'Video',
    ar: 'فيديو',
  },
};

export const getColumnLabel = (key: ColumnKey, language: SupportedLanguage = 'en'): string => (
  columnLabelMap[key]?.[language] ?? columnLabelMap[key]?.en ?? key
);

export const buildColumnLabels = (
  language: SupportedLanguage = 'en',
): Record<ColumnKey, string> => (
  orderedColumns.reduce((acc, key) => {
    acc[key] = getColumnLabel(key, language);
    return acc;
  }, {} as Record<ColumnKey, string>)
);

export const orderedColumns: ColumnKey[] = [
  'specialId',
  'mainCategory',
  'quality',
  'className',
  'classNameArabic',
  'classFeatures',
  'classWeight',
  'classPrice',
  'classVideo',
];

export const columnOptions = orderedColumns.map((key) => ({ key }));

export const defaultColumnVisibility: ColumnVisibility = orderedColumns.reduce((acc, key) => {
  acc[key] = key !== 'classNameArabic';
  return acc;
}, {} as ColumnVisibility);

export const normalizeColumnVisibility = (visibility?: Partial<ColumnVisibility> | null): ColumnVisibility => {
  const normalized: ColumnVisibility = { ...defaultColumnVisibility };
  if (visibility && typeof visibility === 'object') {
    orderedColumns.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(visibility, key)) {
        normalized[key] = Boolean(visibility[key]);
      }
    });
  }
  if (!orderedColumns.some((key) => normalized[key])) {
    return { ...defaultColumnVisibility };
  }
  return normalized;
};

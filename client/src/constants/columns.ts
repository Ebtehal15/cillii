import type { ColumnKey, ColumnVisibility } from '../types';

export const columnLabels: Record<ColumnKey, string> = {
  specialId: 'Special ID',
  mainCategory: 'Main Category',
  quality: 'Group',
  className: 'Class Name',
  classFeatures: 'Features',
  classWeight: 'Weight (kg)',
  classPrice: 'Price',
  classVideo: 'Video',
};

export const orderedColumns: ColumnKey[] = [
  'specialId',
  'mainCategory',
  'quality',
  'className',
  'classFeatures',
  'classWeight',
  'classPrice',
  'classVideo',
];

export const columnOptions = orderedColumns.map((key) => ({
  key,
  label: columnLabels[key],
}));

export const defaultColumnVisibility: ColumnVisibility = orderedColumns.reduce((acc, key) => {
  acc[key] = true;
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

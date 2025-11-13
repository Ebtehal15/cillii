import { useMemo, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useClasses } from '../hooks/useClasses';
import type { ClassFilters, ClassRecord, ColumnVisibility, ColumnKey } from '../types';
import VideoPreview from '../components/VideoPreview';
import { fetchColumnVisibility } from '../api/settings';
import {
  buildColumnLabels,
  defaultColumnVisibility,
  orderedColumns,
} from '../constants/columns';
import useTranslate from '../hooks/useTranslate';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

type ViewMode = 'table' | 'cards';

const UserPanel = () => {
  const [filters, setFilters] = useState<ClassFilters>({});
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const { data: classes = [], isLoading, error } = useClasses(filters);
  const { language, t } = useTranslate();

  const columnLabels = useMemo(
    () => buildColumnLabels(language),
    [language],
  );

  const groups = useMemo<string[]>(() => {
    const set = new Set<string>();
    classes.forEach((item) => {
      if (item.quality) {
        set.add(item.quality);
      }
    });
    return Array.from(set).sort();
  }, [classes]);

  const columnVisibilityQuery = useQuery({
    queryKey: ['columnVisibility'],
    queryFn: fetchColumnVisibility,
    initialData: defaultColumnVisibility,
  });
  const columnVisibility: ColumnVisibility = columnVisibilityQuery.data ?? defaultColumnVisibility;
  const visibleColumnKeys = useMemo(
    () => orderedColumns.filter((key) => columnVisibility[key]),
    [columnVisibility],
  );

  const renderCell = (item: ClassRecord, key: ColumnKey): ReactNode => {
    switch (key) {
      case 'specialId':
        return item.specialId;
      case 'mainCategory':
        return item.mainCategory;
      case 'quality':
        return item.quality;
      case 'className':
        return language === 'ar' && item.classNameArabic
          ? item.classNameArabic
          : item.className;
      case 'classNameArabic':
        return item.classNameArabic || '—';
      case 'classFeatures':
        return item.classFeatures || t('No features provided yet.', 'لم يتم إضافة المزايا بعد.');
      case 'classWeight':
        return item.classWeight !== null && item.classWeight !== undefined
          ? `${item.classWeight.toFixed(2)} kg`
          : '—';
      case 'classPrice':
        return item.classPrice !== null && item.classPrice !== undefined
          ? `$${item.classPrice.toFixed(2)}`
          : t('Price on request', 'السعر عند الطلب');
      case 'classVideo':
        return (
          <VideoPreview
            src={item.classVideo ? `${API_BASE_URL}${item.classVideo}` : null}
            title={language === 'ar' && item.classNameArabic ? item.classNameArabic : item.className}
            variant="icon"
          />
        );
      default:
        return '—';
    }
  };

  const handleFilterChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFilters((prev: ClassFilters) => ({
      ...prev,
      [name]: value || undefined,
    }));
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  return (
    <section className="panel catalog-panel">
      <div className="card catalog-filters">
        <div className="catalog-filters__header">
          <h2>{t('Search & Filters', 'البحث والتصفية')}</h2>
          <p>{t('Use flexible filters to focus on the categories and groups that fit the brief.', 'استخدم خيارات التصفية للتركيز على الفئات المناسبة.')}</p>
        </div>
        <div className="catalog-filters__grid">
          <label>
            {t('Search', 'بحث')}
            <input
              type="search"
              name="search"
              value={filters.search ?? ''}
              onChange={handleFilterChange}
              placeholder={t('Search by ID or class name', 'ابحث بالرمز أو اسم الصنف')}
            />
          </label>

          <label>
            {t('Group', 'المجموعة')}
            <select
              name="quality"
              value={filters.quality ?? ''}
              onChange={handleFilterChange}
            >
              <option value="">{t('All', 'الكل')}</option>
              {groups.map((group) => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="catalog-filters__actions">
          <button type="button" className="secondary" onClick={handleClearFilters}>
            {t('Clear Filters', 'إزالة الفلترة')}
          </button>
        </div>
      </div>

      {isLoading && <p>{t('Loading catalog...', 'جاري تحميل الكتالوج...')}</p>}
      {error && <p className="alert alert--error">{t('Failed to load catalog.', 'تعذر تحميل الكتالوج.')}</p>}
      {!isLoading && !classes.length && (
        <div className="card">
          <p>{t('No products available yet. Please check back later.', 'لا توجد منتجات حالياً. يرجى العودة لاحقاً.')}</p>
        </div>
      )}

      {!isLoading && classes.length > 0 && (
        <div className="card catalog-table">
          <div className="catalog-table__header">
            <div>
              <h2>{t('Available Classes', 'الأصناف المتاحة')}</h2>
              <p>{t('High-level overview of every class, organised for quick reference during buyer sessions.', ' نظرة شاملة على جميع الأصناف .')}</p>
            </div>
          </div>
          <div className="catalog-view-toggle" role="group" aria-label="View mode">
            <button
              type="button"
              className={viewMode === 'table' ? 'active' : ''}
              aria-pressed={viewMode === 'table'}
              onClick={() => setViewMode('table')}
            >
              {t('Table', 'جدول')}
            </button>
            <button
              type="button"
              className={viewMode === 'cards' ? 'active' : ''}
              aria-pressed={viewMode === 'cards'}
              onClick={() => setViewMode('cards')}
            >
              {t('Cards', 'بطاقات')}
            </button>
          </div>
          {viewMode === 'table' ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {visibleColumnKeys.map((key) => (
                      <th key={key}>{columnLabels[key]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {classes.map((item: ClassRecord) => (
                    <tr key={item.id}>
                      {visibleColumnKeys.map((key) => (
                        <td key={key}>{renderCell(item, key)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="catalog-card-grid">
              {classes.map((item) => (
                <article key={item.id} className="catalog-card">
                  <header className="catalog-card__header">
                    <span className="catalog-card__id">{item.specialId}</span>
                    <h3>
                      {language === 'ar' && item.classNameArabic
                        ? item.classNameArabic
                        : item.className}
                    </h3>
                  <p>{item.quality || '—'}</p>
                  </header>
                  <dl>
                    <div>
                      <dt>{t('Main Category', 'الفئة الرئيسية')}</dt>
                      <dd>{item.mainCategory || '—'}</dd>
                    </div>
                  <div>
                    <dt>{t('Features', 'المميزات')}</dt>
                    <dd>{item.classFeatures || t('No features provided yet.', 'لم يتم إضافة المزايا بعد.')}</dd>
                  </div>
                  <div>
                    <dt>{t('Weight', 'الوزن')}</dt>
                    <dd>
                      {item.classWeight !== null && item.classWeight !== undefined
                        ? `${item.classWeight.toFixed(2)} kg`
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('Price', 'السعر')}</dt>
                    <dd>
                      {item.classPrice !== null && item.classPrice !== undefined
                        ? `$${item.classPrice.toFixed(2)}`
                        : t('Price on request', 'السعر عند الطلب')}
                    </dd>
                  </div>
                  </dl>
                  <VideoPreview
                    src={item.classVideo ? `${API_BASE_URL}${item.classVideo}` : null}
                    title={language === 'ar' && item.classNameArabic
                      ? item.classNameArabic
                      : item.className}
                  variant="icon"
                  />
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default UserPanel;


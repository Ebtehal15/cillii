import { useMemo, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useClasses } from '../hooks/useClasses';
import type { ClassFilters, ClassRecord, ColumnVisibility, ColumnKey } from '../types';
import VideoPreview from '../components/VideoPreview';
import { fetchColumnVisibility } from '../api/settings';
import {
  columnLabels,
  defaultColumnVisibility,
  orderedColumns,
} from '../constants/columns';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

const UserPanel = () => {
  const [filters, setFilters] = useState<ClassFilters>({});
  const { data: classes = [], isLoading, error } = useClasses(filters);

  const categories = useMemo<string[]>(() => {
    const set = new Set<string>();
    classes.forEach((item) => {
      if (item.mainCategory) {
        set.add(item.mainCategory);
      }
    });
    return Array.from(set).sort();
  }, [classes]);

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
        return item.className;
      case 'classFeatures':
        return item.classFeatures || 'No features provided yet.';
      case 'classWeight':
        return item.classWeight !== null && item.classWeight !== undefined
          ? `${item.classWeight.toFixed(2)} kg`
          : '—';
      case 'classPrice':
        return item.classPrice !== null && item.classPrice !== undefined
          ? `$${item.classPrice.toFixed(2)}`
          : 'Price on request';
      case 'classVideo':
        return (
          <VideoPreview
            src={item.classVideo ? `${API_BASE_URL}${item.classVideo}` : null}
            title={item.className}
          />
        );
      default:
        return '—';
    }
  };

  const totalVideos = useMemo(() => classes.filter((item) => item.classVideo).length, [classes]);

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
      <div className="card catalog-hero">
        <div className="catalog-hero__copy">
          <h1>Product Catalog</h1>
          <p>
            Browse curated product classes, compare groups, and share immersive videos with your customers.
          </p>
        </div>
        <div className="catalog-stats">
          <div className="catalog-stat">
            <span>{classes.length}</span>
            <p>Total Classes</p>
          </div>
          <div className="catalog-stat">
            <span>{categories.length}</span>
            <p>Main Categories</p>
          </div>
          <div className="catalog-stat">
            <span>{groups.length}</span>
            <p>Groups</p>
          </div>
          <div className="catalog-stat">
            <span>{totalVideos}</span>
            <p>Video Walkthroughs</p>
          </div>
        </div>
      </div>

      <div className="card catalog-filters">
        <div className="catalog-filters__header">
          <h2>Search & Filters</h2>
          <p>Use flexible filters to focus on the categories and groups that fit the brief.</p>
        </div>
        <div className="catalog-filters__grid">
          <label>
            Search
            <input
              type="search"
              name="search"
              value={filters.search ?? ''}
              onChange={handleFilterChange}
              placeholder="Search by ID or class name"
            />
          </label>

          <label>
            Category
            <select
              name="category"
              value={filters.category ?? ''}
              onChange={handleFilterChange}
            >
              <option value="">All</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>

          <label>
            Group
            <select
              name="quality"
              value={filters.quality ?? ''}
              onChange={handleFilterChange}
            >
              <option value="">All</option>
              {groups.map((group) => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="catalog-filters__actions">
          <button type="button" className="secondary" onClick={handleClearFilters}>
            Clear Filters
          </button>
        </div>
      </div>

      {isLoading && <p>Loading catalog...</p>}
      {error && <p className="alert alert--error">Failed to load catalog.</p>}
      {!isLoading && !classes.length && (
        <div className="card">
          <p>No products available yet. Please check back later.</p>
        </div>
      )}

      {!isLoading && classes.length > 0 && (
        <div className="card catalog-table">
          <div className="catalog-table__header">
            <div>
              <h2>Available Classes</h2>
              <p>High-level overview of every class, organised for quick reference during buyer sessions.</p>
            </div>
          </div>
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
        </div>
      )}
    </section>
  );
};

export default UserPanel;


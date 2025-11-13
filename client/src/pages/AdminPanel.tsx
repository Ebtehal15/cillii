import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import {
  bulkUploadClasses,
  createClass,
  deleteAllClasses,
  deleteClass,
  generateSpecialId,
  updateClass,
} from '../api/classes';
import { CLASSES_QUERY_KEY, useClasses } from '../hooks/useClasses';
import type { BulkUploadResult, ClassFilters, ClassRecord, ColumnVisibility, ColumnKey } from '../types';
import VideoPreview from '../components/VideoPreview';
import { useAdminAccess } from '../context/AdminAccessContext';
import {
  columnOptions,
  defaultColumnVisibility,
  buildColumnLabels,
  orderedColumns,
} from '../constants/columns';
import { fetchColumnVisibility, updateColumnVisibility } from '../api/settings';
import useTranslate from '../hooks/useTranslate';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

interface FormState {
  specialId: string;
  mainCategory: string;
  quality: string;
  className: string;
  classNameArabic: string;
  classFeatures: string;
  classPrice: string;
  classWeight: string;
  prefix: string;
}

const emptyForm: FormState = {
  specialId: '',
  mainCategory: '',
  quality: '',
  className: '',
  classNameArabic: '',
  classFeatures: '',
  classPrice: '',
  classWeight: '',
  prefix: '',
};

const AdminPanel = () => {
  const [filters, setFilters] = useState<ClassFilters>({});
  const [formState, setFormState] = useState<FormState>(emptyForm);
  const [selectedClass, setSelectedClass] = useState<ClassRecord | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [bulkReport, setBulkReport] = useState<BulkUploadResult | null>(null);
  const [isMissingVideoExpanded, setIsMissingVideoExpanded] = useState(false);

  const queryClient = useQueryClient();
  const { data: classes = [], isLoading, error } = useClasses(filters);
  const { language, t } = useTranslate();

  const columnLabels = useMemo(
    () => buildColumnLabels(language),
    [language],
  );
  const columnOptionsWithLabels = useMemo(
    () => columnOptions.map(({ key }) => ({ key, label: columnLabels[key] })),
    [columnLabels],
  );
  const { revoke } = useAdminAccess();
  const columnVisibilityQuery = useQuery({
    queryKey: ['columnVisibility'],
    queryFn: fetchColumnVisibility,
    initialData: defaultColumnVisibility,
  });
  const columnVisibility = columnVisibilityQuery.data ?? defaultColumnVisibility;
  const columnVisibilityMutation = useMutation<ColumnVisibility, AxiosError<{ message?: string; error?: string }>, ColumnVisibility>({
    mutationFn: updateColumnVisibility,
    onSuccess: (data) => {
      queryClient.setQueryData(['columnVisibility'], data);
    },
    onError: (mutationError) => {
      setErrorFeedback(extractErrorMessage(mutationError));
    },
  });

  useEffect(() => () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
  }, [videoPreview]);

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

  const totalVideos = useMemo(() => classes.filter((item) => item.classVideo).length, [classes]);

  const missingVideoClasses = useMemo(() => classes.filter((item) => !item.classVideo), [classes]);
  const activeColumnCount = useMemo(
    () => Object.values(columnVisibility).filter(Boolean).length,
    [columnVisibility],
  );
  const orderedVisibleColumns = useMemo(
    () => orderedColumns.filter((key) => columnVisibility[key]),
    [columnVisibility],
  );
  const isUpdatingColumns = columnVisibilityMutation.isPending;

  const handleToggleColumn = (key: ColumnKey) => {
    const nextValue = !columnVisibility[key];
    if (!nextValue && activeColumnCount <= 1) {
      return;
    }
    const updated: ColumnVisibility = { ...columnVisibility, [key]: nextValue };
    columnVisibilityMutation.mutate(updated);
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleVideoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const previewUrl = URL.createObjectURL(file);
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
      }
      setVideoPreview(previewUrl);
    } else {
      setVideoFile(null);
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
        setVideoPreview(null);
      }
    }
  };

  const handleExcelChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setExcelFile(file ?? null);
  };

  const extractErrorMessage = (error: AxiosError<{ message?: string; error?: string }>) => (
    error.response?.data?.error
    || error.response?.data?.message
    || error.message
  );

  const handleEdit = (record: ClassRecord) => {
    setSelectedClass(record);
    setFormState({
      specialId: record.specialId ?? '',
      mainCategory: record.mainCategory ?? '',
      quality: record.quality ?? '',
      className: record.className ?? '',
      classNameArabic: record.classNameArabic ?? '',
      classFeatures: record.classFeatures ?? '',
      classPrice: record.classPrice !== null && record.classPrice !== undefined
        ? String(record.classPrice)
        : '',
      classWeight: record.classWeight !== null && record.classWeight !== undefined
        ? String(record.classWeight)
        : '',
      prefix: '',
    });
    setVideoFile(null);
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
      setVideoPreview(null);
    }
    setIsFormVisible(true);
  };

  const handleAddClick = async () => {
    resetForm();
    setIsFormVisible(true);
    try {
      const nextId = await generateSpecialId();
      setFormState((prev: FormState) => ({
        ...prev,
        specialId: nextId,
      }));
      setFeedback(t(`Generated next ID ${nextId}.`, `تم إنشاء المعرف التالي ${nextId}.`));
      setErrorFeedback(null);
    } catch (idError) {
      if (idError instanceof Error) {
        setErrorFeedback(idError.message);
      } else {
        setErrorFeedback(t('Failed to generate a new ID.', 'تعذر إنشاء معرف جديد.'));
      }
    }
  };

  const resetForm = (hideForm = false) => {
    setFormState(emptyForm);
    setSelectedClass(null);
    setVideoFile(null);
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
      setVideoPreview(null);
    }
    if (hideForm) {
      setIsFormVisible(false);
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormState((prev: FormState) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFilterChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFilters((prev: ClassFilters) => ({
      ...prev,
      [name]: value || undefined,
    }));
  };

  const buildFormData = () => {
    const data = new FormData();
    data.append('specialId', formState.specialId);
    data.append('mainCategory', formState.mainCategory);
    data.append('quality', formState.quality);
    data.append('className', formState.className);
    data.append('classNameArabic', formState.classNameArabic);
    data.append('classFeatures', formState.classFeatures);
    data.append('classPrice', formState.classPrice);
    data.append('classWeight', formState.classWeight);
    if (videoFile) {
      data.append('classVideo', videoFile);
    }
    return data;
  };

  const createMutation = useMutation<ClassRecord, AxiosError<{ message?: string; error?: string }>, FormData>({
    mutationFn: createClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLASSES_QUERY_KEY] });
      setFeedback(t('Class created successfully.', 'تم إنشاء الصنف بنجاح.'));
      setErrorFeedback(null);
      resetForm(true);
    },
    onError: (mutationError) => {
      setErrorFeedback(extractErrorMessage(mutationError));
      setFeedback(null);
    },
  });

  const updateMutation = useMutation<ClassRecord, AxiosError<{ message?: string; error?: string }>, { id: number; data: FormData }>({
    mutationFn: ({ id, data }: { id: number; data: FormData }) => updateClass(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLASSES_QUERY_KEY] });
      setFeedback(t('Class updated successfully.', 'تم تحديث الصنف بنجاح.'));
      setErrorFeedback(null);
      resetForm(true);
    },
    onError: (mutationError) => {
      setErrorFeedback(extractErrorMessage(mutationError));
      setFeedback(null);
    },
  });

  const deleteMutation = useMutation<void, AxiosError<{ message?: string; error?: string }>, number>({
    mutationFn: deleteClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CLASSES_QUERY_KEY] });
      setFeedback(t('Class deleted successfully.', 'تم حذف الصنف بنجاح.'));
      setErrorFeedback(null);
      setBulkReport(null);
    },
    onError: (mutationError) => {
      setErrorFeedback(extractErrorMessage(mutationError));
      setFeedback(null);
    },
  });

  const deleteAllMutation = useMutation<{ deletedCount: number }, AxiosError<{ message?: string; error?: string }>, void>({
    mutationFn: deleteAllClasses,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [CLASSES_QUERY_KEY] });
      setFeedback(t(`Deleted ${result.deletedCount} class(es).`, `تم حذف ${result.deletedCount} صنف/أصناف.`));
      setErrorFeedback(null);
      setBulkReport(null);
      resetForm(true);
    },
    onError: (mutationError) => {
      setErrorFeedback(extractErrorMessage(mutationError));
      setFeedback(null);
    },
  });

  const bulkUploadMutation = useMutation<BulkUploadResult, AxiosError<{ message?: string; error?: string }>, FormData>({
    mutationFn: bulkUploadClasses,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [CLASSES_QUERY_KEY] });
      setFeedback(`Bulk upload completed. Imported ${result.processedCount}, skipped ${result.skippedCount}.`);
      setErrorFeedback(null);
      setExcelFile(null);
      setBulkReport(result);
    },
    onError: (mutationError) => {
      setErrorFeedback(extractErrorMessage(mutationError));
      setFeedback(null);
      setBulkReport(null);
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setErrorFeedback(null);

    const data = buildFormData();

    if (selectedClass) {
      updateMutation.mutate({ id: selectedClass.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (record: ClassRecord) => {
    const localizedName = language === 'ar' && record.classNameArabic ? record.classNameArabic : record.className;
    const message = language === 'ar'
      ? `حذف ${localizedName}؟ لا يمكن التراجع عن هذا الإجراء.`
      : `Delete ${localizedName}? This action cannot be undone.`;
    if (window.confirm(message)) {
      deleteMutation.mutate(record.id);
    }
  };

  const handleDeleteAll = () => {
    if (!classes.length) {
      setErrorFeedback(t('There are no classes to delete.', 'لا توجد أصناف لحذفها.'));
      return;
    }
    const message = t(
      'Delete ALL classes? This will permanently remove every record and any uploaded videos.',
      'هل تريد حذف جميع الأصناف؟ سيؤدي ذلك إلى إزالة كل السجلات وأي مقاطع فيديو مرفوعة نهائياً.',
    );
    if (window.confirm(message)) {
      deleteAllMutation.mutate();
    }
  };

  const handleGenerateId = async () => {
    try {
      const nextId = await generateSpecialId(formState.prefix || undefined);
      setFormState((prev: FormState) => ({
        ...prev,
        specialId: nextId,
      }));
      setFeedback(t(`Generated ID ${nextId}. Remember to save.`, `تم إنشاء المعرف ${nextId}. لا تنس الحفظ.`));
      setErrorFeedback(null);
    } catch (generationError) {
      if (generationError instanceof Error) {
        setErrorFeedback(generationError.message);
      } else {
        setErrorFeedback(t('Failed to generate special ID.', 'تعذر إنشاء معرف خاص.'));
      }
      setFeedback(null);
    }
  };

  const handleBulkUpload = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBulkReport(null);
    if (!excelFile) {
      setErrorFeedback(t('Please select an Excel file to upload.', 'يرجى اختيار ملف إكسل للتحميل.'));
      return;
    }
    const data = new FormData();
    data.append('file', excelFile);
    bulkUploadMutation.mutate(data);
  };

  const actionInProgress = createMutation.isPending
    || updateMutation.isPending
    || deleteMutation.isPending
    || bulkUploadMutation.isPending
    || deleteAllMutation.isPending;

  return (
    <section className="panel">
      <header className="panel__header">
        <div className="panel__header-content">
          <h1>{t('Admin Panel', 'لوحة الإدارة')}</h1>
          <p>{t('Manage product classes, upload media, and keep the catalog up to date.', 'إدارة أصناف المنتجات، وتحميل الوسائط، والحفاظ على الكتالوج محدثاً.')}</p>
        </div>
        <div className="panel__header-actions">
          <button type="button" onClick={handleAddClick}>
            {t('+ Add Class', '+ إضافة صنف')}
          </button>
          <button type="button" className="secondary" onClick={revoke}>
            {t('Sign Out', 'تسجيل الخروج')}
          </button>
        </div>
      </header>

      {(feedback || errorFeedback) && (
        <div className="alerts">
          {feedback && <div className="alert alert--success">{feedback}</div>}
          {errorFeedback && <div className="alert alert--error">{errorFeedback}</div>}
        </div>
      )}

      <div className="card admin-stats">
        <div className="admin-stats__metrics">
          <div className="admin-stat">
            <span>{classes.length}</span>
            <p>{t('Total Classes', 'إجمالي الأصناف')}</p>
          </div>
          <div className="admin-stat">
            <span>{groups.length}</span>
            <p>{t('Groups', 'المجموعات')}</p>
          </div>
          <div className="admin-stat">
            <span>{totalVideos}</span>
            <p>{t('Videos Uploaded', 'عدد مقاطع الفيديو')}</p>
          </div>
          <div className="admin-stat admin-stat--warning">
            <span>{missingVideoClasses.length}</span>
            <p>{t('Missing Videos', 'أصناف بلا فيديو')}</p>
          </div>
        </div>
        {missingVideoClasses.length > 0 && (
          <div className={`admin-stats__missing ${isMissingVideoExpanded ? 'admin-stats__missing--expanded' : ''}`}>
            <button
              type="button"
              className="admin-stats__toggle"
              onClick={() => setIsMissingVideoExpanded((prev) => !prev)}
            >
              <span>
                {t('Classes without video', 'أصناف بلا فيديو')}
                {' '}
                ({missingVideoClasses.length})
              </span>
              <span aria-hidden="true">{isMissingVideoExpanded ? '−' : '+'}</span>
            </button>
            <div className="admin-stats__missing-panel" hidden={!isMissingVideoExpanded}>
              <ul>
                {missingVideoClasses.map((item) => (
                  <li key={item.id}>
                    <span className="admin-stats__missing-name">
                      {language === 'ar' && item.classNameArabic ? item.classNameArabic : item.className}
                    </span>
                    <span className="admin-stats__missing-id">{item.specialId}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="panel__stack">
        <div className="card table-wrapper">
          <div className="table-card__header">
            <div className="table-card__title">
              <h2>{t('Classes', 'الأصناف')} ({classes.length})</h2>
              <p>{t('Browse and manage all catalog classes from a single view.', 'تصفح جميع الأصناف وقم بإدارتها من مكان واحد.')}</p>
            </div>
            <div className="table-card__filters">
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
                {t('Category', 'الفئة')}
                <select
                  name="category"
                  value={filters.category ?? ''}
                  onChange={handleFilterChange}
                >
                  <option value="">{t('All', 'الكل')}</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
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
              <div className="table-card__filter-actions">
                <button type="button" className="secondary" onClick={handleClearFilters}>
                  {t('Clear Filters', 'إزالة الفلترة')}
                </button>
                <button type="button" onClick={() => queryClient.invalidateQueries({ queryKey: [CLASSES_QUERY_KEY] })}>
                  {t('Refresh', 'تحديث')}
                </button>
              </div>
            </div>
            <div className="table-card__controls">
              <details className="column-switcher">
                <summary>{t('Columns', 'الأعمدة')}</summary>
                <div className="column-switcher__grid">
                  {columnOptionsWithLabels.map(({ key, label }) => {
                    const disabled = (activeColumnCount <= 1 && columnVisibility[key]) || isUpdatingColumns;
                    return (
                      <label key={key}>
                        <input
                          type="checkbox"
                          checked={columnVisibility[key]}
                          onChange={() => handleToggleColumn(key)}
                          disabled={disabled}
                        />
                        <span>{label}</span>
                      </label>
                    );
                  })}
                </div>
              </details>
              <button
                type="button"
                className="danger"
                onClick={handleDeleteAll}
                disabled={deleteAllMutation.isPending || !classes.length}
              >
                {deleteAllMutation.isPending ? t('Deleting…', 'جارٍ الحذف...') : t('Delete All', 'حذف الكل')}
              </button>
            </div>
          </div>

          {isLoading && <p>{t('Loading classes...', 'جاري تحميل الأصناف...')}</p>}
          {error && <p className="alert alert--error">{t('Failed to load classes.', 'تعذر تحميل الأصناف.')}</p>}

          {!isLoading && !classes.length && (
            <p>{t('No records yet. Add your first class using the form.', 'لا توجد سجلات بعد. أضف أول صنف باستخدام النموذج.')}</p>
          )}

          {!isLoading && classes.length > 0 && (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {orderedVisibleColumns.map((key) => (
                      <th key={key}>{columnLabels[key]}</th>
                    ))}
                    <th>{t('Actions', 'إجراءات')}</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((item) => (
                    <tr key={item.id}>
                      {orderedVisibleColumns.map((key) => {
                        const label = columnLabels[key];
                        let content: ReactNode;
                        switch (key) {
                          case 'specialId':
                            content = item.specialId;
                            break;
                          case 'mainCategory':
                            content = item.mainCategory;
                            break;
                          case 'quality':
                            content = item.quality;
                            break;
                          case 'className':
                            content = language === 'ar' && item.classNameArabic
                              ? item.classNameArabic
                              : item.className;
                            break;
                          case 'classNameArabic':
                            content = item.classNameArabic || '-';
                            break;
                          case 'classFeatures':
                            content = item.classFeatures || t('No features provided yet.', 'لم يتم إضافة المزايا بعد.');
                            break;
                          case 'classWeight':
                            content = item.classWeight !== null && item.classWeight !== undefined
                              ? `${item.classWeight.toFixed(2)} kg`
                              : '-';
                            break;
                          case 'classPrice':
                            content = item.classPrice !== null && item.classPrice !== undefined
                              ? `$${item.classPrice.toFixed(2)}`
                              : t('Price on request', 'السعر عند الطلب');
                            break;
                          case 'classVideo':
                            content = (
                              <VideoPreview
                                src={item.classVideo ? `${API_BASE_URL}${item.classVideo}` : null}
                                title={language === 'ar' && item.classNameArabic
                                  ? item.classNameArabic
                                  : item.className}
                              />
                            );
                            break;
                          default:
                            content = '-';
                        }
                        return (
                          <td key={key} data-label={label}>
                            {content}
                          </td>
                        );
                      })}
                      <td className="table__actions" data-label={t('Actions', 'إجراءات')}>
                        <button type="button" onClick={() => handleEdit(item)}>
                          {t('Edit', 'تعديل')}
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => handleDelete(item)}
                          disabled={deleteMutation.isPending}
                        >
                          {t('Delete', 'حذف')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {isFormVisible && (
          <form className="card form" onSubmit={handleSubmit}>
            <h2>{selectedClass ? t('Edit Class', 'تعديل الصنف') : t('Add New Class', 'إضافة صنف جديد')}</h2>

            <label>
              {t('Special ID', 'الرمز الخاص')}
              <input
                type="text"
                name="specialId"
                value={formState.specialId}
                onChange={handleInputChange}
                placeholder="CR01"
              />
            </label>

            <label>
              {t('Prefix for Auto ID', 'بادئة المعرف التلقائي')}
              <div className="input-with-button">
                <input
                  type="text"
                  name="prefix"
                  value={formState.prefix}
                  onChange={handleInputChange}
                  placeholder="CR"
                  maxLength={4}
                />
                <button
                  type="button"
                  onClick={handleGenerateId}
                  disabled={actionInProgress}
                >
                  {t('Generate', 'توليد')}
                </button>
              </div>
            </label>

            <label>
              {t('Main Category', 'الفئة الرئيسية')}
              <input
                type="text"
                name="mainCategory"
                value={formState.mainCategory}
                onChange={handleInputChange}
              />
            </label>

            <label>
              {t('Group', 'المجموعة')}
              <input
                type="text"
                name="quality"
                value={formState.quality}
                onChange={handleInputChange}
              />
            </label>

            <label>
              {t('Class Name*', 'اسم الصنف*')}
              <input
                type="text"
                name="className"
                value={formState.className}
                onChange={handleInputChange}
                required
              />
            </label>

            <label>
              {t('Class Name (Arabic)', 'اسم الصنف (عربي)')}
              <input
                type="text"
                name="classNameArabic"
                value={formState.classNameArabic}
                onChange={handleInputChange}
                placeholder="اسم الصنف"
                dir="rtl"
              />
            </label>

            <label>
              {t('Class Features', 'مميزات الصنف')}
              <textarea
                name="classFeatures"
                value={formState.classFeatures}
                onChange={handleInputChange}
                rows={4}
              />
            </label>

            <label>
              {t('Class Weight (kg)', 'وزن الصنف (كجم)')}
              <input
                type="number"
                name="classWeight"
                value={formState.classWeight}
                onChange={handleInputChange}
                step="0.01"
                min="0"
              />
            </label>

            <label>
              {t('Class Price', 'سعر الصنف')}
              <input
                type="number"
                name="classPrice"
                value={formState.classPrice}
                onChange={handleInputChange}
                step="0.01"
                min="0"
              />
            </label>

            <label>
              Class Video
              <input
                type="file"
                name="classVideo"
                accept="video/*"
                onChange={handleVideoChange}
              />
            </label>

            <div className="form__actions">
              <button type="submit" disabled={actionInProgress}>
                {selectedClass ? 'Update Class' : 'Create Class'}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => resetForm(true)}
                disabled={actionInProgress}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <form className="card form" onSubmit={handleBulkUpload}>
          <h2>Bulk Upload</h2>
          <p className="form__hint">
            Upload an Excel file with columns:
            Special ID, Main Category, Group, Class Name, Class Name Arabic, Class Features, Class Price, Class KG, Class Video.
          </p>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleExcelChange}
          />
          <button type="submit" disabled={!excelFile || actionInProgress}>
            Upload Excel
          </button>
        </form>

        {bulkReport && (
          <div className="card bulk-report">
            <h3>Bulk Upload Summary</h3>
            <p>
              Imported <strong>{bulkReport.processedCount}</strong> row(s), skipped{' '}
              <strong>{bulkReport.skippedCount}</strong>.
            </p>
            {bulkReport.skippedCount > 0 && (
              <>
                <p className="bulk-report__hint">
                  Rows were skipped for the reasons below (showing up to 10). Update your spreadsheet and try again.
                </p>
                <ul>
                  {bulkReport.skipped.slice(0, 10).map((entry) => (
                    <li key={entry.index}>
                      <span className="bulk-report__row">Row {entry.index}</span>
                      <span className="bulk-report__reason">{entry.reason}</span>
                    </li>
                  ))}
                </ul>
                {bulkReport.skippedCount > 10 && (
                  <p className="bulk-report__hint">
                    …and {bulkReport.skippedCount - 10} more row(s) skipped.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default AdminPanel;


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
  columnLabels,
  columnOptions,
  defaultColumnVisibility,
  orderedColumns,
} from '../constants/columns';
import { fetchColumnVisibility, updateColumnVisibility } from '../api/settings';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

interface FormState {
  specialId: string;
  mainCategory: string;
  quality: string;
  className: string;
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
      setFeedback(`Generated next ID ${nextId}.`);
      setErrorFeedback(null);
    } catch (idError) {
      if (idError instanceof Error) {
        setErrorFeedback(idError.message);
      } else {
        setErrorFeedback('Failed to generate a new ID.');
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
      setFeedback('Class created successfully.');
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
      setFeedback('Class updated successfully.');
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
      setFeedback('Class deleted successfully.');
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
      setFeedback(`Deleted ${result.deletedCount} class(es).`);
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
    if (window.confirm(`Delete ${record.className}? This action cannot be undone.`)) {
      deleteMutation.mutate(record.id);
    }
  };

  const handleDeleteAll = () => {
    if (!classes.length) {
      setErrorFeedback('There are no classes to delete.');
      return;
    }
    if (window.confirm('Delete ALL classes? This will permanently remove every record and any uploaded videos.')) {
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
      setFeedback(`Generated ID ${nextId}. Remember to save.`);
      setErrorFeedback(null);
    } catch (generationError) {
      if (generationError instanceof Error) {
        setErrorFeedback(generationError.message);
      } else {
        setErrorFeedback('Failed to generate special ID.');
      }
      setFeedback(null);
    }
  };

  const handleBulkUpload = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBulkReport(null);
    if (!excelFile) {
      setErrorFeedback('Please select an Excel file to upload.');
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
          <h1>Admin Panel</h1>
          <p>Manage product classes, upload media, and keep the catalog up to date.</p>
        </div>
        <div className="panel__header-actions">
          <button type="button" onClick={handleAddClick}>
            + Add Class
          </button>
          <button type="button" className="secondary" onClick={revoke}>
            Sign Out
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
            <p>Total Classes</p>
          </div>
          <div className="admin-stat">
            <span>{categories.length}</span>
            <p>Main Categories</p>
          </div>
          <div className="admin-stat">
            <span>{groups.length}</span>
            <p>Groups</p>
          </div>
          <div className="admin-stat">
            <span>{totalVideos}</span>
            <p>Videos Uploaded</p>
          </div>
          <div className="admin-stat admin-stat--warning">
            <span>{missingVideoClasses.length}</span>
            <p>Missing Videos</p>
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
                Classes without video ({missingVideoClasses.length})
              </span>
              <span aria-hidden="true">{isMissingVideoExpanded ? '−' : '+'}</span>
            </button>
            <div className="admin-stats__missing-panel" hidden={!isMissingVideoExpanded}>
              <ul>
                {missingVideoClasses.map((item) => (
                  <li key={item.id}>
                    <span className="admin-stats__missing-name">{item.className}</span>
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
              <h2>Classes ({classes.length})</h2>
              <p>Browse and manage all catalog classes from a single view.</p>
            </div>
            <div className="table-card__filters">
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
              <div className="table-card__filter-actions">
                <button type="button" className="secondary" onClick={handleClearFilters}>
                  Clear Filters
                </button>
                <button type="button" onClick={() => queryClient.invalidateQueries({ queryKey: [CLASSES_QUERY_KEY] })}>
                  Refresh
                </button>
              </div>
            </div>
            <div className="table-card__controls">
              <details className="column-switcher">
                <summary>Columns</summary>
                <div className="column-switcher__grid">
                  {columnOptions.map(({ key, label }) => {
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
                {deleteAllMutation.isPending ? 'Deleting…' : 'Delete All'}
              </button>
            </div>
          </div>

          {isLoading && <p>Loading classes...</p>}
          {error && <p className="alert alert--error">Failed to load classes.</p>}

          {!isLoading && !classes.length && (
            <p>No records yet. Add your first class using the form.</p>
          )}

          {!isLoading && classes.length > 0 && (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {orderedVisibleColumns.map((key) => (
                      <th key={key}>{columnLabels[key]}</th>
                    ))}
                    <th>Actions</th>
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
                            content = item.className;
                            break;
                          case 'classFeatures':
                            content = item.classFeatures;
                            break;
                          case 'classWeight':
                            content = item.classWeight !== null && item.classWeight !== undefined
                              ? `${item.classWeight.toFixed(2)} kg`
                              : '-';
                            break;
                          case 'classPrice':
                            content = item.classPrice !== null && item.classPrice !== undefined
                              ? `$${item.classPrice.toFixed(2)}`
                              : '-';
                            break;
                          case 'classVideo':
                            content = (
                              <VideoPreview
                                src={item.classVideo ? `${API_BASE_URL}${item.classVideo}` : null}
                                title={item.className}
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
                      <td className="table__actions" data-label="Actions">
                        <button type="button" onClick={() => handleEdit(item)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => handleDelete(item)}
                          disabled={deleteMutation.isPending}
                        >
                          Delete
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
            <h2>{selectedClass ? 'Edit Class' : 'Add New Class'}</h2>

            <label>
              Special ID
              <input
                type="text"
                name="specialId"
                value={formState.specialId}
                onChange={handleInputChange}
                placeholder="CR01"
              />
            </label>

            <label>
              Prefix for Auto ID
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
                  Generate
                </button>
              </div>
            </label>

            <label>
              Main Category
              <input
                type="text"
                name="mainCategory"
                value={formState.mainCategory}
                onChange={handleInputChange}
              />
            </label>

            <label>
              Group
              <input
                type="text"
                name="quality"
                value={formState.quality}
                onChange={handleInputChange}
              />
            </label>

            <label>
              Class Name*
              <input
                type="text"
                name="className"
                value={formState.className}
                onChange={handleInputChange}
                required
              />
            </label>

            <label>
              Class Features
              <textarea
                name="classFeatures"
                value={formState.classFeatures}
                onChange={handleInputChange}
                rows={4}
              />
            </label>

            <label>
              Class Weight (kg)
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
              Class Price
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
            Special ID, Main Category, Group, Class Name, Class Features, Class Price, Class KG, Class Video.
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


import { useQuery } from '@tanstack/react-query';
import { fetchClasses } from '../api/classes';
import type { ClassFilters } from '../types';

export const CLASSES_QUERY_KEY = 'classes';

export const useClasses = (filters: ClassFilters = {}) => useQuery({
  queryKey: [CLASSES_QUERY_KEY, filters],
  queryFn: () => fetchClasses(filters),
});


import { getCategories } from '../services/categoryService';
import { useSupabaseQuery } from './useSupabaseQuery';

export function useCategories() {
  return useSupabaseQuery(async () => getCategories(), [], {
    namespace: 'useCategories',
    operation: 'fetchCategories',
  });
}

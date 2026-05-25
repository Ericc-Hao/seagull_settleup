import { getExpenses } from '../services/expenseService';
import { useSupabaseQuery } from './useSupabaseQuery';

export function useExpenses() {
  return useSupabaseQuery(async () => getExpenses(), [], {
    namespace: 'useExpenses',
    operation: 'fetchExpenses',
  });
}

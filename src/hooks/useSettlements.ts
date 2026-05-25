import { getSettlements } from '../services/settlementService';
import { useSupabaseQuery } from './useSupabaseQuery';

export function useSettlements(groupId?: string) {
  return useSupabaseQuery(async () => getSettlements(groupId), [groupId], {
    namespace: 'useSettlements',
    operation: 'fetchSettlements',
  });
}

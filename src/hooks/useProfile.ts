import { getProfile } from '../services/profileService';
import { useSupabaseQuery } from './useSupabaseQuery';

export function useProfile() {
  return useSupabaseQuery(async () => getProfile() ?? null, [], {
    namespace: 'useProfile',
    operation: 'fetchProfile',
  });
}

import { getPendingInvitationsForCurrentUser } from '../services/invitationService';
import { useSupabaseQuery } from './useSupabaseQuery';

export function useInvitations() {
  return useSupabaseQuery(async () => getPendingInvitationsForCurrentUser(), [], {
    namespace: 'useInvitations',
    operation: 'fetchPendingInvitations',
  });
}

import { getGroupMembersByGroup } from '../services/memberService';
import { useSupabaseQuery } from './useSupabaseQuery';

export function useGroupMembers(groupId: string) {
  return useSupabaseQuery(async () => getGroupMembersByGroup(groupId), [groupId], {
    namespace: 'useGroupMembers',
    operation: 'fetchGroupMembers',
  });
}

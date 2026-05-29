import { getGroupMembersByGroup } from '../services/memberService';
import { useGroupParticipants } from './useGroupParticipants';

export function useGroupMembers(groupId: string) {
  const query = useGroupParticipants(groupId, 'all');
  return {
    data: query.members,
    loading: query.loading && query.members.length === 0,
    error: null,
    refetch: query.refresh,
  };
}

export { getGroupMembersByGroup };

import { ScrollView } from 'react-native';

import type { GroupMemberWithProfile } from '../../types/views';
import { AddMemberChip, MemberAvatarChip } from './MemberAvatarChip';

export function PaidBySelector({
  members,
  selectedMemberId,
  onSelect,
  onInvite,
  showInvite,
  loading,
}: {
  members: GroupMemberWithProfile[];
  selectedMemberId?: string;
  onSelect: (memberId: string) => void;
  onInvite?: () => void;
  showInvite?: boolean;
  loading?: boolean;
}) {
  if (loading) {
    return null;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 4 }}>
      {members.map((member) => (
        <MemberAvatarChip
          key={member.id}
          member={member}
          selected={member.id === selectedMemberId}
          onPress={() => onSelect(member.id)}
        />
      ))}
      {showInvite && onInvite ? <AddMemberChip onPress={onInvite} /> : null}
    </ScrollView>
  );
}

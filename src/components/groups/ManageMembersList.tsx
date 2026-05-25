import { Pressable, ScrollView, Text, View } from 'react-native';

import type { GroupMemberWithProfile } from '../../types/views';
import { colors, radii, spacing, typography } from '../../theme';
import { maskEmail } from '../../utils/validation';
import { memberAvatarStatus, memberStatusLabel, UserAvatar } from '../common/UserAvatar';
import { Icon } from '../Icon';

function MemberRow({
  member,
  onPress,
}: {
  member: GroupMemberWithProfile;
  onPress: () => void;
}) {
  const status = memberAvatarStatus(member.role, member.invitationStatus);
  const label = memberStatusLabel(member.role, member.invitationStatus);

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: 12,
        paddingHorizontal: spacing.sm,
        borderRadius: radii.lg,
        backgroundColor: colors.background,
      }}
    >
      <UserAvatar
        avatarUrl={member.avatarUrl}
        displayName={member.displayName}
        email={member.email}
        initials={member.avatarLabel}
        size={44}
        status={status}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={typography.bodyMedium}>{member.displayName}</Text>
        {member.email ? (
          <Text style={[typography.caption, { color: colors.textSecondary }]}>{maskEmail(member.email)}</Text>
        ) : null}
      </View>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
      <Icon name="chevron-right" size={16} color={colors.textTertiary} />
    </Pressable>
  );
}

function MemberSection({
  title,
  members,
  onPressMember,
}: {
  title: string;
  members: GroupMemberWithProfile[];
  onPressMember: (member: GroupMemberWithProfile) => void;
}) {
  if (members.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={[typography.label, { color: colors.textSecondary }]}>{title}</Text>
      <View style={{ gap: spacing.xs }}>
        {members.map((member) => (
          <MemberRow key={member.id} member={member} onPress={() => onPressMember(member)} />
        ))}
      </View>
    </View>
  );
}

export function ManageMembersList({
  activeMembers,
  pendingMembers,
  inactiveMembers,
  onPressMember,
}: {
  activeMembers: GroupMemberWithProfile[];
  pendingMembers: GroupMemberWithProfile[];
  inactiveMembers: GroupMemberWithProfile[];
  onPressMember: (member: GroupMemberWithProfile) => void;
}) {
  const isEmpty = activeMembers.length === 0 && pendingMembers.length === 0 && inactiveMembers.length === 0;

  if (isEmpty) {
    return (
      <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.lg }]}>
        No members found for this group.
      </Text>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.xl }}>
      <MemberSection title="Active Members" members={activeMembers} onPressMember={onPressMember} />
      <MemberSection title="Pending Invitations" members={pendingMembers} onPressMember={onPressMember} />
      <MemberSection title="Removed / Declined" members={inactiveMembers} onPressMember={onPressMember} />
    </ScrollView>
  );
}

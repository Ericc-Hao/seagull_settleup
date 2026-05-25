import { Pressable, ScrollView, Text, View } from 'react-native';

import type { GroupMemberWithProfile } from '../../types/views';
import { colors, layout, radii, shadows, spacing, typography } from '../../theme';
import { Icon } from '../Icon';
import { UserAvatar, memberAvatarStatus } from '../common/UserAvatar';

export function SplitBetweenCard({
  members,
  selectedMemberIds,
  onPress,
}: {
  members: GroupMemberWithProfile[];
  selectedMemberIds: string[];
  onPress: () => void;
}) {
  const activeMembers = members.filter(
    (m) => m.role === 'owner' || (m.invitationStatus === 'active' && m.isActive !== false),
  );
  const selectedMembers = members.filter((m) => selectedMemberIds.includes(m.id));
  const allActiveSelected =
    activeMembers.length > 0 && activeMembers.every((m) => selectedMemberIds.includes(m.id));
  const summary =
    selectedMemberIds.length === 0
      ? 'No members selected'
      : allActiveSelected && selectedMemberIds.length === activeMembers.length
        ? 'All members selected'
        : `${selectedMemberIds.length} of ${members.length} members selected`;

  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: radii.lg,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        padding: layout.cardPadding,
        gap: spacing.sm,
        ...shadows.cardSoft,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ gap: 4, flex: 1 }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Split Between</Text>
          <Text style={typography.bodyMedium}>{summary}</Text>
        </View>
        <Icon name="chevron-right" size={18} color={colors.textTertiary} />
      </View>
      {selectedMembers.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {selectedMembers.map((member) => (
            <UserAvatar
              key={member.id}
              avatarUrl={member.avatarUrl}
              displayName={member.displayName}
              email={member.email}
              initials={member.avatarLabel}
              size={32}
              status={memberAvatarStatus(member.role, member.invitationStatus)}
            />
          ))}
        </ScrollView>
      ) : null}
    </Pressable>
  );
}

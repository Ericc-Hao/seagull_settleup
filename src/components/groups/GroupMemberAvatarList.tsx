import { Pressable, ScrollView, Text, View } from 'react-native';

import type { GroupMemberWithProfile } from '../../types/views';
import { colors, spacing, typography } from '../../theme';
import { Icon } from '../Icon';
import { memberAvatarStatus, memberStatusLabel, UserAvatar } from '../common/UserAvatar';

export function GroupMemberAvatarList({
  members,
  maxVisible = 8,
  onPressMember,
  onPressInvite,
  showInviteButton = false,
}: {
  members: GroupMemberWithProfile[];
  maxVisible?: number;
  onPressMember?: (member: GroupMemberWithProfile) => void;
  onPressInvite?: () => void;
  showInviteButton?: boolean;
}) {
  const visibleMembers = members.slice(0, maxVisible);
  const overflowCount = Math.max(0, members.length - maxVisible);

  return (
    <View style={{ gap: spacing.sm }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingVertical: 4 }}>
        {visibleMembers.map((member) => {
          const status = memberAvatarStatus(member.role, member.invitationStatus);
          const label = memberStatusLabel(member.role, member.invitationStatus);
          return (
            <Pressable
              key={member.id}
              onPress={onPressMember ? () => onPressMember(member) : undefined}
              style={{ width: 72, alignItems: 'center', gap: 6 }}
            >
              <UserAvatar
                avatarUrl={member.avatarUrl}
                displayName={member.displayName}
                email={member.email}
                initials={member.avatarLabel}
                size={44}
                status={status}
              />
              <Text numberOfLines={1} style={[typography.caption, { textAlign: 'center', color: colors.textPrimary }]}>
                {member.displayName.split(' ')[0]}
              </Text>
              <Text numberOfLines={1} style={[typography.caption, { fontSize: 11, color: colors.textSecondary }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}

        {showInviteButton && onPressInvite ? (
          <Pressable onPress={onPressInvite} style={{ width: 72, alignItems: 'center', gap: 6 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.tertiary,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: colors.borderSubtle,
                borderStyle: 'dashed',
              }}
            >
              <Icon name="plus" size={20} color={colors.primary} strokeWidth={2} />
            </View>
            <Text numberOfLines={1} style={[typography.caption, { textAlign: 'center', color: colors.primary }]}>
              Invite
            </Text>
          </Pressable>
        ) : null}

        {overflowCount > 0 ? (
          <View style={{ width: 72, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.background,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: colors.borderSubtle,
              }}
            >
              <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>+{overflowCount}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

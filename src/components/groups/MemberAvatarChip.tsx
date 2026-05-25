import { Pressable, Text, View } from 'react-native';

import { colors, radii, typography } from '../../theme';
import { memberAvatarStatus, UserAvatar } from '../common/UserAvatar';
import type { GroupMemberWithProfile } from '../../types/views';

export function MemberAvatarChip({
  member,
  selected,
  onPress,
  size = 44,
}: {
  member: GroupMemberWithProfile;
  selected?: boolean;
  onPress?: () => void;
  size?: number;
}) {
  const status = memberAvatarStatus(member.role, member.invitationStatus);

  return (
    <Pressable
      onPress={onPress}
      style={{
        alignItems: 'center',
        gap: 6,
        width: 72,
        opacity: onPress ? 1 : 0.95,
      }}
    >
      <View
        style={{
          borderRadius: size / 2 + 4,
          padding: 2,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? colors.primary : colors.borderSubtle,
          backgroundColor: selected ? colors.tertiary : 'transparent',
        }}
      >
        <UserAvatar
          avatarUrl={member.avatarUrl}
          displayName={member.displayName}
          email={member.email}
          initials={member.avatarLabel}
          size={size}
          status={status}
        />
      </View>
      <Text
        numberOfLines={1}
        style={[typography.caption, { textAlign: 'center', color: colors.textPrimary, maxWidth: 72 }]}
      >
        {member.displayName.split(' ')[0]}
      </Text>
    </Pressable>
  );
}

export function AddMemberChip({ onPress, size = 44 }: { onPress: () => void; size?: number }) {
  return (
    <Pressable onPress={onPress} style={{ alignItems: 'center', gap: 6, width: 72 }}>
      <View
        style={{
          width: size + 4,
          height: size + 4,
          borderRadius: (size + 4) / 2,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: colors.primary,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={[typography.title, { color: colors.primary, fontSize: 22, lineHeight: 24 }]}>+</Text>
      </View>
      <Text style={[typography.caption, { color: colors.primary }]}>Invite</Text>
    </Pressable>
  );
}

import { Image, Text, View } from 'react-native';

import { colors, typography } from '../../theme';
import { avatarInitials } from '../../utils/avatar';
import { isPendingParticipant } from '../../utils/groupParticipants';

export { avatarInitials } from '../../utils/avatar';

export type UserAvatarStatus = 'active' | 'pending' | 'declined' | 'owner';
export type UserAvatarSize = 'small' | 'medium' | 'large';

const SIZE_MAP: Record<UserAvatarSize, number> = {
  small: 36,
  medium: 48,
  large: 72,
};

const STATUS_COLORS: Record<UserAvatarStatus, string> = {
  owner: colors.primary,
  active: colors.success,
  pending: '#F59E0B',
  declined: colors.danger,
};

function resolveSize(size?: number | UserAvatarSize): number {
  if (typeof size === 'number') {
    return size;
  }
  return SIZE_MAP[size ?? 'medium'];
}

export function UserAvatar({
  avatarUrl,
  displayName,
  email,
  initials,
  size = 'medium',
  status,
}: {
  avatarUrl?: string | null;
  displayName?: string | null;
  email?: string | null;
  initials?: string;
  size?: number | UserAvatarSize;
  status?: UserAvatarStatus;
}) {
  const dimension = resolveSize(size);
  const label = initials ?? avatarInitials(displayName, email);
  const statusColor = status ? STATUS_COLORS[status] : undefined;
  const isPending = status === 'pending';

  return (
    <View style={{ width: dimension, height: dimension, position: 'relative' }}>
      <View
        style={{
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          backgroundColor: colors.tertiary,
          borderWidth: isPending ? 2 : 1,
          borderColor: isPending ? STATUS_COLORS.pending : colors.borderSubtle,
          borderStyle: isPending ? 'dashed' : 'solid',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          opacity: isPending ? 0.92 : 1,
        }}
      >
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={{ width: dimension, height: dimension }} />
        ) : (
          <Text
            style={[
              typography.bodyMedium,
              {
                color: colors.textPrimary,
                fontSize: dimension * 0.34,
                lineHeight: dimension * 0.38,
              },
            ]}
          >
            {label}
          </Text>
        )}
      </View>
      {statusColor ? (
        <View
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: Math.max(10, dimension * 0.24),
            height: Math.max(10, dimension * 0.24),
            borderRadius: 999,
            backgroundColor: statusColor,
            borderWidth: 2,
            borderColor: colors.white,
          }}
        />
      ) : null}
    </View>
  );
}

export function memberStatusLabel(
  role?: string,
  invitationStatus?: 'active' | 'pending' | 'declined' | 'removed' | 'cancelled',
): string {
  if (role === 'owner') {
    return 'Owner';
  }
  if (isPendingParticipant({ role, invitationStatus, participantType: 'member' })) {
    return 'Pending';
  }
  if (invitationStatus === 'declined') {
    return 'Declined';
  }
  if (invitationStatus === 'cancelled' || invitationStatus === 'removed') {
    return 'Removed';
  }
  return 'Active';
}

export function memberAvatarStatus(
  role?: string,
  invitationStatus?: 'active' | 'pending' | 'declined' | 'removed' | 'cancelled',
): UserAvatarStatus {
  if (role === 'owner') {
    return 'owner';
  }
  if (isPendingParticipant({ role, invitationStatus, participantType: 'member' })) {
    return 'pending';
  }
  if (invitationStatus === 'declined') {
    return 'declined';
  }
  return 'active';
}

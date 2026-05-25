import { Pressable, Text, View } from 'react-native';

import type { GroupMemberWithProfile } from '../../types/views';
import { colors, spacing, typography } from '../../theme';
import { maskEmail } from '../../utils/validation';
import { memberAvatarStatus, memberStatusLabel, UserAvatar } from '../common/UserAvatar';
import { BottomSheet } from '../common/BottomSheet';
import { PrimaryButton } from '../PrimaryButton';
import { SecondaryButton } from '../SecondaryButton';

export function MemberActionSheet({
  member,
  currentUserRole,
  currentUserId,
  visible,
  loading = false,
  onRemoveMember,
  onCancelInvitation,
  onResendInvitation,
  onClose,
}: {
  member: GroupMemberWithProfile | null;
  currentUserRole?: string;
  currentUserId?: string;
  visible: boolean;
  loading?: boolean;
  onRemoveMember?: (memberId: string) => void;
  onCancelInvitation?: (member: GroupMemberWithProfile) => void;
  onResendInvitation?: (invitationId: string) => void;
  onClose: () => void;
}) {
  if (!member) {
    return null;
  }

  const isOwner = member.role === 'owner';
  const isPending = member.invitationStatus === 'pending';
  const isActive = member.invitationStatus === 'active' && member.isActive !== false;
  const canManage = currentUserRole === 'owner';
  const isSelf = member.userId === currentUserId;
  const status = memberAvatarStatus(member.role, member.invitationStatus);
  const statusLabel = isPending ? 'Pending Invitation' : memberStatusLabel(member.role, member.invitationStatus);
  const emailLabel = member.email ? maskEmail(member.email) : undefined;

  const showRemove = canManage && isActive && !isOwner && !isSelf && onRemoveMember;
  const showCancelInvite = canManage && isPending && onCancelInvitation;
  const showResend = canManage && isPending && member.invitationId && onResendInvitation;

  return (
    <BottomSheet visible={visible} title={member.displayName} onClose={onClose}>
      <View style={{ alignItems: 'center', gap: spacing.md }}>
        <UserAvatar
          avatarUrl={member.avatarUrl}
          displayName={member.displayName}
          email={member.email}
          initials={member.avatarLabel}
          size={72}
          status={status}
        />
        {emailLabel ? (
          <Text style={[typography.body, { color: colors.textSecondary }]}>{emailLabel}</Text>
        ) : null}
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text style={typography.bodyMedium}>
            Role: {isOwner ? 'Owner' : 'Member'}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Status: {statusLabel}</Text>
        </View>
      </View>

      <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
        {showRemove ? (
          <Pressable
            onPress={() => onRemoveMember(member.id)}
            disabled={loading}
            style={{
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: '#FEE2E2',
              alignItems: 'center',
              opacity: loading ? 0.7 : 1,
            }}
          >
            <Text style={[typography.bodyMedium, { color: colors.danger }]}>Remove Member</Text>
          </Pressable>
        ) : null}

        {showCancelInvite ? (
          <Pressable
            onPress={() => onCancelInvitation(member)}
            disabled={loading}
            style={{
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: colors.background,
              alignItems: 'center',
              opacity: loading ? 0.7 : 1,
            }}
          >
            <Text style={[typography.bodyMedium, { color: '#B45309' }]}>Cancel Invitation</Text>
          </Pressable>
        ) : null}

        {showResend ? (
          <PrimaryButton
            label={loading ? 'Sending...' : 'Resend Invitation'}
            onPress={() => onResendInvitation(member.invitationId!)}
            disabled={loading}
          />
        ) : null}

        <SecondaryButton label="Close" onPress={onClose} variant="outline" />
      </View>
    </BottomSheet>
  );
}

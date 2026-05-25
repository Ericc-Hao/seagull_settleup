import { Modal, Pressable, Text, View } from 'react-native';

import { colors, layout, radii, spacing, typography } from '../../theme';
import type { PendingInvitationView } from '../../types/views';
import {
  formatInvitationModalBody,
  formatInvitationModalTitle,
  formatInviterByLine,
  GROUP_INVITATION_NOTIFICATION_TITLE,
  resolveGroupDisplayName,
} from '../../utils/invitationCopy';
import { formatDateForDisplay } from '../../utils/date';
import { Icon } from '../Icon';
import { PrimaryButton } from '../PrimaryButton';
import { SecondaryButton } from '../SecondaryButton';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={[typography.caption, { color: colors.textTertiary }]}>{label}</Text>
      <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

function ModalSkeleton() {
  return (
    <View
      style={{
        backgroundColor: colors.background,
        borderRadius: layout.cardRadius,
        padding: layout.cardPadding,
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
      }}
    >
      <View style={{ height: 14, width: '40%', borderRadius: 7, backgroundColor: colors.tertiary, opacity: 0.5 }} />
      <View style={{ height: 18, width: '70%', borderRadius: 9, backgroundColor: colors.tertiary, opacity: 0.45 }} />
      <View style={{ height: 14, width: '55%', borderRadius: 7, backgroundColor: colors.tertiary, opacity: 0.4 }} />
      <View style={{ height: 14, width: '50%', borderRadius: 7, backgroundColor: colors.tertiary, opacity: 0.35 }} />
    </View>
  );
}

export function InvitationActionModal({
  visible,
  invitation,
  loading = false,
  processing,
  onAccept,
  onDecline,
  onClose,
  onViewGroup,
}: {
  visible: boolean;
  invitation: PendingInvitationView | null;
  loading?: boolean;
  processing?: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
  onViewGroup?: () => void;
}) {
  const isPending = invitation?.status === 'pending';
  const isAccepted = invitation?.status === 'accepted';
  const isDeclined = invitation?.status === 'declined';
  const isUnavailable = invitation?.status === 'expired' || invitation?.status === 'cancelled';

  const groupName = invitation ? resolveGroupDisplayName(invitation.groupName) : '';
  const inviterLine = invitation
    ? formatInviterByLine(invitation.inviterName, invitation.inviterEmail)
    : '';
  const createdLabel = invitation
    ? formatDateForDisplay(new Date(invitation.createdAt))
    : '';

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(28, 35, 64, 0.4)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: colors.white,
            borderTopLeftRadius: radii['2xl'],
            borderTopRightRadius: radii['2xl'],
            paddingTop: spacing.md,
            paddingBottom: layout.cardGap,
            paddingHorizontal: layout.screenPadding,
            gap: spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={typography.title}>
              {loading
                ? GROUP_INVITATION_NOTIFICATION_TITLE
                : isPending
                  ? formatInvitationModalTitle(invitation?.groupName)
                  : GROUP_INVITATION_NOTIFICATION_TITLE}
            </Text>
            <Pressable onPress={onClose} hitSlop={10} disabled={processing}>
              <Icon name="x-mark" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {loading ? (
            <>
              <ModalSkeleton />
              <View style={{ height: 48, borderRadius: layout.cardRadius, backgroundColor: colors.tertiary, opacity: 0.35 }} />
            </>
          ) : invitation ? (
            <>
              <View
                style={{
                  backgroundColor: colors.background,
                  borderRadius: layout.cardRadius,
                  padding: layout.cardPadding,
                  gap: spacing.md,
                  borderWidth: 1,
                  borderColor: colors.borderSubtle,
                }}
              >
                <InfoRow label="Group" value={groupName} />
                <InfoRow label="Invited by" value={inviterLine} />
                {invitation.invitedEmail ? <InfoRow label="Sent to" value={invitation.invitedEmail} /> : null}
                <InfoRow label="Invited" value={createdLabel} />
              </View>

              {isPending ? (
                <>
                  <Text style={[typography.body, { color: colors.textPrimary, lineHeight: 22 }]}>
                    {formatInvitationModalBody({
                      inviterName: invitation.inviterName,
                      inviterEmail: invitation.inviterEmail,
                      groupName: invitation.groupName,
                    })}
                  </Text>
                  <PrimaryButton label="Accept Invitation" onPress={onAccept} disabled={processing} />
                  <SecondaryButton label="Decline" onPress={onDecline} disabled={processing} variant="outline" />
                  <Pressable
                    onPress={onClose}
                    disabled={processing}
                    style={{ paddingVertical: 12, alignItems: 'center' }}
                  >
                    <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>Not Now</Text>
                  </Pressable>
                </>
              ) : null}

              {isAccepted ? (
                <>
                  <Text style={[typography.body, { color: colors.textPrimary, lineHeight: 22 }]}>
                    You have already accepted this invitation.
                  </Text>
                  <PrimaryButton label="View Group" onPress={onViewGroup ?? onClose} />
                  <Pressable onPress={onClose} style={{ paddingVertical: 12, alignItems: 'center' }}>
                    <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>Not Now</Text>
                  </Pressable>
                </>
              ) : null}

              {isDeclined ? (
                <>
                  <Text style={[typography.body, { color: colors.textPrimary, lineHeight: 22 }]}>
                    You declined this invitation.
                  </Text>
                  <Pressable onPress={onClose} style={{ paddingVertical: 12, alignItems: 'center' }}>
                    <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>Not Now</Text>
                  </Pressable>
                </>
              ) : null}

              {isUnavailable && !isPending && !isAccepted && !isDeclined ? (
                <>
                  <Text style={[typography.body, { color: colors.textPrimary, lineHeight: 22 }]}>
                    This invitation is no longer available.
                  </Text>
                  <Pressable onPress={onClose} style={{ paddingVertical: 12, alignItems: 'center' }}>
                    <Text style={[typography.bodyMedium, { color: colors.textSecondary }]}>Not Now</Text>
                  </Pressable>
                </>
              ) : null}
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

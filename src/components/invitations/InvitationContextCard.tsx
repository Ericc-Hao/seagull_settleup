import { ActivityIndicator, Text, View } from 'react-native';

import { colors, layout, radii, spacing, typography } from '../../theme';
import type { InvitationPreviewView } from '../../types/views';
import { formatInviterByLine } from '../../utils/invitationCopy';
import { maskEmail } from '../../utils/validation';

export function InvitationContextCard({
  inviteToken,
  preview,
  loading = false,
  fetchFailed = false,
}: {
  inviteToken?: string;
  preview?: InvitationPreviewView | null;
  loading?: boolean;
  fetchFailed?: boolean;
}) {
  if (!inviteToken?.trim()) {
    return null;
  }

  if (loading) {
    return (
      <View
        style={{
          backgroundColor: colors.background,
          borderRadius: radii.lg,
          padding: layout.cardPadding,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
          alignItems: 'center',
          gap: spacing.sm,
        }}
      >
        <ActivityIndicator color={colors.primary} />
        <Text style={[typography.caption, { color: colors.textSecondary }]}>Loading invitation...</Text>
      </View>
    );
  }

  const isPending = preview?.status === 'pending' && preview.isValid;

  if (fetchFailed || !preview || !isPending) {
    return (
      <View
        style={{
          backgroundColor: colors.background,
          borderRadius: radii.lg,
          padding: layout.cardPadding,
          gap: spacing.xs,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
        }}
      >
        <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>Invitation unavailable</Text>
        <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 18 }]}>
          This invitation link is invalid, expired, or has already been used.
        </Text>
        <Text style={[typography.caption, { color: colors.textTertiary, lineHeight: 18 }]}>
          You can still create an account below.
        </Text>
      </View>
    );
  }

  const inviterLine = formatInviterByLine(preview.inviterName, preview.inviterEmail);
  const invitedEmailLabel = preview.invitedEmail ? maskEmail(preview.invitedEmail) : 'your invited email';

  return (
    <View
      style={{
        backgroundColor: colors.background,
        borderRadius: radii.lg,
        padding: layout.cardPadding,
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
      }}
    >
      <Text style={[typography.caption, { color: colors.textSecondary }]}>You've been invited</Text>
      <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>
        {inviterLine} invited you to join "{preview.groupName}".
      </Text>
      <Text style={[typography.caption, { color: colors.textTertiary, lineHeight: 18 }]}>
        Create an account with {invitedEmailLabel} to accept this invitation.
      </Text>
    </View>
  );
}

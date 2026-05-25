import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { getInvitationPreviewByToken } from '../../services/invitationService';
import { colors, layout, radii, spacing, typography } from '../../theme';
import type { InvitationPreviewView } from '../../types/views';
import { formatInviterByLine } from '../../utils/invitationCopy';
import { createLogger } from '../../utils/logger';

const logger = createLogger('InvitationContextCard');

export function InvitationContextCard({ inviteToken }: { inviteToken?: string }) {
  const [preview, setPreview] = useState<InvitationPreviewView | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = inviteToken?.trim();
    if (!trimmed) {
      setPreview(null);
      return;
    }

    let mounted = true;
    setLoading(true);
    logger.info('Invitation context card load started');

    void getInvitationPreviewByToken(trimmed)
      .then((result) => {
        if (mounted) {
          setPreview(result);
        }
      })
      .catch(() => {
        if (mounted) {
          setPreview(null);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [inviteToken]);

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
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!preview || !preview.isValid) {
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
        <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>
          This invitation link is invalid or expired.
        </Text>
      </View>
    );
  }

  const inviterLine = formatInviterByLine(preview.inviterName, preview.inviterEmail);

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
      <Text style={[typography.caption, { color: colors.textSecondary }]}>Group invitation</Text>
      <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>
        Invitation to join {preview.groupName}
      </Text>
      <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22 }]}>
        Invited by {inviterLine}
      </Text>
      <Text style={[typography.caption, { color: colors.textTertiary, lineHeight: 18 }]}>
        You've been invited to join a group on Seagull Split. Create an account with the invited email
        to continue.
      </Text>
    </View>
  );
}

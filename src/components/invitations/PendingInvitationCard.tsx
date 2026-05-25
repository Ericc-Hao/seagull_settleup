import { Text, View } from 'react-native';

import { formatInvitationNotificationBody } from '../../utils/invitationCopy';
import { colors, layout, typography } from '../../theme';
import type { PendingInvitationView } from '../../types/views';
import { formatDateForDisplay } from '../../utils/date';
import { PrimaryButton } from '../PrimaryButton';
import { SecondaryButton } from '../SecondaryButton';

export function PendingInvitationCard({
  invitation,
  processing,
  onAccept,
  onDecline,
}: {
  invitation: PendingInvitationView;
  processing?: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const message = formatInvitationNotificationBody({
    inviterName: invitation.inviterName,
    inviterEmail: invitation.inviterEmail,
    groupName: invitation.groupName,
  });
  const createdLabel = formatDateForDisplay(new Date(invitation.createdAt));

  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: layout.cardRadius,
        padding: layout.cardPadding,
        gap: layout.cardGap,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
      }}
    >
      <View style={{ gap: 4 }}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>Pending invitation</Text>
        <Text style={typography.bodyMedium}>{message}</Text>
        {invitation.groupType ? (
          <Text style={[typography.caption, { color: colors.textTertiary }]}>{invitation.groupType}</Text>
        ) : null}
        <Text style={[typography.caption, { color: colors.textTertiary }]}>{createdLabel}</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <PrimaryButton label="Accept" onPress={onAccept} disabled={processing} />
        </View>
        <View style={{ flex: 1 }}>
          <SecondaryButton label="Decline" onPress={onDecline} disabled={processing} variant="outline" />
        </View>
      </View>
    </View>
  );
}

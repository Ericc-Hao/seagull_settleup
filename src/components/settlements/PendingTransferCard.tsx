import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import type { PendingTransferView } from '../../types/views';
import { colors, layout, radii, shadows, spacing, typography } from '../../theme';
import { UserAvatar } from '../common/UserAvatar';
import { PrimaryButton } from '../PrimaryButton';
import { SecondaryButton } from '../SecondaryButton';
import { buildPaymentDetailsCopyText } from '../../utils/paymentCopy';
import { copyText } from '../../utils/clipboard';
import { createLogger } from '../../utils/logger';
import { PaymentDetailsCard } from './PaymentDetailsCard';

const logger = createLogger('PendingTransferCard');

export function PendingTransferCard({
  transfer,
  onMarkPaid,
  marking,
}: {
  transfer: PendingTransferView;
  onMarkPaid: () => void;
  marking?: boolean;
}) {
  const paymentEmail = transfer.receiverTransferEmail ?? transfer.receiverEmail;
  const paymentMessage = transfer.paymentMessage;
  const [copyAllFeedback, setCopyAllFeedback] = useState(false);

  useEffect(() => {
    if (!copyAllFeedback) {
      return;
    }
    const timer = setTimeout(() => setCopyAllFeedback(false), 1500);
    return () => clearTimeout(timer);
  }, [copyAllFeedback]);

  const handleCopyAll = async () => {
    const text = buildPaymentDetailsCopyText({
      recipientName: transfer.receiverName,
      recipientEmail: paymentEmail,
      recipientPhone: transfer.receiverEmtPhone,
      amountLabel: transfer.amountDisplay,
      message: paymentMessage,
    });
    const success = await copyText(text, 'all');
    if (success) {
      setCopyAllFeedback(true);
      logger.info('Payment field copied', { field: 'all', groupId: transfer.groupId, transferId: transfer.id });
    } else {
      logger.warn('Copy payment field failed', { field: 'all', groupId: transfer.groupId, transferId: transfer.id });
    }
  };

  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: layout.cardRadius,
        padding: layout.cardPadding,
        gap: spacing.md,
        ...shadows.cardSoft,
      }}
    >
      <View style={{ gap: 6 }}>
        <Text style={[typography.caption, { color: colors.textSecondary, letterSpacing: 0.2 }]}>
          Pay {transfer.receiverName}
        </Text>
        <Text style={[typography.sectionTitle, { fontSize: 28, lineHeight: 34 }]}>
          {transfer.amountDisplay}
        </Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          For group: {transfer.groupName}
        </Text>
      </View>

      <View
        style={{
          backgroundColor: colors.background,
          borderRadius: radii.md,
          padding: 14,
          gap: spacing.sm,
        }}
      >
        <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>
          Recipient
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <UserAvatar
            avatarUrl={transfer.receiverAvatarUrl}
            displayName={transfer.receiverName}
            email={transfer.receiverEmail}
            initials={transfer.receiverAvatarLabel}
            size="small"
          />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={typography.bodyMedium}>{transfer.receiverName}</Text>
            {paymentEmail ? (
              <Text style={[typography.caption, { color: colors.textSecondary }]}>{paymentEmail}</Text>
            ) : (
              <Text style={[typography.caption, { color: colors.textTertiary }]}>Email not added</Text>
            )}
          </View>
        </View>
      </View>

      <PaymentDetailsCard
        groupId={transfer.groupId}
        transferId={transfer.id}
        recipientName={transfer.receiverName}
        recipientEmail={paymentEmail}
        recipientPhone={transfer.receiverEmtPhone}
        amountLabel={transfer.amountDisplay}
        message={paymentMessage}
      />

      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <SecondaryButton
            label={copyAllFeedback ? 'Copied' : 'Copy All'}
            icon="document-duplicate"
            onPress={() => void handleCopyAll()}
            variant="outline"
          />
        </View>
        <View style={{ flex: 1 }}>
          <PrimaryButton
            label={marking ? 'Saving…' : 'Mark as Paid'}
            icon="check-circle"
            onPress={onMarkPaid}
            disabled={marking}
          />
        </View>
      </View>
    </View>
  );
}

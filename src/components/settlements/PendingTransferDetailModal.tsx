import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import type { PendingTransferView } from '../../types/views';
import { colors, layout, radii, spacing, typography } from '../../theme';
import { UserAvatar } from '../common/UserAvatar';
import { PrimaryButton } from '../PrimaryButton';
import { SecondaryButton } from '../SecondaryButton';
import { BottomSheet } from '../common/BottomSheet';
import { buildPaymentDetailsCopyText } from '../../utils/paymentCopy';
import { copyText } from '../../utils/clipboard';
import { createLogger } from '../../utils/logger';
import { PaymentDetailsCard } from './PaymentDetailsCard';
import { GroupTagPill } from './GroupTagPill';

const logger = createLogger('PendingTransferDetailModal');

export function PendingTransferDetailModal({
  visible,
  transfer,
  showGroupTag = false,
  marking,
  onClose,
  onMarkPaid,
}: {
  visible: boolean;
  transfer: PendingTransferView | null;
  showGroupTag?: boolean;
  marking?: boolean;
  onClose: () => void;
  onMarkPaid: () => void;
}) {
  const [copyAllFeedback, setCopyAllFeedback] = useState(false);

  useEffect(() => {
    if (!copyAllFeedback) {
      return;
    }
    const timer = setTimeout(() => setCopyAllFeedback(false), 1500);
    return () => clearTimeout(timer);
  }, [copyAllFeedback]);

  if (!transfer) {
    return null;
  }

  const paymentEmail = transfer.receiverTransferEmail ?? transfer.receiverEmail;
  const paymentMessage = transfer.paymentMessage;

  const handleCopyAll = async () => {
    const text = buildPaymentDetailsCopyText({
      recipientName: transfer.receiverName,
      recipientEmail: paymentEmail,
      recipientPhone: transfer.receiverEmtPhone,
      amountLabel: transfer.amountDisplay,
      message: paymentMessage,
      groupName: showGroupTag ? transfer.groupName : undefined,
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
    <BottomSheet
      visible={visible}
      title={`Pay ${transfer.receiverName}`}
      onClose={onClose}
      footer={
        <>
          <SecondaryButton
            label={copyAllFeedback ? 'Copied' : 'Copy All'}
            icon="document-duplicate"
            onPress={() => void handleCopyAll()}
            variant="outline"
          />
          <PrimaryButton
            label={marking ? 'Saving…' : 'Mark as Paid'}
            icon="check-circle"
            onPress={onMarkPaid}
            disabled={marking}
          />
        </>
      }
    >
      <View style={{ gap: spacing.md }}>
        <View style={{ gap: 4 }}>
          <Text style={[typography.sectionTitle, { fontSize: 28, lineHeight: 34 }]}>{transfer.amountDisplay}</Text>
          {showGroupTag && transfer.groupName ? (
            <GroupTagPill groupName={transfer.groupName} />
          ) : (
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              For group: {transfer.groupName}
            </Text>
          )}
        </View>

        <View
          style={{
            backgroundColor: colors.background,
            borderRadius: radii.md,
            padding: 14,
            gap: spacing.sm,
          }}
        >
          <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>Recipient</Text>
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
                <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
                  {paymentEmail}
                </Text>
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
      </View>
    </BottomSheet>
  );
}

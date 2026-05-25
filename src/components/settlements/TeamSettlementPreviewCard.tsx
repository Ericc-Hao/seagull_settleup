import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import type { PendingTransferView } from '../../types/views';
import { colors, layout, radii, spacing, typography } from '../../theme';
import { UserAvatar } from '../common/UserAvatar';
import { SecondaryButton } from '../SecondaryButton';
import { formatCAD } from '../../utils/money';
import { PaymentDetailsCard } from './PaymentDetailsCard';
import { buildPaymentDetailsCopyText } from '../../utils/paymentCopy';
import { copyText } from '../../utils/clipboard';
import { createLogger } from '../../utils/logger';

const logger = createLogger('TeamSettlementPreviewCard');

export function TeamSettlementPreviewCard({
  transfer,
  emptyMessage,
  showPaymentDetails = true,
  showCopyActions = true,
}: {
  transfer?: PendingTransferView | null;
  emptyMessage?: string;
  showPaymentDetails?: boolean;
  showCopyActions?: boolean;
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
    return (
      <View
        style={{
          backgroundColor: colors.background,
          borderRadius: layout.cardRadius,
          padding: layout.cardPadding,
          gap: spacing.xs,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
        }}
      >
        <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>No team transfer needed</Text>
        <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 18 }]}>
          {emptyMessage ?? 'This selected team is already settled.'}
        </Text>
      </View>
    );
  }

  const requiresPayment = transfer.requiresPayment ?? transfer.amountCents > 0;
  const paymentEmail = transfer.receiverTransferEmail ?? transfer.receiverEmail;
  const paymentMessage = transfer.paymentMessage?.trim() ?? '';
  const coveredEntries = transfer.coveredBalances?.filter((entry) => entry.coveredAmountCents > 0) ?? [];
  const selectedMemberNames = transfer.selectedMemberNames ?? [];

  const handleCopyAll = async () => {
    if (!requiresPayment) {
      return;
    }
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
        backgroundColor: colors.background,
        borderRadius: layout.cardRadius,
        padding: 14,
        gap: spacing.xs,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
      }}
    >
      <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>
        {requiresPayment ? 'Team transfer preview' : 'No payment required'}
      </Text>

      {transfer.explanation ? (
        <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 18 }]}>
          {transfer.explanation}
        </Text>
      ) : null}

      {requiresPayment ? (
        <>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            Team pays {transfer.receiverName}
          </Text>
          <Text style={[typography.sectionTitle, { fontSize: 22, lineHeight: 28 }]}>{transfer.amountDisplay}</Text>
        </>
      ) : null}

      {transfer.teamBalanceCents !== undefined ? (
        <Text style={[typography.caption, { color: colors.textTertiary }]}>
          Combined team balance: {formatCAD(transfer.teamBalanceCents, { includeSuffix: true })}
        </Text>
      ) : null}

      {selectedMemberNames.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>
            Selected members
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {selectedMemberNames.join(', ')}
          </Text>
        </View>
      ) : null}

      {requiresPayment && transfer.receiverName ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            backgroundColor: colors.white,
            borderRadius: radii.md,
            padding: 10,
          }}
        >
          <UserAvatar
            avatarUrl={transfer.receiverAvatarUrl}
            displayName={transfer.receiverName}
            email={transfer.receiverEmail}
            initials={transfer.receiverAvatarLabel}
            size="small"
          />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={typography.bodyMedium}>{transfer.receiverName}</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>{transfer.fromLabel}</Text>
          </View>
        </View>
      ) : null}

      {coveredEntries.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>
            Balances covered
          </Text>
          {coveredEntries.map((entry) => (
            <Text
              key={entry.memberId}
              style={[typography.caption, { color: colors.textSecondary, lineHeight: 17 }]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {entry.memberName}: {formatCAD(entry.balanceBeforeCents, { includeSuffix: true })}
              {entry.role === 'debtor'
                ? ' (debt cleared)'
                : entry.role === 'creditor'
                  ? ' (receivable offset)'
                  : entry.role === 'offset'
                    ? ' (offset)'
                    : ''}
            </Text>
          ))}
        </View>
      ) : null}

      {requiresPayment && showPaymentDetails && transfer.receiverName && paymentMessage ? (
        <PaymentDetailsCard
          groupId={transfer.groupId}
          transferId={transfer.id}
          recipientName={transfer.receiverName}
          recipientEmail={paymentEmail}
          recipientPhone={transfer.receiverEmtPhone}
          amountLabel={transfer.amountDisplay}
          message={paymentMessage}
        />
      ) : null}

      {requiresPayment && showCopyActions ? (
        <SecondaryButton
          label={copyAllFeedback ? 'Copied' : 'Copy All'}
          icon="document-duplicate"
          onPress={() => void handleCopyAll()}
          variant="outline"
        />
      ) : null}
    </View>
  );
}

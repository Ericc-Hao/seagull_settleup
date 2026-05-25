import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import { PAYMENT_COPY_FEEDBACK } from '../../utils/paymentCopy';
import { copyText } from '../../utils/clipboard';
import { createLogger } from '../../utils/logger';
import { PaymentDetailRow } from './PaymentDetailRow';

const logger = createLogger('PaymentDetailsCard');

export type PaymentCopyField = 'name' | 'email' | 'phone' | 'amount' | 'message' | 'all';

export function PaymentDetailsCard({
  groupId,
  transferId,
  recipientName,
  recipientEmail,
  recipientPhone,
  amountLabel,
  message,
}: {
  groupId: string;
  transferId: string;
  recipientName: string;
  recipientEmail?: string;
  recipientPhone?: string;
  amountLabel: string;
  message: string;
}) {
  const [copiedField, setCopiedField] = useState<PaymentCopyField | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!copiedField) {
      return;
    }
    const timer = setTimeout(() => {
      setCopiedField(null);
      setFeedback(null);
    }, 1500);
    return () => clearTimeout(timer);
  }, [copiedField]);

  const handleCopy = useCallback(
    async (field: PaymentCopyField, value: string) => {
      const success = await copyText(value, field);
      if (success) {
        setCopiedField(field);
        setFeedback(PAYMENT_COPY_FEEDBACK[field] ?? 'Copied');
        logger.info('Payment field copied', { field, groupId, transferId });
      } else {
        logger.warn('Copy payment field failed', { field, groupId, transferId });
      }
    },
    [groupId, transferId],
  );

  const emailCopyValue = recipientEmail?.trim();
  const phoneCopyValue = recipientPhone?.trim();

  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>
        Payment Details
      </Text>
      <View
        style={{
          backgroundColor: colors.background,
          borderRadius: radii.md,
          padding: 12,
          gap: 4,
        }}
      >
        <PaymentDetailRow
          label="Name"
          value={recipientName}
          copyValue={recipientName}
          copied={copiedField === 'name'}
          onCopy={() => void handleCopy('name', recipientName)}
        />
        <PaymentDetailRow
          label="Email"
          value={emailCopyValue ?? 'Email not added'}
          copyValue={emailCopyValue}
          disabled={!emailCopyValue}
          copied={copiedField === 'email'}
          onCopy={
            emailCopyValue ? () => void handleCopy('email', emailCopyValue) : undefined
          }
        />
        {phoneCopyValue ? (
          <PaymentDetailRow
            label="Phone"
            value={phoneCopyValue}
            copyValue={phoneCopyValue}
            copied={copiedField === 'phone'}
            onCopy={() => void handleCopy('phone', phoneCopyValue)}
          />
        ) : null}
        <PaymentDetailRow
          label="Amount"
          value={amountLabel}
          copyValue={amountLabel}
          copied={copiedField === 'amount'}
          onCopy={() => void handleCopy('amount', amountLabel)}
        />
        <PaymentDetailRow
          label="Message"
          value={message}
          copyValue={message}
          copied={copiedField === 'message'}
          onCopy={() => void handleCopy('message', message)}
        />
      </View>
      {feedback ? (
        <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>{feedback}</Text>
      ) : null}
    </View>
  );
}

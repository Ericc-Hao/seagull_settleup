import { Modal, Pressable, Text, View } from 'react-native';

import type { PendingTransferView } from '../../types/views';
import { colors, layout, radii, spacing, typography } from '../../theme';
import { PrimaryButton } from '../PrimaryButton';
import { SecondaryButton } from '../SecondaryButton';

export function MarkPaidConfirmModal({
  visible,
  transfer,
  onCancel,
  onConfirm,
  confirming,
}: {
  visible: boolean;
  transfer: PendingTransferView | null;
  onCancel: () => void;
  onConfirm: () => void;
  confirming?: boolean;
}) {
  if (!transfer) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        onPress={onCancel}
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          justifyContent: 'center',
          padding: layout.screenPadding,
        }}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            backgroundColor: colors.white,
            borderRadius: radii.lg,
            padding: layout.cardPadding,
            gap: spacing.md,
          }}
        >
          <Text style={typography.sectionTitle}>Mark this transfer as paid?</Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Confirm that you sent {transfer.amountDisplay} to {transfer.receiverName}. This transfer will be
            removed from your pending transfers.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <SecondaryButton label="Cancel" onPress={onCancel} variant="outline" disabled={confirming} />
            </View>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                label={confirming ? 'Saving…' : 'Mark as Paid'}
                onPress={onConfirm}
                disabled={confirming}
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

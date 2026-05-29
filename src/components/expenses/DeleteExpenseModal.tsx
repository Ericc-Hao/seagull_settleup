import { Modal, Pressable, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import { SecondaryButton } from '../SecondaryButton';

export function DeleteExpenseModal({
  visible,
  onCancel,
  onConfirm,
  loading = false,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(28, 35, 64, 0.4)',
          justifyContent: 'center',
          padding: spacing.lg,
        }}
        onPress={onCancel}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            backgroundColor: colors.white,
            borderRadius: radii.xl,
            padding: spacing.lg,
            gap: spacing.md,
          }}
        >
          <Text style={typography.title}>Delete expense?</Text>
          <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22 }]}>
            This expense will be removed from your records and balances will be recalculated.
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <SecondaryButton label="Cancel" onPress={onCancel} variant="outline" disabled={loading} />
            </View>
            <View style={{ flex: 1 }}>
              <Pressable
                onPress={onConfirm}
                disabled={loading}
                style={{
                  backgroundColor: colors.danger,
                  borderRadius: radii.lg,
                  paddingVertical: 14,
                  alignItems: 'center',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                <Text style={[typography.bodyMedium, { color: colors.white }]}>
                  {loading ? 'Deleting...' : 'Delete'}
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

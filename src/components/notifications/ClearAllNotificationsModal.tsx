import { Modal, Pressable, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import { SecondaryButton } from '../SecondaryButton';

export function ClearAllNotificationsModal({
  visible,
  loading = false,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
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
          <Text style={typography.title}>Clear all notifications?</Text>
          <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22 }]}>
            This will remove all notifications from this list.
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
                  {loading ? 'Clearing…' : 'Clear All'}
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

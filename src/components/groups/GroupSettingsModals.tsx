import { Modal, Pressable, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import { PrimaryButton } from '../PrimaryButton';
import { SecondaryButton } from '../SecondaryButton';

export function DeleteGroupModal({
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
    <ConfirmModal
      visible={visible}
      title="Delete Group?"
      body="This will permanently delete this group and its shared expenses. This action cannot be undone."
      confirmLabel={loading ? 'Deleting...' : 'Delete Group'}
      onCancel={onCancel}
      onConfirm={onConfirm}
      destructive
      loading={loading}
    />
  );
}

export function ReactivateGroupModal({
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
    <ConfirmModal
      visible={visible}
      title="Reactivate Group?"
      body="This group will appear in active groups again and members can add new shared expenses."
      confirmLabel={loading ? 'Updating...' : 'Reactivate Group'}
      onCancel={onCancel}
      onConfirm={onConfirm}
      loading={loading}
    />
  );
}

export function SetInactiveModal({
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
    <ConfirmModal
      visible={visible}
      title="Set Group Inactive?"
      body="This group will be hidden from active groups, but its history will remain available."
      confirmLabel={loading ? 'Updating...' : 'Set Inactive'}
      onCancel={onCancel}
      onConfirm={onConfirm}
      loading={loading}
    />
  );
}

function ConfirmModal({
  visible,
  title,
  body,
  confirmLabel,
  onCancel,
  onConfirm,
  destructive = false,
  loading = false,
}: {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  destructive?: boolean;
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
          <Text style={typography.title}>{title}</Text>
          <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22 }]}>{body}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <SecondaryButton label="Cancel" onPress={onCancel} variant="outline" />
            </View>
            <View style={{ flex: 1 }}>
              {destructive ? (
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
                  <Text style={[typography.bodyMedium, { color: colors.white }]}>{confirmLabel}</Text>
                </Pressable>
              ) : (
                <PrimaryButton label={confirmLabel} onPress={onConfirm} disabled={loading} />
              )}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

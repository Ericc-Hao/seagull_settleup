import type { ReactNode } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';

export function BottomSheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(28, 35, 64, 0.4)',
          justifyContent: 'flex-end',
        }}
        onPress={onClose}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            backgroundColor: colors.white,
            borderTopLeftRadius: radii['2xl'],
            borderTopRightRadius: radii['2xl'],
            paddingTop: spacing.md,
            paddingBottom: spacing.xl,
            paddingHorizontal: spacing.lg,
            gap: spacing.md,
            maxHeight: '85%',
          }}
        >
          <View
            style={{
              alignSelf: 'center',
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.borderSubtle,
              marginBottom: spacing.xs,
            }}
          />
          {title ? <Text style={typography.title}>{title}</Text> : null}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

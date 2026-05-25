import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, spacing, typography } from '../../theme';

export function BottomSheet({
  visible,
  title,
  onClose,
  children,
  footer,
}: {
  visible: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const sheetMaxHeight = windowHeight * 0.85;

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
            maxHeight: sheetMaxHeight,
            width: '100%',
          }}
        >
          <View
            style={{
              maxHeight: sheetMaxHeight,
              flexDirection: 'column',
            }}
          >
            <View
              style={{
                paddingTop: spacing.md,
                paddingHorizontal: spacing.lg,
                gap: spacing.sm,
              }}
            >
              <View
                style={{
                  alignSelf: 'center',
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: colors.borderSubtle,
                }}
              />
              {title ? <Text style={typography.title}>{title}</Text> : null}
            </View>

            <ScrollView
              style={{ flexGrow: 0, flexShrink: 1, minHeight: 0 }}
              contentContainerStyle={{
                paddingHorizontal: spacing.lg,
                paddingTop: spacing.sm,
                paddingBottom: footer ? spacing.md : spacing.xl + insets.bottom,
                gap: spacing.md,
              }}
              showsVerticalScrollIndicator
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>

            {footer ? (
              <View
                style={{
                  paddingHorizontal: spacing.lg,
                  paddingTop: spacing.sm,
                  paddingBottom: spacing.lg + insets.bottom,
                  gap: spacing.sm,
                  borderTopWidth: 1,
                  borderTopColor: colors.borderSubtle,
                  backgroundColor: colors.white,
                }}
              >
                {footer}
              </View>
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

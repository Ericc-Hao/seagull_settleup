import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { Image } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import { Icon } from '../Icon';

export function ReceiptViewerModal({
  visible,
  receiptUrl,
  fileName,
  onClose,
}: {
  visible: boolean;
  receiptUrl?: string | null;
  fileName?: string | null;
  onClose: () => void;
}) {
  if (!receiptUrl) {
    return null;
  }

  const openInNewTab = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(receiptUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(28, 35, 64, 0.92)',
          paddingTop: spacing.xl,
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.xl,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing.md,
          }}
        >
          <Text style={[typography.bodyMedium, { color: colors.white, flex: 1 }]}>
            {fileName?.trim() || 'Receipt'}
          </Text>
          <Pressable
            onPress={onClose}
            accessibilityLabel="Close receipt viewer"
            style={{
              width: 36,
              height: 36,
              borderRadius: radii.pill,
              backgroundColor: 'rgba(255,255,255,0.12)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="x-mark" size={18} color={colors.white} strokeWidth={2} />
          </Pressable>
        </View>

        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Image
            source={{ uri: receiptUrl }}
            accessibilityLabel={fileName ? `Receipt: ${fileName}` : 'Receipt image'}
            style={{
              width: '100%',
              flex: 1,
              borderRadius: radii.lg,
            }}
            resizeMode="contain"
          />
        </View>

        {Platform.OS === 'web' ? (
          <Pressable onPress={openInNewTab} style={{ alignSelf: 'center', marginTop: spacing.md }}>
            <Text style={[typography.caption, { color: colors.white, textDecorationLine: 'underline' }]}>
              Open in new tab
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Modal>
  );
}

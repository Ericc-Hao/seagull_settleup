import { Pressable, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import { Icon, IconName } from '../Icon';

function ActionButton({ icon, label, onPress }: { icon: IconName; label: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        borderRadius: radii.md,
        backgroundColor: colors.background,
      }}
    >
      <Icon name={icon} size={18} color={colors.primary} strokeWidth={1.5} />
      <Text style={[typography.caption, { fontWeight: '600', color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

export function ReceiptActions({
  onTakePhoto,
  onUpload,
}: {
  onTakePhoto?: () => void;
  onUpload?: () => void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <ActionButton icon="camera" label="Take Photo" onPress={onTakePhoto} />
      <ActionButton icon="arrow-up-tray" label="Upload" onPress={onUpload} />
    </View>
  );
}

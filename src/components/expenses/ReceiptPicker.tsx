import * as ImagePicker from 'expo-image-picker';
import { Alert, Image, Pressable, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import { Icon } from '../Icon';
import { createLogger } from '../../utils/logger';

const logger = createLogger('ReceiptPicker');

function ActionButton({
  icon,
  label,
  onPress,
}: {
  icon: 'camera' | 'arrow-up-tray';
  label: string;
  onPress: () => void;
}) {
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
        borderWidth: 1,
        borderColor: colors.borderSubtle,
      }}
    >
      <Icon name={icon} size={18} color={colors.primary} strokeWidth={1.5} />
      <Text style={[typography.caption, { fontWeight: '600', color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

export function ReceiptPicker({
  receiptUri,
  onChange,
}: {
  receiptUri?: string;
  onChange: (uri: string | undefined) => void;
}) {
  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera permission required', 'Allow camera access to take a receipt photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      logger.info('Receipt picked from camera');
      onChange(result.assets[0].uri);
    }
  };

  const uploadPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo library permission required', 'Allow photo library access to upload a receipt.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      logger.info('Receipt picked from library');
      onChange(result.assets[0].uri);
    }
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <ActionButton icon="camera" label="Take Photo" onPress={() => void takePhoto()} />
        <ActionButton icon="arrow-up-tray" label="Upload" onPress={() => void uploadPhoto()} />
      </View>
      {receiptUri ? (
        <View style={{ gap: spacing.sm }}>
          <Image
            source={{ uri: receiptUri }}
            style={{ width: '100%', height: 180, borderRadius: radii.lg, backgroundColor: colors.tertiary }}
            resizeMode="cover"
          />
          <Pressable onPress={() => onChange(undefined)} style={{ alignSelf: 'flex-start' }}>
            <Text style={[typography.caption, { color: colors.danger, fontWeight: '600' }]}>Remove receipt</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

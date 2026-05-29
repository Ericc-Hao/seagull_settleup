import * as ImagePicker from 'expo-image-picker';
import { Image, Pressable, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';

export function AvatarPicker({
  uri,
  displayName,
  onPick,
}: {
  uri?: string;
  displayName: string;
  onPick: (uri: string) => void;
}) {
  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      onPick(result.assets[0].uri);
    }
  };

  return (
    <Pressable onPress={() => void pickAvatar()} style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 28,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.borderSubtle,
        }}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width: 80, height: 80 }} />
        ) : (
          <Text style={[typography.amountSm, { color: colors.primary }]}>
            {(displayName.trim() || 'S').charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
      <Text style={[typography.caption, { fontWeight: '600', color: colors.primary, marginTop: spacing.sm }]}>
        {uri ? 'Change Avatar' : 'Add Avatar'}
      </Text>
    </Pressable>
  );
}

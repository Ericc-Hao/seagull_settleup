import { Pressable, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';
import { Icon } from '../Icon';
import { SeagullMascot } from '../SeagullAvatar';

export function HomeGreetingHeader({
  greeting,
  subtitle,
  onNotificationPress,
}: {
  greeting: string;
  subtitle: string;
  onNotificationPress?: () => void;
}) {
  return (
    <View
      style={{
        paddingHorizontal: spacing.screenX,
        paddingTop: spacing.sm,
        paddingBottom: spacing.lg,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <SeagullMascot size={48} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={typography.headline}>{greeting}</Text>
          <Text style={[typography.caption, { marginTop: 4, lineHeight: 18 }]}>{subtitle}</Text>
        </View>
        <Pressable
          onPress={onNotificationPress}
          hitSlop={12}
          style={{
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="bell" size={22} color={colors.textPrimary} strokeWidth={1.5} />
          <View
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 7,
              height: 7,
              borderRadius: 4,
              backgroundColor: '#EF4444',
            }}
          />
        </Pressable>
      </View>
    </View>
  );
}

import { Pressable, Text, View } from 'react-native';

import { colors, layout, typography } from '../../theme';
import { Icon } from '../Icon';
import { ShadowSurface } from '../layout/ShadowSurface';

const HOME_SPLIT_GROUP_CARD_MIN_HEIGHT = 122;

export function HomeSplitGroupCard({
  name,
  balance,
  positive,
  onPress,
}: {
  name: string;
  balance: string;
  positive: boolean;
  onPress?: () => void;
}) {
  const balanceColor = positive ? colors.success : colors.owe;

  return (
    <ShadowSurface
      shadow="cardSoft"
      style={{ flex: 1, alignSelf: 'stretch', minHeight: HOME_SPLIT_GROUP_CARD_MIN_HEIGHT }}
      innerStyle={{ flex: 1 }}
    >
      <Pressable
        onPress={onPress}
        style={{
          flex: 1,
          minHeight: HOME_SPLIT_GROUP_CARD_MIN_HEIGHT,
          padding: layout.cardPadding,
          justifyContent: 'space-between',
        }}
      >
        <View style={{ minWidth: 0 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.background,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 10,
            }}
          >
            <Icon name="user-group" size={18} color={colors.primary} />
          </View>
          <Text style={typography.bodyMedium} numberOfLines={1} ellipsizeMode="tail">
            {name}
          </Text>
        </View>
        <Text
          style={[typography.caption, { color: balanceColor, marginTop: 6, fontWeight: '600', minWidth: 0 }]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {balance}
        </Text>
      </Pressable>
    </ShadowSurface>
  );
}

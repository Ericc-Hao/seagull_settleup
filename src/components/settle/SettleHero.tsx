import { View } from 'react-native';

import { colors, radii, shadows, spacing } from '../../theme';
import { SeagullMascot } from '../SeagullAvatar';

export function SettleHero() {
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xl,
        backgroundColor: colors.white,
        borderRadius: radii.lg,
        ...shadows.cardSoft,
      }}
    >
      <SeagullMascot size={72} />
    </View>
  );
}

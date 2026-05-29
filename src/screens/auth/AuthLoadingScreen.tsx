import { ActivityIndicator, Text, View } from 'react-native';

import { AppLogo, ScreenLayout } from '../../components';
import { colors, spacing, typography } from '../../theme';

export function AuthLoadingScreen() {
  return (
    <ScreenLayout scroll={false} contentStyle={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <AppLogo size={72} />
      <View style={{ marginTop: spacing.md }}>
        <ActivityIndicator color={colors.primary} />
      </View>
      <Text style={[typography.caption, { marginTop: spacing.sm, color: colors.textSecondary }]}>
        Checking your session...
      </Text>
    </ScreenLayout>
  );
}

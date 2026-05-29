import { router } from 'expo-router';
import { Platform, Pressable, Text, View } from 'react-native';

import { PrimaryButton, SecondaryButton } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography } from '../../theme';
import { AuthFormShell, AuthNoticeText } from './AuthFormShell';

export function WelcomeScreen() {
  const { sessionNotice, clearSessionNotice } = useAuth();

  return (
    <AuthFormShell title="Seagull Split" subtitle="Track spending. Split bills. Settle in CAD." compact>
      {sessionNotice ? <AuthNoticeText message={sessionNotice} onDismiss={clearSessionNotice} /> : null}
      <PrimaryButton label="Create Account" onPress={() => router.push('/register')} />
      <SecondaryButton label="Log In" variant="filled" onPress={() => router.push('/(auth)/login')} />
      {Platform.OS === 'web' ? (
        <View style={{ alignItems: 'center' }}>
          <Pressable onPress={() => router.push('/support')} accessibilityRole="link">
            <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>
              Need help? Contact support
            </Text>
          </Pressable>
          <Pressable onPress={() => router.push('/privacy-policy')} accessibilityRole="link">
            <Text style={[typography.caption, { marginTop: spacing.xs, color: colors.textTertiary, textAlign: 'center' }]}>
              Privacy Policy
            </Text>
          </Pressable>
        </View>
      ) : null}
    </AuthFormShell>
  );
}

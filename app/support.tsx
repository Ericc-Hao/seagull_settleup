import { Redirect, router } from 'expo-router';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppLogo, PrimaryButton, ScreenLayout, SecondaryButton, SectionCard } from '../src/components';
import { colors, layout, radii, spacing, typography } from '../src/theme';

const SUPPORT_EMAIL = 'support@seagullcoffee.ca';

function openSupportEmail() {
  const subject = encodeURIComponent('Seagull Split support request');
  const body = encodeURIComponent(
    'Hi Seagull Split team,\n\nI need help with:\n\n',
  );
  void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`);
}

export default function SupportPage() {
  if (Platform.OS !== 'web') {
    return <Redirect href="/" />;
  }

  return (
    <ScreenLayout bottomTabPadding={false} contentStyle={styles.content} scrollBottomPadding={spacing['4xl']}>
      <View style={styles.hero}>
        <AppLogo size={96} />
        <Text style={styles.eyebrow}>Seagull Split</Text>
        <Text style={styles.title}>Support</Text>
        <Text style={styles.subtitle}>
          Need help with your account, an invitation, password reset, or a group expense? Send us a note and we&apos;ll
          help you get unstuck.
        </Text>
      </View>

      <View style={styles.cardWrap}>
        <SectionCard>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Contact us</Text>
            <Text style={styles.body}>
              Email support with a short description of the issue. Please do not include passwords, one-time codes, or
              private API keys.
            </Text>
            <Pressable onPress={openSupportEmail} accessibilityRole="link">
              <Text style={styles.email}>{SUPPORT_EMAIL}</Text>
            </Pressable>
            <PrimaryButton label="Email Support" onPress={openSupportEmail} />
          </View>
        </SectionCard>

        <SectionCard>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Helpful details to include</Text>
            <Text style={styles.body}>- What you were trying to do</Text>
            <Text style={styles.body}>- Whether you were using web or the iOS app</Text>
            <Text style={styles.body}>- Any safe error message shown on screen</Text>
          </View>
        </SectionCard>

        <Pressable onPress={() => router.push('/privacy-policy')} accessibilityRole="link">
          <Text style={styles.privacyLink}>Privacy Policy</Text>
        </Pressable>

        <SecondaryButton label="Back to Seagull Split" variant="filled" onPress={() => router.replace('/')} />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    gap: spacing.xl,
  },
  hero: {
    width: '100%',
    maxWidth: 640,
    alignItems: 'center',
    paddingTop: spacing.lg,
  },
  eyebrow: {
    ...typography.caption,
    marginTop: spacing.md,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    ...typography.largeTitle,
    marginTop: spacing.xs,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    maxWidth: 560,
    marginTop: spacing.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 640,
    gap: spacing.md,
  },
  cardContent: {
    padding: layout.cardPadding,
    gap: spacing.md,
  },
  cardTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  email: {
    ...typography.bodyMedium,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.oweSoft,
    color: colors.primary,
  },
  privacyLink: {
    ...typography.caption,
    alignSelf: 'center',
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

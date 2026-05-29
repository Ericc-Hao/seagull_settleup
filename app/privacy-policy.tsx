import { Redirect, router } from 'expo-router';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppLogo, ScreenLayout, SecondaryButton, SectionCard } from '../src/components';
import { colors, layout, radii, spacing, typography } from '../src/theme';

const SUPPORT_EMAIL = 'support@seagullcoffee.ca';

function openSupportEmail() {
  const subject = encodeURIComponent('Seagull Split privacy question');
  void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`);
}

function PolicySection({ title, children }: { title: string; children: string }) {
  return (
    <SectionCard>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.body}>{children}</Text>
      </View>
    </SectionCard>
  );
}

export default function PrivacyPolicyPage() {
  if (Platform.OS !== 'web') {
    return <Redirect href="/" />;
  }

  return (
    <ScreenLayout bottomTabPadding={false} contentStyle={styles.content} scrollBottomPadding={spacing['4xl']}>
      <View style={styles.hero}>
        <AppLogo size={96} />
        <Text style={styles.eyebrow}>Seagull Split</Text>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.subtitle}>
          This page explains how Seagull Split handles information used to create accounts, manage groups, split
          expenses, send invitations, and support password recovery.
        </Text>
        <Text style={styles.updated}>Effective date: May 29, 2026</Text>
      </View>

      <View style={styles.cardWrap}>
        <PolicySection title="Information we collect">
          We collect account information such as your email address, display name, and optional profile details. We also
          store app content you create, including groups, group members, invitations, expenses, splits, settlements, and
          receipt details you choose to upload or scan.
        </PolicySection>

        <PolicySection title="How we use information">
          We use your information to provide the app, authenticate your account, calculate balances, send invitation and
          password reset emails, maintain app security, improve reliability, and respond to support requests.
        </PolicySection>

        <PolicySection title="Third-party services">
          Seagull Split uses Supabase for authentication, database, storage, and backend functions. Email delivery may
          use Resend. Receipt scanning may use an OCR provider through a Supabase Edge Function. We do not sell your
          personal information.
        </PolicySection>

        <PolicySection title="Receipt images and sensitive data">
          Receipt images are used only for the receipt features you request. Do not upload receipts containing sensitive
          information you do not want processed. Passwords, reset tokens, API keys, and full auth sessions should never
          be sent in support messages.
        </PolicySection>

        <PolicySection title="Data retention and deletion">
          We keep account and app data while your account is active or as needed to provide shared group history. You can
          contact support to request help with account or data deletion, subject to records needed for security,
          integrity, or legal requirements.
        </PolicySection>

        <PolicySection title="Contact">
          For privacy questions or data requests, contact Seagull Split support by email. Include enough detail to help
          us identify your account, but do not include passwords, one-time codes, or private keys.
        </PolicySection>

        <Pressable onPress={openSupportEmail} accessibilityRole="link">
          <Text style={styles.email}>{SUPPORT_EMAIL}</Text>
        </Pressable>

        <View style={styles.actions}>
          <SecondaryButton label="Contact Support" variant="filled" onPress={() => router.push('/support')} />
          <SecondaryButton label="Back to Seagull Split" variant="outline" onPress={() => router.replace('/')} />
        </View>
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
    maxWidth: 720,
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
    maxWidth: 620,
    marginTop: spacing.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  updated: {
    ...typography.caption,
    marginTop: spacing.sm,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  cardWrap: {
    width: '100%',
    maxWidth: 720,
    gap: spacing.md,
  },
  cardContent: {
    padding: layout.cardPadding,
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 23,
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
  actions: {
    gap: spacing.md,
  },
});

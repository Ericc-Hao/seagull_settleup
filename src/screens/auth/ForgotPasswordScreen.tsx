import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { PrimaryButton, SecondaryButton } from '../../components';
import { recoverPassword } from '../../services/authService';
import { colors, typography } from '../../theme';
import { createLogger } from '../../utils/logger';
import { maskEmail } from '../../utils/validation';
import { safeBack } from '../../utils/navigation';
import { AuthErrorMessage } from './AuthErrorMessage';
import { AuthFormShell } from './AuthFormShell';
import { AuthTextInput } from './AuthTextInput';
import { validateEmail } from './authValidation';

const authUiLogger = createLogger('ForgotPasswordScreen');

export function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const prefilledEmail = typeof params.email === 'string' ? params.email : '';
  const [email, setEmail] = useState(prefilledEmail);
  const [validation, setValidation] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setValidation(null);
    const trimmed = email.trim();
    const emailError = validateEmail(trimmed);
    if (emailError) {
      setValidation(emailError);
      return;
    }
    setSubmitting(true);
    authUiLogger.info('Password recovery submit started', { email: maskEmail(trimmed) });
    try {
      await recoverPassword(trimmed);
      setSent(true);
    } catch {
      setValidation('Could not send password reset email right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <AuthFormShell title="Check Your Inbox" subtitle="Password recovery is on its way." compact>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', lineHeight: 22 }]}>
          If this email is registered, we&apos;ll send a password reset link.
        </Text>
        <SecondaryButton label="Back to Log In" variant="filled" onPress={() => safeBack('/(auth)/login')} />
      </AuthFormShell>
    );
  }

  return (
    <AuthFormShell title="Reset Password" subtitle="Enter your email to receive a recovery link." compact>
      <AuthTextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        textContentType="username"
        autoComplete="email"
      />
      <AuthErrorMessage message={validation} />
      <PrimaryButton
        label={submitting ? 'Sending...' : 'Send Recovery Email'}
        onPress={() => void submit()}
        disabled={submitting}
      />
      <SecondaryButton label="Back to Log In" variant="outline" onPress={() => safeBack('/(auth)/login')} />
    </AuthFormShell>
  );
}

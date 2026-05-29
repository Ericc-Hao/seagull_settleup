import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { PrimaryButton } from '../../components';
import { InvitationContextCard } from '../../components/invitations/InvitationContextCard';
import { useAuth } from '../../context/AuthContext';
import { useInvitationPreview } from '../../hooks/useInvitationPreview';
import { useInviteRouteParam } from '../../hooks/useInviteRouteParam';
import { setPendingInviteToken } from '../../lib/pendingInviteToken';
import { colors, layout, radii, spacing, typography } from '../../theme';
import { createLogger } from '../../utils/logger';
import { maskEmail } from '../../utils/validation';
import { authRoute, screenAuthError } from './authCommon';
import { AuthErrorMessage } from './AuthErrorMessage';
import { AuthFormShell, AuthLink } from './AuthFormShell';
import { AuthTextInput } from './AuthTextInput';
import { AvatarPicker } from './AvatarPicker';
import {
  validatePassword,
  validatePasswordConfirmation,
  validateRequired,
} from './authValidation';

const authUiLogger = createLogger('RegisterScreen');

export function RegisterScreen() {
  const { signUp, clearError, loading } = useAuth();
  const inviteToken = useInviteRouteParam();
  const { preview, loading: previewLoading, fetchFailed, isPendingInvite } = useInvitationPreview(inviteToken);
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | undefined>();
  const [email, setEmail] = useState('');
  const [emailLocked, setEmailLocked] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validation, setValidation] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      clearError();
      setValidation(null);
      setLocalError(null);
      return () => {
        clearError();
        setValidation(null);
        setLocalError(null);
      };
    }, [clearError]),
  );

  useEffect(() => {
    authUiLogger.info('Register invite token detected', {
      hasInviteToken: Boolean(inviteToken),
    });
  }, [inviteToken]);

  useEffect(() => {
    if (inviteToken) {
      void setPendingInviteToken(inviteToken);
    }
  }, [inviteToken]);

  useEffect(() => {
    if (preview?.status === 'pending' && preview.invitedEmail) {
      setEmail(preview.invitedEmail);
      setEmailLocked(true);
      authUiLogger.info('Email prefilled from invitation', {
        email: maskEmail(preview.invitedEmail),
      });
      return;
    }

    if (!previewLoading) {
      setEmailLocked(false);
    }
  }, [preview?.status, preview?.invitedEmail, previewLoading]);

  const showExistingAccountPrompt = Boolean(isPendingInvite && preview?.inviteeHasAccount);

  useEffect(() => {
    authUiLogger.info('Register auth render state', {
      showExistingAccountPrompt,
      loading,
      previewLoading,
      hasInviteToken: Boolean(inviteToken),
    });
  }, [showExistingAccountPrompt, loading, previewLoading, inviteToken]);

  const submit = async () => {
    clearError();
    setLocalError(null);
    const registrationEmail = emailLocked && preview?.invitedEmail ? preview.invitedEmail : email.trim();

    const displayNameError = validateRequired(displayName, 'Display name');
    if (displayNameError) {
      setValidation(displayNameError);
      return;
    }
    const emailError = validateRequired(registrationEmail, 'Email');
    if (emailError) {
      setValidation(emailError);
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setValidation(passwordError);
      return;
    }
    const confirmError = validatePasswordConfirmation(password, confirmPassword);
    if (confirmError) {
      setValidation(confirmError);
      return;
    }
    setValidation(null);

    if (inviteToken && isPendingInvite) {
      authUiLogger.info('Registration with invite started', { email: maskEmail(registrationEmail) });
    } else {
      authUiLogger.info('Register submit started', { email: maskEmail(registrationEmail) });
    }

    try {
      await signUp({
        email: registrationEmail,
        password,
        displayName,
        phone: phone.trim() || undefined,
        avatarUri,
      });
    } catch (error) {
      setLocalError(screenAuthError(error));
    }
  };

  return (
    <AuthFormShell title="Create Account" subtitle="Start tracking and splitting in CAD." scroll>
      <InvitationContextCard
        inviteToken={inviteToken}
        preview={preview}
        loading={previewLoading}
        fetchFailed={fetchFailed}
        flow="register"
      />
      {showExistingAccountPrompt ? (
        <View
          style={{
            backgroundColor: colors.background,
            borderRadius: radii.lg,
            padding: layout.cardPadding,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
          }}
        >
          <Text style={[typography.bodyMedium, { color: colors.textPrimary, marginBottom: spacing.sm }]}>
            An account already exists for this email. Please log in to accept the invitation.
          </Text>
          <PrimaryButton label="Log In" onPress={() => router.push(authRoute('/login', inviteToken))} />
        </View>
      ) : (
        <>
          <AvatarPicker uri={avatarUri} displayName={displayName} onPick={setAvatarUri} />
          <AuthTextInput label="Display Name" value={displayName} onChangeText={setDisplayName} autoCapitalize="words" />
          <AuthTextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            disabled={emailLocked}
            placeholder="you@example.com"
            keyboardType="email-address"
            textContentType="username"
            autoComplete="email"
            helperText={emailLocked ? 'This email is linked to your invitation.' : undefined}
          />
          <AuthTextInput label="Phone (optional)" value={phone} onChangeText={setPhone} placeholder="Optional" />
          <AuthTextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="newPassword"
            autoComplete="new-password"
          />
          <AuthTextInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            textContentType="newPassword"
            autoComplete="new-password"
          />
          <AuthErrorMessage message={validation ?? localError} />
          <PrimaryButton
            label={loading ? 'Creating Account...' : 'Create Account'}
            onPress={() => void submit()}
            disabled={loading || (Boolean(inviteToken) && previewLoading)}
          />
        </>
      )}
      <AuthLink
        text="Already have an account?"
        action="Log In"
        onPress={() => router.push(authRoute('/login', inviteToken))}
      />
    </AuthFormShell>
  );
}

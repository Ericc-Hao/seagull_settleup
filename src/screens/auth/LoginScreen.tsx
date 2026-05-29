import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { PrimaryButton } from '../../components';
import { InvitationContextCard } from '../../components/invitations/InvitationContextCard';
import { useAuth } from '../../context/AuthContext';
import { useInvitationPreview } from '../../hooks/useInvitationPreview';
import { useInviteRouteParam } from '../../hooks/useInviteRouteParam';
import { setPendingInviteToken } from '../../lib/pendingInviteToken';
import { createLogger } from '../../utils/logger';
import { maskEmail } from '../../utils/validation';
import { authRoute, screenAuthError } from './authCommon';
import { AuthErrorMessage } from './AuthErrorMessage';
import { AuthFormShell, AuthLink, AuthNoticeText, ForgotPasswordLink } from './AuthFormShell';
import { AuthTextInput } from './AuthTextInput';
import { normalizeEmail, validateRequired } from './authValidation';

const authUiLogger = createLogger('LoginScreen');

export function LoginScreen() {
  const { signIn, clearError, loading, sessionNotice, clearSessionNotice } = useAuth();
  const inviteToken = useInviteRouteParam();
  const { preview, loading: previewLoading, fetchFailed, isPendingInvite } = useInvitationPreview(inviteToken);
  const [email, setEmail] = useState('');
  const [emailLocked, setEmailLocked] = useState(false);
  const [password, setPassword] = useState('');
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
    authUiLogger.info('Login screen invite token detected', {
      hasInviteToken: Boolean(inviteToken),
    });
  }, [inviteToken]);

  useEffect(() => {
    if (inviteToken) {
      void setPendingInviteToken(inviteToken);
    }
  }, [inviteToken]);

  useEffect(() => {
    if (isPendingInvite && preview?.invitedEmail) {
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
  }, [isPendingInvite, preview?.invitedEmail, previewLoading]);

  const submit = async () => {
    clearError();
    setLocalError(null);
    const loginEmail = emailLocked && preview?.invitedEmail ? preview.invitedEmail : email.trim();

    const emailError = validateRequired(loginEmail, 'Email');
    if (emailError) {
      setValidation(emailError);
      return;
    }
    const passwordError = validateRequired(password, 'Password');
    if (passwordError) {
      setValidation(passwordError);
      return;
    }
    if (isPendingInvite && preview?.invitedEmail) {
      if (normalizeEmail(loginEmail) !== normalizeEmail(preview.invitedEmail)) {
        setValidation(
          `This invitation was sent to ${maskEmail(preview.invitedEmail)}. Please log in with that email.`,
        );
        return;
      }
    }
    setValidation(null);
    authUiLogger.info('Login submit started', { email: maskEmail(loginEmail) });
    try {
      await signIn(loginEmail, password);
    } catch (error) {
      setLocalError(screenAuthError(error));
    }
  };

  const goToForgotPassword = () => {
    const currentEmail = email.trim();
    router.push(
      currentEmail
        ? { pathname: '/(auth)/forgot-password', params: { email: currentEmail } }
        : '/(auth)/forgot-password',
    );
  };

  return (
    <AuthFormShell title="Welcome Back" subtitle="Log in to your Seagull Split account." compact>
      <InvitationContextCard
        inviteToken={inviteToken}
        preview={preview}
        loading={previewLoading}
        fetchFailed={fetchFailed}
        flow="login"
      />
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
      <AuthTextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Enter your password"
        textContentType="password"
        autoComplete="current-password"
      />
      <ForgotPasswordLink onPress={goToForgotPassword} />
      {sessionNotice ? <AuthNoticeText message={sessionNotice} onDismiss={clearSessionNotice} /> : null}
      <AuthErrorMessage message={validation ?? localError} />
      <PrimaryButton
        label={loading ? 'Logging In...' : 'Log In'}
        onPress={() => void submit()}
        disabled={loading || (Boolean(inviteToken) && previewLoading)}
      />
      <AuthLink
        text="New here?"
        action="Create Account"
        onPress={() => router.push(authRoute('/register', inviteToken))}
      />
    </AuthFormShell>
  );
}

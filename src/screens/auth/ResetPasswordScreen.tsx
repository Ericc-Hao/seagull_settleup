import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Text } from 'react-native';

import { PrimaryButton, SecondaryButton } from '../../components';
import { useAuth } from '../../context/AuthContext';
import {
  useRecoveryLinkErrorParam,
  useRecoveryTokenHashParam,
} from '../../hooks/useRecoveryRouteParams';
import { supabase } from '../../lib/supabase';
import {
  clearRecoveryParamsFromBrowserUrl,
  exchangeRecoveryCodeFromUrl,
  hasRecoveryCodeInUrl,
  isExpiredRecoveryError,
  isRecoveryLinkExpiredError,
  RECOVERY_LINK_EXPIRED_MESSAGE,
  signOutLocal,
  verifyRecoveryTokenHash,
} from '../../services/authService';
import { colors, typography } from '../../theme';
import { toUserFriendlyAuthError } from '../../utils/authErrors';
import { createLogger } from '../../utils/logger';
import { screenAuthError } from './authCommon';
import { AuthErrorMessage } from './AuthErrorMessage';
import { AuthFormShell } from './AuthFormShell';
import { AuthLoadingScreen } from './AuthLoadingScreen';
import { AuthTextInput } from './AuthTextInput';
import { validatePassword, validatePasswordConfirmation } from './authValidation';

const authUiLogger = createLogger('ResetPasswordScreen');

export function ResetPasswordScreen() {
  const { authInitialized, session } = useAuth();
  const recoveryTokenHash = useRecoveryTokenHashParam();
  const recoveryLinkError = useRecoveryLinkErrorParam();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validation, setValidation] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [expiredLinkMessage, setExpiredLinkMessage] = useState<string | null>(null);
  const [pendingTokenHash, setPendingTokenHash] = useState<string | null>(null);
  const [continuing, setContinuing] = useState(false);

  useEffect(() => {
    if (recoveryTokenHash) {
      setPendingTokenHash(recoveryTokenHash);
    }
  }, [recoveryTokenHash]);

  useEffect(() => {
    if (isRecoveryLinkExpiredError(recoveryLinkError)) {
      setExpiredLinkMessage(RECOVERY_LINK_EXPIRED_MESSAGE);
      setHasRecoverySession(false);
      setSessionChecked(true);
    }
  }, [recoveryLinkError]);

  useEffect(() => {
    if (!authInitialized) {
      return;
    }

    if (isRecoveryLinkExpiredError(recoveryLinkError)) {
      return;
    }

    void (async () => {
      try {
        if (Platform.OS === 'web') {
          if (recoveryTokenHash) {
            setHasRecoverySession(false);
            return;
          }

          if (hasRecoveryCodeInUrl()) {
            await exchangeRecoveryCodeFromUrl();
          }
        } else if (recoveryTokenHash) {
          setHasRecoverySession(false);
          return;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) {
          authUiLogger.warn('Reset password session check failed', {
            reason: toUserFriendlyAuthError(error),
          });
          setHasRecoverySession(false);
        } else {
          setHasRecoverySession(Boolean(data.session));
        }
      } catch (error) {
        authUiLogger.warn('Reset password recovery link invalid', {
          reason: toUserFriendlyAuthError(error),
        });
        if (isExpiredRecoveryError(error)) {
          setExpiredLinkMessage(RECOVERY_LINK_EXPIRED_MESSAGE);
        }
        setHasRecoverySession(false);
      } finally {
        setSessionChecked(true);
      }
    })();
  }, [authInitialized, recoveryLinkError, recoveryTokenHash]);

  const handleContinueRecovery = async () => {
    if (!pendingTokenHash) {
      return;
    }

    setContinuing(true);
    setValidation(null);
    authUiLogger.info('Recovery token continue pressed');
    try {
      await verifyRecoveryTokenHash(pendingTokenHash);
      clearRecoveryParamsFromBrowserUrl();
      setPendingTokenHash(null);
      setHasRecoverySession(true);
    } catch (error) {
      if (isExpiredRecoveryError(error)) {
        setExpiredLinkMessage(RECOVERY_LINK_EXPIRED_MESSAGE);
        setPendingTokenHash(null);
      } else {
        setValidation(toUserFriendlyAuthError(error));
      }
      setHasRecoverySession(false);
    } finally {
      setContinuing(false);
    }
  };

  const submit = async () => {
    setValidation(null);
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
    setSubmitting(true);
    authUiLogger.info('Reset password submit started');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setValidation(screenAuthError(error));
        return;
      }
      await signOutLocal();
      setDone(true);
    } catch (error) {
      setValidation(screenAuthError(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (!authInitialized || !sessionChecked) {
    return <AuthLoadingScreen />;
  }

  if (done) {
    return (
      <AuthFormShell title="Password Updated" subtitle="You're all set." compact>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', lineHeight: 22 }]}>
          Your password has been updated. You can now log in with your new password.
        </Text>
        <PrimaryButton label="Go to Log In" onPress={() => router.replace('/(auth)/login')} />
      </AuthFormShell>
    );
  }

  if (!hasRecoverySession && !session && expiredLinkMessage) {
    return (
      <AuthFormShell title="Link Expired" subtitle="This recovery link is no longer valid." compact>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', lineHeight: 22 }]}>
          {expiredLinkMessage}
        </Text>
        <PrimaryButton
          label="Request New Reset Email"
          onPress={() => router.replace('/(auth)/forgot-password')}
        />
        <SecondaryButton label="Back to Log In" variant="outline" onPress={() => router.replace('/(auth)/login')} />
      </AuthFormShell>
    );
  }

  if (pendingTokenHash && !hasRecoverySession) {
    return (
      <AuthFormShell title="Reset Password" subtitle="Ready to reset your password?" compact>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', lineHeight: 22 }]}>
          We received your password reset request. Tap Continue to verify this link and choose a new password.
        </Text>
        <AuthErrorMessage message={validation} />
        <PrimaryButton
          label={continuing ? 'Verifying...' : 'Continue'}
          onPress={() => void handleContinueRecovery()}
          disabled={continuing}
        />
        <SecondaryButton label="Back to Log In" variant="outline" onPress={() => router.replace('/(auth)/login')} />
      </AuthFormShell>
    );
  }

  if (!hasRecoverySession && !session) {
    return (
      <AuthFormShell title="Link Expired" subtitle="This recovery link is no longer valid." compact>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', lineHeight: 22 }]}>
          Open the reset link from your email, or request a new recovery email.
        </Text>
        <PrimaryButton
          label="Request New Reset Email"
          onPress={() => router.replace('/(auth)/forgot-password')}
        />
        <SecondaryButton label="Back to Log In" variant="outline" onPress={() => router.replace('/(auth)/login')} />
      </AuthFormShell>
    );
  }

  return (
    <AuthFormShell title="Set New Password" subtitle="Choose a new password for your account." compact>
      <AuthTextInput
        label="New Password"
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
      <AuthErrorMessage message={validation} />
      <PrimaryButton
        label={submitting ? 'Updating...' : 'Update Password'}
        onPress={() => void submit()}
        disabled={submitting}
      />
    </AuthFormShell>
  );
}

import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import type { ReactNode } from 'react';
import { Children, Fragment, isValidElement, useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from 'react-native';

import { PrimaryButton, AppLogo, ScreenLayout, SecondaryButton } from '../components';
import { InvitationContextCard } from '../components/invitations/InvitationContextCard';
import { ShadowSurface } from '../components/layout/ShadowSurface';
import { useAuth } from '../context/AuthContext';
import { useInvitationPreview } from '../hooks/useInvitationPreview';
import { useInviteRouteParam } from '../hooks/useInviteRouteParam';
import {
  useRecoveryLinkErrorParam,
  useRecoveryTokenHashParam,
} from '../hooks/useRecoveryRouteParams';
import { setPendingInviteToken } from '../lib/pendingInviteToken';
import { supabase } from '../lib/supabase';
import {
  recoverPassword,
  clearRecoveryParamsFromBrowserUrl,
  exchangeRecoveryCodeFromUrl,
  hasRecoveryCodeInUrl,
  isExpiredRecoveryError,
  isRecoveryLinkExpiredError,
  RECOVERY_LINK_EXPIRED_MESSAGE,
  signOutLocal,
  verifyRecoveryTokenHash,
} from '../services/authService';
import { colors, layout, radii, spacing, typography } from '../theme';
import { createLogger } from '../utils/logger';
import { toUserFriendlyAuthError } from '../utils/authErrors';
import { isValidEmail, maskEmail, normalizeEmail } from '../utils/validation';
import { safeBack } from '../utils/navigation';

const authUiLogger = createLogger('AuthScreens');

function authRoute(path: '/login' | '/register', inviteToken?: string) {
  return inviteToken ? { pathname: path, params: { invite: inviteToken } } : path;
}

function flattenAuthChildren(children: ReactNode): ReactNode[] {
  const items: ReactNode[] = [];

  Children.forEach(children, (child) => {
    if (child == null || child === false) {
      return;
    }

    if (isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment) {
      items.push(...flattenAuthChildren(child.props.children));
      return;
    }

    items.push(child);
  });

  return items;
}

function AuthForm({ children }: { children: ReactNode }) {
  const items = flattenAuthChildren(children);

  return (
    <View style={{ width: '100%', alignSelf: 'stretch' }}>
      {items.map((child, index) => (
        <View
          key={index}
          style={{
            width: '100%',
            alignSelf: 'stretch',
            marginTop: index > 0 ? spacing.md : 0,
          }}
        >
          {child}
        </View>
      ))}
    </View>
  );
}

function AuthCard({
  title,
  subtitle,
  children,
  scroll = true,
  compact = false,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  scroll?: boolean;
  compact?: boolean;
}) {
  return (
    <ScreenLayout
      scroll={scroll}
      keyboardAvoiding
      bottomTabPadding={false}
      scrollBottomPadding={compact ? spacing['3xl'] + 48 : spacing['4xl'] + 48}
      contentStyle={{
        flexGrow: 1,
        alignSelf: 'stretch',
        ...(compact ? { justifyContent: 'center' } : {}),
      }}
    >
      <View style={{ alignSelf: 'stretch', paddingTop: compact ? spacing.md : spacing.lg }}>
        <View style={{ alignItems: 'center' }}>
          <AppLogo size={72} />
          <View style={{ marginTop: spacing.md, alignItems: 'center', maxWidth: 320 }}>
            <Text style={[typography.largeTitle, { textAlign: 'center' }]}>{title}</Text>
            <Text style={[typography.subtitle, { textAlign: 'center', marginTop: spacing.xs }]}>
              {subtitle}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <ShadowSurface
            shadow="card"
            borderRadius={radii['2xl']}
            style={{ alignSelf: 'stretch' }}
            innerStyle={{ padding: layout.cardPadding }}
          >
            <AuthForm>{children}</AuthForm>
          </ShadowSurface>
        </View>
      </View>
    </ScreenLayout>
  );
}

function AuthInput({
  label,
  value,
  onChangeText,
  secureTextEntry = false,
  autoCapitalize = 'none',
  disabled = false,
  helperText,
  placeholder,
  keyboardType = 'default',
  textContentType,
  autoComplete,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  disabled?: boolean;
  helperText?: string;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  textContentType?: TextInputProps['textContentType'];
  autoComplete?: TextInputProps['autoComplete'];
}) {
  return (
    <View
      style={{
        backgroundColor: disabled ? colors.borderSubtle : colors.white,
        borderRadius: radii.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 4,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        minHeight: 76,
        opacity: disabled ? 0.85 : 1,
      }}
    >
      <Text style={[typography.label, { marginBottom: 6 }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        spellCheck={false}
        keyboardType={keyboardType}
        textContentType={textContentType}
        autoComplete={autoComplete}
        editable={!disabled}
        selectTextOnFocus={!disabled}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        style={[
          typography.body,
          {
            padding: 0,
            margin: 0,
            minHeight: 24,
            color: disabled ? colors.textSecondary : colors.textPrimary,
            ...(Platform.OS === 'android' ? { textAlignVertical: 'center' as const } : {}),
          },
        ]}
      />
      {helperText ? (
        <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 6 }]}>{helperText}</Text>
      ) : null}
    </View>
  );
}

function ErrorText({ message }: { message?: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <Text style={[typography.caption, { color: colors.danger, textAlign: 'center', lineHeight: 18 }]}>
      {message}
    </Text>
  );
}

function screenAuthError(error: unknown): string {
  const friendly = toUserFriendlyAuthError(error);
  if (friendly !== 'Something went wrong. Please try again.') {
    return friendly;
  }
  return error instanceof Error ? error.message : friendly;
}

function NoticeText({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <Pressable
      onPress={onDismiss}
      style={{
        backgroundColor: colors.borderSubtle,
        borderRadius: radii.lg,
        padding: spacing.md,
      }}
    >
      <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 18 }]}>{message}</Text>
    </Pressable>
  );
}

function AvatarPicker({
  uri,
  displayName,
  onPick,
}: {
  uri?: string;
  displayName: string;
  onPick: (uri: string) => void;
}) {
  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      onPick(result.assets[0].uri);
    }
  };

  return (
    <Pressable onPress={() => void pickAvatar()} style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 28,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.borderSubtle,
        }}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width: 80, height: 80 }} />
        ) : (
          <Text style={[typography.amountSm, { color: colors.primary }]}>
            {(displayName.trim() || 'S').charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
      <Text style={[typography.caption, { fontWeight: '600', color: colors.primary, marginTop: spacing.sm }]}>
        {uri ? 'Change Avatar' : 'Add Avatar'}
      </Text>
    </Pressable>
  );
}

function AuthLink({ text, action, onPress }: { text: string; action: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ alignItems: 'center', paddingVertical: spacing.xs }}>
      <Text style={[typography.caption, { textAlign: 'center' }]}>
        {text} <Text style={{ color: colors.primary, fontWeight: '700' }}>{action}</Text>
      </Text>
    </Pressable>
  );
}

function ForgotPasswordLink({ onPress }: { onPress: () => void }) {
  return (
    <View style={{ alignItems: 'flex-end' }}>
      <Pressable onPress={onPress} hitSlop={8} style={{ paddingVertical: spacing.xs }}>
        <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
          Forgot password?
        </Text>
      </Pressable>
    </View>
  );
}

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

export function WelcomeScreen() {
  const { sessionNotice, clearSessionNotice } = useAuth();

  return (
    <AuthCard title="Seagull Split" subtitle="Track spending. Split bills. Settle in CAD." compact>
      {sessionNotice ? <NoticeText message={sessionNotice} onDismiss={clearSessionNotice} /> : null}
      <PrimaryButton label="Create Account" onPress={() => router.push('/register')} />
      <SecondaryButton label="Log In" variant="filled" onPress={() => router.push('/(auth)/login')} />
    </AuthCard>
  );
}

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

    if (!loginEmail) {
      setValidation('Email is required.');
      return;
    }
    if (!password) {
      setValidation('Password is required.');
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
    <AuthCard title="Welcome Back" subtitle="Log in to your Seagull Split account." compact>
      <InvitationContextCard
        inviteToken={inviteToken}
        preview={preview}
        loading={previewLoading}
        fetchFailed={fetchFailed}
        flow="login"
      />
      <AuthInput
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
      <AuthInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Enter your password"
        textContentType="password"
        autoComplete="current-password"
      />
      <ForgotPasswordLink onPress={goToForgotPassword} />
      {sessionNotice ? <NoticeText message={sessionNotice} onDismiss={clearSessionNotice} /> : null}
      <ErrorText message={validation ?? localError} />
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
    </AuthCard>
  );
}

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

    if (!displayName.trim()) {
      setValidation('Display name is required.');
      return;
    }
    if (!registrationEmail) {
      setValidation('Email is required.');
      return;
    }
    if (password.length < 6) {
      setValidation('Password should be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setValidation('Password and confirm password must match.');
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
    <AuthCard title="Create Account" subtitle="Start tracking and splitting in CAD." scroll>
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
          <AuthInput label="Display Name" value={displayName} onChangeText={setDisplayName} autoCapitalize="words" />
          <AuthInput
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
          <AuthInput label="Phone (optional)" value={phone} onChangeText={setPhone} placeholder="Optional" />
          <AuthInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="newPassword"
            autoComplete="new-password"
          />
          <AuthInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            textContentType="newPassword"
            autoComplete="new-password"
          />
          <ErrorText message={validation ?? localError} />
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
    </AuthCard>
  );
}

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
    if (!isValidEmail(trimmed)) {
      setValidation('Please enter a valid email address.');
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
      <AuthCard title="Check Your Inbox" subtitle="Password recovery is on its way." compact>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', lineHeight: 22 }]}>
          If this email is registered, we&apos;ll send a password reset link.
        </Text>
        <SecondaryButton label="Back to Log In" variant="filled" onPress={() => safeBack('/(auth)/login')} />
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Reset Password" subtitle="Enter your email to receive a recovery link." compact>
      <AuthInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        textContentType="username"
        autoComplete="email"
      />
      <ErrorText message={validation} />
      <PrimaryButton
        label={submitting ? 'Sending...' : 'Send Recovery Email'}
        onPress={() => void submit()}
        disabled={submitting}
      />
      <SecondaryButton label="Back to Log In" variant="outline" onPress={() => safeBack('/(auth)/login')} />
    </AuthCard>
  );
}

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
    if (password.length < 6) {
      setValidation('Password should be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setValidation('Password and confirm password must match.');
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
      <AuthCard title="Password Updated" subtitle="You're all set." compact>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', lineHeight: 22 }]}>
          Your password has been updated. You can now log in with your new password.
        </Text>
        <PrimaryButton label="Go to Log In" onPress={() => router.replace('/(auth)/login')} />
      </AuthCard>
    );
  }

  if (!hasRecoverySession && !session && expiredLinkMessage) {
    return (
      <AuthCard title="Link Expired" subtitle="This recovery link is no longer valid." compact>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', lineHeight: 22 }]}>
          {expiredLinkMessage}
        </Text>
        <PrimaryButton
          label="Request New Reset Email"
          onPress={() => router.replace('/(auth)/forgot-password')}
        />
        <SecondaryButton label="Back to Log In" variant="outline" onPress={() => router.replace('/(auth)/login')} />
      </AuthCard>
    );
  }

  if (pendingTokenHash && !hasRecoverySession) {
    return (
      <AuthCard title="Reset Password" subtitle="Ready to reset your password?" compact>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', lineHeight: 22 }]}>
          We received your password reset request. Tap Continue to verify this link and choose a new password.
        </Text>
        <ErrorText message={validation} />
        <PrimaryButton
          label={continuing ? 'Verifying...' : 'Continue'}
          onPress={() => void handleContinueRecovery()}
          disabled={continuing}
        />
        <SecondaryButton label="Back to Log In" variant="outline" onPress={() => router.replace('/(auth)/login')} />
      </AuthCard>
    );
  }

  if (!hasRecoverySession && !session) {
    return (
      <AuthCard title="Link Expired" subtitle="This recovery link is no longer valid." compact>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', lineHeight: 22 }]}>
          Open the reset link from your email, or request a new recovery email.
        </Text>
        <PrimaryButton
          label="Request New Reset Email"
          onPress={() => router.replace('/(auth)/forgot-password')}
        />
        <SecondaryButton label="Back to Log In" variant="outline" onPress={() => router.replace('/(auth)/login')} />
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Set New Password" subtitle="Choose a new password for your account." compact>
      <AuthInput
        label="New Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textContentType="newPassword"
        autoComplete="new-password"
      />
      <AuthInput
        label="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        textContentType="newPassword"
        autoComplete="new-password"
      />
      <ErrorText message={validation} />
      <PrimaryButton
        label={submitting ? 'Updating...' : 'Update Password'}
        onPress={() => void submit()}
        disabled={submitting}
      />
    </AuthCard>
  );
}

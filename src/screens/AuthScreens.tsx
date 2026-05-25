import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, TextInput, View } from 'react-native';

import { PrimaryButton, AppLogo, ScreenLayout, SecondaryButton } from '../components';
import { InvitationContextCard } from '../components/invitations/InvitationContextCard';
import { useAuth } from '../context/AuthContext';
import { useInvitationPreview } from '../hooks/useInvitationPreview';
import { useInviteRouteParam } from '../hooks/useInviteRouteParam';
import { setPendingInviteToken } from '../lib/pendingInviteToken';
import { colors, layout, radii, shadows, spacing, typography } from '../theme';
import { createLogger } from '../utils/logger';
import { maskEmail } from '../utils/validation';
import { safeBack } from '../utils/navigation';

const authUiLogger = createLogger('AuthScreens');

function authRoute(path: '/login' | '/register', inviteToken?: string) {
  return inviteToken ? { pathname: path, params: { invite: inviteToken } } : path;
}

function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <ScreenLayout scroll={false} contentStyle={{ flex: 1, justifyContent: 'center', gap: spacing.xl }}>
      <View style={{ alignItems: 'center', gap: spacing.md }}>
        <AppLogo size={88} />
        <View style={{ alignItems: 'center', gap: spacing.xs }}>
          <Text style={[typography.largeTitle, { textAlign: 'center' }]}>{title}</Text>
          <Text style={[typography.subtitle, { textAlign: 'center' }]}>{subtitle}</Text>
        </View>
      </View>

      <View
        style={{
          backgroundColor: colors.white,
          borderRadius: radii['2xl'],
          padding: layout.cardPadding,
          gap: spacing.md,
          ...shadows.card,
        }}
      >
        {children}
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
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  disabled?: boolean;
  helperText?: string;
}) {
  return (
    <View
      style={{
        backgroundColor: disabled ? colors.borderSubtle : colors.background,
        borderRadius: radii.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        opacity: disabled ? 0.85 : 1,
      }}
    >
      <Text style={[typography.label, { marginBottom: 4 }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        editable={!disabled}
        selectTextOnFocus={!disabled}
        style={[typography.body, { padding: 0, color: disabled ? colors.textSecondary : colors.textPrimary }]}
      />
      {helperText ? (
        <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]}>{helperText}</Text>
      ) : null}
    </View>
  );
}

function ErrorText({ message }: { message?: string | null }) {
  if (!message) {
    return null;
  }
  return <Text style={[typography.caption, { color: colors.danger }]}>{message}</Text>;
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
    <Pressable
      onPress={() => void pickAvatar()}
      style={{
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
      }}
    >
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
          <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
        ) : (
          <Text style={[typography.amountSm, { color: colors.primary }]}>
            {(displayName.trim() || 'S').charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
      <Text style={[typography.caption, { fontWeight: '600', color: colors.primary }]}>
        {uri ? 'Change Avatar' : 'Add Avatar'}
      </Text>
    </Pressable>
  );
}

function AuthLink({ text, action, onPress }: { text: string; action: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ alignItems: 'center', paddingVertical: spacing.xs }}>
      <Text style={typography.caption}>
        {text} <Text style={{ color: colors.primary, fontWeight: '700' }}>{action}</Text>
      </Text>
    </Pressable>
  );
}

export function AuthLoadingScreen() {
  return (
    <ScreenLayout scroll={false} contentStyle={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <AppLogo size={88} />
      <ActivityIndicator color={colors.primary} />
      <Text style={typography.caption}>Checking your session...</Text>
    </ScreenLayout>
  );
}

export function WelcomeScreen() {
  return (
    <AuthCard title="Seagull Split" subtitle="Track spending. Split bills. Settle in CAD.">
      <PrimaryButton label="Create Account" onPress={() => router.push('/(auth)/register')} />
      <SecondaryButton label="Log In" variant="filled" onPress={() => router.push('/(auth)/login')} />
    </AuthCard>
  );
}

export function LoginScreen() {
  const { signIn, error, clearError, loading } = useAuth();
  const inviteToken = useInviteRouteParam();
  const { preview, loading: previewLoading, fetchFailed } = useInvitationPreview(inviteToken);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validation, setValidation] = useState<string | null>(null);

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
    if (preview?.isValid && preview.invitedEmail) {
      setEmail(preview.invitedEmail);
    }
  }, [preview?.invitedEmail, preview?.isValid]);

  const submit = async () => {
    clearError();
    if (!email.trim()) {
      setValidation('Email is required.');
      return;
    }
    if (!password) {
      setValidation('Password is required.');
      return;
    }
    setValidation(null);
    authUiLogger.info('Login submit started', { email: maskEmail(email) });
    await signIn(email, password);
  };

  return (
    <AuthCard title="Welcome Back" subtitle="Log in to your Seagull Split account.">
      <InvitationContextCard
        inviteToken={inviteToken}
        preview={preview}
        loading={previewLoading}
        fetchFailed={fetchFailed}
      />
      <AuthInput label="Email" value={email} onChangeText={setEmail} />
      <AuthInput label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <ErrorText message={validation ?? error} />
      <PrimaryButton label={loading ? 'Logging In...' : 'Log In'} onPress={() => void submit()} disabled={loading} />
      <AuthLink
        text="New here?"
        action="Create Account"
        onPress={() => router.push(authRoute('/register', inviteToken))}
      />
    </AuthCard>
  );
}

export function RegisterScreen() {
  const { signUp, error, clearError, loading } = useAuth();
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

  const submit = async () => {
    clearError();
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

    await signUp({
      email: registrationEmail,
      password,
      displayName,
      phone: phone.trim() || undefined,
      avatarUri,
    });
  };

  return (
    <AuthCard title="Create Account" subtitle="Start tracking and splitting in CAD.">
      <InvitationContextCard
        inviteToken={inviteToken}
        preview={preview}
        loading={previewLoading}
        fetchFailed={fetchFailed}
      />
      <AvatarPicker uri={avatarUri} displayName={displayName} onPick={setAvatarUri} />
      <AuthInput label="Display Name" value={displayName} onChangeText={setDisplayName} autoCapitalize="words" />
      <AuthInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        disabled={emailLocked}
        helperText={emailLocked ? 'This email is linked to your invitation.' : undefined}
      />
      <AuthInput label="Phone (optional)" value={phone} onChangeText={setPhone} />
      <AuthInput label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <AuthInput label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
      <ErrorText message={validation ?? error} />
      <PrimaryButton
        label={loading ? 'Creating Account...' : 'Create Account'}
        onPress={() => void submit()}
        disabled={loading || (Boolean(inviteToken) && previewLoading)}
      />
      <AuthLink
        text="Already have an account?"
        action="Log In"
        onPress={() => router.push(authRoute('/login', inviteToken))}
      />
    </AuthCard>
  );
}

export function ForgotPasswordScreen() {
  return (
    <AuthCard title="Reset Password" subtitle="Password reset will be added soon.">
      <SecondaryButton label="Back to Log In" variant="filled" onPress={() => safeBack('/(auth)/login')} />
    </AuthCard>
  );
}

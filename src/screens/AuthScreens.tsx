import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, TextInput, View } from 'react-native';

import { PrimaryButton, AppLogo, ScreenLayout, SecondaryButton } from '../components';
import { InvitationContextCard } from '../components/invitations/InvitationContextCard';
import { useAuth } from '../context/AuthContext';
import { setPendingInviteToken } from '../lib/pendingInviteToken';
import { colors, layout, radii, shadows, spacing, typography } from '../theme';
import { createLogger } from '../utils/logger';
import { maskEmail } from '../utils/validation';
import { safeBack } from '../utils/navigation';

const authUiLogger = createLogger('AuthScreens');

function resolveInviteParam(invite: string | string[] | undefined): string | undefined {
  if (typeof invite === 'string' && invite.trim()) {
    return invite.trim();
  }
  if (Array.isArray(invite)) {
    const first = invite.find((value) => value.trim());
    return first?.trim();
  }
  return undefined;
}

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
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View
      style={{
        backgroundColor: colors.background,
        borderRadius: radii.lg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
      }}
    >
      <Text style={[typography.label, { marginBottom: 4 }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={[typography.body, { padding: 0 }]}
      />
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
  const params = useLocalSearchParams<{ invite?: string | string[] }>();
  const inviteToken = resolveInviteParam(params.invite);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validation, setValidation] = useState<string | null>(null);

  useEffect(() => {
    if (inviteToken) {
      void setPendingInviteToken(inviteToken);
    }
  }, [inviteToken]);

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
      <InvitationContextCard inviteToken={inviteToken} />
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
  const params = useLocalSearchParams<{ invite?: string | string[] }>();
  const inviteToken = resolveInviteParam(params.invite);
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | undefined>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validation, setValidation] = useState<string | null>(null);

  useEffect(() => {
    if (inviteToken) {
      void setPendingInviteToken(inviteToken);
    }
  }, [inviteToken]);

  const submit = async () => {
    clearError();
    if (!displayName.trim()) {
      setValidation('Display name is required.');
      return;
    }
    if (!email.trim()) {
      setValidation('Email is required.');
      return;
    }
    if (!phone.trim()) {
      setValidation('Phone number is required.');
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
    authUiLogger.info('Register submit started', { email: maskEmail(email) });
    await signUp({ email, password, displayName, phone, avatarUri });
  };

  return (
    <AuthCard title="Create Account" subtitle="Start tracking and splitting in CAD.">
      <InvitationContextCard inviteToken={inviteToken} />
      <AvatarPicker uri={avatarUri} displayName={displayName} onPick={setAvatarUri} />
      <AuthInput label="Display Name" value={displayName} onChangeText={setDisplayName} autoCapitalize="words" />
      <AuthInput label="Phone" value={phone} onChangeText={setPhone} />
      <AuthInput label="Email" value={email} onChangeText={setEmail} />
      <AuthInput label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <AuthInput label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
      <ErrorText message={validation ?? error} />
      <PrimaryButton
        label={loading ? 'Creating Account...' : 'Create Account'}
        onPress={() => void submit()}
        disabled={loading}
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

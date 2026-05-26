import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';

import {
  FormSection,
  PrimaryButton,
  ScreenLayout,
  ScreenPageHeader,
  SecondaryButton,
  SegmentedPillLight,
  UserAvatar,
} from '../components';
import { useAppData } from '../context/AppDataContext';
import { invalidateAfterUpdateProfile } from '../utils/mutationInvalidation';
import { EMT_METHOD_OPTIONS } from '../data/constants';
import { getProfile, updateAvatar, updateProfile } from '../services/profileService';
import { colors, layout, radii, spacing, typography } from '../theme';
import type { PreferredEmtMethod } from '../types/models';
import { toUserFriendlyError } from '../utils/errors';
import { createLogger } from '../utils/logger';
import { safeBack } from '../utils/navigation';

const logger = createLogger('EditProfileScreen');

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function ProfileTextInput({
  label,
  value,
  onChangeText,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  editable?: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: colors.background,
        borderRadius: radii.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        opacity: editable ? 1 : 0.7,
      }}
    >
      <Text style={[typography.label, { marginBottom: 4 }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        autoCorrect={false}
        autoCapitalize="none"
        placeholderTextColor={colors.textTertiary}
        style={[typography.body, { padding: 0 }]}
      />
    </View>
  );
}

export function EditProfileScreen() {
  const { invalidate } = useAppData();
  const profile = getProfile();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [emtEmail, setEmtEmail] = useState(profile?.emtEmail ?? '');
  const [emtPhone, setEmtPhone] = useState(profile?.emtPhone ?? '');
  const [preferredEmtMethod, setPreferredEmtMethod] = useState<PreferredEmtMethod>(
    profile?.preferredEmtMethod ?? 'none',
  );
  const [avatarUri, setAvatarUri] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const avatarPreview = avatarUri ?? profile?.avatarUrl;
  const email = profile?.email ?? '';

  const canSave = useMemo(() => !saving, [saving]);

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required to update your avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setAvatarUri(result.assets[0].uri);
      setError(null);
    }
  };

  const save = async () => {
    setError(null);
    setMessage(null);

    if (!displayName.trim()) {
      setError('Display name is required.');
      return;
    }
    if (!phone.trim()) {
      setError('Phone number is required.');
      return;
    }
    if (emtEmail.trim() && !isValidEmail(emtEmail.trim())) {
      setError('Enter a valid EMT email address.');
      return;
    }
    if (!profile?.userId) {
      setError('Profile is still loading. Please try again.');
      return;
    }

    setSaving(true);
    logger.info('Update profile submit started');
    try {
      let avatarUrl = profile.avatarUrl;
      let avatarWarning: string | null = null;

      if (avatarUri) {
        try {
          avatarUrl = await updateAvatar(profile.userId, avatarUri);
        } catch (err) {
          avatarWarning = err instanceof Error ? err.message : 'Avatar upload failed.';
        }
      }

      await updateProfile({
        displayName: displayName.trim(),
        phone: phone.trim(),
        avatarUrl,
        emtEmail: emtEmail.trim() || undefined,
        emtPhone: emtPhone.trim() || undefined,
        preferredEmtMethod,
      });
      invalidateAfterUpdateProfile(invalidate);

      if (avatarWarning) {
        setError(`Profile saved, but avatar upload failed: ${avatarWarning}`);
        return;
      }

      setMessage('Profile saved.');
      logger.info('Update profile submit succeeded');
      setTimeout(() => safeBack('/(tabs)/profile'), 650);
    } catch (err) {
      logger.error('Update profile submit failed', err);
      setError(toUserFriendlyError(err, 'Unable to save profile.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout
      header={
        <ScreenPageHeader
          title="Edit Profile"
          subtitle="Update your account and payment info."
          onBack={() => safeBack('/(tabs)/profile')}
          showMascot={false}
        />
      }
      footer={
        <View
          style={{
            paddingHorizontal: layout.screenPadding,
            paddingTop: layout.cardGap,
            paddingBottom: layout.cardGap,
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.borderSubtle,
            gap: spacing.sm,
          }}
        >
          <PrimaryButton label={saving ? 'Saving...' : 'Save Changes'} onPress={() => void save()} disabled={!canSave} />
          <SecondaryButton
            label="Cancel"
            variant="outline"
            onPress={() => safeBack('/(tabs)/profile')}
            disabled={saving}
          />
        </View>
      }
    >
      <View style={{ gap: layout.sectionGap }}>
        <FormSection label="Avatar">
          <Pressable onPress={() => void pickAvatar()} style={{ alignItems: 'center', gap: spacing.sm }}>
            {avatarPreview ? (
              <Image
                source={{ uri: avatarPreview }}
                style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.tertiary }}
              />
            ) : (
              <UserAvatar displayName={displayName} email={email} size="large" />
            )}
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
              {avatarPreview ? 'Change Avatar' : 'Add Avatar'}
            </Text>
          </Pressable>
        </FormSection>

        <FormSection label="Account">
          <View style={{ gap: spacing.md }}>
            <ProfileTextInput label="Display Name" value={displayName} onChangeText={setDisplayName} />
            <ProfileTextInput label="Phone" value={phone} onChangeText={setPhone} />
            <ProfileTextInput label="Email" value={email} onChangeText={() => {}} editable={false} />
          </View>
        </FormSection>

        <FormSection label="EMT Payment Info">
          <View style={{ gap: spacing.md }}>
            <ProfileTextInput label="EMT Email" value={emtEmail} onChangeText={setEmtEmail} />
            <ProfileTextInput label="EMT Phone" value={emtPhone} onChangeText={setEmtPhone} />
            <SegmentedPillLight
              options={EMT_METHOD_OPTIONS}
              value={preferredEmtMethod}
              onChange={setPreferredEmtMethod}
            />
          </View>
        </FormSection>

        {message ? <Text style={[typography.caption, { color: colors.success }]}>{message}</Text> : null}
        {error ? <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text> : null}
      </View>
    </ScreenLayout>
  );
}

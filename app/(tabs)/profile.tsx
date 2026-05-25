import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import {
  Icon,
  type IconName,
  ScreenLayout,
  SectionCard,
  SectionTitle,
  TabPageHeader,
  UserAvatar,
} from '../../src/components';
import { useAuth } from '../../src/context/AuthContext';
import { useNotifications } from '../../src/context/NotificationsContext';
import { useProfileData } from '../../src/hooks/useProfileData';
import { colors, layout, spacing, typography } from '../../src/theme';

function valueOrPlaceholder(value?: string | null): string {
  return value?.trim() || 'Not added';
}

function methodLabel(value?: string): string {
  if (value === 'email') return 'Email';
  if (value === 'phone') return 'Phone';
  return 'Not added';
}

function SettingsRow({
  label,
  value,
  icon,
  onPress,
  showDivider = true,
  danger = false,
}: {
  label: string;
  value?: string;
  icon?: IconName;
  onPress?: () => void;
  showDivider?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: layout.cardPadding,
        paddingVertical: 15,
        borderBottomWidth: showDivider ? 1 : 0,
        borderBottomColor: colors.borderSubtle,
        opacity: pressed ? 0.72 : 1,
      })}
    >
      {icon ? (
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 10,
            backgroundColor: danger ? colors.dangerSoft : colors.background,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} size={17} color={danger ? colors.danger : colors.textSecondary} strokeWidth={1.7} />
        </View>
      ) : null}
      <Text
        style={[
          typography.bodyMedium,
          {
            flex: 1,
            color: danger ? colors.danger : colors.textPrimary,
          },
        ]}
      >
        {label}
      </Text>
      {value ? (
        <Text
          style={[
            typography.body,
            {
              color: value === 'Not added' ? colors.textTertiary : colors.textSecondary,
              maxWidth: 170,
              textAlign: 'right',
            },
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>
      ) : null}
      {onPress ? <Icon name="chevron-right" size={16} color={colors.textTertiary} strokeWidth={1.7} /> : null}
    </Pressable>
  );
}

function AvatarRow({
  displayName,
  email,
  avatarUrl,
  onPress,
}: {
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: layout.cardPadding,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderSubtle,
        opacity: pressed ? 0.72 : 1,
      })}
    >
      <UserAvatar avatarUrl={avatarUrl} displayName={displayName} email={email} size="medium" />
      <View style={{ flex: 1 }}>
        <Text style={typography.bodyMedium}>Avatar</Text>
        <Text style={[typography.caption, { marginTop: 2 }]}>Update profile image</Text>
      </View>
      <Icon name="chevron-right" size={16} color={colors.textTertiary} strokeWidth={1.7} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const data = useProfileData();
  const profile = data.profile;
  const { signOut } = useAuth();
  const { unreadCount } = useNotifications();

  return (
    <ScreenLayout
      header={
        <TabPageHeader
          title={data.title}
          subtitle={data.subtitle}
          unreadCount={unreadCount}
          onNotificationPress={() => router.push('/notifications')}
        />
      }
    >
      <View style={{ gap: layout.sectionGap }}>
        <View style={{ gap: layout.cardGap }}>
          <SectionTitle title="Account" />
          <SectionCard>
            <AvatarRow
              displayName={profile?.displayName}
              email={profile?.email}
              avatarUrl={profile?.avatarUrl}
              onPress={() => router.push('/edit-profile')}
            />
            <SettingsRow
              icon="user"
              label="Display Name"
              value={valueOrPlaceholder(profile?.displayName)}
              onPress={() => router.push('/edit-profile')}
            />
            <SettingsRow
              icon="envelope"
              label="Email"
              value={valueOrPlaceholder(profile?.email)}
              showDivider
            />
            <SettingsRow
              icon="wallet"
              label="Phone"
              value={valueOrPlaceholder(profile?.phone)}
              onPress={() => router.push('/edit-profile')}
              showDivider={false}
            />
          </SectionCard>
        </View>

        <View style={{ gap: layout.cardGap }}>
          <SectionTitle title="Payment Info" />
          <SectionCard>
            <SettingsRow
              icon="envelope"
              label="EMT Email"
              value={valueOrPlaceholder(profile?.emtEmail)}
              onPress={() => router.push('/edit-profile')}
            />
            <SettingsRow
              icon="wallet"
              label="EMT Phone"
              value={valueOrPlaceholder(profile?.emtPhone)}
              onPress={() => router.push('/edit-profile')}
            />
            <SettingsRow
              icon="banknotes"
              label="Preferred Method"
              value={methodLabel(profile?.preferredEmtMethod)}
              onPress={() => router.push('/edit-profile')}
              showDivider={false}
            />
          </SectionCard>
        </View>

        <View style={{ gap: layout.cardGap }}>
          <SectionTitle title="Preferences" />
          <SectionCard>
            <SettingsRow
              icon="currency-dollar"
              label="Default Currency"
              value={profile?.defaultCurrency ?? 'CAD'}
              showDivider={false}
            />
          </SectionCard>
        </View>

        <View style={{ gap: layout.cardGap }}>
          <SectionTitle title="Actions" />
          <SectionCard>
            <SettingsRow
              icon="pencil-square"
              label="Edit Profile"
              onPress={() => router.push('/edit-profile')}
            />
            <SettingsRow
              icon="x-mark"
              label="Log Out"
              danger
              onPress={() => void signOut()}
              showDivider={false}
            />
          </SectionCard>
        </View>
      </View>
    </ScreenLayout>
  );
}

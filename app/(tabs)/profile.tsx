import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
import { colors, layout, typography } from '../../src/theme';

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
  valueMaxWidth = 150,
}: {
  label: string;
  value?: string;
  icon?: IconName;
  onPress?: () => void;
  showDivider?: boolean;
  danger?: boolean;
  valueMaxWidth?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.rowPressable, { borderBottomWidth: showDivider ? 1 : 0 }]}
    >
      <View style={styles.rowContent}>
        {icon ? (
          <View
            style={[
              styles.settingsIconWrapper,
              { backgroundColor: danger ? colors.dangerSoft : colors.background },
            ]}
          >
            <Icon name={icon} size={17} color={danger ? colors.danger : colors.textSecondary} strokeWidth={1.7} />
          </View>
        ) : null}
        <View style={styles.settingsLabelContainer}>
          <Text
            numberOfLines={1}
            style={[
              typography.bodyMedium,
              {
                color: danger ? colors.danger : colors.textPrimary,
              },
            ]}
          >
            {label}
          </Text>
        </View>
        {value ? (
          <View style={[styles.settingsValueContainer, { width: valueMaxWidth }]}>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[
                typography.body,
                {
                  color: value === 'Not added' ? colors.textTertiary : colors.textSecondary,
                  textAlign: 'right',
                },
              ]}
            >
              {value}
            </Text>
          </View>
        ) : null}
        {onPress ? (
          <View style={styles.chevronWrapper}>
            <Icon name="chevron-right" size={16} color={colors.textTertiary} strokeWidth={1.7} />
          </View>
        ) : null}
      </View>
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
      style={[styles.rowPressable, styles.avatarPressable]}
    >
      <View style={styles.rowContent}>
        <View style={styles.avatarWrapper}>
          <UserAvatar avatarUrl={avatarUrl} displayName={displayName} email={email} size="medium" />
        </View>
        <View style={styles.avatarLabelContainer}>
          <Text numberOfLines={1} style={typography.bodyMedium}>
            Avatar
          </Text>
          <Text numberOfLines={1} style={[typography.caption, { marginTop: 2 }]}>
            Update profile image
          </Text>
        </View>
        <View style={styles.chevronWrapper}>
          <Icon name="chevron-right" size={16} color={colors.textTertiary} strokeWidth={1.7} />
        </View>
      </View>
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
      <View>
        <View style={styles.section}>
          <View style={styles.sectionTitleWrapper}>
            <SectionTitle title="Account" />
          </View>
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
              valueMaxWidth={140}
              onPress={() => router.push('/edit-profile')}
            />
            <SettingsRow
              icon="envelope"
              label="Email"
              value={valueOrPlaceholder(profile?.email)}
              valueMaxWidth={160}
              showDivider
            />
            <SettingsRow
              icon="wallet"
              label="Phone"
              value={valueOrPlaceholder(profile?.phone)}
              valueMaxWidth={150}
              onPress={() => router.push('/edit-profile')}
              showDivider={false}
            />
          </SectionCard>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleWrapper}>
            <SectionTitle title="Payment Info" />
          </View>
          <SectionCard>
            <SettingsRow
              icon="envelope"
              label="EMT Email"
              value={valueOrPlaceholder(profile?.emtEmail)}
              valueMaxWidth={160}
              onPress={() => router.push('/edit-profile')}
            />
            <SettingsRow
              icon="wallet"
              label="EMT Phone"
              value={valueOrPlaceholder(profile?.emtPhone)}
              valueMaxWidth={150}
              onPress={() => router.push('/edit-profile')}
            />
            <SettingsRow
              icon="banknotes"
              label="Preferred Method"
              value={methodLabel(profile?.preferredEmtMethod)}
              valueMaxWidth={150}
              onPress={() => router.push('/edit-profile')}
              showDivider={false}
            />
          </SectionCard>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleWrapper}>
            <SectionTitle title="Preferences" />
          </View>
          <SectionCard>
            <SettingsRow
              icon="currency-dollar"
              label="Default Currency"
              value={profile?.defaultCurrency ?? 'CAD'}
              valueMaxWidth={80}
              showDivider={false}
            />
          </SectionCard>
        </View>

        <View>
          <View style={styles.sectionTitleWrapper}>
            <SectionTitle title="Actions" />
          </View>
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

const styles = StyleSheet.create({
  section: {
    marginBottom: layout.sectionGap,
  },
  sectionTitleWrapper: {
    marginBottom: layout.cardGap,
  },
  rowPressable: {
    width: '100%',
    alignSelf: 'stretch',
    minHeight: 56,
    paddingHorizontal: layout.cardPadding,
    paddingVertical: 12,
    borderBottomColor: colors.borderSubtle,
  },
  avatarPressable: {
    minHeight: 64,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  rowContent: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsIconWrapper: {
    width: 30,
    height: 30,
    borderRadius: 10,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  settingsLabelContainer: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  settingsValueContainer: {
    marginLeft: 8,
    flexShrink: 1,
    alignItems: 'flex-end',
  },
  chevronWrapper: {
    width: 18,
    marginLeft: 6,
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  avatarWrapper: {
    marginRight: 12,
    flexShrink: 0,
  },
  avatarLabelContainer: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
});

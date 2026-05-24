import { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, spacing, typography } from '../theme';
import { Icon } from './Icon';
import { SeagullAvatar, SeagullMascot } from './SeagullAvatar';

interface AppHeaderProps {
  greeting: string;
  subtitle: string;
  userId: string;
  userName: string;
  onNotificationPress?: () => void;
  variant?: 'home' | 'screen';
  title?: string;
  onBack?: () => void;
  right?: ReactNode;
}

export function AppHeader({
  greeting,
  subtitle,
  userId,
  userName,
  onNotificationPress,
  variant = 'home',
  title,
  onBack,
  right,
}: AppHeaderProps) {
  if (variant === 'screen') {
    return (
      <View style={{ paddingHorizontal: spacing.screenX, paddingBottom: spacing.md }}>
        <LinearGradient
          colors={[colors.surfaceMuted, colors.background]}
          style={{ borderRadius: 0, paddingTop: spacing.sm, paddingBottom: spacing.lg }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            {onBack ? (
              <Pressable
                onPress={onBack}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.white,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="chevron-left" size={22} color={colors.textPrimary} />
              </Pressable>
            ) : (
              <View style={{ width: 40 }} />
            )}
            {right ?? <SeagullMascot size={56} />}
          </View>
          {title ? (
            <View style={{ marginTop: spacing.md, paddingRight: 80 }}>
              <Text style={typography.title}>{title}</Text>
              {subtitle ? <Text style={[typography.caption, { marginTop: 4 }]}>{subtitle}</Text> : null}
            </View>
          ) : null}
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: spacing.screenX, paddingTop: spacing.sm, paddingBottom: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <SeagullAvatar id={userId} label={userName} size={52} />
          <View style={{ flex: 1 }}>
            <Text style={typography.headline}>{greeting}</Text>
            <Text style={[typography.caption, { marginTop: 2 }]}>{subtitle}</Text>
          </View>
        </View>
        <Pressable onPress={onNotificationPress} style={{ padding: spacing.xs }}>
          <View>
            <Icon name="bell" size={24} color={colors.textPrimary} />
            <View
              style={{
                position: 'absolute',
                top: 2,
                right: 2,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#EF4444',
                borderWidth: 1.5,
                borderColor: colors.background,
              }}
            />
          </View>
        </Pressable>
      </View>
    </View>
  );
}

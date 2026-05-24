import { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors, layout, shadows, typography } from '../theme';
import { Icon, IconName } from './Icon';

export function SectionTitle({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={typography.sectionTitle}>{title}</Text>
      {actionLabel ? (
        <Pressable onPress={onAction} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>{actionLabel}</Text>
          <Icon name="chevron-right" size={14} color={colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function SectionCard({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        width: '100%',
        backgroundColor: colors.white,
        borderRadius: layout.cardRadius,
        overflow: 'hidden',
        ...shadows.cardSoft,
      }}
    >
      {children}
    </View>
  );
}

export function SectionRow({
  icon,
  iconTint,
  iconBg,
  label,
  subtitle,
  value,
  onPress,
  showDivider = true,
  showChevron = true,
}: {
  icon: IconName;
  iconTint: string;
  iconBg: string;
  label: string;
  subtitle?: string;
  value: string;
  onPress?: () => void;
  showDivider?: boolean;
  showChevron?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: layout.cardPadding,
        paddingVertical: 14,
        borderBottomWidth: showDivider ? 1 : 0,
        borderBottomColor: colors.borderSubtle,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: iconBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={20} color={iconTint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={typography.bodyMedium}>{label}</Text>
        {subtitle ? (
          <Text style={[typography.caption, { marginTop: 2, color: colors.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      {value ? <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>{value}</Text> : null}
      {showChevron ? <Icon name="chevron-right" size={16} color={colors.textTertiary} /> : null}
    </Pressable>
  );
}

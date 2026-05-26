import { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors, layout, typography } from '../theme';
import { Icon, IconName } from './Icon';
import { CategoryIconBadge } from './expenses/CategoryIconBadge';
import { ShadowSurface } from './layout/ShadowSurface';

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
        <Pressable onPress={onAction} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>{actionLabel}</Text>
          <View style={{ marginLeft: 2 }}>
            <Icon name="chevron-right" size={14} color={colors.textSecondary} />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

export function SectionCard({ children }: { children: ReactNode }) {
  return (
    <ShadowSurface shadow="cardSoft" overflowHidden>
      {children}
    </ShadowSurface>
  );
}

export function SectionRow({
  icon,
  iconTint,
  iconBg,
  categoryKey,
  categoryName,
  categoryId,
  label,
  subtitle,
  detailText,
  value,
  onPress,
  showDivider = true,
  showChevron = true,
}: {
  icon?: IconName;
  iconTint?: string;
  iconBg?: string;
  categoryKey?: string;
  categoryName?: string;
  categoryId?: string;
  label: string;
  subtitle?: string;
  detailText?: string;
  value: string;
  onPress?: () => void;
  showDivider?: boolean;
  showChevron?: boolean;
}) {
  const hasCategory = Boolean(categoryKey || categoryName || categoryId);

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: layout.cardPadding,
        paddingVertical: 14,
        borderBottomWidth: showDivider ? 1 : 0,
        borderBottomColor: colors.borderSubtle,
      }}
    >
      {hasCategory ? (
        <View style={{ marginRight: 12 }}>
          <CategoryIconBadge
            categoryKey={categoryKey}
            categoryName={categoryName}
            categoryId={categoryId}
            size="sm"
          />
        </View>
      ) : icon && iconTint && iconBg ? (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: iconBg,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Icon name={icon} size={20} color={iconTint} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={typography.bodyMedium}>{label}</Text>
        {subtitle ? (
          <Text style={[typography.caption, { marginTop: 2, color: colors.textSecondary }]}>{subtitle}</Text>
        ) : null}
        {detailText ? (
          <Text style={[typography.caption, { marginTop: 2, color: colors.textTertiary }]}>{detailText}</Text>
        ) : null}
      </View>
      {value ? <Text style={[typography.bodyMedium, { color: colors.textPrimary, marginRight: 8 }]}>{value}</Text> : null}
      {showChevron ? <Icon name="chevron-right" size={16} color={colors.textTertiary} /> : null}
    </Pressable>
  );
}

import { Pressable, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import { Icon, IconName } from '../Icon';
import { BottomSheet } from '../common/BottomSheet';

function SettingsActionRow({
  label,
  icon,
  onPress,
  tone = 'default',
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
  tone?: 'default' | 'warning' | 'danger';
}) {
  const labelColor =
    tone === 'danger' ? colors.danger : tone === 'warning' ? '#B45309' : colors.textPrimary;

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: 14,
        paddingHorizontal: spacing.sm,
        borderRadius: radii.lg,
        backgroundColor: colors.background,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: colors.white,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={18} color={labelColor} strokeWidth={1.5} />
      </View>
      <Text style={[typography.bodyMedium, { color: labelColor, flex: 1 }]}>{label}</Text>
      <Icon name="chevron-right" size={18} color={colors.textTertiary} strokeWidth={1.5} />
    </Pressable>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={[typography.label, { color: colors.textSecondary, paddingHorizontal: spacing.xs }]}>
        {title}
      </Text>
      <View style={{ gap: spacing.xs }}>{children}</View>
    </View>
  );
}

export function GroupSettingsSheet({
  visible,
  isOwner,
  isInactive = false,
  onClose,
  onManageMembers,
  onInviteMembers,
  onEditGroup,
  onSetInactive,
  onReactivate,
  onDeleteGroup,
}: {
  visible: boolean;
  isOwner: boolean;
  isInactive?: boolean;
  onClose: () => void;
  onManageMembers: () => void;
  onInviteMembers: () => void;
  onEditGroup: () => void;
  onSetInactive: () => void;
  onReactivate: () => void;
  onDeleteGroup: () => void;
}) {
  return (
    <BottomSheet visible={visible} title="Group Settings" onClose={onClose}>
      <View style={{ gap: spacing.lg }}>
        <SettingsSection title="Members">
          <SettingsActionRow label="Manage Members" icon="users" onPress={onManageMembers} />
          {isOwner && !isInactive ? (
            <SettingsActionRow label="Invite More Members" icon="envelope" onPress={onInviteMembers} />
          ) : null}
        </SettingsSection>

        {isOwner ? (
          <SettingsSection title="Group">
            <SettingsActionRow label="Edit Group Details" icon="pencil-square" onPress={onEditGroup} />
            {isInactive ? (
              <SettingsActionRow label="Reactivate Group" icon="arrow-path" onPress={onReactivate} />
            ) : (
              <SettingsActionRow label="Set Group Inactive" icon="lock-closed" onPress={onSetInactive} tone="warning" />
            )}
            <SettingsActionRow label="Delete Group" icon="x-mark" onPress={onDeleteGroup} tone="danger" />
          </SettingsSection>
        ) : null}
      </View>
    </BottomSheet>
  );
}

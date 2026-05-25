import { Pressable, Text, View } from 'react-native';

import { colors, layout, typography } from '../../theme';
import { Icon, IconName } from '../Icon';

function ActionRow({
  icon,
  label,
  tone = 'default',
  onPress,
  showDivider,
}: {
  icon: IconName;
  label: string;
  tone?: 'default' | 'danger';
  onPress: () => void;
  showDivider?: boolean;
}) {
  const textColor = tone === 'danger' ? colors.danger : colors.textPrimary;
  const iconColor = tone === 'danger' ? colors.danger : colors.primary;

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
          backgroundColor: tone === 'danger' ? colors.dangerSoft : colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={18} color={iconColor} strokeWidth={1.5} />
      </View>
      <Text style={[typography.bodyMedium, { color: textColor, flex: 1 }]}>{label}</Text>
      <Icon name="chevron-right" size={16} color={colors.textTertiary} />
    </Pressable>
  );
}

export function GroupActionsCard({
  onInviteMembers,
  onSetInactive,
  onDeleteGroup,
}: {
  onInviteMembers: () => void;
  onSetInactive: () => void;
  onDeleteGroup: () => void;
}) {
  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: layout.cardRadius,
        overflow: 'hidden',
      }}
    >
      <ActionRow icon="envelope" label="Invite More Members" onPress={onInviteMembers} showDivider />
      <ActionRow icon="clipboard-list" label="Set Group Inactive" onPress={onSetInactive} showDivider />
      <ActionRow icon="x-mark" label="Delete Group" tone="danger" onPress={onDeleteGroup} />
    </View>
  );
}

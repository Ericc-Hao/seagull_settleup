import { Pressable, Text, View } from 'react-native';

import type { PendingTransferView } from '../../types/views';
import { colors, layout, typography } from '../../theme';
import { UserAvatar } from '../common/UserAvatar';
import { Icon } from '../Icon';

export function PendingTransferRow({
  transfer,
  showGroupTag = false,
  showDivider = true,
  onPress,
}: {
  transfer: PendingTransferView;
  showGroupTag?: boolean;
  showDivider?: boolean;
  onPress: () => void;
}) {
  const statusLine = showGroupTag
    ? `${transfer.groupName} · Pending`
    : 'Pending · Tap for payment details';

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
      <UserAvatar
        avatarUrl={transfer.receiverAvatarUrl}
        displayName={transfer.receiverName}
        email={transfer.receiverEmail}
        initials={transfer.receiverAvatarLabel}
        size="small"
      />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={typography.bodyMedium}>Pay {transfer.receiverName}</Text>
        {!showGroupTag && transfer.groupName ? (
          <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
            {transfer.groupName}
          </Text>
        ) : null}
        <Text style={[typography.caption, { color: colors.owe, fontWeight: '600' }]} numberOfLines={1}>
          {statusLine}
        </Text>
      </View>
      <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>{transfer.amountDisplay}</Text>
      <Icon name="chevron-right" size={16} color={colors.textTertiary} />
    </Pressable>
  );
}

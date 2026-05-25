import { Pressable, Text, View } from 'react-native';

import { colors, typography } from '../../theme';
import { Icon } from '../Icon';

export function PaymentDetailRow({
  label,
  value,
  copyValue,
  disabled = false,
  copied = false,
  onCopy,
  numberOfLines = 1,
}: {
  label: string;
  value: string;
  copyValue?: string;
  disabled?: boolean;
  copied?: boolean;
  onCopy?: () => void;
  numberOfLines?: number;
}) {
  const canCopy = !disabled && Boolean(copyValue?.trim()) && Boolean(onCopy);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minHeight: 32,
      }}
    >
      <Text style={[typography.caption, { width: 58, color: colors.textSecondary, fontWeight: '600' }]}>
        {label}
      </Text>
      <Text
        style={[typography.bodyMedium, { flex: 1, color: disabled ? colors.textTertiary : colors.textPrimary }]}
        numberOfLines={numberOfLines}
        ellipsizeMode="tail"
      >
        {value}
      </Text>
      {canCopy ? (
        <Pressable
          onPress={onCopy}
          hitSlop={8}
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: copied ? colors.tertiary : 'transparent',
          }}
        >
          <Icon
            name={copied ? 'check-circle' : 'document-duplicate'}
            size={16}
            color={copied ? colors.primary : colors.textSecondary}
            solid={copied}
          />
        </Pressable>
      ) : (
        <View style={{ width: 28 }} />
      )}
    </View>
  );
}

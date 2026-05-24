import { Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';

export interface TransferDetail {
  label: string;
  value: string;
}

export function TransferDetailList({ items }: { items: TransferDetail[] }) {
  return (
    <View>
      {items.map((item, index) => (
        <View
          key={item.label}
          style={{
            paddingVertical: 12,
            borderBottomWidth: index < items.length - 1 ? 1 : 0,
            borderBottomColor: colors.borderSubtle,
          }}
        >
          <Text style={[typography.caption, { marginBottom: 4 }]}>{item.label}</Text>
          <Text
            style={[
              typography.bodyMedium,
              { color: colors.textPrimary, lineHeight: item.label === 'Message' ? 20 : 22 },
            ]}
          >
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

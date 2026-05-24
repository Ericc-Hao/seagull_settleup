import { Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';
import { SeagullAvatar } from '../SeagullAvatar';

export interface SplitPreviewItem {
  id: string;
  name: string;
  amount: string;
}

export function SplitPreviewList({ items }: { items: SplitPreviewItem[] }) {
  return (
    <View style={{ gap: 10 }}>
      {items.map((item) => (
        <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <SeagullAvatar id={item.id} label={item.name} size={32} />
          <Text style={[typography.body, { flex: 1, color: colors.textPrimary }]}>{item.name}</Text>
          <View
            style={{
              flex: 1,
              height: 1,
              borderBottomWidth: 1,
              borderStyle: 'dashed',
              borderColor: colors.borderSubtle,
              marginHorizontal: 4,
            }}
          />
          <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>{item.amount}</Text>
        </View>
      ))}
    </View>
  );
}

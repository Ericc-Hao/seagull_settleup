import { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { cards, spacing, typography } from '../../theme';

export function FormSection({
  label,
  hint,
  children,
  noPadding,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  noPadding?: boolean;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={[typography.sectionTitle, { paddingHorizontal: 2 }]}>{label}</Text>
      <View style={[cards.section, noPadding ? { padding: 0 } : undefined]}>
        {children}
      </View>
      {hint ? <Text style={[typography.caption, { paddingHorizontal: 2 }]}>{hint}</Text> : null}
    </View>
  );
}

import { Text, View } from 'react-native';

import type { GroupStatus } from '../types/models';

const styles: Record<string, { bg: string; text: string; label: string }> = {
  planning: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Planning' },
  active: { bg: 'bg-orange-50', text: 'text-orange-600', label: 'Pending' },
  ready_to_settle: { bg: 'bg-rose-50', text: 'text-rose-500', label: 'Not Settled' },
  settled: { bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'Settled' },
  archived: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Archived' },
};

export function StatusPill({ status, label }: { status: GroupStatus; label?: string }) {
  const s = styles[status] ?? styles.active;
  return (
    <View className={`self-start rounded-full px-2 py-0.5 ${s.bg}`}>
      <Text className={`text-[10px] font-bold ${s.text}`}>{label ?? s.label}</Text>
    </View>
  );
}

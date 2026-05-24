import { ReactNode } from 'react';
import { Text, View } from 'react-native';

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <Text className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</Text>
      <View className="gap-2">{children}</View>
    </View>
  );
}

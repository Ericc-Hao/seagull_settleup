import { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';

export function Screen({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-950" contentContainerClassName="gap-3 p-4 pb-10">
      <View className="gap-1">
        <Text className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</Text>
        {subtitle ? <Text className="text-sm text-slate-600 dark:text-slate-300">{subtitle}</Text> : null}
      </View>
      {children}
    </ScrollView>
  );
}

export function Row({
  label,
  value,
  valueClassName = 'text-slate-900 dark:text-slate-100',
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm text-slate-600 dark:text-slate-300">{label}</Text>
      <Text className={`text-sm font-semibold ${valueClassName}`}>{value}</Text>
    </View>
  );
}

import { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';

export function ScreenCard(props: { title: string; children: ReactNode }): ReactNode {
  return (
    <View className="gap-2 rounded-xl border border-slate-200 bg-white p-3.5">
      <Text className="text-base font-semibold text-slate-900">{props.title}</Text>
      <View className="gap-1.5">{props.children}</View>
    </View>
  );
}

export function ScreenContainer(props: { title: string; subtitle?: string; children: ReactNode }): ReactNode {
  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerClassName="gap-3 p-4">
      <Text className="text-2xl font-bold text-slate-900">{props.title}</Text>
      {props.subtitle ? <Text className="text-sm text-slate-700">{props.subtitle}</Text> : null}
      {props.children}
    </ScrollView>
  );
}

export const rowClassName = 'flex-row items-center justify-between';
export const labelClassName = 'text-sm text-slate-700';
export const valueClassName = 'text-sm font-semibold text-slate-900';

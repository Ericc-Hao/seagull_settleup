import { Text, View } from 'react-native';

export function Progress({
  label,
  value,
  tone = 'blue',
}: {
  label: string;
  value: number;
  tone?: 'blue' | 'emerald';
}) {
  const normalized = Math.max(0, Math.min(100, value));
  const barToneClass = tone === 'emerald' ? 'bg-emerald-500' : 'bg-blue-600';
  const filledSegments = Math.round((normalized / 100) * 20);

  return (
    <View className="gap-1.5">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</Text>
        <Text className="text-xs font-semibold text-slate-900 dark:text-slate-100">{normalized}%</Text>
      </View>
      <View className="flex-row gap-0.5">
        {Array.from({ length: 20 }, (_, index) => (
          <View
            key={`${label}-${index}`}
            className={`h-1.5 flex-1 rounded-full ${index < filledSegments ? barToneClass : 'bg-slate-200 dark:bg-slate-700'}`}
          />
        ))}
      </View>
    </View>
  );
}

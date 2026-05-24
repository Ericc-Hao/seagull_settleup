import { Pressable, Text, View } from 'react-native';

import { Icon, IconName } from './icon';
import { shadows } from '../theme';
import { BRAND } from './theme';

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <View className="flex-row rounded-2xl bg-brand-100 p-1">
      {options.map((option) => {
        const active = value === option.id;
        return (
          <Pressable
            key={option.id}
            onPress={() => onChange(option.id)}
            className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 ${
              active ? 'bg-white' : ''
            }`}
            style={active ? shadows.cardSoft : undefined}
          >
            {option.icon ? (
              <Icon
                name={option.icon}
                size={18}
                color={active ? BRAND.lavender : BRAND.muted}
                solid={active}
              />
            ) : null}
            <Text
              className={`text-center text-sm font-semibold ${active ? 'text-brand-navy' : 'text-brand-muted'}`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

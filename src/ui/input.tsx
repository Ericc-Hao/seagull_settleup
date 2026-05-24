import { Text, TextInput, View } from 'react-native';

import { BRAND } from './theme';

interface InputProps {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'decimal-pad';
  locked?: boolean;
  multiline?: boolean;
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  locked = false,
  multiline = false,
}: InputProps) {
  return (
    <View className="gap-1.5">
      <Text className="text-xs font-semibold text-brand-muted">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={BRAND.muted}
        editable={!locked}
        keyboardType={keyboardType}
        multiline={multiline}
        className={`rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-[15px] text-brand-navy ${
          locked ? 'opacity-70' : ''
        } ${multiline ? 'min-h-[88px]' : ''}`}
      />
    </View>
  );
}

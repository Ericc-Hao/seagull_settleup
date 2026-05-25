import { FormInput } from './FormInput';

export function EmailInput({
  value,
  onChangeText,
  placeholder = 'Email address',
  error,
  onSubmitEditing,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  onSubmitEditing?: () => void;
}) {
  return (
    <FormInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      error={error}
      onSubmitEditing={onSubmitEditing}
      keyboardType="email-address"
      autoCapitalize="none"
    />
  );
}

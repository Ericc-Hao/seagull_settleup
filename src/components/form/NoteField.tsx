import { TextInput } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';

export function NoteField({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textTertiary}
      multiline
      textAlignVertical="top"
      style={{
        minHeight: 88,
        backgroundColor: colors.background,
        borderRadius: radii.md,
        padding: spacing.md,
        ...typography.body,
        fontSize: 14,
      }}
    />
  );
}

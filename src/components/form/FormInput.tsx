import { Pressable, Text, TextInput, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';
import { Icon } from '../Icon';

export function FormInput({
  value,
  onChangeText,
  placeholder,
  error,
  clearable = true,
  onSubmitEditing,
  keyboardType,
  autoCapitalize = 'sentences',
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  clearable?: boolean;
  onSubmitEditing?: () => void;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View>
      <View style={fieldRowStyle}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          onSubmitEditing={onSubmitEditing}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          style={[typography.body, { flex: 1, padding: 0, color: colors.textPrimary }]}
        />
        {clearable && value.length > 0 ? (
          <Pressable onPress={() => onChangeText('')} hitSlop={8} style={{ marginLeft: spacing.sm }}>
            <Icon name="x-mark" size={18} color={colors.textTertiary} strokeWidth={1.5} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text
          style={[
            typography.caption,
            { color: colors.danger, paddingHorizontal: 2, marginTop: spacing.xs },
          ]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const fieldRowStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  backgroundColor: colors.white,
  borderRadius: radii.md,
  borderWidth: 1,
  borderColor: colors.borderSubtle,
  paddingHorizontal: spacing.md,
  paddingVertical: 12,
};

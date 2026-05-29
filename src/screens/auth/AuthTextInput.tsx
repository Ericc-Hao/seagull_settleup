import { Text, TextInput, View, type KeyboardTypeOptions, type TextInputProps } from 'react-native';

import { colors, typography } from '../../theme';
import {
  authInputContainerDisabledStyle,
  authInputContainerStyle,
  authInputTextStyle,
} from './authScreenStyles';

export function AuthTextInput({
  label,
  value,
  onChangeText,
  secureTextEntry = false,
  autoCapitalize = 'none',
  disabled = false,
  helperText,
  placeholder,
  keyboardType = 'default',
  textContentType,
  autoComplete,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  disabled?: boolean;
  helperText?: string;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  textContentType?: TextInputProps['textContentType'];
  autoComplete?: TextInputProps['autoComplete'];
}) {
  return (
    <View
      style={{
        ...authInputContainerStyle,
        ...(disabled ? authInputContainerDisabledStyle : {}),
        opacity: disabled ? 0.85 : 1,
      }}
    >
      <Text style={[typography.label, { marginBottom: 6 }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        spellCheck={false}
        keyboardType={keyboardType}
        textContentType={textContentType}
        autoComplete={autoComplete}
        editable={!disabled}
        selectTextOnFocus={!disabled}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        style={[
          typography.body,
          authInputTextStyle,
          {
            color: disabled ? colors.textSecondary : colors.textPrimary,
          },
        ]}
      />
      {helperText ? (
        <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 6 }]}>{helperText}</Text>
      ) : null}
    </View>
  );
}

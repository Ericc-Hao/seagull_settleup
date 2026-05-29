import { Text } from 'react-native';

import { authErrorTextStyle } from './authScreenStyles';

export function AuthErrorMessage({ message }: { message?: string | null }) {
  if (!message) {
    return null;
  }
  return <Text style={authErrorTextStyle}>{message}</Text>;
}

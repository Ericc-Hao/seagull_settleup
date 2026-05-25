import { Stack } from 'expo-router';

import { stackScreenOptions } from '../../src/navigation/screenOptions';

export default function AuthLayout() {
  return <Stack screenOptions={stackScreenOptions} />;
}

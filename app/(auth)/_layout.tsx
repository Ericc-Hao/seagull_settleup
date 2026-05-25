import { Stack } from 'expo-router';

import { PublicAuthRoute } from '../../src/components/auth/PublicAuthRoute';
import { stackScreenOptions } from '../../src/navigation/screenOptions';

export default function AuthLayout() {
  return (
    <PublicAuthRoute>
      <Stack screenOptions={stackScreenOptions} />
    </PublicAuthRoute>
  );
}

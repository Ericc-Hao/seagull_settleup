import { Stack } from 'expo-router';

import { ProtectedRoute } from '../../../src/components/auth/ProtectedRoute';
import { groupStackScreenOptions } from '../../../src/navigation/screenOptions';

export default function GroupLayout() {
  return (
    <ProtectedRoute>
      <Stack screenOptions={groupStackScreenOptions}>
        <Stack.Screen name="index" />
        <Stack.Screen name="invite-members" />
        <Stack.Screen name="manage-members" />
        <Stack.Screen name="edit-group" />
        <Stack.Screen name="add-expense" />
        <Stack.Screen name="settle-up" />
      </Stack>
    </ProtectedRoute>
  );
}

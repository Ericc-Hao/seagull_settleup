import { Stack } from 'expo-router';

import { groupStackScreenOptions } from '../../../src/navigation/screenOptions';

export default function GroupLayout() {
  return (
    <Stack screenOptions={groupStackScreenOptions}>
      <Stack.Screen name="index" />
      <Stack.Screen name="invite-members" />
      <Stack.Screen name="manage-members" />
      <Stack.Screen name="edit-group" />
      <Stack.Screen name="add-expense" />
      <Stack.Screen name="settle-up" />
    </Stack>
  );
}

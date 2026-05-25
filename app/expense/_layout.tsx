import { Stack } from 'expo-router';
import { View } from 'react-native';

import { stackScreenOptions } from '../../src/navigation/screenOptions';
import { colors } from '../../src/theme';

export default function ExpenseLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack screenOptions={stackScreenOptions}>
        <Stack.Screen name="[expenseId]" />
      </Stack>
    </View>
  );
}

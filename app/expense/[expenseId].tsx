import { Redirect, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { ExpenseDetailScreen } from '../../src/screens/ExpenseDetailScreen';
import { colors } from '../../src/theme';

export default function ExpenseDetailRoute() {
  const { expenseId } = useLocalSearchParams<{ expenseId: string }>();
  if (!expenseId) {
    return <Redirect href="/(tabs)/expenses" />;
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ExpenseDetailScreen expenseId={expenseId} />
    </View>
  );
}

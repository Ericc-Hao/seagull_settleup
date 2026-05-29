import { Redirect, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { ExpenseDetailScreen } from '../../src/screens/ExpenseDetailScreen';
import { colors } from '../../src/theme';
import { resolveRouteParam } from '../../src/utils/navigation';
import type { ExpenseDetailFrom } from '../../src/utils/navigation';

function parseFrom(value?: string): ExpenseDetailFrom | undefined {
  return value === 'group' || value === 'expenses' ? value : undefined;
}

export default function ExpenseDetailRoute() {
  const params = useLocalSearchParams<{
    expenseId: string;
    from?: string | string[];
    groupId?: string | string[];
  }>();
  const expenseId = resolveRouteParam(params.expenseId);
  const from = parseFrom(resolveRouteParam(params.from));
  const groupId = resolveRouteParam(params.groupId);

  if (!expenseId) {
    return <Redirect href="/(tabs)/expenses" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ExpenseDetailScreen
        expenseId={expenseId}
        navigationContext={{
          from,
          groupId,
        }}
      />
    </View>
  );
}

import { Redirect, useLocalSearchParams } from 'expo-router';

import { GroupAddExpenseRouteScreen } from '../../../src/screens/GroupAddExpenseRouteScreen';
import { resolveRouteParam } from '../../../src/utils/navigation';

export default function GroupAddExpenseRoute() {
  const params = useLocalSearchParams<{ groupId: string | string[] }>();
  const groupId = resolveRouteParam(params.groupId);
  if (!groupId) {
    return <Redirect href="/add-expense" />;
  }
  return <GroupAddExpenseRouteScreen groupId={groupId} />;
}

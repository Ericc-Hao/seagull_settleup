import { Redirect, useLocalSearchParams } from 'expo-router';

import { ManageMembersScreen } from '../../../src/screens';
import { resolveRouteParam } from '../../../src/utils/navigation';

export default function ManageMembersRoute() {
  const params = useLocalSearchParams<{ groupId: string | string[] }>();
  const groupId = resolveRouteParam(params.groupId);
  if (!groupId) {
    return <Redirect href="/(tabs)/groups" />;
  }
  return <ManageMembersScreen groupId={groupId} />;
}

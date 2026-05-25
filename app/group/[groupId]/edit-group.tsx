import { Redirect, useLocalSearchParams } from 'expo-router';

import { EditGroupScreen } from '../../../src/screens';
import { resolveRouteParam } from '../../../src/utils/navigation';

export default function EditGroupRoute() {
  const params = useLocalSearchParams<{ groupId: string | string[] }>();
  const groupId = resolveRouteParam(params.groupId);
  if (!groupId) {
    return <Redirect href="/(tabs)/groups" />;
  }
  return <EditGroupScreen groupId={groupId} />;
}

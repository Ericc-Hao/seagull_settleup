import { Redirect, useLocalSearchParams } from 'expo-router';

import { SettleUpScreen } from '../../../src/screens';
import { resolveRouteParam } from '../../../src/utils/navigation';

export default function SettleUpRoute() {
  const params = useLocalSearchParams<{ groupId: string | string[] }>();
  const groupId = resolveRouteParam(params.groupId);
  if (!groupId) {
    return <Redirect href="/(tabs)/groups" />;
  }
  return <SettleUpScreen mode="group" groupId={groupId} />;
}

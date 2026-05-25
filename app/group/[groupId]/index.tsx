import { Redirect, useLocalSearchParams } from 'expo-router';

import { GroupDetailScreen } from '../../../src/screens';

export default function GroupDetailRoute() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  if (!groupId) {
    return <Redirect href="/(tabs)/groups" />;
  }
  return <GroupDetailScreen groupId={groupId} />;
}

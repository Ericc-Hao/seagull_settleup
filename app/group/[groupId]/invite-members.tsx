import { Redirect, useLocalSearchParams } from 'expo-router';

import { InviteMembersScreen } from '../../../src/screens';

export default function InviteMembersRoute() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  if (!groupId) {
    return <Redirect href="/(tabs)/groups" />;
  }
  return <InviteMembersScreen groupId={groupId} />;
}

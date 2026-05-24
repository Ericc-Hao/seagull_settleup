import { useLocalSearchParams } from 'expo-router';

import { SettleUpScreen } from '../../../src/screens';

export default function SettleUpRoute() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  return <SettleUpScreen groupId={groupId ?? 'group-banff'} />;
}

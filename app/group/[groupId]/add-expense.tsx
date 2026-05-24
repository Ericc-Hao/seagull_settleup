import { useLocalSearchParams } from 'expo-router';

import { AddExpenseScreen } from '../../../src/screens';

export default function AddExpenseRoute() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  return <AddExpenseScreen groupId={groupId ?? 'group-banff'} />;
}

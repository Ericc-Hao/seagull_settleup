import { useLocalSearchParams } from 'expo-router';

import { AddExpenseScreen } from '../src/screens';

export default function AddExpenseRoute() {
  const params = useLocalSearchParams<{ groupId?: string | string[] }>();
  const raw = params.groupId;
  const initialGroupId = typeof raw === 'string' ? raw : raw?.[0];
  return <AddExpenseScreen initialGroupId={initialGroupId} />;
}

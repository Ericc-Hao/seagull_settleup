import { Redirect, useLocalSearchParams } from 'expo-router';

export default function GroupAddExpenseRoute() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  if (!groupId) {
    return <Redirect href="/add-expense" />;
  }
  return <Redirect href={`/add-expense?groupId=${groupId}`} />;
}

import { useLocalSearchParams } from 'expo-router';

import { ProtectedRoute } from '../src/components/auth/ProtectedRoute';
import { AddExpenseScreen } from '../src/screens';

function AddExpenseRouteContent() {
  const params = useLocalSearchParams<{ groupId?: string | string[] }>();
  const raw = params.groupId;
  const initialGroupId = typeof raw === 'string' ? raw : raw?.[0];
  return <AddExpenseScreen initialGroupId={initialGroupId} />;
}

export default function AddExpenseRoute() {
  return (
    <ProtectedRoute>
      <AddExpenseRouteContent />
    </ProtectedRoute>
  );
}

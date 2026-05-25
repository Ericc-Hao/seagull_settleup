import { ProtectedRoute } from '../src/components/auth/ProtectedRoute';
import { CreateGroupScreen } from '../src/screens';

export default function CreateGroupRoute() {
  return (
    <ProtectedRoute>
      <CreateGroupScreen />
    </ProtectedRoute>
  );
}

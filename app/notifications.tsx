import { ProtectedRoute } from '../src/components/auth/ProtectedRoute';
import { NotificationsScreen } from '../src/screens/NotificationsScreen';

export default function NotificationsRoute() {
  return (
    <ProtectedRoute>
      <NotificationsScreen />
    </ProtectedRoute>
  );
}

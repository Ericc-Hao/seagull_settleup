import { ProtectedRoute } from '../src/components/auth/ProtectedRoute';
import { EditProfileScreen } from '../src/screens/EditProfileScreen';

export default function EditProfileRoute() {
  return (
    <ProtectedRoute>
      <EditProfileScreen />
    </ProtectedRoute>
  );
}

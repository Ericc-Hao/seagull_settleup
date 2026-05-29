import { PublicAuthRoute } from '../src/components/auth/PublicAuthRoute';
import { RegisterScreen } from '../src/screens/AuthScreens';

export default function RegisterRoute() {
  return (
    <PublicAuthRoute>
      <RegisterScreen />
    </PublicAuthRoute>
  );
}

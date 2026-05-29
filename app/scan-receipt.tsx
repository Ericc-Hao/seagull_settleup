import { ProtectedRoute } from '../src/components/auth/ProtectedRoute';
import { ScanReceiptScreen } from '../src/screens';

export default function ScanReceiptRoute() {
  return (
    <ProtectedRoute>
      <ScanReceiptScreen />
    </ProtectedRoute>
  );
}

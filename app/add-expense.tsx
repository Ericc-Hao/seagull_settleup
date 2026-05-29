import { useLocalSearchParams } from 'expo-router';

import { ProtectedRoute } from '../src/components/auth/ProtectedRoute';
import { AddExpenseScreen } from '../src/screens';
import type { ExpenseType } from '../src/types/models';

function firstParam(value?: string | string[]): string | undefined {
  return typeof value === 'string' ? value : value?.[0];
}

function parseExpenseType(value?: string): ExpenseType | undefined {
  return value === 'personal' || value === 'split' ? value : undefined;
}

function AddExpenseRouteContent() {
  const params = useLocalSearchParams<{
    groupId?: string | string[];
    source?: string | string[];
    amountCents?: string | string[];
    receiptUri?: string | string[];
    expenseType?: string | string[];
  }>();
  const initialGroupId = firstParam(params.groupId);
  const source = firstParam(params.source);
  const amountCentsRaw = firstParam(params.amountCents);
  const amountCents = amountCentsRaw ? Number.parseInt(amountCentsRaw, 10) : undefined;

  return (
    <AddExpenseScreen
      initialGroupId={initialGroupId}
      prefill={{
        source,
        amountCents: Number.isFinite(amountCents) ? amountCents : undefined,
        receiptUri: firstParam(params.receiptUri),
        expenseType: parseExpenseType(firstParam(params.expenseType)),
      }}
    />
  );
}

export default function AddExpenseRoute() {
  return (
    <ProtectedRoute>
      <AddExpenseRouteContent />
    </ProtectedRoute>
  );
}

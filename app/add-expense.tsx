import { useLocalSearchParams } from 'expo-router';

import { ProtectedRoute } from '../src/components/auth/ProtectedRoute';
import { AddExpenseScreen } from '../src/screens';
import type { CurrencyCode } from '../src/types/currency';
import { isCurrencyCode } from '../src/types/currency';
import type { ExpenseType } from '../src/types/models';

function firstParam(value?: string | string[]): string | undefined {
  return typeof value === 'string' ? value : value?.[0];
}

function parseExpenseType(value?: string): ExpenseType | undefined {
  return value === 'personal' || value === 'split' ? value : undefined;
}

function parseCurrency(value?: string): CurrencyCode | undefined {
  const raw = value?.trim().toUpperCase();
  return raw && isCurrencyCode(raw) ? raw : undefined;
}

function parseIntParam(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseFloatParam(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function AddExpenseRouteContent() {
  const params = useLocalSearchParams<{
    groupId?: string | string[];
    source?: string | string[];
    amountCents?: string | string[];
    currency?: string | string[];
    receiptUri?: string | string[];
    expenseType?: string | string[];
    originalAmountMinor?: string | string[];
    originalCurrency?: string | string[];
    exchangeRate?: string | string[];
    exchangeRateTimestamp?: string | string[];
    exchangeRateProvider?: string | string[];
  }>();
  const initialGroupId = firstParam(params.groupId);
  const source = firstParam(params.source);
  const amountCents = parseIntParam(firstParam(params.amountCents));

  return (
    <AddExpenseScreen
      initialGroupId={initialGroupId}
      prefill={{
        source,
        amountCents,
        currency: parseCurrency(firstParam(params.currency)),
        receiptUri: firstParam(params.receiptUri),
        expenseType: parseExpenseType(firstParam(params.expenseType)),
        originalAmountMinor: parseIntParam(firstParam(params.originalAmountMinor)),
        originalCurrency: parseCurrency(firstParam(params.originalCurrency)),
        exchangeRate: parseFloatParam(firstParam(params.exchangeRate)),
        exchangeRateTimestamp: firstParam(params.exchangeRateTimestamp),
        exchangeRateProvider: firstParam(params.exchangeRateProvider),
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

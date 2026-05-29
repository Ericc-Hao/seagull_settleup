import { router, type Href } from 'expo-router';

import { createLogger } from './logger';

const logger = createLogger('navigation');

export type ExpenseDetailFrom = 'group' | 'expenses';

export interface ExpenseDetailNavigationContext {
  from?: ExpenseDetailFrom;
  groupId?: string;
}

export function replaceToGroup(groupId: string): void {
  router.replace(`/group/${groupId}`);
}

export function replaceToExpenses(): void {
  router.replace('/(tabs)/expenses');
}

export function replaceToHome(): void {
  router.replace('/(tabs)/home');
}

export function replaceToGroups(): void {
  router.replace('/(tabs)/groups');
}

export function safeBack(fallback: Href): void {
  safeBackOrReplace(fallback);
}

export function safeBackOrReplace(fallback: Href): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallback);
}

export function resolveRouteParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export function navigateToExpenseDetail(
  expenseId: string,
  context?: ExpenseDetailNavigationContext,
): void {
  router.push({
    pathname: '/expense/[expenseId]',
    params: {
      expenseId,
      ...(context?.from ? { from: context.from } : {}),
      ...(context?.groupId ? { groupId: context.groupId } : {}),
    },
  });
}

export function navigateAfterDeleteExpense(
  result: { type?: 'personal' | 'split'; groupId?: string | null },
  context?: ExpenseDetailNavigationContext,
): void {
  logger.info('Navigate after delete expense', {
    type: result.type,
    groupId: result.groupId ?? context?.groupId,
    from: context?.from,
  });

  if (context?.from === 'group' && context.groupId) {
    safeBackOrReplace(`/group/${context.groupId}`);
    return;
  }

  if (context?.from === 'expenses') {
    safeBackOrReplace('/(tabs)/expenses');
    return;
  }

  if (result.type === 'split' && result.groupId) {
    safeBackOrReplace(`/group/${result.groupId}`);
    return;
  }

  safeBackOrReplace('/(tabs)/expenses');
}

/** Clears scan-receipt/add-expense modals, then lands on the post-save destination. */
export function navigateAfterScanReceiptSave(
  destination: Href,
  context?: { expenseType?: string; groupId?: string },
): void {
  logger.info('Scan receipt flow complete, resetting navigation stack', {
    destination,
    expenseType: context?.expenseType,
    groupId: context?.groupId,
  });

  router.dismissAll();

  if (context?.expenseType === 'split' && context.groupId) {
    replaceToGroup(context.groupId);
    return;
  }

  router.replace(destination);
}

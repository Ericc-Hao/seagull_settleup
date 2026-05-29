import { router, type Href } from 'expo-router';

import { createLogger } from './logger';

const logger = createLogger('navigation');

export function safeBack(fallback: Href): void {
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
    router.navigate('/(tabs)/groups');
    router.push(`/group/${context.groupId}`);
    return;
  }

  router.navigate(destination);
}

import * as Clipboard from 'expo-clipboard';

import { createLogger } from './logger';

const logger = createLogger('clipboard');

export async function copyText(value: string, label?: string): Promise<boolean> {
  const trimmed = value?.trim();
  if (!trimmed) {
    logger.warn('Copy attempted with empty value', { label });
    return false;
  }

  try {
    await Clipboard.setStringAsync(trimmed);
    return true;
  } catch (error) {
    logger.error('Copy failed', error, { label });
    return false;
  }
}

export { PAYMENT_COPY_FEEDBACK, buildPaymentDetailsCopyText, buildPaymentMessage } from './paymentCopy';

import type { ReceiptScanResult } from '../../services/receiptScanService';
import type { CurrencyCode } from '../../types/currency';
import { formatAmountInputValue } from '../../utils/currency';
import { RECEIPT_SCAN_MESSAGES } from '../../utils/receiptScanErrors';

export function applyConvertedAmount(result: ReceiptScanResult): string {
  const amountMinor = result.convertedAmountMinor ?? result.detectedAmountMinor;
  if (!amountMinor || amountMinor <= 0) {
    return '';
  }
  return formatAmountInputValue(amountMinor, result.targetCurrency);
}

export interface ScanResultUiUpdates {
  amountText?: string;
  notice?: string;
}

export function deriveScanResultUiUpdates(
  result: ReceiptScanResult,
  currentAmountText: string,
): ScanResultUiUpdates {
  if (result.requiresCurrencySelection) {
    return {
      notice: result.noticeMessage ?? RECEIPT_SCAN_MESSAGES.currencyNotDetected,
      ...(result.detectedAmountText && !currentAmountText ? { amountText: '' } : {}),
    };
  }

  if (result.conversionFailed) {
    return {
      notice: result.noticeMessage ?? RECEIPT_SCAN_MESSAGES.exchangeRateUnavailable,
      ...(result.detectedAmountMinor && result.detectedAmountMinor > 0
        ? { amountText: applyConvertedAmount(result) }
        : {}),
    };
  }

  if (result.convertedAmountMinor && result.convertedAmountMinor > 0) {
    return {
      amountText: applyConvertedAmount(result),
      notice:
        result.candidates.length > 1
          ? `${result.candidates.length} total candidate(s) found. Review the amount before continuing.`
          : undefined,
    };
  }

  if (result.detectedAmountMinor && result.detectedAmountMinor > 0) {
    return {
      amountText: formatAmountInputValue(result.detectedAmountMinor, result.targetCurrency),
      notice: RECEIPT_SCAN_MESSAGES.noAmount,
    };
  }

  return { notice: RECEIPT_SCAN_MESSAGES.noAmount };
}

export function buildReceiptConversionRouteParams(
  scanResult: ReceiptScanResult | undefined,
  selectedSourceCurrency: CurrencyCode,
): Record<string, string> {
  if (!scanResult?.detectedAmountMinor) {
    return {};
  }

  return {
    originalAmountMinor: String(scanResult.detectedAmountMinor),
    originalCurrency: scanResult.detectedCurrency ?? selectedSourceCurrency,
    ...(scanResult.exchangeRate ? { exchangeRate: String(scanResult.exchangeRate) } : {}),
    ...(scanResult.exchangeRateTimestamp ? { exchangeRateTimestamp: scanResult.exchangeRateTimestamp } : {}),
    ...(scanResult.exchangeRateProvider ? { exchangeRateProvider: scanResult.exchangeRateProvider } : {}),
  };
}

export function validateContinueScanReceipt(amountCents: number): string | undefined {
  if (amountCents <= 0) {
    return RECEIPT_SCAN_MESSAGES.amountRequired;
  }
  return undefined;
}

export function canContinueScanReceipt(input: {
  amountCents: number;
  scanning: boolean;
  converting: boolean;
  requiresCurrencySelection: boolean;
  amountText: string;
}): boolean {
  return (
    input.amountCents > 0 &&
    !input.scanning &&
    !input.converting &&
    !(input.requiresCurrencySelection && !input.amountText)
  );
}

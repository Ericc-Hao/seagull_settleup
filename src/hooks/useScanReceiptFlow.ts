import * as ImagePicker from 'expo-image-picker';
import { useCallback, useMemo, useState } from 'react';

import { getProfile } from '../services/profileService';
import {
  convertReceiptAmount,
  scanReceiptImage,
  type ReceiptScanResult,
} from '../services/receiptScanService';
import type { ExpenseType } from '../types/models';
import type { CurrencyCode } from '../types/currency';
import { normalizeCurrencyCode } from '../types/currency';
import {
  parseAmountInput,
  sanitizeAmountInput,
} from '../utils/currency';
import {
  RECEIPT_SCAN_MESSAGES,
  ReceiptScanError,
} from '../utils/receiptScanErrors';
import {
  buildReceiptConversionRouteParams,
  canContinueScanReceipt,
  deriveScanResultUiUpdates,
  validateContinueScanReceipt,
} from './scanReceipt/scanReceiptFlowHelpers';

export function useScanReceiptFlow() {
  const profile = getProfile();
  const targetCurrency = normalizeCurrencyCode(profile?.defaultCurrency);

  const [receiptUri, setReceiptUri] = useState<string | undefined>();
  const [amountText, setAmountText] = useState('');
  const [expenseType, setExpenseType] = useState<ExpenseType>('split');
  const [scanResult, setScanResult] = useState<ReceiptScanResult | undefined>();
  const [selectedSourceCurrency, setSelectedSourceCurrency] = useState<CurrencyCode>('USD');
  const [scanning, setScanning] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();
  const [showReplaceChooser, setShowReplaceChooser] = useState(false);

  const amountCents = parseAmountInput(amountText, targetCurrency);
  const requiresCurrencySelection = scanResult?.requiresCurrencySelection ?? false;

  const resetReceiptSelection = useCallback(() => {
    setReceiptUri(undefined);
    setScanResult(undefined);
    setAmountText('');
    setError(undefined);
    setNotice(undefined);
    setShowReplaceChooser(false);
  }, []);

  const handleScanResult = useCallback((result: ReceiptScanResult, baselineAmountText: string) => {
    setScanResult(result);
    const updates = deriveScanResultUiUpdates(result, baselineAmountText);
    if (updates.amountText !== undefined) {
      setAmountText(updates.amountText);
    }
    setNotice(updates.notice);
  }, []);

  const scanPickedAsset = useCallback(
    async (asset: ImagePicker.ImagePickerAsset) => {
      setShowReplaceChooser(false);
      setReceiptUri(asset.uri);
      setScanResult(undefined);
      setError(undefined);
      setNotice(undefined);
      setAmountText('');

      if (!asset.base64) {
        setNotice(RECEIPT_SCAN_MESSAGES.missingImageData);
        return;
      }

      setScanning(true);
      try {
        const result = await scanReceiptImage({
          imageBase64: asset.base64,
          mimeType: asset.mimeType,
          targetCurrency,
        });
        handleScanResult(result, '');
      } catch (scanError) {
        const receiptError =
          scanError instanceof ReceiptScanError
            ? scanError
            : new ReceiptScanError(
                scanError instanceof Error ? scanError.message : RECEIPT_SCAN_MESSAGES.ocrFailed,
                'ocr_failed',
              );

        setNotice(receiptError.message);
      } finally {
        setScanning(false);
      }
    },
    [handleScanResult, targetCurrency],
  );

  const handleSourceCurrencyConvert = useCallback(async () => {
    if (!scanResult?.detectedAmountMinor && !scanResult?.detectedAmountText) {
      return;
    }

    setConverting(true);
    setError(undefined);

    try {
      const result = await convertReceiptAmount({
        amountMinor: scanResult.detectedAmountMinor ?? undefined,
        detectedAmountText: scanResult.detectedAmountText ?? undefined,
        sourceCurrency: selectedSourceCurrency,
        targetCurrency,
      });
      handleScanResult(result, amountText);
    } catch (convertError) {
      const receiptError =
        convertError instanceof ReceiptScanError
          ? convertError
          : new ReceiptScanError(
              convertError instanceof Error ? convertError.message : RECEIPT_SCAN_MESSAGES.exchangeRateUnavailable,
              'exchange_rate_unavailable',
            );
      setNotice(receiptError.message);
    } finally {
      setConverting(false);
    }
  }, [amountText, handleScanResult, scanResult, selectedSourceCurrency, targetCurrency]);

  const takePhoto = useCallback(async () => {
    setError(undefined);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError(RECEIPT_SCAN_MESSAGES.cameraPermission);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      base64: true,
    });
    if (result.canceled) {
      return;
    }
    if (result.assets[0]) {
      void scanPickedAsset(result.assets[0]);
    }
  }, [scanPickedAsset]);

  const uploadImage = useCallback(async () => {
    setError(undefined);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(RECEIPT_SCAN_MESSAGES.libraryPermission);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      base64: true,
    });
    if (result.canceled) {
      return;
    }
    if (result.assets[0]) {
      void scanPickedAsset(result.assets[0]);
    }
  }, [scanPickedAsset]);

  const handleReplacePhotoPress = useCallback(() => {
    setShowReplaceChooser(true);
  }, []);

  const handleRemovePhoto = useCallback(() => {
    resetReceiptSelection();
  }, [resetReceiptSelection]);

  const onAmountChange = useCallback(
    (value: string) => {
      setAmountText(sanitizeAmountInput(value, targetCurrency));
      setError((current) => (current ? undefined : current));
      setNotice((current) => (current === RECEIPT_SCAN_MESSAGES.noAmount ? undefined : current));
    },
    [targetCurrency],
  );

  const receiptConversionParams = useMemo(
    () => buildReceiptConversionRouteParams(scanResult, selectedSourceCurrency),
    [scanResult, selectedSourceCurrency],
  );

  const canContinue = canContinueScanReceipt({
    amountCents,
    scanning,
    converting,
    requiresCurrencySelection,
    amountText,
  });

  const validateContinue = useCallback(() => validateContinueScanReceipt(amountCents), [amountCents]);

  const buildAddExpenseParams = useCallback(
    () => ({
      source: 'scan_receipt',
      amountCents: String(amountCents),
      currency: targetCurrency,
      ...(receiptUri ? { receiptUri } : {}),
      expenseType,
      ...receiptConversionParams,
    }),
    [amountCents, expenseType, receiptConversionParams, receiptUri, targetCurrency],
  );

  return {
    targetCurrency,
    receiptUri,
    amountText,
    amountCents,
    expenseType,
    setExpenseType,
    scanResult,
    selectedSourceCurrency,
    setSelectedSourceCurrency,
    scanning,
    converting,
    error,
    setError,
    notice,
    showReplaceChooser,
    requiresCurrencySelection,
    canContinue,
    takePhoto,
    uploadImage,
    handleReplacePhotoPress,
    handleRemovePhoto,
    handleSourceCurrencyConvert,
    onAmountChange,
    validateContinue,
    buildAddExpenseParams,
  };
}

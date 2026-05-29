import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';

import {
  FormSection,
  PrimaryButton,
  ScreenLayout,
  ScreenPageHeader,
  SegmentedPill,
  SecondaryButton,
} from '../components';
import { AmountInputCard } from '../components/expenses';
import { EXPENSE_TYPE_OPTIONS } from '../data/constants';
import { scanReceiptImage, type ReceiptScanResult } from '../services/receiptScanService';
import { buttons, colors, layout, radii, shadows, spacing, typography } from '../theme';
import type { ExpenseType } from '../types/models';
import { createLogger } from '../utils/logger';
import { dollarsToCents, formatAmountInputValue, formatCAD } from '../utils/money';
import { safeBack } from '../utils/navigation';
import {
  RECEIPT_SCAN_MESSAGES,
  ReceiptScanError,
} from '../utils/receiptScanErrors';
import { Icon, type IconName } from '../components/Icon';

const logger = createLogger('ScanReceiptScreen');

function sanitizeAmountInput(value: string): string {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length <= 1) {
    return cleaned;
  }
  return `${parts[0]}.${parts.slice(1).join('').slice(0, 2)}`;
}

function SourceButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        flex: 1,
        minHeight: 52,
        borderRadius: radii.md,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: spacing.sm,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Icon name={icon} size={20} color={colors.primary} strokeWidth={1.5} />
      <Text style={[typography.bodyMedium, { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

function ReceiptSourceCard({
  disabled,
  onTakePhoto,
  onUploadImage,
  label = 'Receipt source',
}: {
  disabled?: boolean;
  onTakePhoto: () => void;
  onUploadImage: () => void;
  label?: string;
}) {
  return (
    <View
      style={{
        borderRadius: radii.lg,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        padding: spacing.lg,
        gap: spacing.md,
        ...shadows.cardSoft,
      }}
    >
      <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <SourceButton icon="camera" label="Take Photo" onPress={onTakePhoto} disabled={disabled} />
        <SourceButton icon="arrow-up-tray" label="Upload Image" onPress={onUploadImage} disabled={disabled} />
      </View>
    </View>
  );
}

function DangerOutlineButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const preset = buttons.outline;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={{ flex: 1, minWidth: 0 }}
    >
      {({ pressed }) => (
        <View
          style={[
            preset.container,
            {
              minHeight: 48,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 14,
              borderColor: colors.danger,
              opacity: disabled ? preset.disabledOpacity : pressed ? preset.pressedOpacity : 1,
            },
          ]}
        >
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[preset.label, { color: colors.danger, textAlign: 'center', flexShrink: 1 }]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function PreviewCard({
  receiptUri,
  scanning,
  notice,
}: {
  receiptUri?: string;
  scanning: boolean;
  notice?: string;
}) {
  if (!receiptUri) {
    return null;
  }

  return (
    <View
      style={{
        borderRadius: radii.lg,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        padding: spacing.lg,
        gap: spacing.md,
        ...shadows.cardSoft,
      }}
    >
      <Text style={[typography.caption, { color: colors.textSecondary }]}>Receipt preview</Text>
      <Image
        source={{ uri: receiptUri }}
        style={{ width: '100%', height: 220, borderRadius: radii.lg, backgroundColor: colors.tertiary }}
        resizeMode="cover"
      />
      {scanning ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>Scanning receipt...</Text>
        </View>
      ) : notice ? (
        <Text style={[typography.caption, { color: colors.textSecondary }]}>{notice}</Text>
      ) : null}
    </View>
  );
}

export function ScanReceiptScreen() {
  const [receiptUri, setReceiptUri] = useState<string | undefined>();
  const [amountText, setAmountText] = useState('');
  const [expenseType, setExpenseType] = useState<ExpenseType>('split');
  const [scanResult, setScanResult] = useState<ReceiptScanResult | undefined>();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();
  const [showReplaceChooser, setShowReplaceChooser] = useState(false);
  const amountCents = dollarsToCents(amountText);

  const resetReceiptSelection = useCallback(() => {
    setReceiptUri(undefined);
    setScanResult(undefined);
    setAmountText('');
    setError(undefined);
    setNotice(undefined);
    setShowReplaceChooser(false);
  }, []);

  const scanPickedAsset = useCallback(
    async (asset: ImagePicker.ImagePickerAsset, options?: { replacing?: boolean }) => {
      if (options?.replacing) {
        logger.info('Receipt scan photo replaced');
      }

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
      logger.info('Receipt scan image selected', { mimeType: asset.mimeType ?? 'image/jpeg' });
      try {
        const result = await scanReceiptImage({
          imageBase64: asset.base64,
          mimeType: asset.mimeType,
        });
        setScanResult(result);
        if (result.detectedAmountCents && result.detectedAmountCents > 0) {
          setAmountText(formatAmountInputValue(result.detectedAmountCents));
          if (result.candidates.length > 1) {
            setNotice(`${result.candidates.length} total candidate(s) found. Review the amount before continuing.`);
          }
        } else {
          setNotice(RECEIPT_SCAN_MESSAGES.noAmount);
        }
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
    [],
  );

  const takePhoto = useCallback(
    async (replacing = false) => {
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
        void scanPickedAsset(result.assets[0], { replacing });
      }
    },
    [scanPickedAsset],
  );

  const uploadImage = useCallback(
    async (replacing = false) => {
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
        void scanPickedAsset(result.assets[0], { replacing });
      }
    },
    [scanPickedAsset],
  );

  const handleReplacePhotoPress = useCallback(() => {
    logger.info('Receipt scan replace photo pressed');
    setShowReplaceChooser(true);
  }, []);

  const handleRemovePhoto = useCallback(() => {
    logger.info('Receipt scan remove photo pressed');
    resetReceiptSelection();
    logger.info('Receipt scan photo removed');
  }, [resetReceiptSelection]);

  const continueToAddExpense = useCallback(() => {
    if (amountCents <= 0) {
      setError(RECEIPT_SCAN_MESSAGES.amountRequired);
      return;
    }

    setError(undefined);
    logger.info('Receipt scan continue pressed', {
      expenseType,
      amountCents,
      hasReceipt: Boolean(receiptUri),
    });
    router.push({
      pathname: '/add-expense',
      params: {
        source: 'scan_receipt',
        amountCents: String(amountCents),
        currency: 'CAD',
        ...(receiptUri ? { receiptUri } : {}),
        expenseType,
      },
    });
  }, [amountCents, expenseType, receiptUri]);

  const detectedAmountLabel =
    scanResult?.detectedAmountCents && scanResult.detectedAmountCents > 0
      ? formatCAD(scanResult.detectedAmountCents)
      : null;

  return (
    <ScreenLayout
      keyboardAvoiding
      header={
        <ScreenPageHeader
          title="Scan Receipt"
          subtitle="Upload or take a photo of your receipt."
          onBack={() => safeBack('/(tabs)/home')}
        />
      }
      footer={
        receiptUri ? (
          <View
            style={{
              paddingHorizontal: layout.screenPadding,
              paddingTop: layout.cardGap,
              paddingBottom: layout.cardGap,
              backgroundColor: colors.background,
              borderTopWidth: 1,
              borderTopColor: colors.borderSubtle,
              gap: spacing.sm,
            }}
          >
            {error ? (
              <Text style={[typography.caption, { color: colors.danger, textAlign: 'center' }]}>{error}</Text>
            ) : null}
            <PrimaryButton
              label="Continue"
              onPress={continueToAddExpense}
              disabled={amountCents <= 0 || scanning}
            />
          </View>
        ) : null
      }
    >
      <View style={{ gap: 20 }}>
        {!receiptUri ? (
          <ReceiptSourceCard
            disabled={scanning}
            onTakePhoto={() => void takePhoto()}
            onUploadImage={() => void uploadImage()}
          />
        ) : null}

        <PreviewCard receiptUri={receiptUri} scanning={scanning} notice={notice} />

        {receiptUri ? (
          <>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <SecondaryButton
                  label="Replace Photo"
                  onPress={handleReplacePhotoPress}
                  disabled={scanning}
                  fullWidth
                  variant="filled"
                />
              </View>
              <DangerOutlineButton label="Remove" onPress={handleRemovePhoto} disabled={scanning} />
            </View>

            {showReplaceChooser ? (
              <ReceiptSourceCard
                disabled={scanning}
                label="Choose a new photo"
                onTakePhoto={() => void takePhoto(true)}
                onUploadImage={() => void uploadImage(true)}
              />
            ) : null}

            <FormSection label="Detected amount">
              {detectedAmountLabel && !scanning ? (
                <Text
                  style={[
                    typography.caption,
                    { color: colors.textSecondary, marginBottom: spacing.xs, paddingHorizontal: 2 },
                  ]}
                >
                  Scanned total: {detectedAmountLabel}
                  {scanResult?.confidence
                    ? ` (${Math.round(scanResult.confidence * 100)}% confidence)`
                    : ''}
                </Text>
              ) : null}
              <AmountInputCard
                amountCents={amountCents}
                amountText={amountText}
                onChangeAmountText={(value) => {
                  setAmountText(sanitizeAmountInput(value));
                  if (error) {
                    setError(undefined);
                  }
                  if (notice === RECEIPT_SCAN_MESSAGES.noAmount) {
                    setNotice(undefined);
                  }
                }}
                error={amountText && amountCents <= 0 ? 'Please enter a valid amount.' : undefined}
              />
            </FormSection>

            <FormSection label="Expense Type">
              <SegmentedPill options={EXPENSE_TYPE_OPTIONS} value={expenseType} onChange={setExpenseType} />
            </FormSection>
          </>
        ) : null}
      </View>
    </ScreenLayout>
  );
}

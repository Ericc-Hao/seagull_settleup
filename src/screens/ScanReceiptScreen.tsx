import { router } from 'expo-router';
import { useCallback } from 'react';
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
import { CurrencySelector } from '../components/form';
import { EXPENSE_TYPE_OPTIONS } from '../data/constants';
import { useScanReceiptFlow } from '../hooks/useScanReceiptFlow';
import type { ReceiptScanResult } from '../services/receiptScanService';
import { buttons, colors, layout, radii, shadows, spacing, typography } from '../theme';
import type { CurrencyCode } from '../types/models';
import {
  formatCurrency,
  formatExchangeRateLine,
} from '../utils/currency';
import { safeBack } from '../utils/navigation';
import { Icon, type IconName } from '../components/Icon';

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

function ConversionSummary({
  scanResult,
  targetCurrency,
}: {
  scanResult?: ReceiptScanResult;
  targetCurrency: CurrencyCode;
}) {
  if (!scanResult?.detectedAmountMinor || scanResult.detectedAmountMinor <= 0) {
    return null;
  }

  const detectedCurrency = scanResult.detectedCurrency;
  const detectedLabel = detectedCurrency
    ? formatCurrency(scanResult.detectedAmountMinor, detectedCurrency)
    : scanResult.detectedAmountText ?? formatCurrency(scanResult.detectedAmountMinor, targetCurrency);

  return (
    <View
      style={{
        borderRadius: radii.lg,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        padding: spacing.lg,
        gap: spacing.sm,
        ...shadows.cardSoft,
      }}
    >
      <Text style={[typography.caption, { color: colors.textSecondary }]}>Detected receipt</Text>
      <Text style={typography.bodyMedium}>{detectedLabel}</Text>

      {scanResult.convertedAmountMinor && scanResult.convertedAmountMinor > 0 ? (
        <>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>
            Converted to your currency
          </Text>
          <Text style={typography.bodyMedium}>
            {formatCurrency(scanResult.convertedAmountMinor, targetCurrency)}
          </Text>
        </>
      ) : null}

      {scanResult.exchangeRate &&
      detectedCurrency &&
      detectedCurrency !== targetCurrency &&
      scanResult.exchangeRate !== 1 ? (
        <Text style={[typography.caption, { color: colors.textTertiary }]}>
          Exchange rate: {formatExchangeRateLine(detectedCurrency, targetCurrency, scanResult.exchangeRate)}
        </Text>
      ) : null}
    </View>
  );
}

export function ScanReceiptScreen() {
  const {
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
  } = useScanReceiptFlow();

  const continueToAddExpense = useCallback(() => {
    const validationError = validateContinue();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(undefined);
    router.push({
      pathname: '/add-expense',
      params: buildAddExpenseParams(),
    });
  }, [buildAddExpenseParams, setError, validateContinue]);

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
              disabled={!canContinue}
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
                  disabled={scanning || converting}
                  fullWidth
                  variant="filled"
                />
              </View>
              <DangerOutlineButton label="Remove" onPress={handleRemovePhoto} disabled={scanning || converting} />
            </View>

            {showReplaceChooser ? (
              <ReceiptSourceCard
                disabled={scanning || converting}
                label="Choose a new photo"
                onTakePhoto={() => void takePhoto()}
                onUploadImage={() => void uploadImage()}
              />
            ) : null}

            <ConversionSummary scanResult={scanResult} targetCurrency={targetCurrency} />

            {requiresCurrencySelection ? (
              <FormSection label="Select receipt currency">
                <View style={{ gap: spacing.md }}>
                  <CurrencySelector
                    label="Receipt currency"
                    value={selectedSourceCurrency}
                    onChange={setSelectedSourceCurrency}
                    disabled={scanning || converting}
                  />
                  <PrimaryButton
                    label={converting ? 'Converting...' : 'Convert amount'}
                    onPress={() => void handleSourceCurrencyConvert()}
                    disabled={scanning || converting}
                  />
                </View>
              </FormSection>
            ) : null}

            <FormSection label="Amount">
              <AmountInputCard
                amountCents={amountCents}
                amountText={amountText}
                currency={targetCurrency}
                onChangeAmountText={onAmountChange}
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

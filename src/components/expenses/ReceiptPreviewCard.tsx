import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';

import { colors, layout, radii, spacing, typography } from '../../theme';
import { createLogger } from '../../utils/logger';
import { SectionCard, SectionTitle } from '../SectionCard';

const logger = createLogger('ReceiptPreviewCard');

export function ReceiptPreviewCard({
  receiptUrl,
  fileName,
  onPress,
  loading = false,
}: {
  receiptUrl?: string | null;
  fileName?: string | null;
  onPress?: () => void;
  loading?: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if (loading) {
    return (
      <View style={{ gap: layout.cardGap }}>
        <SectionTitle title="Receipt" />
        <SectionCard>
          <View
            style={{
              padding: layout.cardPadding,
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.sm,
              minHeight: 160,
            }}
          >
            <ActivityIndicator color={colors.primary} />
            <Text style={[typography.caption, { color: colors.textSecondary }]}>Loading receipt...</Text>
          </View>
        </SectionCard>
      </View>
    );
  }

  if (!receiptUrl) {
    return null;
  }

  const showError = imageFailed;

  return (
    <View style={{ gap: layout.cardGap }}>
      <SectionTitle title="Receipt" />
      <SectionCard>
        <Pressable
          onPress={onPress}
          disabled={!onPress || showError}
          style={{
            padding: layout.cardPadding,
            gap: spacing.sm,
          }}
        >
          {showError ? (
            <View
              style={{
                minHeight: 160,
                borderRadius: radii.lg,
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.borderSubtle,
                alignItems: 'center',
                justifyContent: 'center',
                padding: spacing.md,
              }}
            >
              <Text style={[typography.bodyMedium, { color: colors.textSecondary, textAlign: 'center' }]}>
                Receipt could not be loaded
              </Text>
            </View>
          ) : (
            <Image
              source={{ uri: receiptUrl }}
              accessibilityLabel={fileName ? `Receipt: ${fileName}` : 'Receipt image'}
              style={{
                width: '100%',
                height: 220,
                borderRadius: radii.lg,
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.borderSubtle,
              }}
              resizeMode="cover"
              onError={() => {
                logger.error('Receipt image failed to load', undefined, { hasReceiptUrl: Boolean(receiptUrl) });
                setImageFailed(true);
              }}
            />
          )}
          {!showError && onPress ? (
            <Text style={[typography.caption, { color: colors.primary, textAlign: 'center' }]}>
              Tap to view full size
            </Text>
          ) : null}
        </Pressable>
      </SectionCard>
    </View>
  );
}

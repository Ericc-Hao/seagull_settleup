import { Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { PendingTransferView } from '../../types/views';
import { colors, layout, radii, spacing, typography } from '../../theme';
import { PrimaryButton } from '../PrimaryButton';
import { SecondaryButton } from '../SecondaryButton';
import { TeamSettlementPreviewCard } from './TeamSettlementPreviewCard';

export function ConfirmTeamSettlementModal({
  visible,
  transfer,
  selectedMemberNames,
  confirming,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  transfer: PendingTransferView | null;
  selectedMemberNames: string[];
  confirming?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const modalMaxHeight = windowHeight * 0.85;

  if (!transfer) {
    return null;
  }

  const requiresPayment = transfer.requiresPayment ?? transfer.amountCents > 0;
  const paidByName = transfer.paidByName ?? selectedMemberNames[0] ?? 'Member';
  const paymentEmail = transfer.receiverTransferEmail ?? transfer.receiverEmail;
  const coveredOthers = (transfer.coveredBalances ?? []).filter(
    (entry) => entry.role === 'debtor' && entry.coveredAmountCents > 0 && entry.memberName !== paidByName,
  );
  const teamLabel =
    selectedMemberNames.length === 2
      ? `${selectedMemberNames[0]} and ${selectedMemberNames[1]}`
      : selectedMemberNames.join(', ');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        onPress={onCancel}
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          justifyContent: 'center',
          padding: layout.screenPadding,
        }}
      >
        <Pressable onPress={(event) => event.stopPropagation()}>
          <View
            style={{
              backgroundColor: colors.white,
              borderRadius: radii.lg,
              maxHeight: modalMaxHeight,
              width: '100%',
              overflow: 'hidden',
            }}
          >
            <ScrollView
              style={{ flexGrow: 0, flexShrink: 1, minHeight: 0 }}
              contentContainerStyle={{
                padding: layout.cardPadding,
                gap: spacing.md,
              }}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
            >
            <Text style={typography.sectionTitle}>Confirm team settlement?</Text>

            {requiresPayment ? (
              <View style={{ gap: spacing.sm }}>
                <View style={{ gap: spacing.xs }}>
                  <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22 }]}>
                    You are settling together with:
                  </Text>
                  <Text style={typography.bodyMedium}>{selectedMemberNames.join(', ')}</Text>
                </View>

                <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22 }]}>
                  {paidByName} will pay {transfer.amountDisplay} on behalf of this team.
                </Text>

                {coveredOthers.length > 0 ? (
                  <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 18 }]}>
                    This includes {coveredOthers.map((entry) => entry.memberName).join(' and ')}&apos;s pending
                    balance, so they will not need to settle this amount separately.
                  </Text>
                ) : null}

                {transfer.receiverName ? (
                  <View style={{ gap: 4 }}>
                    <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>
                      Recipient
                    </Text>
                    <Text style={typography.bodyMedium}>{transfer.receiverName}</Text>
                    {paymentEmail ? (
                      <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
                        {paymentEmail}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : (
              <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22 }]}>
                {teamLabel} are already balanced together. Confirming will record that this team settlement is
                complete.
              </Text>
            )}

            <TeamSettlementPreviewCard
              transfer={transfer}
              showPaymentDetails={false}
              showCopyActions={false}
            />
          </ScrollView>

          <View
            style={{
              flexDirection: 'row',
              gap: 10,
              paddingHorizontal: layout.cardPadding,
              paddingTop: spacing.sm,
              paddingBottom: layout.cardPadding + insets.bottom,
              borderTopWidth: 1,
              borderTopColor: colors.borderSubtle,
              backgroundColor: colors.white,
            }}
          >
            <View style={{ flex: 1 }}>
              <SecondaryButton label="Cancel" onPress={onCancel} variant="outline" disabled={confirming} />
            </View>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                label={confirming ? 'Saving…' : 'Confirm Team Settlement'}
                onPress={onConfirm}
                disabled={confirming}
              />
            </View>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

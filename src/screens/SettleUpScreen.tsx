import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { useAppData } from '../context/AppDataContext';
import { invalidateAfterMarkTransferPaid } from '../utils/mutationInvalidation';
import {
  FormSection,
  ScreenLayout,
  ScreenPageHeader,
} from '../components';
import {
  ConfirmTeamSettlementModal,
  MarkPaidConfirmModal,
  NoPendingTransfersCard,
  PendingTransferDetailModal,
  PendingTransferRow,
  SettleTogetherCard,
  SettlementHistoryCard,
  TeamSettlementModal,
} from '../components/settlements';
import { SectionCard } from '../components/SectionCard';
import { useGlobalSettleUpData } from '../hooks/useGlobalSettleUpData';
import { useSettleUpData } from '../hooks/useSettleUpData';
import { useTeamSettlement } from '../hooks/useTeamSettlement';
import { markTransferAsPaid } from '../services/settlementService';
import type { PendingTransferView } from '../types/views';
import { colors, typography } from '../theme';
import { createLogger } from '../utils/logger';
import { safeBack } from '../utils/navigation';
import { toUserFriendlyError } from '../utils/errors';

const logger = createLogger('SettleUpScreen');

const SECTION_GAP = 20;

export type SettleUpMode = 'global' | 'group';

interface SettleUpScreenProps {
  mode: SettleUpMode;
  groupId?: string;
}

export function SettleUpScreen({ mode, groupId }: SettleUpScreenProps) {
  const isGlobal = mode === 'global';
  const { invalidate, refreshNotifications } = useAppData();
  const groupData = useSettleUpData(groupId ?? '', { enabled: !isGlobal });
  const globalData = useGlobalSettleUpData();
  const data = isGlobal ? globalData : groupData;
  const team = useTeamSettlement(groupId ?? '', groupData.currentMemberId);
  const [detailTransfer, setDetailTransfer] = useState<PendingTransferView | null>(null);
  const [confirmTransfer, setConfirmTransfer] = useState<PendingTransferView | null>(null);
  const [marking, setMarking] = useState(false);

  const handleBack = () => {
    if (isGlobal) {
      safeBack('/(tabs)/home');
      return;
    }
    safeBack(groupId ? `/group/${groupId}` : '/(tabs)/groups');
  };

  if (!data.ready) {
    return (
      <ScreenLayout
        header={
          <ScreenPageHeader
            title="Pending Transfers"
            subtitle="Loading..."
            onBack={handleBack}
            showMascot={false}
          />
        }
      >
        <Text style={[typography.body, { color: colors.textSecondary }]}>Loading settlement data...</Text>
      </ScreenLayout>
    );
  }

  if (!isGlobal && !groupData.group) {
    return (
      <ScreenLayout
        header={
          <ScreenPageHeader
            title="Pending Transfers"
            subtitle="Group not found."
            onBack={() => safeBack('/(tabs)/groups')}
            showMascot={false}
          />
        }
      >
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          This group could not be loaded.
        </Text>
      </ScreenLayout>
    );
  }

  const handleConfirmPaid = async () => {
    if (!confirmTransfer) {
      return;
    }
    const transferGroupId = confirmTransfer.groupId;
    setMarking(true);
    try {
      await markTransferAsPaid(transferGroupId, confirmTransfer);
      setConfirmTransfer(null);
      setDetailTransfer(null);
      invalidateAfterMarkTransferPaid(invalidate, transferGroupId);
      void refreshNotifications();
    } catch (error) {
      logger.error('Mark as paid failed', error, {
        groupId: transferGroupId,
        transferId: confirmTransfer.id,
        mode: isGlobal ? 'global' : 'group',
      });
      Alert.alert('Unable to mark as paid', toUserFriendlyError(error, 'Please try again.'));
    } finally {
      setMarking(false);
    }
  };

  const handleConfirmTeamSettlement = async () => {
    try {
      await team.confirmTeamSettlement(async () => {
        if (groupId) {
          invalidateAfterMarkTransferPaid(invalidate, groupId);
        } else {
          invalidate('settlements');
          invalidate('home');
          invalidate('expenses');
          invalidate('groups');
        }
        void refreshNotifications();
      });
    } catch (error) {
      Alert.alert('Unable to save team settlement', toUserFriendlyError(error, 'Please try again.'));
    }
  };

  const headerSubtitle = isGlobal
    ? 'Review payments across all groups.'
    : groupData.group
      ? `Review your outgoing balances. For ${groupData.group.name}`
      : 'Review your outgoing balances.';

  const pendingSectionLabel = isGlobal ? 'Unsettled Payments' : 'Your Pending Transfers';

  return (
    <ScreenLayout
      header={
        <ScreenPageHeader
          title="Pending Transfers"
          subtitle={headerSubtitle}
          onBack={handleBack}
          showMascot={false}
        />
      }
    >
      <View style={{ gap: SECTION_GAP }}>
        <FormSection label={pendingSectionLabel} noPadding>
          {data.outgoingTransfers.length > 0 ? (
            <SectionCard>
              {data.outgoingTransfers.map((transfer, index) => (
                <PendingTransferRow
                  key={`${transfer.groupId}-${transfer.id}`}
                  transfer={transfer}
                  showGroupTag={isGlobal}
                  showDivider={index < data.outgoingTransfers.length - 1}
                  onPress={() => setDetailTransfer(transfer)}
                />
              ))}
            </SectionCard>
          ) : (
            <NoPendingTransfersCard variant={isGlobal ? 'global' : 'group'} />
          )}
        </FormSection>

        {!isGlobal && groupData.showSettleTogether ? (
          <SettleTogetherCard onPress={team.openSelection} />
        ) : null}

        <SettlementHistoryCard items={data.settlementHistory} showGroupTag={isGlobal} />
      </View>

      <PendingTransferDetailModal
        visible={Boolean(detailTransfer)}
        transfer={detailTransfer}
        showGroupTag={isGlobal}
        marking={marking}
        onClose={() => {
          if (!marking) {
            setDetailTransfer(null);
          }
        }}
        onMarkPaid={() => {
          if (detailTransfer) {
            setConfirmTransfer(detailTransfer);
          }
        }}
      />

      <MarkPaidConfirmModal
        visible={Boolean(confirmTransfer)}
        transfer={confirmTransfer}
        confirming={marking}
        onCancel={() => {
          if (!marking) {
            setConfirmTransfer(null);
          }
        }}
        onConfirm={() => void handleConfirmPaid()}
      />

      {!isGlobal ? (
        <>
          <TeamSettlementModal
            visible={team.selectionVisible}
            step={team.step}
            members={groupData.members}
            selectedMemberIds={team.selectedMemberIds}
            currentMemberId={groupData.currentMemberId}
            validationError={team.validationError}
            previewTransfer={team.previewTransfer}
            reviewing={team.reviewing}
            onToggleMember={team.toggleMember}
            onSelectMyself={team.selectMyself}
            onSelectAll={team.selectAll}
            onClear={team.clearSelection}
            onReview={team.reviewTeamSettlement}
            onBackToSelection={() => team.setStep('select')}
            onConfirmPreview={team.openConfirm}
            onClose={team.closeSelection}
          />

          <ConfirmTeamSettlementModal
            visible={team.confirmVisible}
            transfer={team.previewTransfer}
            selectedMemberNames={team.selectedMemberNames}
            confirming={team.confirming}
            onCancel={team.cancelConfirm}
            onConfirm={() => void handleConfirmTeamSettlement()}
          />
        </>
      ) : null}
    </ScreenLayout>
  );
}

import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { useAppData } from '../context/AppDataContext';
import {
  FormSection,
  ScreenLayout,
  ScreenPageHeader,
} from '../components';
import {
  MarkPaidConfirmModal,
  NoPendingTransfersCard,
  PendingTransferCard,
  SettlementHistoryCard,
  SettlementMethodCard,
  TeamSelectionCard,
} from '../components/settlements';
import { useSettleUpData } from '../hooks/useSettleUpData';
import { markTransferAsPaid } from '../services/settlementService';
import type { PendingTransferView } from '../types/views';
import { colors, layout, typography } from '../theme';
import { createLogger } from '../utils/logger';
import { safeBack } from '../utils/navigation';
import { toUserFriendlyError } from '../utils/errors';

const logger = createLogger('SettleUpScreen');

const SECTION_GAP = 20;

interface SettleUpScreenProps {
  groupId: string;
}

export function SettleUpScreen({ groupId }: SettleUpScreenProps) {
  const { refresh } = useAppData();
  const data = useSettleUpData(groupId);
  const [pendingTransfer, setPendingTransfer] = useState<PendingTransferView | null>(null);
  const [marking, setMarking] = useState(false);

  if (!data.ready) {
    return (
      <ScreenLayout
        header={
          <ScreenPageHeader
            title="Pending Transfers"
            subtitle="Loading..."
            onBack={() => safeBack(`/group/${groupId}`)}
            showMascot={false}
          />
        }
      >
        <Text style={[typography.body, { color: colors.textSecondary }]}>Loading settlement data...</Text>
      </ScreenLayout>
    );
  }

  if (!data.group) {
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
    if (!pendingTransfer) {
      return;
    }
    setMarking(true);
    logger.info('Mark as paid submit started', { groupId, transferId: pendingTransfer.id });
    try {
      await markTransferAsPaid(groupId, pendingTransfer);
      logger.info('Mark as paid submit succeeded', { groupId, transferId: pendingTransfer.id });
      setPendingTransfer(null);
      await refresh();
    } catch (error) {
      logger.error('Mark as paid submit failed', error, { groupId, transferId: pendingTransfer.id });
      Alert.alert('Unable to mark as paid', toUserFriendlyError(error, 'Please try again.'));
    } finally {
      setMarking(false);
    }
  };

  return (
    <ScreenLayout
      header={
        <ScreenPageHeader
          title="Pending Transfers"
          subtitle="Review your outgoing balances."
          onBack={() => safeBack(`/group/${groupId}`)}
          showMascot={false}
        />
      }
    >
      <View style={{ gap: SECTION_GAP }}>
        <SettlementMethodCard value={data.mode} onChange={data.setMode} />

        {data.mode === 'team' ? (
          <TeamSelectionCard
            members={data.members}
            selectedMemberIds={data.teamMemberIds}
            onToggle={data.toggleTeamMember}
            onSelectMyself={data.selectMyself}
            onSelectAll={data.selectAllTeamMembers}
            onClear={data.clearTeamSelection}
            validationError={data.teamValidationError}
          />
        ) : null}

        <FormSection label="Your Pending Transfers" noPadding>
          {data.outgoingTransfers.length > 0 ? (
            <View style={{ gap: layout.cardGap }}>
              {data.outgoingTransfers.map((transfer) => (
                <PendingTransferCard
                  key={transfer.id}
                  transfer={transfer}
                  marking={marking && pendingTransfer?.id === transfer.id}
                  onMarkPaid={() => setPendingTransfer(transfer)}
                />
              ))}
            </View>
          ) : (
            <NoPendingTransfersCard />
          )}
        </FormSection>

        <SettlementHistoryCard items={data.settlementHistory} />
      </View>

      <MarkPaidConfirmModal
        visible={Boolean(pendingTransfer)}
        transfer={pendingTransfer}
        confirming={marking}
        onCancel={() => {
          if (!marking) {
            setPendingTransfer(null);
          }
        }}
        onConfirm={() => void handleConfirmPaid()}
      />
    </ScreenLayout>
  );
}

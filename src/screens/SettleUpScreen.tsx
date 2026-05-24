import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { SETTLE_UP_MOCK, type SettleMode } from '../data/settleUpMock';
import {
  FormSection,
  PaymentSummaryCard,
  PrimaryButton,
  ScreenLayout,
  ScreenPageHeader,
  SecondaryButton,
  SegmentedPillLight,
  SettleHero,
  SwitchModeCard,
  TeamSelectCard,
  TransferDetailList,
} from '../components';
import { colors, spacing } from '../theme';

const SECTION_GAP = 20;

interface SettleUpScreenProps {
  groupId?: string;
}

export function SettleUpScreen({ groupId: _groupId }: SettleUpScreenProps) {
  const [mode, setMode] = useState<SettleMode>(SETTLE_UP_MOCK.defaultMode);
  const [selectedTeamId, setSelectedTeamId] = useState<string>(SETTLE_UP_MOCK.summary.toTeamId);

  const fromTeam = SETTLE_UP_MOCK.teams.find((t) => t.id === SETTLE_UP_MOCK.summary.fromTeamId)!;
  const toTeam = SETTLE_UP_MOCK.teams.find((t) => t.id === SETTLE_UP_MOCK.summary.toTeamId)!;

  const transferDetails = [
    { label: 'Receiver', value: SETTLE_UP_MOCK.transfer.receiver },
    { label: 'EMT', value: SETTLE_UP_MOCK.transfer.emt },
    { label: 'Message', value: SETTLE_UP_MOCK.transfer.message },
  ];

  return (
    <ScreenLayout
      header={
        <ScreenPageHeader
          title={SETTLE_UP_MOCK.title}
          subtitle={SETTLE_UP_MOCK.subtitle}
          onBack={() => router.back()}
          showMascot={false}
        />
      }
    >
      <View style={{ gap: SECTION_GAP }}>
        <SettleHero />

        <SegmentedPillLight
          options={[
            { id: 'team' as const, label: 'Couple / Team' },
            { id: 'individual' as const, label: 'Individual' },
          ]}
          value={mode}
          onChange={setMode}
        />

        <View style={{ flexDirection: 'row', gap: 12 }}>
          {SETTLE_UP_MOCK.teams.map((team) => (
            <TeamSelectCard
              key={team.id}
              team={team}
              selected={selectedTeamId === team.id}
              onPress={() => setSelectedTeamId(team.id)}
            />
          ))}
        </View>

        <PaymentSummaryCard
          direction={SETTLE_UP_MOCK.summary.direction}
          amount={SETTLE_UP_MOCK.summary.amount}
          fromMemberIds={fromTeam.memberIds}
          toMemberIds={toTeam.memberIds}
        />

        <FormSection label="Transfer Details">
          <TransferDetailList items={transferDetails} />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.lg }}>
            <View style={{ flex: 1 }}>
              <SecondaryButton
                label={SETTLE_UP_MOCK.actions.copyLabel}
                icon="document-duplicate"
                onPress={() => {}}
                variant="outline"
              />
            </View>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                label={SETTLE_UP_MOCK.actions.markPaidLabel}
                icon="check-circle"
                onPress={() => {}}
              />
            </View>
          </View>
        </FormSection>

        <SwitchModeCard
          title={SETTLE_UP_MOCK.switchMode.title}
          hint={SETTLE_UP_MOCK.switchMode.hint}
          onPress={() => setMode('individual')}
        />
      </View>
    </ScreenLayout>
  );
}

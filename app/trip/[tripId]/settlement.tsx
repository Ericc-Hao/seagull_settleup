import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { shadows } from '../../../src/theme';
import type { TransferView } from '../../../src/state/settle-context';
import type { SettlementMode } from '../../../src/state/trip-types';
import { formatCad, useTrip } from '../../../src/state/trips-context';
import { AppScreen } from '../../../src/ui/app-screen';
import { Avatar } from '../../../src/ui/avatar';
import { FormCard } from '../../../src/ui/form-card';
import { GradientCard } from '../../../src/ui/gradient-card';
import { Icon } from '../../../src/ui/icon';
import { Mascot } from '../../../src/ui/mascot';
import { PageHeader } from '../../../src/ui/page-header';
import { SegmentedControl } from '../../../src/ui/segmented-control';
import { SurfaceCard } from '../../../src/ui/surface-card';
import { BRAND } from '../../../src/ui/theme';

export default function TripSettlementScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const {
    trip,
    individualTransfers,
    teamTransfers,
    settleCheck,
    toggleTransferPaid,
    runSettlement,
    updateTrip,
  } = useTrip(tripId ?? '');

  const [mode, setMode] = useState<SettlementMode>(trip?.settlementMode ?? 'team');

  const rows: TransferView[] = mode === 'individual' ? individualTransfers : teamTransfers;
  const primaryTransfer = rows[0];

  const teamCards = useMemo(() => {
    if (!trip) return [];
    return trip.teams.map((team) => ({
      id: team.id,
      name: team.name,
      members: trip.members.filter((m) => m.teamId === team.id).map((m) => m.id),
    }));
  }, [trip]);

  if (!trip) {
    return (
      <AppScreen>
        <Text className="text-brand-muted">Trip not found</Text>
      </AppScreen>
    );
  }

  if (!settleCheck.ok) {
    return (
      <AppScreen noPadding>
        <PageHeader title="Settle Up" subtitle="Complete your group setup first." showBell />
        <View className="px-4">
          <FormCard title="Not ready">
            <Text className="text-sm text-brand-muted">{settleCheck.reason}</Text>
          </FormCard>
        </View>
      </AppScreen>
    );
  }

  const copyEmt = async () => {
    if (!primaryTransfer) return;
    await Clipboard.setStringAsync(
      `Receiver: ${primaryTransfer.toLabel}\nEMT: ${primaryTransfer.toEmtEmail ?? ''}\nMessage: ${trip.name} Settlement - ${primaryTransfer.fromLabel} to ${primaryTransfer.toLabel}\nAmount: ${formatCad(primaryTransfer.amountCents)}`,
    );
  };

  return (
    <AppScreen noPadding>
      <PageHeader
        title="Settle Up"
        subtitle={`Only ${rows.length} transfer${rows.length === 1 ? '' : 's'} needed`}
        showBell
      />

      <View className="gap-4 px-4">
        <SegmentedControl
          options={[
            { id: 'individual' as const, label: 'Individual', icon: 'user' },
            { id: 'team' as const, label: 'Couple / Team', icon: 'user-group' },
          ]}
          value={mode}
          onChange={(next) => {
            setMode(next);
            updateTrip(tripId ?? '', { settlementMode: next });
          }}
        />

        {mode === 'team' && teamCards.length > 0 ? (
          <View className="flex-row gap-3">
            {teamCards.map((team, index) => (
              <SurfaceCard key={team.id} className="flex-1 items-center py-4">
                <View className="flex-row items-center gap-1">
                  {team.members.map((id) => (
                    <Avatar key={id} id={id} label={id} size="sm" />
                  ))}
                </View>
                <Text className="mt-2 text-sm font-bold text-brand-navy">{team.name}</Text>
                <Text className="mt-0.5 text-center text-[10px] text-brand-muted">
                  Members: {team.members.join(', ')}
                </Text>
                <View className="mt-2">
                  <Icon
                    name="check-circle"
                    size={22}
                    color={index === 0 ? BRAND.lavender : BRAND.success}
                    solid
                  />
                </View>
              </SurfaceCard>
            ))}
          </View>
        ) : null}

        {primaryTransfer ? (
          <GradientCard>
            <Text className="pr-12 text-base font-bold text-white">
              {primaryTransfer.fromLabel} pays {primaryTransfer.toLabel}
            </Text>
            <Text className="mt-2 text-[32px] font-bold text-white">{formatCad(primaryTransfer.amountCents)}</Text>
            <View className="absolute bottom-2 right-2">
              <Mascot size={48} />
            </View>
          </GradientCard>
        ) : (
          <SurfaceCard>
            <Text className="text-center text-sm text-brand-muted">Everyone is even — no transfers needed.</Text>
          </SurfaceCard>
        )}

        {primaryTransfer ? (
          <FormCard title="Transfer Details">
            <View className="gap-3.5">
              <View className="flex-row items-center gap-3">
                <View className="h-9 w-9 items-center justify-center rounded-full bg-brand-50">
                  <Icon name="user" size={18} color={BRAND.lavender} />
                </View>
                <Text className="w-20 text-sm text-brand-muted">Receiver</Text>
                <Text className="flex-1 text-right text-sm font-bold text-brand-navy">{primaryTransfer.toLabel}</Text>
              </View>
              <View className="flex-row items-center gap-3">
                <View className="h-9 w-9 items-center justify-center rounded-full bg-brand-50">
                  <Icon name="envelope" size={18} color={BRAND.lavender} />
                </View>
                <Text className="w-20 text-sm text-brand-muted">EMT</Text>
                <Text className="flex-1 text-right text-sm font-bold text-brand-navy">
                  {primaryTransfer.toEmtEmail ?? '—'}
                </Text>
              </View>
              <View className="flex-row items-start gap-3">
                <View className="h-9 w-9 items-center justify-center rounded-full bg-brand-50">
                  <Icon name="chat-bubble" size={18} color={BRAND.lavender} />
                </View>
                <Text className="w-20 text-sm text-brand-muted">Message</Text>
                <Text className="flex-1 text-right text-xs font-semibold leading-4 text-brand-navy">
                  {trip.name} Settlement — {primaryTransfer.fromLabel} to {primaryTransfer.toLabel}
                </Text>
              </View>
            </View>
            <View className="mt-4 flex-row gap-2">
              <Pressable
                onPress={copyEmt}
                className="flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl border-2 border-brand-300 py-3"
              >
                <Icon name="document-duplicate" size={18} color={BRAND.lavender} />
                <Text className="text-sm font-bold text-brand-500">Copy EMT Info</Text>
              </Pressable>
              <Pressable
                onPress={() => toggleTransferPaid(tripId ?? '', mode, primaryTransfer.key)}
                className="flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl bg-brand-300 py-3"
              >
                <Icon name="check-circle" size={18} color="#FFFFFF" solid />
                <Text className="text-sm font-bold text-white">
                  {primaryTransfer.paid ? 'Mark Pending' : 'Mark as Paid'}
                </Text>
              </Pressable>
            </View>
          </FormCard>
        ) : null}

        <Pressable
          onPress={() => setMode('individual')}
          className="flex-row items-center justify-between rounded-3xl bg-white p-4"
          style={shadows.card}
        >
          <View className="flex-1 pr-3">
            <Text className="font-bold text-brand-navy">Switch to Individual Mode</Text>
            <Text className="mt-0.5 text-xs text-brand-muted">Split expenses individually.</Text>
            <Text className="mt-1 text-xs font-bold text-rose-500">
              {individualTransfers.length} transfers needed
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            {['A', 'B', 'C', 'D'].map((id) => (
              <View key={id} className="h-6 w-6 items-center justify-center rounded-full bg-brand-100">
                <Text className="text-[10px] font-bold text-brand-navy">{id}</Text>
              </View>
            ))}
            <Icon name="chevron-right" size={18} color={BRAND.muted} />
          </View>
        </Pressable>

        <Pressable
          onPress={() => {
            runSettlement(tripId ?? '');
            router.back();
          }}
          className="rounded-2xl bg-brand-100 py-3"
        >
          <Text className="text-center text-sm font-bold text-brand-navy">Complete settlement run</Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

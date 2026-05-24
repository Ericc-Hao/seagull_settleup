import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatCad, useTrip } from '../../../src/state/trips-context';
import { AppScreen } from '../../../src/ui/app-screen';
import { Avatar } from '../../../src/ui/avatar';
import { GradientCard } from '../../../src/ui/gradient-card';
import { Icon } from '../../../src/ui/icon';
import { Mascot } from '../../../src/ui/mascot';
import { SegmentedControl } from '../../../src/ui/segmented-control';
import { SurfaceCard } from '../../../src/ui/surface-card';
import { shadows } from '../../../src/theme';
import { BRAND } from '../../../src/ui/theme';

type TripTab = 'expenses' | 'balances' | 'settle';

function formatDateRange(start: string, end: string): string {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
  };
  return `${fmt(start)} – ${fmt(end)}`;
}

export default function TripDashboardScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { trip, dashboard, activeMemberId } = useTrip(tripId ?? '');
  const [tab, setTab] = useState<TripTab>('balances');
  const insets = useSafeAreaInsets();

  if (!trip || !dashboard) {
    return (
      <AppScreen>
        <Text className="text-brand-muted">Trip not found</Text>
      </AppScreen>
    );
  }

  const myBalance = dashboard.memberSummary.find((m) => m.memberId === activeMemberId);
  const youOwed = (myBalance?.balanceCents ?? 0) > 0 ? myBalance!.balanceCents : 0;

  const header = (
    <View className="bg-brand-50 px-4" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between py-2">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-white"
          style={shadows.cardSoft}
        >
          <Icon name="chevron-left" size={22} color={BRAND.navy} />
        </Pressable>
        <View className="flex-1 items-center px-2">
          <Text className="text-lg font-bold text-brand-navy">{trip.name}</Text>
          <View className="mt-0.5 flex-row items-center gap-1">
            <Icon name="calendar" size={14} color={BRAND.muted} />
            <Text className="text-xs text-brand-muted">{formatDateRange(trip.startDate, trip.endDate)}</Text>
          </View>
        </View>
        <Avatar id={activeMemberId} label="You" size="md" />
      </View>
    </View>
  );

  return (
    <AppScreen header={header} noPadding>
      <View className="gap-4 px-4">
        <GradientCard>
          <View className="min-h-[120px] justify-between">
            <View className="pr-16">
              <Text className="text-sm font-medium text-white/90">Total Spent</Text>
              <Text className="mt-1 text-[28px] font-bold text-white">{formatCad(dashboard.totalSpentCents)}</Text>
            </View>
            {youOwed > 0 ? (
              <View className="mt-3 flex-row items-center gap-2 self-start rounded-2xl bg-white/25 px-3 py-2">
                <Icon name="arrow-up-circle" size={20} color="#FFFFFF" solid />
                <View>
                  <Text className="text-[11px] text-white/85">You are owed</Text>
                  <Text className="text-base font-bold text-white">{formatCad(youOwed)}</Text>
                </View>
              </View>
            ) : null}
            <View className="absolute -right-2 bottom-0">
              <Mascot size={52} />
            </View>
          </View>
        </GradientCard>

        <View className="flex-row gap-3">
          <Link href={`/trip/${tripId}/expenses`} asChild>
            <Pressable className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-brand-300 py-3.5">
              <Icon name="document-plus" size={20} color="#FFFFFF" />
              <Text className="text-sm font-bold text-white">Add Expense</Text>
            </Pressable>
          </Link>
          <Link href={`/trip/${tripId}/settlement`} asChild>
            <Pressable className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-brand-300 bg-white py-3.5">
              <Icon name="currency-dollar" size={20} color={BRAND.lavender} />
              <Text className="text-sm font-bold text-brand-500">Settle Up</Text>
            </Pressable>
          </Link>
        </View>

        <SegmentedControl
          options={[
            { id: 'expenses' as const, label: 'Expenses' },
            { id: 'balances' as const, label: 'Balances' },
            { id: 'settle' as const, label: 'Settle' },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === 'expenses' ? (
          <View className="gap-2">
            {trip.expenses.length === 0 ? (
              <Text className="py-4 text-center text-sm text-brand-muted">No expenses yet.</Text>
            ) : (
              trip.expenses.map((expense) => (
                <SurfaceCard key={expense.id} className="flex-row items-center justify-between py-3">
                  <View>
                    <Text className="font-bold text-brand-navy">{expense.note}</Text>
                    <Text className="text-xs text-brand-muted">{expense.category}</Text>
                  </View>
                  <Text className="font-bold text-brand-navy">{formatCad(expense.amountCents)}</Text>
                </SurfaceCard>
              ))
            )}
          </View>
        ) : null}

        {tab === 'balances' ? (
          <View className="gap-3">
            {dashboard.memberSummary.map((member) => (
              <SurfaceCard key={member.memberId} className="flex-row items-center gap-3">
                <Avatar id={member.memberId} label={member.displayName} />
                <View className="flex-1">
                  <Text className="text-[15px] font-bold text-brand-navy">{member.displayName}</Text>
                  <View className="mt-1.5 flex-row gap-4">
                    <View>
                      <Text className="text-[10px] uppercase text-brand-muted">Paid</Text>
                      <Text className="text-sm font-semibold text-brand-navy">{formatCad(member.paidCents)}</Text>
                    </View>
                    <View className="h-full w-px bg-brand-100" />
                    <View>
                      <Text className="text-[10px] uppercase text-brand-muted">Share</Text>
                      <Text className="text-sm font-semibold text-brand-navy">{formatCad(member.owedCents)}</Text>
                    </View>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-[10px] text-brand-muted">Balance</Text>
                  <Text
                    className={`text-sm font-bold ${member.balanceCents >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}
                  >
                    {member.balanceCents >= 0 ? '+' : '−'}
                    {formatCad(Math.abs(member.balanceCents))}
                  </Text>
                </View>
              </SurfaceCard>
            ))}
            <View className="flex-row gap-2.5 rounded-2xl bg-brand-100 p-4">
              <Icon name="information-circle" size={20} color={BRAND.lavender} />
              <Text className="flex-1 text-xs leading-5 text-brand-muted">
                Balance = Paid − Share. Positive balance means others owe you. Negative balance means you owe others.
              </Text>
            </View>
          </View>
        ) : null}

        {tab === 'settle' ? (
          <Link href={`/trip/${tripId}/settlement`} asChild>
            <Pressable className="flex-row items-center justify-center gap-2 rounded-2xl bg-brand-300 py-4">
              <Icon name="arrow-path" size={20} color="#FFFFFF" />
              <Text className="font-bold text-white">Open Settle Up</Text>
              <Icon name="chevron-right" size={18} color="#FFFFFF" />
            </Pressable>
          </Link>
        ) : null}
      </View>
    </AppScreen>
  );
}

import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatCad, useTrip } from '../../../src/state/trips-context';
import { shadows } from '../../../src/theme';
import { AppScreen } from '../../../src/ui/app-screen';
import { Avatar } from '../../../src/ui/avatar';
import { FormCard } from '../../../src/ui/form-card';
import { GradientCard } from '../../../src/ui/gradient-card';
import { Icon } from '../../../src/ui/icon';
import { Mascot } from '../../../src/ui/mascot';
import { ScenicHeader } from '../../../src/ui/scenic-header';
import { SegmentedControl } from '../../../src/ui/segmented-control';
import { SurfaceCard } from '../../../src/ui/surface-card';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_COLORS,
  EXPENSE_CATEGORY_ICONS,
  BRAND,
} from '../../../src/ui/theme';

function toCents(value: string): number {
  const parsed = Number(value.replace(/,/g, ''));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

export default function TripExpensesScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { trip, addExpense } = useTrip(tripId ?? '');
  const insets = useSafeAreaInsets();

  const [expenseKind, setExpenseKind] = useState<'personal' | 'split'>('split');
  const [amountInput, setAmountInput] = useState('2000');
  const [note, setNote] = useState('Banff hotel booking');
  const [category, setCategory] = useState<(typeof EXPENSE_CATEGORIES)[number]>('Hotel');
  const [splitMethod, setSplitMethod] = useState<'equal' | 'custom'>('equal');
  const [payerMemberId, setPayerMemberId] = useState(trip?.members[0]?.id ?? '');
  const [participantIds, setParticipantIds] = useState<string[]>(trip?.members.map((m) => m.id) ?? []);
  const [errorMessage, setErrorMessage] = useState('');

  const members = trip?.members ?? [];
  const amountCents = toCents(amountInput);

  const splitPreview = useMemo(() => {
    if (!members.length || amountCents <= 0) return [];
    const ids = participantIds.length ? participantIds : members.map((m) => m.id);
    const perPerson = Math.floor(amountCents / ids.length);
    const remainder = amountCents - perPerson * ids.length;
    return ids.map((id, i) => ({
      id,
      name: members.find((m) => m.id === id)?.displayName ?? id,
      cents: perPerson + (i === 0 ? remainder : 0),
    }));
  }, [amountCents, members, participantIds]);

  if (!trip) {
    return (
      <AppScreen>
        <Text className="text-brand-muted">Trip not found</Text>
      </AppScreen>
    );
  }

  const toggleParticipant = (memberId: string) => {
    setParticipantIds((current) =>
      current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId],
    );
  };

  const submit = () => {
    try {
      addExpense(tripId ?? '', {
        amountCents,
        payerMemberId,
        participantIds: expenseKind === 'split' ? participantIds : [payerMemberId],
        splitMethod: expenseKind === 'split' ? splitMethod : 'equal',
        category: category.trim() || 'Other',
        note: note.trim() || 'Expense',
        expenseDate: new Date().toISOString().slice(0, 10),
      });
      router.back();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save.');
    }
  };

  const header = (
    <ScenicHeader tall>
      <View style={{ paddingTop: insets.top > 0 ? 0 : 8 }}>
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-xl bg-white"
            style={shadows.cardSoft}
          >
            <Icon name="chevron-left" size={22} color={BRAND.navy} />
          </Pressable>
          <Text className="text-lg font-bold text-brand-navy">Add Expense</Text>
          <Mascot size={44} />
        </View>
      </View>
    </ScenicHeader>
  );

  return (
    <AppScreen
      header={header}
      noPadding
      footer={
        <View className="border-t border-brand-100 bg-white px-4 py-3">
          <Pressable
            onPress={submit}
            className="flex-row items-center justify-center gap-2 rounded-2xl bg-brand-300 py-4"
          >
            <Icon name="document-plus" size={22} color="#FFFFFF" />
            <Text className="font-bold text-white">Save Expense</Text>
          </Pressable>
        </View>
      }
    >
      <View className="gap-4 px-4">
        <SegmentedControl
          options={[
            { id: 'personal' as const, label: 'Personal' },
            { id: 'split' as const, label: 'Split' },
          ]}
          value={expenseKind}
          onChange={setExpenseKind}
        />

        <GradientCard>
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[34px] font-bold text-white">
                {formatCad(amountCents).replace('CA', '').trim()}
              </Text>
              <Text className="text-sm font-medium text-white/80">CAD</Text>
            </View>
            <View className="rounded-2xl bg-white/25 p-3">
              <Icon name="banknotes" size={28} color="rgba(255,255,255,0.95)" />
            </View>
          </View>
          <TextInput
            value={amountInput}
            onChangeText={setAmountInput}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="rgba(255,255,255,0.5)"
            className="mt-3 rounded-xl bg-white/20 px-3 py-2 text-white"
          />
        </GradientCard>

        <FormCard title="Paid by">
          <View className="flex-row flex-wrap gap-4">
            {members.map((member) => (
              <Pressable key={member.id} onPress={() => setPayerMemberId(member.id)}>
                <Avatar id={member.id} label={member.displayName} selected={payerMemberId === member.id} />
              </Pressable>
            ))}
          </View>
        </FormCard>

        <FormCard title="Category">
          <View className="flex-row flex-wrap gap-2">
            {EXPENSE_CATEGORIES.map((cat) => {
              const active = category === cat;
              const colors = EXPENSE_CATEGORY_COLORS[cat];
              return (
                <Pressable
                  key={cat}
                  onPress={() => setCategory(cat)}
                  className={`items-center rounded-2xl border px-3 py-2.5 ${
                    active ? 'border-brand-300 bg-brand-50' : 'border-brand-100 bg-white'
                  }`}
                  style={{ minWidth: '30%' }}
                >
                  <View
                    className="mb-1 h-9 w-9 items-center justify-center rounded-xl"
                    style={{ backgroundColor: colors.bg }}
                  >
                    <Icon name={EXPENSE_CATEGORY_ICONS[cat]} size={20} color={colors.color} />
                  </View>
                  <Text className={`text-xs font-semibold ${active ? 'text-brand-500' : 'text-brand-muted'}`}>
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </FormCard>

        {expenseKind === 'split' ? (
          <>
            <FormCard title="Split Between">
              {members.map((member) => {
                const active = participantIds.includes(member.id);
                return (
                  <Pressable
                    key={member.id}
                    onPress={() => toggleParticipant(member.id)}
                    className="mb-1 flex-row items-center gap-3 py-1"
                  >
                    <View
                      className={`h-5 w-5 items-center justify-center rounded-md ${
                        active ? 'bg-brand-300' : 'border border-brand-200 bg-white'
                      }`}
                    >
                      {active ? <Icon name="check-circle" size={16} color="#FFFFFF" solid /> : null}
                    </View>
                    <Avatar id={member.id} label={member.displayName} size="sm" />
                    <Text className="flex-1 font-semibold text-brand-navy">{member.displayName}</Text>
                    <View className="flex-row items-center gap-1">
                      <Icon name="user" size={14} color={BRAND.muted} />
                      <Text className="text-xs text-brand-muted">1</Text>
                    </View>
                  </Pressable>
                );
              })}
            </FormCard>

            <FormCard title="Split Method">
              <SegmentedControl
                options={[
                  { id: 'equal' as const, label: 'Equal' },
                  { id: 'custom' as const, label: 'Custom' },
                ]}
                value={splitMethod}
                onChange={setSplitMethod}
              />
            </FormCard>

            <FormCard title="Split Preview">
              {splitPreview.map((row) => (
                <View key={row.id} className="flex-row items-center gap-2 py-1.5">
                  <Avatar id={row.id} label={row.name} size="sm" />
                  <Text className="flex-1 text-sm text-brand-navy">{row.name}</Text>
                  <View className="mx-2 h-px flex-1 border-b border-dashed border-brand-100" />
                  <Text className="text-sm font-bold text-brand-navy">{formatCad(row.cents)}</Text>
                </View>
              ))}
            </FormCard>
          </>
        ) : null}

        <View className="flex-row gap-3">
          <View className="flex-1 gap-2">
            <Text className="text-sm font-bold text-brand-navy">Receipt</Text>
            <Pressable className="flex-row items-center justify-center gap-2 rounded-2xl border border-brand-100 bg-white py-3">
              <Icon name="camera" size={20} color={BRAND.lavender} />
              <Text className="text-sm font-semibold text-brand-500">Take Photo</Text>
            </Pressable>
            <Pressable className="flex-row items-center justify-center gap-2 rounded-2xl border border-brand-100 bg-white py-3">
              <Icon name="arrow-up-tray" size={20} color={BRAND.lavender} />
              <Text className="text-sm font-semibold text-brand-500">Upload</Text>
            </Pressable>
          </View>
          <View className="flex-1">
            <Text className="mb-2 text-sm font-bold text-brand-navy">Note (Optional)</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              multiline
              className="min-h-[96px] rounded-2xl border border-brand-100 bg-white p-3 text-sm text-brand-navy"
              placeholderTextColor={BRAND.muted}
            />
          </View>
        </View>

        {errorMessage ? <Text className="text-sm text-rose-500">{errorMessage}</Text> : null}
      </View>
    </AppScreen>
  );
}

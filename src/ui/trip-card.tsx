import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Text, View } from 'react-native';

import type { TripListItem, TripStatus } from '../state/trip-types';
import { formatCad } from '../state/trips-context';
import { Icon } from './icon';
import { StatusPill } from './status-pill';
import { BRAND, SHADOW } from './theme';

const TRIP_GRADIENTS: [string, string][] = [
  ['#6EE7B7', '#3B82F6'],
  ['#FDBA74', '#F472B6'],
  ['#A78BFA', '#60A5FA'],
];

function tripGradient(id: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return TRIP_GRADIENTS[Math.abs(hash) % TRIP_GRADIENTS.length];
}

function statusForCard(status: TripStatus): { pill: TripStatus; label: string } {
  if (status === 'ready_to_settle') return { pill: 'ready_to_settle', label: 'Not Settled' };
  if (status === 'settled') return { pill: 'settled', label: 'Settled' };
  return { pill: 'active', label: 'Pending' };
}

export function SplitGroupCard({
  trip,
  youOwedCents = 0,
  youOweCents = 0,
}: {
  trip: TripListItem;
  youOwedCents?: number;
  youOweCents?: number;
}) {
  const { pill, label } = statusForCard(trip.status);
  const positive = youOwedCents >= youOweCents && youOwedCents > 0;
  const amount = positive ? youOwedCents : youOweCents;
  const [c1, c2] = tripGradient(trip.id);

  return (
    <Link href={`/trip/${trip.id}`} asChild>
      <Pressable className="mr-3 w-[168px]" style={SHADOW}>
        <View className="overflow-hidden rounded-3xl bg-white p-3.5">
          <View className="flex-row items-start justify-between">
            <View className="h-11 w-11 overflow-hidden rounded-full">
              <LinearGradient colors={[c1, c2]} className="h-full w-full" />
            </View>
            <View className="flex-row items-center gap-1 rounded-full bg-brand-50 px-2 py-1">
              <Icon name="user-group" size={14} color={BRAND.muted} />
              <Text className="text-xs font-semibold text-brand-muted">{trip.memberCount}</Text>
            </View>
          </View>

          <Text className="mt-2.5 text-[15px] font-bold text-brand-navy" numberOfLines={1}>
            {trip.name}
          </Text>

          <View className="mt-1.5">
            <StatusPill status={pill} label={label} />
          </View>

          <Text className="mt-2 text-xs text-brand-muted">Total {formatCad(trip.totalSpentCents)}</Text>

          {amount > 0 ? (
            <View className="mt-2 flex-row items-center justify-between">
              <Text
                className={`text-xs font-bold ${positive ? 'text-emerald-600' : 'text-rose-500'}`}
                numberOfLines={1}
              >
                {positive ? `You are owed ${formatCad(amount)}` : `You owe ${formatCad(amount)}`}
              </Text>
              <Icon name="chevron-right" size={14} color={positive ? BRAND.success : BRAND.danger} />
            </View>
          ) : (
            <View className="mt-2 flex-row justify-end">
              <Icon name="chevron-right" size={14} color={BRAND.muted} />
            </View>
          )}
        </View>
      </Pressable>
    </Link>
  );
}

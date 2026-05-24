import { Link, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useTrip } from '../../../src/state/trips-context';
import { AppScreen } from '../../../src/ui/app-screen';
import { Avatar } from '../../../src/ui/avatar';
import { Icon } from '../../../src/ui/icon';
import { PageHeader } from '../../../src/ui/page-header';
import { SurfaceCard } from '../../../src/ui/surface-card';
import { BRAND } from '../../../src/ui/theme';

export default function TripPeopleScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { trip } = useTrip(tripId ?? '');

  if (!trip) {
    return (
      <AppScreen>
        <Text className="text-brand-muted">Trip not found</Text>
      </AppScreen>
    );
  }

  return (
    <AppScreen noPadding>
      <PageHeader title="People" subtitle="Invite or add participants. EMT info helps at settlement." />

      <View className="gap-4 px-4">
        <View className="flex-row gap-3">
          <Link href={`/trip/${tripId}/people/add`} asChild>
            <Pressable className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-brand-300 py-3.5">
              <Icon name="plus" size={20} color="#FFFFFF" solid />
              <Text className="font-bold text-white">Add person</Text>
            </Pressable>
          </Link>
          <Pressable className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-brand-200 bg-white py-3.5">
            <Icon name="envelope" size={20} color={BRAND.muted} />
            <Text className="font-semibold text-brand-muted">Invite link</Text>
          </Pressable>
        </View>

        <Text className="text-sm font-bold text-brand-navy">{trip.members.length} participants</Text>

        {trip.members.map((member) => (
          <SurfaceCard key={member.id} className="flex-row items-center gap-3">
            <Avatar id={member.id} label={member.displayName} />
            <View className="flex-1">
              <Text className="font-bold text-brand-navy">{member.displayName}</Text>
              <Text className="mt-0.5 text-xs capitalize text-brand-muted">
                {member.role} · {member.memberStatus.replace('_', ' ')}
              </Text>
              <Text className="mt-1 text-xs text-brand-muted">
                Team {member.teamId ?? 'Solo'} · EMT {member.emtEmail ?? 'Missing'}
              </Text>
            </View>
            <Icon name="chevron-right" size={18} color={BRAND.muted} />
          </SurfaceCard>
        ))}
      </View>
    </AppScreen>
  );
}

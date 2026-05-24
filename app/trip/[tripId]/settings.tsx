import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTrip } from '../../../src/state/trips-context';
import { AppScreen } from '../../../src/ui/app-screen';
import { FormCard } from '../../../src/ui/form-card';
import { Input } from '../../../src/ui/input';
import { PageHeader } from '../../../src/ui/page-header';
export default function TripSettingsScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { trip, updateTrip, updateMemberEmt } = useTrip(tripId ?? '');

  const [selectedId, setSelectedId] = useState(trip?.members[0]?.id ?? '');

  const selectedMember = useMemo(
    () => trip?.members.find((m) => m.id === selectedId),
    [trip?.members, selectedId],
  );

  if (!trip) {
    return (
      <AppScreen>
        <Text className="text-brand-muted">Trip not found</Text>
      </AppScreen>
    );
  }

  return (
    <AppScreen noPadding>
      <PageHeader title="Trip Settings" subtitle="Edit trip details and member EMT profiles." showMascot={false} />

      <View className="gap-4 px-4">
        <FormCard title="Trip details" icon="briefcase">
          <Input label="Trip name" value={trip.name} onChangeText={(v) => updateTrip(tripId ?? '', { name: v })} />
          <Input
            label="Destination"
            value={trip.destination}
            onChangeText={(v) => updateTrip(tripId ?? '', { destination: v })}
          />
          <Input
            label="Start date"
            value={trip.startDate}
            onChangeText={(v) => updateTrip(tripId ?? '', { startDate: v })}
          />
          <Input label="End date" value={trip.endDate} onChangeText={(v) => updateTrip(tripId ?? '', { endDate: v })} />
          <Input label="Currency" value={trip.currency} onChangeText={() => {}} locked />
        </FormCard>

        {selectedMember ? (
          <FormCard title={`EMT · ${selectedMember.displayName}`} icon="envelope">
            <Input
              label="EMT name"
              value={selectedMember.emtName ?? ''}
              onChangeText={(v) =>
                updateMemberEmt(tripId ?? '', selectedMember.id, {
                  emtName: v,
                  emtEmail: selectedMember.emtEmail,
                  emtPhone: selectedMember.emtPhone,
                })
              }
            />
            <Input
              label="EMT email"
              value={selectedMember.emtEmail ?? ''}
              onChangeText={(v) =>
                updateMemberEmt(tripId ?? '', selectedMember.id, {
                  emtName: selectedMember.emtName,
                  emtEmail: v,
                  emtPhone: selectedMember.emtPhone,
                })
              }
              keyboardType="email-address"
            />
            <Input
              label="EMT phone"
              value={selectedMember.emtPhone ?? ''}
              onChangeText={(v) =>
                updateMemberEmt(tripId ?? '', selectedMember.id, {
                  emtName: selectedMember.emtName,
                  emtEmail: selectedMember.emtEmail,
                  emtPhone: v,
                })
              }
            />
          </FormCard>
        ) : null}

        <FormCard title="Switch member" icon="users">
          <View className="flex-row flex-wrap gap-2">
            {trip.members.map((member) => (
              <Pressable
                key={member.id}
                onPress={() => setSelectedId(member.id)}
                className={`rounded-full px-4 py-2 ${
                  selectedId === member.id ? 'bg-brand-300' : 'bg-brand-100'
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    selectedId === member.id ? 'text-white' : 'text-brand-navy'
                  }`}
                >
                  {member.displayName}
                </Text>
              </Pressable>
            ))}
          </View>
        </FormCard>
      </View>
    </AppScreen>
  );
}

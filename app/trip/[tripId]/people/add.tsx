import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTrip } from '../../../../src/state/trips-context';
import { AppScreen } from '../../../../src/ui/app-screen';
import { FormCard } from '../../../../src/ui/form-card';
import { Input } from '../../../../src/ui/input';
import { PageHeader } from '../../../../src/ui/page-header';

export default function AddPersonScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { addPerson } = useTrip(tripId ?? '');
  const [displayName, setDisplayName] = useState('');
  const [nickname, setNickname] = useState('');
  const [emtEmail, setEmtEmail] = useState('');
  const [emtPhone, setEmtPhone] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (!displayName.trim()) {
      setError('Name is required.');
      return;
    }
    addPerson(tripId ?? '', {
      displayName,
      nickname: nickname || undefined,
      memberStatus: 'manually_added',
      emtEmail: emtEmail || undefined,
      emtPhone: emtPhone || undefined,
    });
    router.back();
  };

  return (
    <AppScreen
      noPadding
      footer={
        <View className="border-t border-brand-100 bg-white px-4 py-3">
          <Pressable onPress={submit} className="rounded-2xl bg-brand-300 py-4">
            <Text className="text-center font-bold text-white">Add to trip</Text>
          </Pressable>
        </View>
      }
    >
      <PageHeader title="Add Members" subtitle="Manual entry — no app signup required." showMascot={false} />

      <View className="gap-4 px-4">
        <FormCard title="Member details" icon="user">
          <Input label="Display name" value={displayName} onChangeText={setDisplayName} placeholder="Alex" />
          <Input label="Nickname (optional)" value={nickname} onChangeText={setNickname} placeholder="A" />
          <Input
            label="EMT email (optional)"
            value={emtEmail}
            onChangeText={setEmtEmail}
            placeholder="alex@example.com"
            keyboardType="email-address"
          />
          <Input
            label="EMT phone (optional)"
            value={emtPhone}
            onChangeText={setEmtPhone}
            placeholder="647-000-0000"
            keyboardType="numeric"
          />
        </FormCard>

        {error ? <Text className="text-sm text-rose-500">{error}</Text> : null}
      </View>
    </AppScreen>
  );
}

import { Text, View } from 'react-native';

import { labelClassName, rowClassName, ScreenCard, ScreenContainer, valueClassName } from './shared';

export function EmtProfileScreen() {
  return (
    <ScreenContainer title="EMT Profile" subtitle="Store EMT contact details (no bank credentials)">
      <ScreenCard title="Primary Receiver">
        <FieldRow label="Name" value="Eric Hao" />
        <FieldRow label="Preferred Method" value="Email" />
        <FieldRow label="EMT Email" value="example@gmail.com" />
        <FieldRow label="EMT Phone" value="647-123-4567" />
        <FieldRow label="Auto Deposit" value="Yes" />
        <FieldRow label="Default Message" value="Banff Trip Settlement" />
      </ScreenCard>
    </ScreenContainer>
  );
}

function FieldRow(props: { label: string; value: string }) {
  return (
    <View className={rowClassName}>
      <Text className={labelClassName}>{props.label}</Text>
      <Text className={valueClassName}>{props.value}</Text>
    </View>
  );
}

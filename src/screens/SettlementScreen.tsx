import { Text, View } from 'react-native';

import { demoIndividualTransfers, demoTeamTransfers, formatCad } from '../demo/mvpData';
import { labelClassName, rowClassName, ScreenCard, ScreenContainer, valueClassName } from './shared';

export function SettlementScreen() {
  return (
    <ScreenContainer title="Settlement" subtitle="Optimized transfers for individual and couple modes">
      <ScreenCard title="Individual Settlement">
        {demoIndividualTransfers.map((transfer, index) => (
          <View key={`${transfer.fromId}-${transfer.toId}-${index}`} className={rowClassName}>
            <Text className={labelClassName}>
              {transfer.fromId}
              {' -> '}
              {transfer.toId}
            </Text>
            <Text className={valueClassName}>{formatCad(transfer.amountCents)}</Text>
          </View>
        ))}
      </ScreenCard>

      <ScreenCard title="Couple / Team Settlement">
        {demoTeamTransfers.map((transfer, index) => (
          <View key={`${transfer.fromId}-${transfer.toId}-${index}`} className={rowClassName}>
            <Text className={labelClassName}>
              {transfer.fromId}
              {' -> '}
              {transfer.toId}
            </Text>
            <Text className={valueClassName}>{formatCad(transfer.amountCents)}</Text>
          </View>
        ))}
      </ScreenCard>
    </ScreenContainer>
  );
}

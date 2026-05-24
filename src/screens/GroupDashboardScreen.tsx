import { Text, View } from 'react-native';

import { demoExpenses, demoGroup, demoMemberBalances, demoMembers, formatCad } from '../demo/mvpData';
import { labelClassName, rowClassName, ScreenCard, ScreenContainer, valueClassName } from './shared';

export function GroupDashboardScreen() {
  const totalCents = demoExpenses.reduce((sum, expense) => sum + expense.amountCents, 0);

  return (
    <ScreenContainer title="Group Dashboard" subtitle={`${demoGroup.name} (${demoGroup.currency})`}>
      <ScreenCard title="Overview">
        <View className={rowClassName}>
          <Text className={labelClassName}>Total spending</Text>
          <Text className={valueClassName}>{formatCad(totalCents)}</Text>
        </View>
        <View className={rowClassName}>
          <Text className={labelClassName}>Members</Text>
          <Text className={valueClassName}>{demoMembers.length}</Text>
        </View>
        <View className={rowClassName}>
          <Text className={labelClassName}>Expenses</Text>
          <Text className={valueClassName}>{demoExpenses.length}</Text>
        </View>
      </ScreenCard>

      <ScreenCard title="Member Balance">
        {demoMemberBalances.map((balance) => (
          <View key={balance.memberId} className={rowClassName}>
            <Text className={labelClassName}>{balance.memberId}</Text>
            <Text className={valueClassName}>{formatCad(balance.balanceCents)}</Text>
          </View>
        ))}
      </ScreenCard>
    </ScreenContainer>
  );
}

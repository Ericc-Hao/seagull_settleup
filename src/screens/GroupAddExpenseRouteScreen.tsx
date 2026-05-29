import { Redirect } from 'expo-router';
import { useMemo } from 'react';

import { InactiveGroupMutationBlock } from '../components/groups/InactiveGroupMutationBlock';
import { useAppData } from '../context/AppDataContext';
import { canMutateGroup, getGroupById } from '../services/groupService';

interface GroupAddExpenseRouteScreenProps {
  groupId: string;
}

export function GroupAddExpenseRouteScreen({ groupId }: GroupAddExpenseRouteScreenProps) {
  const { versions, getGroupDetailVersion } = useAppData();
  const groupDetailVersion = getGroupDetailVersion(groupId);
  const group = useMemo(
    () => getGroupById(groupId),
    [groupId, versions.groups, groupDetailVersion],
  );

  if (!group) {
    return <Redirect href="/add-expense" />;
  }

  if (!canMutateGroup(group)) {
    return <InactiveGroupMutationBlock groupId={groupId} title="Add Expense" />;
  }

  return <Redirect href={`/add-expense?groupId=${groupId}`} />;
}

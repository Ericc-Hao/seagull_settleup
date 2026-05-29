import {
  INACTIVE_GROUP_EXPENSE_MESSAGE,
  isGroupActiveForNewExpenses,
} from '../../services/groupService';
import type { ExpenseType, Group, SplitMethod } from '../../types/models';
import { isCustomSplitTotalValid } from './splitAmountHelpers';

export interface AddExpenseValidationInput {
  amountCents: number;
  kind: ExpenseType;
  selectedGroupId?: string;
  selectedGroupInactive: boolean;
  payerMemberId: string;
  splitMemberIds: string[];
  splitMethod: SplitMethod;
  customAssignedTotal: number;
  categoryKey: string;
}

export function validateAddExpenseAmount(amountCents: number): string | undefined {
  if (amountCents <= 0) {
    return 'Please enter an amount.';
  }
  return undefined;
}

export function validateSelectedGroup(
  kind: ExpenseType,
  selectedGroupId?: string,
  selectedGroupInactive = false,
): string | undefined {
  if (kind !== 'split') {
    return undefined;
  }
  if (!selectedGroupId) {
    return 'Please select a group.';
  }
  if (selectedGroupInactive) {
    return INACTIVE_GROUP_EXPENSE_MESSAGE;
  }
  return undefined;
}

export function validateSplitParticipants(
  payerMemberId: string,
  splitMemberIds: string[],
): string | undefined {
  if (!payerMemberId) {
    return 'Please choose who paid.';
  }
  if (splitMemberIds.length === 0) {
    return 'Please choose at least one person to split with.';
  }
  return undefined;
}

export function validateCustomSplit(
  splitMethod: SplitMethod,
  amountCents: number,
  customAssignedTotal: number,
): string | undefined {
  if (isCustomSplitTotalValid(splitMethod, amountCents, customAssignedTotal)) {
    return undefined;
  }
  return 'Custom split total must equal the expense amount.';
}

export function validateCategory(categoryKey: string): string | undefined {
  if (!categoryKey) {
    return 'Please select a category.';
  }
  return undefined;
}

export function validateAddExpenseForm(input: AddExpenseValidationInput): string | undefined {
  return (
    validateAddExpenseAmount(input.amountCents) ??
    validateSelectedGroup(input.kind, input.selectedGroupId, input.selectedGroupInactive) ??
    (input.kind === 'split'
      ? validateSplitParticipants(input.payerMemberId, input.splitMemberIds)
      : undefined) ??
    (input.kind === 'split'
      ? validateCustomSplit(input.splitMethod, input.amountCents, input.customAssignedTotal)
      : undefined) ??
    validateCategory(input.categoryKey)
  );
}

export function isGroupInactiveForNewExpenses(group: Group | undefined): boolean {
  return Boolean(group && !isGroupActiveForNewExpenses(group));
}

export function getInactiveGroupExpenseMessage(): string {
  return INACTIVE_GROUP_EXPENSE_MESSAGE;
}

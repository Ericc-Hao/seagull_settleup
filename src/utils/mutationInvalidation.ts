import type { InvalidationPayload, InvalidationType } from '../context/appDataTypes';

export type InvalidateFn = (type: InvalidationType, payload?: InvalidationPayload) => void;

export function invalidateAfterCreatePersonalExpense(invalidate: InvalidateFn): void {
  invalidate('expenses');
  invalidate('home');
}

export function invalidateAfterCreateSplitExpense(invalidate: InvalidateFn, groupId: string): void {
  invalidate('expenses', { groupId });
  invalidate('groups', { groupId });
  invalidate('group_detail', { groupId });
  invalidate('settlements', { groupId });
  invalidate('home');
}

export function invalidateAfterMarkTransferPaid(invalidate: InvalidateFn, groupId: string): void {
  invalidate('settlements', { groupId });
  invalidate('groups', { groupId });
  invalidate('home');
  invalidate('expenses', { groupId });
}

export function invalidateAfterAcceptInvitation(invalidate: InvalidateFn): void {
  invalidate('groups');
  invalidate('invitations');
  invalidate('notifications');
  invalidate('home');
}

export function invalidateAfterDeclineInvitation(invalidate: InvalidateFn): void {
  invalidate('invitations');
  invalidate('notifications');
}

export interface ExpenseInvalidationInput {
  expenseId: string;
  groupId?: string;
  type?: 'personal' | 'split';
}

export function invalidateAfterUpdateExpense(invalidate: InvalidateFn, input: ExpenseInvalidationInput): void {
  if (input.type === 'split' && input.groupId) {
    invalidateAfterCreateSplitExpense(invalidate, input.groupId);
    return;
  }
  invalidate('expenses');
  invalidate('home');
  if (input.groupId) {
    invalidate('receipts');
  }
}

export function invalidateAfterDeleteExpense(invalidate: InvalidateFn, input: ExpenseInvalidationInput): void {
  if (input.type === 'split' && input.groupId) {
    invalidate('expenses', { groupId: input.groupId });
    invalidate('groups', { groupId: input.groupId });
    invalidate('group_detail', { groupId: input.groupId });
    invalidate('settlements', { groupId: input.groupId });
    invalidate('home');
    invalidate('receipts');
    return;
  }
  invalidate('expenses');
  invalidate('home');
  invalidate('receipts');
}

export function invalidateAfterInviteMember(invalidate: InvalidateFn, groupId: string): void {
  invalidate('group_members', { groupId });
  invalidate('group_detail', { groupId });
  invalidate('invitations');
}

export function invalidateAfterUpdateProfile(invalidate: InvalidateFn): void {
  invalidate('profile');
  invalidate('home');
  invalidate('groups');
}

export function invalidateAfterCreateGroup(invalidate: InvalidateFn): void {
  invalidate('groups');
  invalidate('home');
  invalidate('invitations');
  invalidate('notifications');
}

export function invalidateAfterDeleteGroup(invalidate: InvalidateFn, groupId: string): void {
  invalidate('groups', { groupId });
  invalidate('home');
  invalidate('expenses', { groupId });
  invalidate('settlements', { groupId });
}

export function invalidateAfterSetGroupInactive(invalidate: InvalidateFn, groupId: string): void {
  invalidate('groups', { groupId });
  invalidate('home');
  invalidate('group_detail', { groupId });
  invalidate('expenses', { groupId });
}

/** Same cache slices as inactive — group status affects selectors and detail. */
export const invalidateAfterReactivateGroup = invalidateAfterSetGroupInactive;

export function invalidateAfterGroupMemberChange(invalidate: InvalidateFn, groupId: string): void {
  invalidate('group_members', { groupId });
  invalidate('group_detail', { groupId });
  invalidate('invitations');
}

export function invalidateAfterUpdateGroup(invalidate: InvalidateFn, groupId: string): void {
  invalidate('groups', { groupId });
  invalidate('group_detail', { groupId });
  invalidate('home');
}

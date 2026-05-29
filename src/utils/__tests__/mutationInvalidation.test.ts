import { describe, expect, it, vi } from 'vitest';

import type { InvalidationPayload, InvalidationType } from '../../context/appDataTypes';
import {
  invalidateAfterAcceptInvitation,
  invalidateAfterCreatePersonalExpense,
  invalidateAfterCreateSplitExpense,
  invalidateAfterDeclineInvitation,
  invalidateAfterDeleteExpense,
  invalidateAfterDeleteGroup,
  invalidateAfterGroupMemberChange,
  invalidateAfterInviteMember,
  invalidateAfterMarkTransferPaid,
  invalidateAfterSetGroupInactive,
  invalidateAfterUpdateExpense,
  invalidateAfterUpdateGroup,
  invalidateAfterUpdateProfile,
} from '../mutationInvalidation';

type RecordedInvalidation = { type: InvalidationType; payload?: InvalidationPayload };

function createInvalidateRecorder() {
  const calls: RecordedInvalidation[] = [];
  const invalidate = vi.fn((type: InvalidationType, payload?: InvalidationPayload) => {
    calls.push({ type, payload });
  });
  return { invalidate, calls };
}

describe('mutationInvalidation', () => {
  it('create personal expense invalidates expenses and home', () => {
    const { invalidate, calls } = createInvalidateRecorder();
    invalidateAfterCreatePersonalExpense(invalidate);
    expect(calls).toEqual([
      { type: 'expenses' },
      { type: 'home' },
    ]);
  });

  it('create split expense invalidates expenses, groups, group_detail, settlements, and home', () => {
    const { invalidate, calls } = createInvalidateRecorder();
    invalidateAfterCreateSplitExpense(invalidate, 'group-a');
    expect(calls).toEqual([
      { type: 'expenses', payload: { groupId: 'group-a' } },
      { type: 'groups', payload: { groupId: 'group-a' } },
      { type: 'group_detail', payload: { groupId: 'group-a' } },
      { type: 'settlements', payload: { groupId: 'group-a' } },
      { type: 'home' },
    ]);
  });

  it('mark transfer paid invalidates settlements, groups, home, and expenses', () => {
    const { invalidate, calls } = createInvalidateRecorder();
    invalidateAfterMarkTransferPaid(invalidate, 'group-b');
    expect(calls).toEqual([
      { type: 'settlements', payload: { groupId: 'group-b' } },
      { type: 'groups', payload: { groupId: 'group-b' } },
      { type: 'home' },
      { type: 'expenses', payload: { groupId: 'group-b' } },
    ]);
  });

  it('accept invitation invalidates groups, invitations, notifications, and home', () => {
    const { invalidate, calls } = createInvalidateRecorder();
    invalidateAfterAcceptInvitation(invalidate);
    expect(calls).toEqual([
      { type: 'groups' },
      { type: 'invitations' },
      { type: 'notifications' },
      { type: 'home' },
    ]);
  });

  it('decline invitation invalidates invitations and notifications only', () => {
    const { invalidate, calls } = createInvalidateRecorder();
    invalidateAfterDeclineInvitation(invalidate);
    expect(calls).toEqual([
      { type: 'invitations' },
      { type: 'notifications' },
    ]);
  });

  it('update personal expense invalidates expenses and home', () => {
    const { invalidate, calls } = createInvalidateRecorder();
    invalidateAfterUpdateExpense(invalidate, { expenseId: 'exp-1', type: 'personal' });
    expect(calls).toEqual([
      { type: 'expenses' },
      { type: 'home' },
    ]);
  });

  it('update split expense invalidates split-related slices', () => {
    const { invalidate, calls } = createInvalidateRecorder();
    invalidateAfterUpdateExpense(invalidate, {
      expenseId: 'exp-2',
      groupId: 'group-split',
      type: 'split',
    });
    expect(calls).toEqual([
      { type: 'expenses', payload: { groupId: 'group-split' } },
      { type: 'groups', payload: { groupId: 'group-split' } },
      { type: 'group_detail', payload: { groupId: 'group-split' } },
      { type: 'settlements', payload: { groupId: 'group-split' } },
      { type: 'home' },
    ]);
  });

  it('delete personal expense invalidates expenses and home', () => {
    const { invalidate, calls } = createInvalidateRecorder();
    invalidateAfterDeleteExpense(invalidate, { expenseId: 'exp-3', type: 'personal' });
    expect(calls).toEqual([
      { type: 'expenses' },
      { type: 'home' },
      { type: 'receipts' },
    ]);
  });

  it('delete split expense invalidates split-related slices', () => {
    const { invalidate, calls } = createInvalidateRecorder();
    invalidateAfterDeleteExpense(invalidate, {
      expenseId: 'exp-4',
      groupId: 'group-del',
      type: 'split',
    });
    expect(calls).toEqual([
      { type: 'expenses', payload: { groupId: 'group-del' } },
      { type: 'groups', payload: { groupId: 'group-del' } },
      { type: 'group_detail', payload: { groupId: 'group-del' } },
      { type: 'settlements', payload: { groupId: 'group-del' } },
      { type: 'home' },
      { type: 'receipts' },
    ]);
  });

  it('invite member invalidates group_members, group_detail, and invitations', () => {
    const { invalidate, calls } = createInvalidateRecorder();
    invalidateAfterInviteMember(invalidate, 'group-c');
    expect(calls).toEqual([
      { type: 'group_members', payload: { groupId: 'group-c' } },
      { type: 'group_detail', payload: { groupId: 'group-c' } },
      { type: 'invitations' },
    ]);
  });

  it('update profile invalidates profile, home, and groups', () => {
    const { invalidate, calls } = createInvalidateRecorder();
    invalidateAfterUpdateProfile(invalidate);
    expect(calls).toEqual([
      { type: 'profile' },
      { type: 'home' },
      { type: 'groups' },
    ]);
  });

  it('delete group invalidates groups, home, expenses, and settlements', () => {
    const { invalidate, calls } = createInvalidateRecorder();
    invalidateAfterDeleteGroup(invalidate, 'group-d');
    expect(calls).toEqual([
      { type: 'groups', payload: { groupId: 'group-d' } },
      { type: 'home' },
      { type: 'expenses', payload: { groupId: 'group-d' } },
      { type: 'settlements', payload: { groupId: 'group-d' } },
    ]);
  });

  it('set group inactive invalidates groups, home, group_detail, and expenses', () => {
    const { invalidate, calls } = createInvalidateRecorder();
    invalidateAfterSetGroupInactive(invalidate, 'group-e');
    expect(calls).toEqual([
      { type: 'groups', payload: { groupId: 'group-e' } },
      { type: 'home' },
      { type: 'group_detail', payload: { groupId: 'group-e' } },
      { type: 'expenses', payload: { groupId: 'group-e' } },
    ]);
  });

  it('group member change invalidates group_members, group_detail, and invitations', () => {
    const { invalidate, calls } = createInvalidateRecorder();
    invalidateAfterGroupMemberChange(invalidate, 'group-f');
    expect(calls).toEqual([
      { type: 'group_members', payload: { groupId: 'group-f' } },
      { type: 'group_detail', payload: { groupId: 'group-f' } },
      { type: 'invitations' },
    ]);
  });

  it('update group invalidates groups, group_detail, and home', () => {
    const { invalidate, calls } = createInvalidateRecorder();
    invalidateAfterUpdateGroup(invalidate, 'group-g');
    expect(calls).toEqual([
      { type: 'groups', payload: { groupId: 'group-g' } },
      { type: 'group_detail', payload: { groupId: 'group-g' } },
      { type: 'home' },
    ]);
  });
});

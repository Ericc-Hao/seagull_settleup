import { describe, expect, it } from 'vitest';

import {
  invalidationTouchesInvitations,
  invalidationTouchesNotifications,
  slicesForInvalidationType,
} from '../appDataTypes';

describe('appDataTypes invalidation slice mapping', () => {
  it('maps home to summary-related slices', () => {
    expect(slicesForInvalidationType('home').sort()).toEqual(
      ['expenses', 'group_members', 'groups', 'settlements'].sort(),
    );
  });

  it('maps group_detail to group-scoped slices', () => {
    expect(slicesForInvalidationType('group_detail').sort()).toEqual(
      ['expenses', 'group_members', 'groups', 'settlements'].sort(),
    );
  });

  it('maps expenses to expense and receipt slices', () => {
    expect(slicesForInvalidationType('expenses').sort()).toEqual(['expenses', 'receipts'].sort());
  });

  it('maps notifications to no cache slices', () => {
    expect(slicesForInvalidationType('notifications')).toEqual([]);
  });

  it('invitations trigger invitation sync and may trigger notifications', () => {
    expect(invalidationTouchesInvitations('invitations')).toBe(true);
    expect(invalidationTouchesNotifications('invitations')).toBe(true);
  });
});

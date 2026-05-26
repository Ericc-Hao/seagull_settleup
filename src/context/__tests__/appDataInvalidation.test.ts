import { describe, expect, it } from 'vitest';

import { EMPTY_VERSIONS } from '../appDataTypes';
import {
  bumpVersionsForInvalidations,
  collectGroupDetailIds,
  filterInvalidationsWithSuccessfulSlices,
  type QueuedInvalidation,
  versionsAfterLogoutReset,
} from '../appDataInvalidation';

describe('appDataInvalidation', () => {
  it('bumps groupDetailVersions for two different groupIds in one batch', () => {
    const items: QueuedInvalidation[] = [
      { type: 'group_detail', payload: { groupId: 'group-a' } },
      { type: 'group_detail', payload: { groupId: 'group-b' } },
    ];
    const next = bumpVersionsForInvalidations(EMPTY_VERSIONS, items);
    expect(next.groupDetail).toEqual({ 'group-a': 1, 'group-b': 1 });
  });

  it('collectGroupDetailIds returns unique group ids from batch payloads', () => {
    const items: QueuedInvalidation[] = [
      { type: 'group_detail', payload: { groupId: 'group-a' } },
      { type: 'expenses', payload: { groupId: 'group-b' } },
      { type: 'group_detail', payload: { groupId: 'group-a' } },
    ];
    expect(collectGroupDetailIds(items).sort()).toEqual(['group-a', 'group-b']);
  });

  it('keeps expenses invalidation when expense slices succeed and groups fail', () => {
    const batch: QueuedInvalidation[] = [
      { type: 'expenses' },
      { type: 'groups' },
    ];
    const successful = new Set(['expenses', 'receipts'] as const);
    const applicable = filterInvalidationsWithSuccessfulSlices(batch, successful);
    expect(applicable.map((item) => item.type)).toEqual(['expenses']);
  });

  it('drops groups invalidation when groups slice fails', () => {
    const batch: QueuedInvalidation[] = [{ type: 'groups' }];
    const successful = new Set(['expenses', 'receipts'] as const);
    const applicable = filterInvalidationsWithSuccessfulSlices(batch, successful);
    expect(applicable).toEqual([]);
  });

  it('keeps notifications invalidation without cache slices', () => {
    const batch: QueuedInvalidation[] = [{ type: 'notifications' }];
    const applicable = filterInvalidationsWithSuccessfulSlices(batch, new Set());
    expect(applicable).toEqual(batch);
  });

  it('does not bump notifications version from cache invalidation bumps', () => {
    const next = bumpVersionsForInvalidations(EMPTY_VERSIONS, [{ type: 'notifications' }]);
    expect(next.notifications).toBe(0);
  });

  it('resets versions on logout helper', () => {
    const dirty = bumpVersionsForInvalidations(EMPTY_VERSIONS, [
      { type: 'home' },
      { type: 'group_detail', payload: { groupId: 'g1' } },
    ]);
    expect(dirty.home).toBe(1);
    expect(versionsAfterLogoutReset()).toEqual(EMPTY_VERSIONS);
  });
});

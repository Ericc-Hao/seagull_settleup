import type { CacheSliceKey } from '../lib/cacheRefresh';

import type { AppDataTimestamps, AppDataVersions, InvalidationPayload, InvalidationType } from './appDataTypes';
import { EMPTY_VERSIONS, slicesForInvalidationType, touchTimestampsForType } from './appDataTypes';

export interface QueuedInvalidation {
  type: InvalidationType;
  payload?: InvalidationPayload;
}

/** groupId in payloads affects version counters only; slice refresh remains full-table. */
export function collectGroupDetailIds(items: QueuedInvalidation[]): string[] {
  const ids = new Set<string>();
  for (const { type, payload } of items) {
    if (
      payload?.groupId &&
      (type === 'group_detail' ||
        type === 'group_members' ||
        type === 'settlements' ||
        type === 'expenses' ||
        type === 'groups')
    ) {
      ids.add(payload.groupId);
    }
  }
  return Array.from(ids);
}

export function collectSlices(items: QueuedInvalidation[]): CacheSliceKey[] {
  const slices = new Set<CacheSliceKey>();
  for (const { type } of items) {
    for (const slice of slicesForInvalidationType(type)) {
      slices.add(slice);
    }
  }
  return Array.from(slices);
}

export function invalidationRequiresCacheSlices(type: InvalidationType): boolean {
  return slicesForInvalidationType(type).length > 0;
}

export function filterInvalidationsWithSuccessfulSlices(
  items: QueuedInvalidation[],
  successfulSlices: Set<CacheSliceKey>,
): QueuedInvalidation[] {
  return items.filter((item) => {
    if (item.type === 'all') {
      return successfulSlices.size > 0;
    }
    if (!invalidationRequiresCacheSlices(item.type)) {
      return true;
    }
    const required = slicesForInvalidationType(item.type);
    return required.every((slice) => successfulSlices.has(slice));
  });
}

export function bumpVersionsForInvalidations(
  current: AppDataVersions,
  items: QueuedInvalidation[],
): AppDataVersions {
  let next: AppDataVersions = {
    ...current,
    groupDetail: { ...current.groupDetail },
  };

  for (const { type, payload } of items) {
    switch (type) {
      case 'profile':
        next = { ...next, profile: next.profile + 1 };
        break;
      case 'home':
        next = { ...next, home: next.home + 1 };
        break;
      case 'groups':
        next = { ...next, groups: next.groups + 1 };
        break;
      case 'expenses':
      case 'receipts':
        next = { ...next, expenses: next.expenses + 1 };
        break;
      case 'settlements':
        next = { ...next, settlements: next.settlements + 1 };
        break;
      case 'group_members':
        next = { ...next, groups: next.groups + 1 };
        if (payload?.groupId) {
          const groupId = payload.groupId;
          next.groupDetail = {
            ...next.groupDetail,
            [groupId]: (next.groupDetail[groupId] ?? 0) + 1,
          };
        }
        break;
      case 'group_detail':
        if (payload?.groupId) {
          const groupId = payload.groupId;
          next.groupDetail = {
            ...next.groupDetail,
            [groupId]: (next.groupDetail[groupId] ?? 0) + 1,
          };
        }
        break;
      case 'notifications':
      case 'invitations':
        break;
      case 'all':
        next = {
          profile: next.profile + 1,
          home: next.home + 1,
          groups: next.groups + 1,
          expenses: next.expenses + 1,
          notifications: next.notifications + 1,
          settlements: next.settlements + 1,
          groupDetail: Object.fromEntries(
            Object.entries(next.groupDetail).map(([id, value]) => [id, value + 1]),
          ),
        };
        break;
      default:
        break;
    }
  }

  return next;
}

export function touchTimestampsForInvalidations(
  current: AppDataTimestamps,
  items: QueuedInvalidation[],
  now: number,
): AppDataTimestamps {
  let next = { ...current };
  for (const item of items) {
    next = { ...next, ...touchTimestampsForType(item.type, now) };
  }
  return next;
}

export function versionsAfterLogoutReset(): AppDataVersions {
  return { ...EMPTY_VERSIONS };
}

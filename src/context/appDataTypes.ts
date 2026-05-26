import type { CacheSliceKey } from '../lib/cacheRefresh';

export type InvalidationType =
  | 'profile'
  | 'home'
  | 'groups'
  | 'group_detail'
  | 'group_members'
  | 'expenses'
  | 'notifications'
  | 'invitations'
  | 'settlements'
  | 'receipts'
  | 'all';

export interface InvalidationPayload {
  groupId?: string;
}

export interface AppDataVersions {
  profile: number;
  home: number;
  groups: number;
  expenses: number;
  notifications: number;
  settlements: number;
  groupDetail: Record<string, number>;
}

export const EMPTY_VERSIONS: AppDataVersions = {
  profile: 0,
  home: 0,
  groups: 0,
  expenses: 0,
  notifications: 0,
  settlements: 0,
  groupDetail: {},
};

export interface AppDataTimestamps {
  lastProfileFetchAt: number | null;
  lastGroupsFetchAt: number | null;
  lastExpensesFetchAt: number | null;
  lastNotificationsFetchAt: number | null;
  lastSettlementsFetchAt: number | null;
  lastInvitationsFetchAt: number | null;
}

export interface AppDataLoadingState {
  profileLoading: boolean;
  groupsLoading: boolean;
  expensesLoading: boolean;
  notificationsLoading: boolean;
  settlementsLoading: boolean;
}

const NOTIFICATION_INVALIDATION_TYPES = new Set<InvalidationType>([
  'notifications',
  'invitations',
  'all',
]);

const INVITATION_INVALIDATION_TYPES = new Set<InvalidationType>([
  'invitations',
  'groups',
  'group_members',
  'group_detail',
  'all',
]);

const CACHE_INVALIDATION_TYPES = new Set<InvalidationType>([
  'profile',
  'home',
  'groups',
  'group_detail',
  'group_members',
  'expenses',
  'settlements',
  'receipts',
  'invitations',
  'all',
]);

const INVALIDATION_SLICE_MAP: Record<InvalidationType, CacheSliceKey[]> = {
  profile: ['profile'],
  home: ['expenses', 'groups', 'group_members', 'settlements'],
  groups: ['groups', 'group_members'],
  group_detail: ['groups', 'group_members', 'expenses', 'settlements'],
  group_members: ['group_members'],
  expenses: ['expenses', 'receipts'],
  settlements: ['settlements'],
  notifications: [],
  invitations: ['group_members'],
  receipts: ['receipts'],
  all: ['profile', 'groups', 'group_members', 'expenses', 'settlements', 'receipts'],
};

export function invalidationTouchesCache(type: InvalidationType): boolean {
  return CACHE_INVALIDATION_TYPES.has(type);
}

export function invalidationTouchesNotifications(type: InvalidationType): boolean {
  return NOTIFICATION_INVALIDATION_TYPES.has(type);
}

export function invalidationTouchesInvitations(type: InvalidationType): boolean {
  return INVITATION_INVALIDATION_TYPES.has(type);
}

export function slicesForInvalidationType(type: InvalidationType): CacheSliceKey[] {
  return INVALIDATION_SLICE_MAP[type] ?? [];
}

export function touchTimestampsForType(
  type: InvalidationType,
  now: number,
): Partial<AppDataTimestamps> {
  switch (type) {
    case 'profile':
      return { lastProfileFetchAt: now };
    case 'groups':
    case 'group_members':
    case 'group_detail':
      return { lastGroupsFetchAt: now };
    case 'expenses':
    case 'receipts':
    case 'home':
      return { lastExpensesFetchAt: now };
    case 'notifications':
      return { lastNotificationsFetchAt: now };
    case 'settlements':
      return { lastSettlementsFetchAt: now };
    case 'invitations':
      return { lastInvitationsFetchAt: now };
    case 'all':
      return {
        lastProfileFetchAt: now,
        lastGroupsFetchAt: now,
        lastExpensesFetchAt: now,
        lastNotificationsFetchAt: now,
        lastSettlementsFetchAt: now,
        lastInvitationsFetchAt: now,
      };
    default:
      return {};
  }
}

import type { GroupType } from './types';
import type { IconName } from '../components/Icon';

export const CREATE_GROUP_MOCK = {
  title: 'Create Group',
  subtitle: 'Start a trip, dinner, or shared budget.',
  defaultName: 'Banff Trip',
  currency: 'CAD – Canadian Dollar',
  currencyHint: 'Currency is locked for all members.',
  startDate: 'May 23, 2026',
  endDate: 'May 30, 2026',
  members: ['A', 'B', 'C', 'D'] as const,
  ctaLabel: 'Next: Add Members',
} as const;

export const GROUP_TYPE_OPTIONS: { id: GroupType; label: string; icon: IconName }[] = [
  { id: 'Trip', label: 'Trip', icon: 'briefcase' },
  { id: 'Dinner', label: 'Dinner', icon: 'building-storefront' },
  { id: 'Camping', label: 'Camping', icon: 'map' },
  { id: 'Skiing', label: 'Skiing', icon: 'sparkles' },
  { id: 'Roommate', label: 'Roommate', icon: 'home-modern' },
  { id: 'Other', label: 'Other', icon: 'ellipsis' },
];

export type SettlementModeOption = 'team' | 'individual';

export const SETTLEMENT_OPTIONS: {
  id: SettlementModeOption;
  title: string;
  description: string;
}[] = [
  {
    id: 'team',
    title: 'Couple / Team',
    description: 'Settle together as a couple or team.',
  },
  {
    id: 'individual',
    title: 'Individual',
    description: 'Settle up individually with each member.',
  },
];

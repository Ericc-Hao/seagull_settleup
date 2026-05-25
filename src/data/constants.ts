import type { IconName } from '../components/Icon';
import type { ExpenseType, GroupType, PreferredEmtMethod, SettlementMode, SplitMethod } from '../types/models';

export const UI_COPY = {
  homeSubtitle: 'Track your spending and settle balances.',
  groupsTitle: 'Groups',
  groupsSubtitle: 'Trips, dinners, and shared budgets.',
  expensesTitle: 'Expenses',
  expensesSubtitle: 'Personal spending and shared splits.',
  profileTitle: 'Profile',
  profileSubtitle: 'Account & preferences',
  createGroupTitle: 'Create Group',
  createGroupSubtitle: 'Create a shared group for expenses.',
  createGroupCta: 'Create Group',
  addExpenseTitle: 'Add Expense',
  settleUpTitle: 'Pending Transfers',
} as const;

export const GROUP_TYPE_OPTIONS: { id: GroupType; label: string; icon: IconName }[] = [
  { id: 'Trip', label: 'Trip', icon: 'briefcase' },
  { id: 'Dinner', label: 'Dinner', icon: 'building-storefront' },
  { id: 'Camping', label: 'Camping', icon: 'map' },
  { id: 'Skiing', label: 'Skiing', icon: 'sparkles' },
  { id: 'Roommate', label: 'Roommate', icon: 'home-modern' },
  { id: 'Other', label: 'Other', icon: 'ellipsis' },
];

export const SETTLEMENT_OPTIONS = [
  {
    id: 'team' as const,
    title: 'Couple / Team',
    description: 'Settle together as a couple or team.',
  },
  {
    id: 'individual' as const,
    title: 'Individual',
    description: 'Settle up individually with each member.',
  },
];

export const SETTLE_MODE_TABS: { id: SettlementMode; label: string }[] = [
  { id: 'team', label: 'Couple / Team' },
  { id: 'individual', label: 'Individual' },
];

export const EXPENSE_FILTER_OPTIONS: { id: 'all' | ExpenseType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'personal', label: 'Personal' },
  { id: 'split', label: 'Split' },
];

export const EXPENSE_TYPE_OPTIONS: { id: ExpenseType; label: string }[] = [
  { id: 'personal', label: 'Personal' },
  { id: 'split', label: 'Split' },
];

export const SPLIT_METHOD_OPTIONS: { id: SplitMethod; label: string }[] = [
  { id: 'equal', label: 'Equal' },
  { id: 'custom', label: 'Custom' },
];

export const EMT_METHOD_OPTIONS: { id: PreferredEmtMethod; label: string }[] = [
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Phone' },
  { id: 'none', label: 'None' },
];

export const QUICK_ACTIONS = [
  { id: 'scan', label: 'Scan Receipt', icon: 'viewfinder-circle' as IconName },
  { id: 'create', label: 'Create Group', icon: 'user-group' as IconName },
  { id: 'settle', label: 'Pending Transfers', icon: 'currency-dollar' as IconName },
  { id: 'personal', label: 'Personal', icon: 'user' as IconName },
] as const;


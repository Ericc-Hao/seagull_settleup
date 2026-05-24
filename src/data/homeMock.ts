import type { IconName } from '../components/Icon';

/** Static mock content for HomeScreen (design spec) */
export const HOME_MOCK = {
  user: {
    id: 'eric',
    name: 'Eric',
  },
  greeting: 'Good afternoon, Eric',
  subtitle: 'Track your spending. Split without stress.',

  overview: {
    title: 'May 2026 Overview',
    totalSpent: '$1,842.50 CAD',
    youOwed: '$275.00',
    youOwe: '$68.50',
  },

  quickActions: [
    { id: 'scan', label: 'Scan Receipt', icon: 'viewfinder-circle' as IconName, tint: '#5B7CFA', bg: '#EEF2FF' },
    { id: 'create', label: 'Create Group', icon: 'user-group' as IconName, tint: '#0D9488', bg: '#ECFDF5' },
    { id: 'settle', label: 'Settle Up', icon: 'currency-dollar' as IconName, tint: '#EA580C', bg: '#FFF7ED' },
    { id: 'personal', label: 'Personal', icon: 'user' as IconName, tint: '#7C3AED', bg: '#F5F3FF' },
  ],

  bookkeeping: [
    { id: 'food', label: 'Food & Drinks', amount: '$420.50', icon: 'building-storefront' as IconName, tint: '#F97316', bg: '#FFF7ED' },
    { id: 'transport', label: 'Transportation', amount: '$180.00', icon: 'truck' as IconName, tint: '#3B82F6', bg: '#EFF6FF' },
    { id: 'shopping', label: 'Shopping', amount: '$260.00', icon: 'shopping-bag' as IconName, tint: '#14B8A6', bg: '#F0FDFA' },
    { id: 'rent', label: 'Rent & Bills', amount: '$900.00', icon: 'home-modern' as IconName, tint: '#8B5CF6', bg: '#F5F3FF' },
  ],

  splitGroups: [
    {
      id: 'group-banff',
      name: 'Banff Trip',
      balance: 'You are owed $1,275.00',
      positive: true,
      gradient: ['#6EE7B7', '#60A5FA'] as [string, string],
    },
    {
      id: 'group-waterloo',
      name: 'Waterloo Dinner',
      balance: 'You owe $36.20',
      positive: false,
      gradient: ['#FDBA74', '#F472B6'] as [string, string],
    },
  ],
} as const;

import type { IconName } from '../components/Icon';

export const EXPENSES_TAB_MOCK = {
  title: 'Expenses',
  subtitle: 'Personal spending and shared splits.',
  summary: {
    title: 'May 2026 Expenses',
    primaryLabel: 'Total Spent',
    primaryValue: '$1,842.50 CAD',
    stats: [
      { label: 'Personal', value: '$1,760.50', tone: 'default' as const },
      { label: 'Split (your share)', value: '$82.00', tone: 'default' as const },
    ],
  },
  personal: [
    { id: 'p1', label: 'Groceries — Whole Foods', amount: '$86.40', icon: 'shopping-cart' as IconName, tint: '#22C55E', bg: '#F0FDF4' },
    { id: 'p2', label: 'Uber to airport', amount: '$42.00', icon: 'truck' as IconName, tint: '#3B82F6', bg: '#EFF6FF' },
    { id: 'p3', label: 'Coffee — Morning Brew', amount: '$12.50', icon: 'building-storefront' as IconName, tint: '#F97316', bg: '#FFF7ED' },
  ],
  split: [
    { id: 's1', label: 'Banff Hotel', group: 'Banff Trip', amount: '$500.00', icon: 'home-modern' as IconName, tint: '#8B5CF6', bg: '#F5F3FF' },
    { id: 's2', label: 'Food & Drinks', group: 'Banff Trip', amount: '$10.51', icon: 'building-storefront' as IconName, tint: '#F97316', bg: '#FFF7ED' },
    { id: 's3', label: 'Dinner tab', group: 'Waterloo Dinner', amount: '$47.10', icon: 'building-storefront' as IconName, tint: '#F97316', bg: '#FFF7ED' },
  ],
};

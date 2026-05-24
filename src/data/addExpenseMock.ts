import type { IconName } from '../components/Icon';

export type ExpenseKind = 'personal' | 'split';
export type SplitMethod = 'equal' | 'custom';

export const ADD_EXPENSE_MOCK = {
  title: 'Add Expense',
  defaultKind: 'split' as ExpenseKind,
  amountLabel: 'Amount',
  amountDisplay: '$2,000.00 CAD',
  amountRaw: '2000',
  defaultPayerId: 'A',
  defaultCategory: 'Hotel',
  defaultSplitMethod: 'equal' as SplitMethod,
  notePlaceholder: 'Add a note...',
  ctaLabel: 'Save Expense',

  payers: [
    { id: 'A', label: 'A', name: 'Alex' },
    { id: 'B', label: 'B', name: 'Blake' },
    { id: 'C', label: 'C', name: 'Casey' },
    { id: 'D', label: 'D', name: 'Dana' },
  ],

  categories: [
    { id: 'Hotel', label: 'Hotel', icon: 'home-modern' as IconName },
    { id: 'Food', label: 'Food', icon: 'building-storefront' as IconName },
    { id: 'Gas', label: 'Gas', icon: 'truck' as IconName },
    { id: 'Ticket', label: 'Ticket', icon: 'ticket' as IconName },
    { id: 'Grocery', label: 'Grocery', icon: 'shopping-cart' as IconName },
    { id: 'Other', label: 'Other', icon: 'ellipsis' as IconName },
  ],

  splitMembers: [
    { id: 'A', name: 'Alex', included: true },
    { id: 'B', name: 'Blake', included: true },
    { id: 'C', name: 'Casey', included: true },
    { id: 'D', name: 'Dana', included: true },
  ],

  splitPreview: [
    { id: 'A', name: 'Alex', amount: '$500.00 CAD' },
    { id: 'B', name: 'Blake', amount: '$500.00 CAD' },
    { id: 'C', name: 'Casey', amount: '$500.00 CAD' },
    { id: 'D', name: 'Dana', amount: '$500.00 CAD' },
  ],
} as const;

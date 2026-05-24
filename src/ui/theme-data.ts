import type { IconName } from './icon';

export const CATEGORY_META: Record<
  string,
  { label: string; color: string; bg: string; icon: IconName }
> = {
  Food: { label: 'Food & Drinks', color: '#F97316', bg: '#FFF7ED', icon: 'building-storefront' },
  Hotel: { label: 'Rent & Bills', color: '#8B5CF6', bg: '#F5F3FF', icon: 'home-modern' },
  Gas: { label: 'Transportation', color: '#3B82F6', bg: '#EFF6FF', icon: 'truck' },
  Ticket: { label: 'Tickets', color: '#10B981', bg: '#ECFDF5', icon: 'ticket' },
  Grocery: { label: 'Grocery', color: '#22C55E', bg: '#F0FDF4', icon: 'shopping-cart' },
  Shopping: { label: 'Shopping', color: '#14B8A6', bg: '#F0FDFA', icon: 'shopping-bag' },
  Parking: { label: 'Parking', color: '#6366F1', bg: '#EEF2FF', icon: 'map' },
  Rental: { label: 'Rental', color: '#0EA5E9', bg: '#F0F9FF', icon: 'briefcase' },
  Activity: { label: 'Activity', color: '#EC4899', bg: '#FDF2F8', icon: 'sparkles' },
  Other: { label: 'Other', color: '#64748B', bg: '#F1F5F9', icon: 'ellipsis' },
};

export const GROUP_TYPES = ['Trip', 'Dinner', 'Camping', 'Skiing', 'Roommate', 'Other'] as const;

export const GROUP_TYPE_ICONS: Record<(typeof GROUP_TYPES)[number], IconName> = {
  Trip: 'briefcase',
  Dinner: 'building-storefront',
  Camping: 'map',
  Skiing: 'sparkles',
  Roommate: 'home-modern',
  Other: 'ellipsis',
};

export const EXPENSE_CATEGORIES = ['Hotel', 'Food', 'Gas', 'Ticket', 'Grocery', 'Other'] as const;

export const EXPENSE_CATEGORY_ICONS: Record<(typeof EXPENSE_CATEGORIES)[number], IconName> = {
  Hotel: 'home-modern',
  Food: 'building-storefront',
  Gas: 'truck',
  Ticket: 'ticket',
  Grocery: 'shopping-cart',
  Other: 'ellipsis',
};

export const EXPENSE_CATEGORY_COLORS: Record<(typeof EXPENSE_CATEGORIES)[number], { color: string; bg: string }> = {
  Hotel: { color: '#3B82F6', bg: '#EFF6FF' },
  Food: { color: '#F97316', bg: '#FFF7ED' },
  Gas: { color: '#8B5CF6', bg: '#F5F3FF' },
  Ticket: { color: '#10B981', bg: '#ECFDF5' },
  Grocery: { color: '#EAB308', bg: '#FEFCE8' },
  Other: { color: '#64748B', bg: '#F1F5F9' },
};

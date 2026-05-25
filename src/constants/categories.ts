import type { IconName } from '../components/Icon';

export type CategoryKey =
  | 'food_drinks'
  | 'transportation'
  | 'shopping'
  | 'rent_bills'
  | 'groceries'
  | 'hotel'
  | 'gas'
  | 'tickets'
  | 'parking'
  | 'entertainment'
  | 'travel'
  | 'other';

export interface CategoryConfig {
  key: CategoryKey;
  label: string;
  icon: IconName;
  tint: string;
  bg: string;
}

/** Canonical expense category definitions — matches Supabase default categories. */
export const EXPENSE_CATEGORIES: CategoryConfig[] = [
  { key: 'food_drinks', label: 'Food & Drinks', icon: 'building-storefront', tint: '#F97316', bg: '#FFF7ED' },
  { key: 'transportation', label: 'Transportation', icon: 'truck', tint: '#3B82F6', bg: '#EFF6FF' },
  { key: 'shopping', label: 'Shopping', icon: 'shopping-bag', tint: '#14B8A6', bg: '#F0FDFA' },
  { key: 'rent_bills', label: 'Rent & Bills', icon: 'home-modern', tint: '#8B5CF6', bg: '#F5F3FF' },
  { key: 'groceries', label: 'Groceries', icon: 'shopping-cart', tint: '#22C55E', bg: '#F0FDF4' },
  { key: 'hotel', label: 'Hotel', icon: 'home-modern', tint: '#6366F1', bg: '#EEF2FF' },
  { key: 'gas', label: 'Gas', icon: 'truck', tint: '#2563EB', bg: '#EFF6FF' },
  { key: 'tickets', label: 'Tickets', icon: 'ticket', tint: '#10B981', bg: '#ECFDF5' },
  { key: 'parking', label: 'Parking', icon: 'map', tint: '#64748B', bg: '#F1F5F9' },
  { key: 'entertainment', label: 'Entertainment', icon: 'sparkles', tint: '#EC4899', bg: '#FDF2F8' },
  { key: 'travel', label: 'Travel', icon: 'briefcase', tint: '#0EA5E9', bg: '#F0F9FF' },
  { key: 'other', label: 'Other', icon: 'ellipsis', tint: '#64748B', bg: '#F1F5F9' },
];

export const CATEGORY_BY_KEY: Record<CategoryKey, CategoryConfig> = Object.fromEntries(
  EXPENSE_CATEGORIES.map((category) => [category.key, category]),
) as Record<CategoryKey, CategoryConfig>;

export const OTHER_CATEGORY = CATEGORY_BY_KEY.other;

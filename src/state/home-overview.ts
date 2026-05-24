import type { IconName } from '../ui/icon';
import { CATEGORY_META } from '../ui/theme';
import type { Trip } from './trip-types';
import { getMemberBalanceCents } from './trip-selectors';

export interface HomeOverview {
  totalSpentCents: number;
  youOwedCents: number;
  youOweCents: number;
  categoryBreakdown: {
    category: string;
    label: string;
    totalCents: number;
    color: string;
    bg: string;
    icon: IconName;
  }[];
}

export function buildHomeOverview(trips: Trip[], activeMemberId: string): HomeOverview {
  let totalSpentCents = 0;
  let youOwedCents = 0;
  let youOweCents = 0;
  const categoryMap = new Map<string, number>();

  for (const trip of trips) {
    for (const expense of trip.expenses) {
      totalSpentCents += expense.amountCents;
      const key = expense.category.trim() || 'Other';
      categoryMap.set(key, (categoryMap.get(key) ?? 0) + expense.amountCents);
    }

    const balance = getMemberBalanceCents(trip, activeMemberId);
    if (balance > 0) youOwedCents += balance;
    if (balance < 0) youOweCents += Math.abs(balance);
  }

  const categoryBreakdown = Array.from(categoryMap.entries())
    .map(([category, totalCents]) => {
      const meta = CATEGORY_META[category] ?? CATEGORY_META.Other;
      return {
        category,
        label: meta.label,
        totalCents,
        color: meta.color,
        bg: meta.bg,
        icon: meta.icon,
      };
    })
    .sort((a, b) => b.totalCents - a.totalCents)
    .slice(0, 4);

  return { totalSpentCents, youOwedCents, youOweCents, categoryBreakdown };
}

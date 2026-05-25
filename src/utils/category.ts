import {
  CATEGORY_BY_KEY,
  EXPENSE_CATEGORIES,
  OTHER_CATEGORY,
  type CategoryConfig,
  type CategoryKey,
} from '../constants/categories';
import { readDb } from '../services/dbHelpers';
import type { Category } from '../types/models';
import { createLogger } from './logger';

const logger = createLogger('category');

const LABEL_TO_KEY: Record<string, CategoryKey> = {
  'food & drinks': 'food_drinks',
  'food and drinks': 'food_drinks',
  food: 'food_drinks',
  transportation: 'transportation',
  transport: 'transportation',
  shopping: 'shopping',
  'rent & bills': 'rent_bills',
  'rent and bills': 'rent_bills',
  rent: 'rent_bills',
  bills: 'rent_bills',
  groceries: 'groceries',
  grocery: 'groceries',
  hotel: 'hotel',
  gas: 'gas',
  tickets: 'tickets',
  ticket: 'tickets',
  parking: 'parking',
  entertainment: 'entertainment',
  travel: 'travel',
  other: 'other',
};

/** Legacy CATEGORY_META keys from older list rendering. */
const LEGACY_KEY_ALIASES: Record<string, CategoryKey> = {
  food: 'food_drinks',
  gas: 'transportation',
  hotel: 'rent_bills',
  ticket: 'tickets',
  grocery: 'groceries',
};

export function matchCategoryKey(categoryKeyOrName?: string | null): CategoryKey | null {
  if (!categoryKeyOrName?.trim()) {
    return null;
  }

  const trimmed = categoryKeyOrName.trim();
  const lower = trimmed.toLowerCase();

  if (lower in CATEGORY_BY_KEY) {
    return lower as CategoryKey;
  }

  if (LABEL_TO_KEY[lower]) {
    return LABEL_TO_KEY[lower];
  }

  if (LEGACY_KEY_ALIASES[lower]) {
    return LEGACY_KEY_ALIASES[lower];
  }

  const slug = lower.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  if (slug in CATEGORY_BY_KEY) {
    return slug as CategoryKey;
  }

  return null;
}

export function normalizeCategoryKey(categoryKeyOrName?: string | null): CategoryKey {
  return matchCategoryKey(categoryKeyOrName) ?? 'other';
}

export function getCategoryConfig(input?: {
  categoryKey?: string | null;
  categoryName?: string | null;
  categoryId?: string | null;
  expenseId?: string;
}): CategoryConfig {
  let resolvedKey: CategoryKey | null = null;

  if (input?.categoryId) {
    const fromDb = readDb().categories.find((category) => category.id === input.categoryId);
    if (fromDb) {
      resolvedKey = matchCategoryKey(fromDb.name);
    }
  }

  if (!resolvedKey && input?.categoryKey) {
    resolvedKey = matchCategoryKey(input.categoryKey);
  }

  if (!resolvedKey && input?.categoryName) {
    resolvedKey = matchCategoryKey(input.categoryName);
  }

  if (!resolvedKey && (input?.categoryName || input?.categoryKey || input?.categoryId)) {
    logger.warn('Unknown expense category, falling back to Other', {
      categoryName: input?.categoryName,
      categoryKey: input?.categoryKey,
      categoryId: input?.categoryId,
      expenseId: input?.expenseId,
    });
  }

  return resolvedKey ? CATEGORY_BY_KEY[resolvedKey] : OTHER_CATEGORY;
}

export function getCategoryLabel(categoryKeyOrName?: string | null): string {
  return getCategoryConfig({ categoryKey: categoryKeyOrName, categoryName: categoryKeyOrName }).label;
}

export function getCategoryIcon(categoryKeyOrName?: string | null) {
  return getCategoryConfig({ categoryKey: categoryKeyOrName, categoryName: categoryKeyOrName }).icon;
}

export interface CategoryPickerOption extends CategoryConfig {
  /** Supabase categories.id when available */
  dbId?: string;
}

export function getCategoryPickerOptions(dbCategories: Category[] = readDb().categories): CategoryPickerOption[] {
  return EXPENSE_CATEGORIES.map((config) => {
    const dbMatch = dbCategories.find(
      (category) => normalizeCategoryKey(category.name) === config.key,
    );
    return {
      ...config,
      dbId: dbMatch?.id,
    };
  });
}

export function resolveCategoryForSave(
  selectedKey: CategoryKey | '',
  dbCategories: Category[] = readDb().categories,
): { categoryId?: string; categoryName: string; categoryKey: CategoryKey } {
  const config = selectedKey ? CATEGORY_BY_KEY[selectedKey] ?? OTHER_CATEGORY : OTHER_CATEGORY;
  const dbMatch = dbCategories.find(
    (category) => normalizeCategoryKey(category.name) === config.key,
  );
  return {
    categoryId: dbMatch?.id,
    categoryName: config.label,
    categoryKey: config.key,
  };
}

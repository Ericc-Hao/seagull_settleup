import { mapCategory } from '../lib/mappers';
import { supabase } from '../lib/supabase';
import type { Category } from '../types/models';
import { createLogger } from '../utils/logger';
import { readDb } from './dbHelpers';
import { getCurrentUserId } from './groupService';

const logger = createLogger('categoryService');

export function getCachedCategories(): Category[] {
  return readDb().categories;
}

export async function getCategories(): Promise<Category[]> {
  logger.info('Fetch categories started', { table: 'categories' });
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }
    const categories = (data ?? []).map(mapCategory);
    logger.info('Fetch categories succeeded', { table: 'categories', count: categories.length });
    return categories;
  } catch (error) {
    logger.error('Fetch categories failed', error, { table: 'categories' });
    throw error;
  }
}

export async function createCategory(input: {
  name: string;
  icon?: string;
  color?: string;
  type?: 'personal' | 'split' | 'both';
}): Promise<Category> {
  logger.info('Create category started', { table: 'categories', name: input.name });
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      throw new Error('You must be logged in to create a category.');
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({
        user_id: userId,
        name: input.name,
        icon: input.icon ?? null,
        color: input.color ?? null,
        type: input.type ?? 'both',
        is_default: false,
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }
    logger.info('Create category succeeded', { table: 'categories', categoryId: data.id });
    return mapCategory(data);
  } catch (error) {
    logger.error('Create category failed', error, { table: 'categories', name: input.name });
    throw error;
  }
}

export async function updateCategory(
  categoryId: string,
  input: Partial<Pick<Category, 'name' | 'icon' | 'color' | 'type'>>,
): Promise<Category> {
  logger.info('Update category started', { table: 'categories', categoryId });
  try {
    const { data, error } = await supabase
      .from('categories')
      .update({
        name: input.name,
        icon: input.icon,
        color: input.color,
        type: input.type,
      })
      .eq('id', categoryId)
      .select('*')
      .single();

    if (error) {
      throw error;
    }
    logger.info('Update category succeeded', { table: 'categories', categoryId });
    return mapCategory(data);
  } catch (error) {
    logger.error('Update category failed', error, { table: 'categories', categoryId });
    throw error;
  }
}

export async function deleteCategory(categoryId: string): Promise<void> {
  logger.info('Delete category started', { table: 'categories', categoryId });
  try {
    const { error } = await supabase.from('categories').delete().eq('id', categoryId);
    if (error) {
      throw error;
    }
    logger.info('Delete category succeeded', { table: 'categories', categoryId });
  } catch (error) {
    logger.error('Delete category failed', error, { table: 'categories', categoryId });
    throw error;
  }
}

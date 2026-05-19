import { supabase } from '../supabase/client';
import type { SearchOptions } from '../models/search';

/**
 * Saved filters — the user's shortcut chips ("P4 sans date", "demain avec time", etc.).
 * We store the SearchOptions directly in a jsonb column so the search screen can
 * replay them without a translation layer.
 */
export interface SavedFilter {
  id: string;
  user_id: string;
  name: string;
  query: SearchOptions;
  sort_order: number;
  created_at: string;
}

export async function listFilters(): Promise<SavedFilter[]> {
  const { data, error } = await supabase
    .from('saved_filters')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as SavedFilter[];
}

export async function createFilter(name: string, query: SearchOptions): Promise<SavedFilter> {
  const { data, error } = await supabase
    .from('saved_filters')
    .insert({ name, query })
    .select()
    .single();
  if (error) throw error;
  return data as SavedFilter;
}

export async function updateFilter(id: string, patch: Partial<Pick<SavedFilter, 'name' | 'query' | 'sort_order'>>): Promise<SavedFilter> {
  const { data, error } = await supabase
    .from('saved_filters')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as SavedFilter;
}

export async function deleteFilter(id: string): Promise<void> {
  const { error } = await supabase.from('saved_filters').delete().eq('id', id);
  if (error) throw error;
}

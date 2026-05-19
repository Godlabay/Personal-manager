import { supabase } from '../supabase/client';
import type { Project } from './types';

export async function listProjects(includeArchived = false): Promise<Project[]> {
  let q = supabase.from('projects').select('*').order('sort_order', { ascending: true });
  if (!includeArchived) q = q.eq('archived', false);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Project[];
}

export async function createProject(name: string, color?: string): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert({ name, color: color ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as Project;
}

export async function archiveProject(id: string): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update({ archived: true })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Project;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}

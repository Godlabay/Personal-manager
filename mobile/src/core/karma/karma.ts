import { supabase } from '../supabase/client';

/**
 * Karma + streaks — TDAH-friendly gamification.
 *
 * Rules (Phase 2 draft):
 *  - Every completed task = +1 karma.
 *  - Streak counts as "days where user completed ≥1 task".
 *  - Missing a day resets current_streak to 1 on next completion (not 0 —
 *    we never show 0 to avoid the shame spiral).
 *  - longest_streak only grows, never resets.
 *
 * Stored on user_profile (karma, current_streak, longest_streak, preferences.last_complete_day).
 */

export interface KarmaState {
  karma: number;
  current_streak: number;
  longest_streak: number;
  last_complete_day: string | null;
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function yesterdayOf(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(y, m - 1, d - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Ensures a user_profile row exists and returns the current karma state.
 * Safe to call repeatedly — uses upsert with onConflict on user_id.
 */
export async function getKarma(): Promise<KarmaState | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data, error } = await supabase
    .from('user_profile')
    .select('karma, current_streak, longest_streak, preferences')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (error) return null;

  if (!data) {
    // First time — insert empty profile.
    await supabase.from('user_profile').insert({
      user_id: userData.user.id,
      karma: 0,
      current_streak: 0,
      longest_streak: 0,
      preferences: {},
    });
    return { karma: 0, current_streak: 0, longest_streak: 0, last_complete_day: null };
  }

  return {
    karma: data.karma ?? 0,
    current_streak: data.current_streak ?? 0,
    longest_streak: data.longest_streak ?? 0,
    last_complete_day: (data.preferences as { last_complete_day?: string })?.last_complete_day ?? null,
  };
}

/**
 * Called whenever a task is completed. Bumps karma and (at most once per day)
 * extends or resets the streak.
 */
export async function onTaskCompleted(): Promise<KarmaState | null> {
  const state = await getKarma();
  if (!state) return null;

  const todayStr = today();
  const alreadyCountedToday = state.last_complete_day === todayStr;
  const yesterday = yesterdayOf(todayStr);

  const nextCurrent = alreadyCountedToday
    ? state.current_streak
    : state.last_complete_day === yesterday
      ? state.current_streak + 1
      : 1;

  const nextLongest = Math.max(state.longest_streak, nextCurrent);

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  // Fetch preferences to merge.
  const { data: profile } = await supabase
    .from('user_profile')
    .select('preferences')
    .eq('user_id', userData.user.id)
    .maybeSingle();
  const prefs = (profile?.preferences as Record<string, unknown>) ?? {};

  const { data, error } = await supabase
    .from('user_profile')
    .update({
      karma: state.karma + 1,
      current_streak: nextCurrent,
      longest_streak: nextLongest,
      preferences: { ...prefs, last_complete_day: todayStr },
    })
    .eq('user_id', userData.user.id)
    .select('karma, current_streak, longest_streak, preferences')
    .single();

  if (error || !data) return state;

  return {
    karma: data.karma,
    current_streak: data.current_streak,
    longest_streak: data.longest_streak,
    last_complete_day: todayStr,
  };
}

import { supabase } from '../supabase/client';
import type { Session, User } from '@supabase/supabase-js';

/**
 * Thin auth facade. We use magic-link email for Phase 1 — no password storage,
 * no social provider complexity. The redirect URL deep-links back into the app
 * via the `personalmanager://` scheme (configured in app.json).
 */

const REDIRECT_URL = 'personalmanager://auth-callback';

export async function sendMagicLink(email: string): Promise<{ error?: string }> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: REDIRECT_URL,
      shouldCreateUser: true,
    },
  });
  return error ? { error: error.message } : {};
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/**
 * Register a listener for auth state changes. The returned function unsubscribes.
 * Use this in the root layout to drive which tabs are mounted.
 */
export function onAuthChange(cb: (session: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

/**
 * Handle a universal-link / deep-link callback, extracting the OTP fragment and
 * exchanging it for a session.
 */
export async function handleAuthDeepLink(url: string): Promise<boolean> {
  // Supabase puts the code in the hash fragment; parse both query and fragment.
  const u = new URL(url);
  const params = new URLSearchParams(u.search.startsWith('?') ? u.search.slice(1) : u.search);
  const hash = u.hash.startsWith('#') ? u.hash.slice(1) : u.hash;
  const hashParams = new URLSearchParams(hash);
  const code = params.get('code') ?? hashParams.get('code');
  if (!code) return false;
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return !error;
}

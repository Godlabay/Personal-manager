import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { getSession, onAuthChange } from '../auth/auth';

interface SessionState {
  session: Session | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
}

/**
 * Zustand store wrapping Supabase auth state so React components can subscribe
 * without each mounting their own listener. Call hydrate() once at app boot.
 */
export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  hydrated: false,
  async hydrate() {
    const session = await getSession();
    set({ session, hydrated: true });
    onAuthChange((s) => set({ session: s }));
  },
}));

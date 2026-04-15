import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import { ThemeProvider, useTheme } from '@/design/theme';
import { useSessionStore } from '@/core/store/session';
import { handleAuthDeepLink } from '@/core/auth/auth';
import { setFocusLaunchHandler } from '@/core/ai/tools/startFocusSession';

/**
 * Root layout. Responsible for:
 *  - Wrapping the whole tree in ThemeProvider + GestureHandlerRootView
 *  - Kicking off session hydration on mount
 *  - Routing unauthenticated users to (auth) and authenticated users to (tabs)
 *  - Catching OTP deep links (personalmanager://auth-callback?code=...)
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <RootGate />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function RootGate() {
  const { palette, isDark } = useTheme();
  const hydrate = useSessionStore((s) => s.hydrate);
  const session = useSessionStore((s) => s.session);
  const hydrated = useSessionStore((s) => s.hydrated);
  const router = useRouter();
  const segments = useSegments();

  // Hydrate auth + listen for OTP deep links + wire AI focus tool.
  useEffect(() => {
    hydrate();
    const sub = Linking.addEventListener('url', ({ url }) => {
      void handleAuthDeepLink(url);
    });
    setFocusLaunchHandler(({ task_id, duration_minutes, ambience }) => {
      router.push({
        pathname: '/focus',
        params: { task_id, duration: String(duration_minutes), ambience },
      } as never);
    });
    return () => sub.remove();
  }, [hydrate, router]);

  // Redirect when auth state changes.
  useEffect(() => {
    if (!hydrated) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)/today');
    }
  }, [hydrated, session, segments, router]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={palette.background} />
      <Slot />
    </>
  );
}

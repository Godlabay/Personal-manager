import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { palettes, type Palette, type PaletteName } from './palette';
import { spacing, radius } from './spacing';
import { fonts } from './typography';

/**
 * ThemeChoice = what the user picked in Settings.
 * "system" follows OS (dark → ember, light → parchment).
 * The three named palettes force a specific look regardless of OS.
 */
export type ThemeChoice = 'system' | PaletteName;

const STORAGE_KEY = 'app.theme';

interface ThemeContextValue {
  palette: Palette;
  spacing: typeof spacing;
  radius: typeof radius;
  fonts: typeof fonts;
  choice: ThemeChoice;
  paletteName: PaletteName;
  setChoice: (choice: ThemeChoice) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolvePalette(choice: ThemeChoice, systemIsDark: boolean): PaletteName {
  if (choice === 'system') return systemIsDark ? 'ember' : 'parchment';
  return choice;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const systemIsDark = systemScheme === 'dark';
  const [choice, setChoiceState] = useState<ThemeChoice>('system');
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from AsyncStorage on mount.
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'system' || stored === 'ember' || stored === 'midnight' || stored === 'parchment') {
          setChoiceState(stored);
        }
      } catch {
        // Ignore — fall back to default.
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const setChoice = (next: ThemeChoice) => {
    setChoiceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  };

  const value = useMemo<ThemeContextValue>(() => {
    const paletteName = resolvePalette(choice, systemIsDark);
    const palette = palettes[paletteName];
    const isDark = paletteName !== 'parchment';
    return { palette, spacing, radius, fonts, choice, paletteName, setChoice, isDark };
  }, [choice, systemIsDark]);

  // Avoid flashing the default theme before we've read AsyncStorage.
  if (!hydrated) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

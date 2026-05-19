/**
 * Warm, cocoon-style palettes. Three variants; user picks in Settings.
 *
 * - Ember (default): chocolate-noir background, ember-orange accent. Camp-fire feel.
 * - Midnight: neutral dark with slightly warm accent for users who find Ember too saturated.
 * - Parchment: light theme with ivory paper background, terracotta accent.
 *
 * Priority colors are independent of theme accent so meaning stays stable across themes.
 */

export interface Palette {
  background: string;
  surface: string;
  surfaceElevated: string;
  accent: string;
  accentSoft: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  warning: string;
  danger: string;
  outline: string;
}

export const ember: Palette = {
  background:      '#1E1612',
  surface:         '#2A1F18',
  surfaceElevated: '#3A2A20',
  accent:          '#FF8A3D',
  accentSoft:      '#FFB86B',
  text:            '#F5E6D3',
  textSecondary:   '#C9B89E',
  textMuted:       '#8A7A66',
  success:         '#7FA84E',
  warning:         '#E0A955',
  danger:          '#C94E3B',
  outline:         '#4A3A2E',
};

export const midnight: Palette = {
  background:      '#0F141A',
  surface:         '#141B24',
  surfaceElevated: '#1C2530',
  accent:          '#7FA2E0',
  accentSoft:      '#A9C1EB',
  text:            '#E6EAF2',
  textSecondary:   '#ABB5C7',
  textMuted:       '#6B7585',
  success:         '#86B472',
  warning:         '#D9A866',
  danger:          '#D16B5A',
  outline:         '#2A3444',
};

export const parchment: Palette = {
  background:      '#FAF3E6',
  surface:         '#FFFFFF',
  surfaceElevated: '#FFF9EC',
  accent:          '#C6581D',
  accentSoft:      '#E88A52',
  text:            '#2A1F18',
  textSecondary:   '#5B4B3D',
  textMuted:       '#8C7E6E',
  success:         '#5A7F33',
  warning:         '#B77A2B',
  danger:          '#A63A28',
  outline:         '#E4D8C3',
};

/** P1..P4. Independent of theme accent to keep meaning stable. */
export const priorityColors = [
  '#7C8A94', // P1 low — slate
  '#5BA4E0', // P2 medium — blue
  '#E0A955', // P3 high — amber
  '#C94E3B', // P4 urgent — terracotta
];

export const palettes = { ember, midnight, parchment } as const;
export type PaletteName = keyof typeof palettes;

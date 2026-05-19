/**
 * Focus session ambience presets.
 * Each preset maps to a curated YouTube video ID.
 * The YouTube embed is shown inside a react-native-webview iframe.
 * Users must have YouTube accessible; no audio is extracted (ToS compliant).
 */

export interface AmbiencePreset {
  id: string;
  label: string;
  emoji: string;
  videoId: string;
  /** Short atmospheric description shown below the label. */
  vibe: string;
}

export const AMBIENCE_PRESETS: AmbiencePreset[] = [
  {
    id: 'rohan_lofi',
    label: 'Rohan Lo-fi',
    emoji: '🐎',
    videoId: '5qap5aO4i9A',  // lo-fi hip hop — Radio - Beats to Relax/Study to
    vibe: 'Calme & régulier',
  },
  {
    id: 'shire_rainy',
    label: 'Shire Rainy Day',
    emoji: '🌧️',
    videoId: 'q76bMs-NwRk',  // cozy hobbit rain ambience
    vibe: 'Pluie douce & feu',
  },
  {
    id: 'rivendell_piano',
    label: 'Rivendell Piano',
    emoji: '🎹',
    videoId: 'HGl75kurxok',  // elvish / fantasy piano focus
    vibe: 'Doux & inspirant',
  },
  {
    id: 'mordor_dark',
    label: 'Mordor Ambient',
    emoji: '🌋',
    videoId: 'x9UOQmlX_T4',  // dark cinematic focus
    vibe: 'Intense & immersif',
  },
  {
    id: 'fangorn_forest',
    label: 'Fangorn Forest',
    emoji: '🌲',
    videoId: 'jFmcgBNfBPs',  // forest nature sounds
    vibe: 'Nature & sérénité',
  },
  {
    id: 'silence',
    label: 'Silence',
    emoji: '🤫',
    videoId: '',
    vibe: 'Aucune musique',
  },
];

export const DEFAULT_PRESET = AMBIENCE_PRESETS[0];
export const SILENCE_PRESET = AMBIENCE_PRESETS[AMBIENCE_PRESETS.length - 1];

import { Platform, TextStyle } from 'react-native';

/**
 * Rounded sans-serif to feel softer than the default system font.
 * On iOS we use San Francisco Rounded; on Android we fall back to the system default
 * (we can ship a bundled Nunito or Rubik later for parity).
 */
const family = Platform.select({
  ios: undefined,            // fontFamily is set via fontWeight + roundingHack below
  android: undefined,
  default: undefined,
});

const roundedIOS: TextStyle = Platform.select({
  ios: { fontFamily: 'System', fontVariant: undefined },
  default: {},
}) as TextStyle;

export const fonts = {
  largeTitle: { ...roundedIOS, fontSize: 34, lineHeight: 41, fontWeight: '700' } as TextStyle,
  title:      { ...roundedIOS, fontSize: 28, lineHeight: 34, fontWeight: '600' } as TextStyle,
  title2:     { ...roundedIOS, fontSize: 22, lineHeight: 28, fontWeight: '600' } as TextStyle,
  title3:     { ...roundedIOS, fontSize: 20, lineHeight: 25, fontWeight: '600' } as TextStyle,
  headline:   { ...roundedIOS, fontSize: 17, lineHeight: 22, fontWeight: '600' } as TextStyle,
  body:       { ...roundedIOS, fontSize: 17, lineHeight: 22, fontWeight: '400' } as TextStyle,
  callout:    { ...roundedIOS, fontSize: 16, lineHeight: 21, fontWeight: '400' } as TextStyle,
  footnote:   { ...roundedIOS, fontSize: 13, lineHeight: 18, fontWeight: '400' } as TextStyle,
  caption:    { ...roundedIOS, fontSize: 12, lineHeight: 16, fontWeight: '400' } as TextStyle,
  timerDigits: (size: number): TextStyle => ({
    ...roundedIOS,
    fontSize: size,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  }),
} as const;

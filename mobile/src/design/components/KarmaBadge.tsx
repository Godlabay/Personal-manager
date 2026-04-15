import { View, Text } from 'react-native';
import { useTheme } from '../theme';

/**
 * Warm, compact karma + streak chip. Shows on the Today header and Settings.
 * If the user has no karma yet we render a whisper-quiet "no pressure" state
 * instead of "0 / 0" to avoid the shame vibe.
 */
export interface KarmaBadgeProps {
  karma: number;
  currentStreak: number;
  longestStreak: number;
  compact?: boolean;
}

export function KarmaBadge({ karma, currentStreak, longestStreak, compact }: KarmaBadgeProps) {
  const { palette, spacing, fonts, radius } = useTheme();
  const isFresh = karma === 0 && currentStreak === 0;

  if (isFresh && compact) {
    return (
      <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill, backgroundColor: palette.surfaceElevated }}>
        <Text style={[fonts.footnote, { color: palette.textMuted }]}>✨ prêt quand tu l'es</Text>
      </View>
    );
  }

  const tile = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: palette.surfaceElevated,
  };

  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      <View style={tile}>
        <Text style={{ fontSize: 14 }}>🔥</Text>
        <Text style={[fonts.callout, { color: palette.text, fontWeight: '600' }]}>{currentStreak}</Text>
        {longestStreak > currentStreak && !compact ? (
          <Text style={[fonts.footnote, { color: palette.textMuted }]}>/ {longestStreak}</Text>
        ) : null}
      </View>
      <View style={tile}>
        <Text style={{ fontSize: 14 }}>⭐️</Text>
        <Text style={[fonts.callout, { color: palette.text, fontWeight: '600' }]}>{karma}</Text>
      </View>
    </View>
  );
}

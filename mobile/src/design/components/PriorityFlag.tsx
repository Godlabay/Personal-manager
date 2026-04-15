import React from 'react';
import { View } from 'react-native';
import { priorityColors } from '../palette';
import { useTheme } from '../theme';

interface Props {
  /** 1..4 — priority level. P4 is most urgent. */
  priority: number;
  size?: number;
}

/**
 * Small flag swatch whose color maps to priority independently of theme accent
 * (so meaning is stable across Ember / Midnight / Parchment).
 */
export function PriorityFlag({ priority, size = 10 }: Props) {
  const { palette } = useTheme();
  const clamped = Math.max(1, Math.min(4, priority));
  const color = priorityColors[clamped - 1] ?? palette.textMuted;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
      }}
    />
  );
}

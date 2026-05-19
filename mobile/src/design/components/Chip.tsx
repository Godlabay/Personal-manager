import React from 'react';
import { Pressable, Text, View, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../theme';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Optional color override (e.g. label color). Falls back to theme accent. */
  color?: string;
  leading?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Pill-shaped tag used for labels, filters, quick actions.
 * Selected = filled with color, unselected = translucent outline.
 */
export function Chip({ label, selected, onPress, color, leading, style }: Props) {
  const { palette, radius, fonts, spacing } = useTheme();
  const tint = color ?? palette.accent;

  const body = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          paddingVertical: spacing.xs + 2,
          paddingHorizontal: spacing.md,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: selected ? tint : palette.outline,
          backgroundColor: selected ? tint : 'transparent',
        },
        style,
      ]}
    >
      {leading}
      <Text
        style={[
          fonts.footnote,
          { color: selected ? palette.background : palette.textSecondary, fontWeight: '500' },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
      {body}
    </Pressable>
  );
}

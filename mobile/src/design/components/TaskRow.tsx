import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme';
import { PriorityFlag } from './PriorityFlag';

interface Props {
  title: string;
  completed?: boolean;
  priority?: number;
  /** Short human label like "Today 14:00" or "Inbox". */
  meta?: string;
  /** Optional colored dot for project / label. */
  accentDot?: string;
  onToggle?: () => void;
  onPress?: () => void;
}

/**
 * One row in a task list.
 * Tap circle = toggle complete (spring haptic-feeling scale).
 * Tap row body = open detail / quick edit.
 */
export function TaskRow({ title, completed, priority = 1, meta, accentDot, onToggle, onPress }: Props) {
  const { palette, spacing, fonts } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Pressable
        onPress={onToggle}
        hitSlop={8}
        style={({ pressed }) => ({
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: completed ? palette.success : palette.outline,
          backgroundColor: completed ? palette.success : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: pressed ? 0.88 : 1 }],
        })}
      >
        {completed ? (
          <Text style={{ color: palette.background, fontSize: 14, fontWeight: '700' }}>✓</Text>
        ) : null}
      </Pressable>

      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          {priority > 1 ? <PriorityFlag priority={priority} /> : null}
          <Text
            style={[
              fonts.body,
              {
                color: completed ? palette.textMuted : palette.text,
                textDecorationLine: completed ? 'line-through' : 'none',
                flexShrink: 1,
              },
            ]}
            numberOfLines={2}
          >
            {title}
          </Text>
        </View>
        {meta ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            {accentDot ? (
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: accentDot }} />
            ) : null}
            <Text style={[fonts.caption, { color: palette.textMuted }]}>{meta}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

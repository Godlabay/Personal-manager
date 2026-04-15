import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme';

interface Props {
  icon?: string;
  title: string;
  message?: string;
  action?: React.ReactNode;
}

/**
 * Warm, non-judgmental empty state. No "you have nothing to do!" clinical vibes.
 * Used for: empty Inbox (celebrate), empty Today (suggest break), no AI key set, etc.
 */
export function EmptyState({ icon = '🫖', title, message, action }: Props) {
  const { palette, spacing, fonts } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xxl,
        gap: spacing.md,
      }}
    >
      <Text style={{ fontSize: 48 }}>{icon}</Text>
      <Text style={[fonts.title3, { color: palette.text, textAlign: 'center' }]}>{title}</Text>
      {message ? (
        <Text style={[fonts.callout, { color: palette.textSecondary, textAlign: 'center' }]}>
          {message}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: spacing.md }}>{action}</View> : null}
    </View>
  );
}

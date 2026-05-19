import React from 'react';
import { Pressable, Text, ActivityIndicator, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../theme';

type Variant = 'primary' | 'secondary' | 'ghost';

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Rounded pill button with warm springy feedback.
 * Primary = filled accent; Secondary = outlined; Ghost = text-only.
 */
export function WarmButton({ title, onPress, variant = 'primary', disabled, loading, fullWidth, style }: Props) {
  const { palette, radius, fonts, spacing } = useTheme();

  const bg =
    variant === 'primary' ? palette.accent :
    variant === 'secondary' ? 'transparent' :
    'transparent';

  const fg =
    variant === 'primary' ? (palette.background) :
    variant === 'secondary' ? palette.accent :
    palette.accent;

  const border =
    variant === 'secondary' ? palette.accent : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: variant === 'secondary' ? 1.5 : 0,
          borderRadius: radius.pill,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xl,
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[fonts.headline, { color: fg }]} numberOfLines={1}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

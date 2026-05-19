import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/design/theme';
import { supabase } from '@/core/supabase/client';
import { AMBIENCE_PRESETS, SILENCE_PRESET, type AmbiencePreset } from '@/features/focus/presets';

const PRESET_DURATIONS = [25, 50, 90];

export default function FocusScreen() {
  const { palette, spacing, fonts, radius } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    task_id?: string;
    duration?: string;
    ambience?: string;
  }>();

  const [duration, setDuration] = useState(Number(params.duration ?? 25));
  const [preset, setPreset] = useState<AmbiencePreset>(
    AMBIENCE_PRESETS.find((p) => p.id === params.ambience) ?? AMBIENCE_PRESETS[0],
  );
  const [phase, setPhase] = useState<'setup' | 'running' | 'done'>('setup');
  const [remaining, setRemaining] = useState(duration * 60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startedAt = useRef<Date | null>(null);
  const progress = useRef(new Animated.Value(0)).current;

  // When running, tick every second.
  useEffect(() => {
    if (phase !== 'running') return;
    timerRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(timerRef.current!);
          setPhase('done');
          void saveTimeEntry();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [phase]);

  // Animate the circular progress.
  useEffect(() => {
    const total = duration * 60;
    const frac = (total - remaining) / total;
    Animated.timing(progress, {
      toValue: frac,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [remaining, duration]);

  const saveTimeEntry = async () => {
    if (!startedAt.current) return;
    const endedAt = new Date();
    const durationS = Math.round((endedAt.getTime() - startedAt.current.getTime()) / 1000);
    await supabase.from('time_entries').insert({
      task_id: params.task_id ?? null,
      started_at: startedAt.current.toISOString(),
      ended_at: endedAt.toISOString(),
      duration_s: durationS,
      kind: 'focus',
      ambience: preset.id,
    });
  };

  const onStart = () => {
    startedAt.current = new Date();
    setRemaining(duration * 60);
    setPhase('running');
  };

  const onStop = () => {
    clearInterval(timerRef.current!);
    void saveTimeEntry();
    router.back();
  };

  const mm = Math.floor(remaining / 60).toString().padStart(2, '0');
  const ss = (remaining % 60).toString().padStart(2, '0');

  // Ember color intensity: interpolate accent opacity as time progresses.
  const timerColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [palette.accent + '80', palette.accent],
  });

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      {/* YouTube embed — hidden during setup */}
      {phase === 'running' && preset.videoId && (
        <View style={{ height: 0, overflow: 'hidden' }}>
          <WebView
            source={{ uri: `https://www.youtube-nocookie.com/embed/${preset.videoId}?autoplay=1&controls=0&loop=1&playlist=${preset.videoId}` }}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            style={{ width: 0, height: 0 }}
          />
        </View>
      )}

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xxl }}>

        {/* --- DONE state --- */}
        {phase === 'done' ? (
          <View style={{ alignItems: 'center', gap: spacing.xl }}>
            <Text style={{ fontSize: 64 }}>🌟</Text>
            <Text style={[fonts.title, { color: palette.text }]}>Beau boulot.</Text>
            <Text style={[fonts.body, { color: palette.textSecondary }]}>Une petite victoire.</Text>
            <Pressable
              onPress={() => router.back()}
              style={{ marginTop: spacing.lg, padding: spacing.lg, borderRadius: radius.pill, backgroundColor: palette.accent }}
            >
              <Text style={[fonts.headline, { color: palette.background }]}>Retour</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Circular timer */}
            <View style={{ alignItems: 'center', justifyContent: 'center', width: 200, height: 200 }}>
              <Animated.View
                style={{
                  position: 'absolute',
                  width: 200,
                  height: 200,
                  borderRadius: 100,
                  borderWidth: 6,
                  borderColor: timerColor,
                }}
              />
              <View style={{ alignItems: 'center' }}>
                <Text style={[fonts.largeTitle, { color: palette.text, fontSize: 48, fontVariant: ['tabular-nums'] }]}>
                  {mm}:{ss}
                </Text>
                {phase === 'running' && (
                  <Text style={[fonts.caption, { color: palette.textMuted }]}>
                    {preset.emoji} {preset.label}
                  </Text>
                )}
              </View>
            </View>

            {/* Duration picker (setup only) */}
            {phase === 'setup' && (
              <View style={{ gap: spacing.lg, alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                  {PRESET_DURATIONS.map((d) => (
                    <Pressable
                      key={d}
                      onPress={() => { setDuration(d); setRemaining(d * 60); }}
                      style={{
                        paddingHorizontal: spacing.xl,
                        paddingVertical: spacing.md,
                        borderRadius: radius.pill,
                        borderWidth: 1.5,
                        borderColor: duration === d ? palette.accent : palette.outline,
                        backgroundColor: duration === d ? palette.accent + '20' : 'transparent',
                      }}
                    >
                      <Text style={[fonts.headline, { color: duration === d ? palette.accent : palette.textSecondary }]}>
                        {d} min
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Ambience picker */}
                <FlatList
                  horizontal
                  data={AMBIENCE_PRESETS}
                  keyExtractor={(p) => p.id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.xl }}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => setPreset(item)}
                      style={{
                        padding: spacing.md,
                        borderRadius: radius.card,
                        borderWidth: 1.5,
                        borderColor: preset.id === item.id ? palette.accent : palette.outline,
                        backgroundColor: preset.id === item.id ? palette.surfaceElevated : palette.surface,
                        alignItems: 'center',
                        width: 96,
                        gap: 4,
                      }}
                    >
                      <Text style={{ fontSize: 24 }}>{item.emoji}</Text>
                      <Text style={[fonts.caption, { color: palette.text, textAlign: 'center' }]} numberOfLines={2}>
                        {item.label}
                      </Text>
                    </Pressable>
                  )}
                />

                <Pressable
                  onPress={onStart}
                  style={{
                    paddingHorizontal: spacing.xxxl,
                    paddingVertical: spacing.lg,
                    borderRadius: radius.pill,
                    backgroundColor: palette.accent,
                  }}
                >
                  <Text style={[fonts.title3, { color: palette.background }]}>Démarrer</Text>
                </Pressable>
              </View>
            )}

            {/* Running controls */}
            {phase === 'running' && (
              <Pressable onPress={onStop} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Ionicons name="stop-circle-outline" size={22} color={palette.textMuted} />
                <Text style={[fonts.callout, { color: palette.textMuted }]}>Arrêter</Text>
              </Pressable>
            )}
          </>
        )}
      </View>
    </View>
  );
}

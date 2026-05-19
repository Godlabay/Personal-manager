import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/design/theme';
import { KarmaBadge } from '@/design/components/KarmaBadge';
import { getKarma, type KarmaState } from '@/core/karma/karma';
import {
  dailyActivity,
  energyBreakdown,
  completionRate,
  type DayBucket,
  type EnergyBreakdown,
  type CompletionRate,
} from '@/core/insights/insights';
import { totalsByProject } from '@/core/models/timeEntries';

/**
 * Insights = mirror, not a judgment. Layout: karma header, last-14-days
 * completion bars, focus time by project, open-task energy distribution.
 *
 * We draw bars with plain Views — no charting lib. Phase 3 priority was
 * visibility, not fidelity; we can swap in victory-native later.
 */
export default function InsightsScreen() {
  const { palette, spacing, fonts, radius } = useTheme();
  const router = useRouter();
  const [karma, setKarma] = useState<KarmaState | null>(null);
  const [activity, setActivity] = useState<DayBucket[]>([]);
  const [rate, setRate] = useState<CompletionRate | null>(null);
  const [energy, setEnergy] = useState<EnergyBreakdown | null>(null);
  const [projects, setProjects] = useState<Array<{ project_id: string | null; project_name: string | null; seconds: number }>>([]);

  const load = useCallback(async () => {
    try {
      const [k, a, r, e, p] = await Promise.all([
        getKarma(),
        dailyActivity(14),
        completionRate(7),
        energyBreakdown(),
        totalsByProject(30),
      ]);
      setKarma(k);
      setActivity(a);
      setRate(r);
      setEnergy(e);
      setProjects(p);
    } catch {
      // Offline / blip — leave current state.
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const maxBar = Math.max(1, ...activity.map((d) => d.completed));

  const card = {
    backgroundColor: palette.surface,
    borderRadius: radius.card,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={palette.accent} />
        </Pressable>
        <Text style={[fonts.title, { color: palette.text, flex: 1 }]}>Insights</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
        {/* Karma summary */}
        {karma ? (
          <View style={[card, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <View style={{ flex: 1 }}>
              <Text style={[fonts.headline, { color: palette.text }]}>Ton feu</Text>
              <Text style={[fonts.footnote, { color: palette.textMuted, marginTop: 2 }]}>
                Série actuelle · meilleure : {karma.longest_streak}
              </Text>
            </View>
            <KarmaBadge karma={karma.karma} currentStreak={karma.current_streak} longestStreak={karma.longest_streak} />
          </View>
        ) : null}

        {/* Completion rate */}
        {rate ? (
          <View style={card}>
            <Text style={[fonts.headline, { color: palette.text }]}>7 derniers jours</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginTop: spacing.xs }}>
              <Text style={[fonts.largeTitle, { color: palette.accent, fontSize: 40 }]}>
                {rate.completedLast7}
              </Text>
              <Text style={[fonts.callout, { color: palette.textMuted }]}>
                faites / {rate.createdLast7} ajoutées
              </Text>
            </View>
            <Text style={[fonts.footnote, { color: palette.textSecondary, marginTop: spacing.xs }]}>
              {describeRate(rate.rate)}
            </Text>
          </View>
        ) : null}

        {/* Daily bars */}
        <View style={card}>
          <Text style={[fonts.headline, { color: palette.text, marginBottom: spacing.md }]}>14 derniers jours</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 120 }}>
            {activity.map((d) => {
              const h = (d.completed / maxBar) * 100;
              return (
                <View key={d.day} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  <View
                    style={{
                      height: `${Math.max(2, h)}%`,
                      width: '100%',
                      backgroundColor: d.completed > 0 ? palette.accent : palette.outline,
                      borderRadius: 4,
                      minHeight: 2,
                    }}
                  />
                </View>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs }}>
            <Text style={[fonts.caption, { color: palette.textMuted }]}>
              {formatShortDay(activity[0]?.day)}
            </Text>
            <Text style={[fonts.caption, { color: palette.textMuted }]}>
              {formatShortDay(activity[activity.length - 1]?.day)}
            </Text>
          </View>
        </View>

        {/* Time by project */}
        {projects.length > 0 ? (
          <View style={card}>
            <Text style={[fonts.headline, { color: palette.text, marginBottom: spacing.md }]}>Focus · 30 derniers jours</Text>
            {projects.slice(0, 8).map((p) => {
              const max = projects[0]?.seconds || 1;
              const w = Math.max(4, Math.round((p.seconds / max) * 100));
              return (
                <View key={(p.project_id ?? 'inbox') + p.seconds} style={{ marginBottom: spacing.sm }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={[fonts.callout, { color: palette.text }]}>{p.project_name ?? 'Inbox'}</Text>
                    <Text style={[fonts.footnote, { color: palette.textMuted }]}>{formatDuration(p.seconds)}</Text>
                  </View>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: palette.surfaceElevated }}>
                    <View style={{ height: 6, borderRadius: 3, width: `${w}%`, backgroundColor: palette.accentSoft }} />
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Energy distribution — open tasks only */}
        {energy ? (
          <View style={card}>
            <Text style={[fonts.headline, { color: palette.text, marginBottom: spacing.md }]}>Énergie disponible</Text>
            {(['low', 'medium', 'high', 'unset'] as const).map((level) => {
              const count = energy[level];
              const total = energy.low + energy.medium + energy.high + energy.unset || 1;
              const w = Math.max(4, Math.round((count / total) * 100));
              const color = level === 'high' ? palette.accent
                : level === 'medium' ? palette.accentSoft
                : level === 'low' ? palette.success
                : palette.outline;
              const label = level === 'unset' ? 'sans niveau' : level === 'low' ? 'basse' : level === 'medium' ? 'moyenne' : 'haute';
              return (
                <View key={level} style={{ marginBottom: spacing.sm }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={[fonts.callout, { color: palette.text }]}>{label}</Text>
                    <Text style={[fonts.footnote, { color: palette.textMuted }]}>{count}</Text>
                  </View>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: palette.surfaceElevated }}>
                    <View style={{ height: 6, borderRadius: 3, width: `${w}%`, backgroundColor: color }} />
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function describeRate(r: number): string {
  if (r >= 0.8) return 'Rythme solide.';
  if (r >= 0.5) return 'Bon momentum.';
  if (r >= 0.25) return 'Quelques victoires.';
  return 'Petit feu qui démarre.';
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h${String(rem).padStart(2, '0')}`;
}

function formatShortDay(key?: string): string {
  if (!key) return '';
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

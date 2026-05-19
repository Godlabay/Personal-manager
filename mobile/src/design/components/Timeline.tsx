import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../theme';
import { PriorityFlag } from './PriorityFlag';
import type { Task } from '@/core/models/types';

/**
 * Gantt-lite — horizontal timeline of tasks over the next N days.
 *  - One row per task (only ones with due_at).
 *  - Column per day; a marker sits in the column matching task.due_at.
 *  - Tasks beyond the window shown as "→" indicator at the right edge.
 *
 * No dependency lines yet (Phase 4-ish). The goal here is the "at-a-glance"
 * read: what's my week look like, not the classical PM Gantt with bars and
 * critical paths.
 */

interface Props {
  tasks: Task[];
  /** Window size in days (default 14). */
  days?: number;
  onTaskPress?: (task: Task) => void;
}

const COLUMN_W = 44;

export function Timeline({ tasks, days = 14, onTaskPress }: Props) {
  const { palette, spacing, fonts, radius } = useTheme();

  const { range, withDue } = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const r: Date[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      r.push(d);
    }
    const wd = tasks.filter((t) => !!t.due_at);
    wd.sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime());
    return { range: r, withDue: wd };
  }, [tasks, days]);

  if (withDue.length === 0) {
    return (
      <View style={{ padding: spacing.xxl, alignItems: 'center' }}>
        <Text style={[fonts.callout, { color: palette.textMuted }]}>Aucune tâche avec date sur {days} jours.</Text>
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ flexDirection: 'row' }}>
        {/* Left gutter: task titles */}
        <View style={{ width: 160, borderRightWidth: 1, borderRightColor: palette.outline }}>
          <View style={{ height: 32, justifyContent: 'center', paddingHorizontal: spacing.sm, borderBottomWidth: 1, borderBottomColor: palette.outline }}>
            <Text style={[fonts.caption, { color: palette.textMuted }]}>Tâche</Text>
          </View>
          {withDue.map((task) => (
            <Pressable
              key={task.id}
              onPress={() => onTaskPress?.(task)}
              style={{ height: 40, justifyContent: 'center', paddingHorizontal: spacing.sm, borderBottomWidth: 1, borderBottomColor: palette.outline }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {task.priority > 1 ? <PriorityFlag priority={task.priority} /> : null}
                <Text
                  style={[fonts.footnote, {
                    color: task.status === 'done' ? palette.textMuted : palette.text,
                    textDecorationLine: task.status === 'done' ? 'line-through' : 'none',
                    flex: 1,
                  }]}
                  numberOfLines={1}
                >
                  {task.title}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Right: day columns */}
        <View>
          {/* Header row: days */}
          <View style={{ flexDirection: 'row', height: 32, borderBottomWidth: 1, borderBottomColor: palette.outline }}>
            {range.map((d, i) => (
              <View
                key={i}
                style={{
                  width: COLUMN_W,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isToday(d) ? palette.surfaceElevated : 'transparent',
                }}
              >
                <Text style={[fonts.caption, { color: palette.textMuted, fontWeight: '600' }]}>
                  {d.toLocaleDateString(undefined, { weekday: 'short' })[0].toUpperCase()}
                </Text>
                <Text style={[fonts.caption, { color: isToday(d) ? palette.accent : palette.textSecondary }]}>
                  {d.getDate()}
                </Text>
              </View>
            ))}
          </View>

          {/* Task rows */}
          {withDue.map((task) => (
            <View key={task.id} style={{ flexDirection: 'row', height: 40, borderBottomWidth: 1, borderBottomColor: palette.outline }}>
              {range.map((d, i) => {
                const hit = sameDay(d, new Date(task.due_at!));
                const inPast = !hit && d.getTime() < new Date(task.due_at!).getTime() && new Date(task.due_at!).getTime() <= range[range.length - 1].getTime();
                return (
                  <View key={i} style={{ width: COLUMN_W, alignItems: 'center', justifyContent: 'center', backgroundColor: isToday(d) ? palette.surfaceElevated : 'transparent' }}>
                    {hit ? (
                      <View
                        style={{
                          width: 28,
                          height: 20,
                          borderRadius: 6,
                          backgroundColor: task.status === 'done' ? palette.success : priorityColor(task.priority, palette),
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        {task.status === 'done' ? (
                          <Text style={{ color: palette.background, fontSize: 11, fontWeight: '700' }}>✓</Text>
                        ) : null}
                      </View>
                    ) : inPast ? (
                      <View style={{ height: 2, width: COLUMN_W, backgroundColor: palette.outline }} />
                    ) : null}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isToday(d: Date): boolean {
  return sameDay(d, new Date());
}

function priorityColor(p: number, palette: { accent: string; accentSoft: string; warning: string; danger: string }): string {
  if (p >= 4) return palette.danger;
  if (p === 3) return palette.warning;
  if (p === 2) return palette.accentSoft;
  return palette.accent;
}

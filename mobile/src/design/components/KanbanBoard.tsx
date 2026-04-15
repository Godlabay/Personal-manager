import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../theme';
import { PriorityFlag } from './PriorityFlag';
import type { Task } from '@/core/models/types';
import { t } from '@/core/i18n/strings';

/**
 * Horizontal-scrolling Kanban board.
 *  - Four canonical columns: todo / doing / done / blocked.
 *    (Users who want custom column names can override via project.kanban_columns
 *     later; for Phase 2 we keep it fixed.)
 *  - Tap a card → host screen decides (open detail).
 *  - Long-press a card → host shows a "move to column" sheet.
 *
 * No drag-and-drop yet: the dependency (react-native-draggable-flatlist + gesture-handler
 * choreography) adds significant complexity for a Phase 2 feature. Long-press
 * move-to-column is the accessible shortcut in the meantime.
 */

export const KANBAN_COLUMNS = ['todo', 'doing', 'done', 'blocked'] as const;
export type KanbanColumn = typeof KANBAN_COLUMNS[number];

function columnLabel(c: KanbanColumn): string {
  return t(`col_${c}`);
}

/** Treats status=done as the "done" column regardless of kanban_column value. */
export function resolveColumn(task: Task): KanbanColumn {
  if (task.status === 'done') return 'done';
  const c = (task.kanban_column as KanbanColumn | null) ?? 'todo';
  return KANBAN_COLUMNS.includes(c) ? c : 'todo';
}

interface Props {
  tasks: Task[];
  onTaskPress?: (task: Task) => void;
  onTaskLongPress?: (task: Task) => void;
}

export function KanbanBoard({ tasks, onTaskPress, onTaskLongPress }: Props) {
  const { palette, spacing, fonts, radius } = useTheme();

  const grouped = useMemo(() => {
    const g: Record<KanbanColumn, Task[]> = { todo: [], doing: [], done: [], blocked: [] };
    for (const task of tasks) g[resolveColumn(task)].push(task);
    return g;
  }, [tasks]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md }}
    >
      {KANBAN_COLUMNS.map((col) => {
        const items = grouped[col];
        return (
          <View
            key={col}
            style={{
              width: 260,
              backgroundColor: palette.surface,
              borderRadius: radius.card,
              padding: spacing.md,
              gap: spacing.sm,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xs, marginBottom: spacing.xs }}>
              <Text style={[fonts.footnote, { color: palette.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                {columnLabel(col)}
              </Text>
              <Text style={[fonts.footnote, { color: palette.textMuted }]}>{items.length}</Text>
            </View>

            {items.length === 0 ? (
              <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
                <Text style={[fonts.caption, { color: palette.textMuted }]}>—</Text>
              </View>
            ) : (
              items.map((task) => (
                <Pressable
                  key={task.id}
                  onPress={() => onTaskPress?.(task)}
                  onLongPress={() => onTaskLongPress?.(task)}
                  style={({ pressed }) => ({
                    backgroundColor: palette.surfaceElevated,
                    padding: spacing.md,
                    borderRadius: radius.chip,
                    opacity: pressed ? 0.75 : 1,
                    gap: spacing.xs,
                  })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                    {task.priority > 1 ? <PriorityFlag priority={task.priority} /> : null}
                    <Text
                      style={[fonts.callout, {
                        color: task.status === 'done' ? palette.textMuted : palette.text,
                        textDecorationLine: task.status === 'done' ? 'line-through' : 'none',
                        flexShrink: 1,
                      }]}
                      numberOfLines={3}
                    >
                      {task.title}
                    </Text>
                  </View>
                  {task.due_at ? (
                    <Text style={[fonts.caption, { color: palette.textMuted }]}>
                      {new Date(task.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </Text>
                  ) : null}
                </Pressable>
              ))
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

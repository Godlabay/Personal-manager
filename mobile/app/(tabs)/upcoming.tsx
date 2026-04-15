import { useCallback, useEffect, useState } from 'react';
import { SectionList, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/design/theme';
import { TaskRow } from '@/design/components/TaskRow';
import { EmptyState } from '@/design/components/EmptyState';
import { listUpcoming, completeTask } from '@/core/models/tasks';
import type { Task } from '@/core/models/types';
import { t } from '@/core/i18n/strings';

interface Section {
  title: string;
  data: Task[];
}

function groupByDay(tasks: Task[]): Section[] {
  const buckets = new Map<string, Task[]>();
  for (const task of tasks) {
    if (!task.due_at) continue;
    const d = new Date(task.due_at);
    const key = d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
    const arr = buckets.get(key) ?? [];
    arr.push(task);
    buckets.set(key, arr);
  }
  return Array.from(buckets.entries()).map(([title, data]) => ({ title, data }));
}

export default function UpcomingScreen() {
  const { palette, spacing, fonts } = useTheme();
  const [sections, setSections] = useState<Section[]>([]);

  const load = useCallback(async () => {
    const tasks = await listUpcoming(21);
    setSections(groupByDay(tasks));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { load(); }, [load]);

  const onToggle = async (task: Task) => {
    await completeTask(task.id);
    load();
  };

  return (
    <SectionList
      style={{ backgroundColor: palette.background }}
      sections={sections}
      keyExtractor={(item) => item.id}
      renderSectionHeader={({ section }) => (
        <View style={{ backgroundColor: palette.background, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xs }}>
          <Text style={[fonts.footnote, { color: palette.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
            {section.title}
          </Text>
        </View>
      )}
      renderItem={({ item }) => (
        <TaskRow
          title={item.title}
          priority={item.priority}
          completed={item.status === 'done'}
          onToggle={() => onToggle(item)}
        />
      )}
      ListEmptyComponent={
        <EmptyState
          icon="🌄"
          title={t('empty_today_title')}
          message={t('empty_today_msg')}
        />
      }
      contentContainerStyle={sections.length === 0 ? { flex: 1 } : { paddingBottom: spacing.xxl }}
    />
  );
}

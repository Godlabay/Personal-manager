import { useCallback, useEffect, useState } from 'react';
import { Pressable, SectionList, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/design/theme';
import { TaskRow } from '@/design/components/TaskRow';
import { EmptyState } from '@/design/components/EmptyState';
import { Timeline } from '@/design/components/Timeline';
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
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<'list' | 'timeline'>('list');

  const load = useCallback(async () => {
    const next = await listUpcoming(21);
    setTasks(next);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { load(); }, [load]);

  const onToggle = async (task: Task) => {
    await completeTask(task.id);
    load();
  };

  const sections = groupByDay(tasks);

  const header = (
    <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={[fonts.title, { color: palette.text }]}>{t('tab_upcoming')}</Text>
      <Pressable onPress={() => setView((v) => (v === 'list' ? 'timeline' : 'list'))} hitSlop={10}>
        <Ionicons name={view === 'timeline' ? 'list' : 'calendar'} size={22} color={palette.accent} />
      </Pressable>
    </View>
  );

  if (view === 'timeline') {
    return (
      <View style={{ flex: 1, backgroundColor: palette.background }}>
        {header}
        <Timeline tasks={tasks} days={14} onTaskPress={(task) => router.push(`/task/${task.id}`)} />
      </View>
    );
  }

  return (
    <SectionList
      style={{ backgroundColor: palette.background }}
      sections={sections}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={header}
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
          onPress={() => router.push(`/task/${item.id}`)}
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

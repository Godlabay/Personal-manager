import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { useTheme } from '@/design/theme';
import { TaskRow } from '@/design/components/TaskRow';
import { EmptyState } from '@/design/components/EmptyState';
import { WarmButton } from '@/design/components/WarmButton';
import { listToday, completeTask, reopenTask } from '@/core/models/tasks';
import { supabase } from '@/core/supabase/client';
import type { Task } from '@/core/models/types';
import { t } from '@/core/i18n/strings';

export default function TodayScreen() {
  const { palette, spacing } = useTheme();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const next = await listToday();
      setTasks(next);
    } catch {
      // Network blips — keep current list, let user retry.
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Realtime — reload on any task change for this user.
  useEffect(() => {
    const ch = supabase
      .channel('today-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onToggle = async (task: Task) => {
    // Optimistic flip.
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: task.status === 'done' ? 'open' : 'done' } : t)));
    try {
      if (task.status === 'done') await reopenTask(task.id);
      else await completeTask(task.id);
    } catch {
      load();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <FlatList
        data={tasks}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <TaskRow
            title={item.title}
            priority={item.priority}
            completed={item.status === 'done'}
            meta={item.due_at ? formatMeta(item.due_at, item.due_has_time) : undefined}
            onToggle={() => onToggle(item)}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} />}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: palette.outline, marginLeft: spacing.xl + 24 }} />}
        ListEmptyComponent={<EmptyState icon="☀️" title={t('empty_today_title')} message={t('empty_today_msg')} />}
        contentContainerStyle={tasks.length === 0 ? { flex: 1 } : undefined}
      />

      <Pressable
        onPress={() => router.push('/quick-add')}
        style={{
          position: 'absolute',
          right: spacing.xl,
          bottom: spacing.xl,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: palette.accent,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <Ionicons name="add" size={30} color={palette.background} />
      </Pressable>
    </View>
  );
}

function formatMeta(iso: string, hasTime: boolean): string {
  const d = new Date(iso);
  if (hasTime) {
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}`;
  }
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

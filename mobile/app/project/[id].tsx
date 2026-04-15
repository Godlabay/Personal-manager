import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/design/theme';
import { TaskRow } from '@/design/components/TaskRow';
import { EmptyState } from '@/design/components/EmptyState';
import { supabase } from '@/core/supabase/client';
import { listByProject, completeTask, reopenTask } from '@/core/models/tasks';
import type { Task, Project } from '@/core/models/types';
import { useRouter as useNav } from 'expo-router';

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { palette, spacing, fonts, radius } = useTheme();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    const [{ data: proj }, taskList] = await Promise.all([
      supabase.from('projects').select('*').eq('id', id).single(),
      listByProject(id),
    ]);
    if (proj) setProject(proj as Project);
    setTasks(taskList);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Realtime updates for this project's tasks.
  useEffect(() => {
    const ch = supabase
      .channel(`project-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, load]);

  const onToggle = async (task: Task) => {
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: task.status === 'done' ? 'open' : 'done' } : t));
    try {
      if (task.status === 'done') await reopenTask(task.id);
      else await completeTask(task.id);
    } catch { load(); }
  };

  const open = tasks.filter((t) => t.status === 'open');
  const done = tasks.filter((t) => t.status === 'done');

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.lg,
        paddingTop: spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: palette.outline,
      }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={palette.accent} />
        </Pressable>
        {project?.color && (
          <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: project.color }} />
        )}
        <Text style={[fonts.title2, { color: palette.text, flex: 1 }]} numberOfLines={1}>
          {project?.name ?? '…'}
        </Text>
        <Pressable onPress={() => router.push({ pathname: '/quick-add', params: { projectId: id } } as never)} hitSlop={8}>
          <Ionicons name="add" size={26} color={palette.accent} />
        </Pressable>
      </View>

      <FlatList
        data={open}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <TaskRow
            title={item.title}
            priority={item.priority}
            completed={false}
            meta={item.due_at ? new Date(item.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : undefined}
            onToggle={() => onToggle(item)}
            onPress={() => router.push({ pathname: '/quick-add', params: { taskId: item.id } } as never)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: palette.outline, marginLeft: spacing.xl + 24 }} />}
        ListHeaderComponent={
          open.length === 0 ? null : (
            <Text style={[fonts.footnote, { color: palette.textMuted, marginHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
              {open.length} tâche{open.length > 1 ? 's' : ''}
            </Text>
          )
        }
        ListEmptyComponent={
          <EmptyState
            icon="✅"
            title="Tout est fait"
            message="Ajoute une tâche avec le + en haut à droite."
          />
        }
        ListFooterComponent={
          done.length === 0 ? null : (
            <View>
              <Text style={[fonts.footnote, { color: palette.textMuted, marginHorizontal: spacing.lg, marginTop: spacing.xxl, marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                Complétées ({done.length})
              </Text>
              {done.map((item) => (
                <TaskRow
                  key={item.id}
                  title={item.title}
                  priority={item.priority}
                  completed
                  onToggle={() => onToggle(item)}
                />
              ))}
            </View>
          )
        }
        contentContainerStyle={open.length === 0 ? { flex: 1 } : { paddingBottom: spacing.xxxl }}
      />
    </View>
  );
}

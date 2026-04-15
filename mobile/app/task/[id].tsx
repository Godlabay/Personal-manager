import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/design/theme';
import { PriorityFlag } from '@/design/components/PriorityFlag';
import { WarmButton } from '@/design/components/WarmButton';
import { Attachments } from '@/design/components/Attachments';
import { getTask, completeTask, reopenTask, deleteTask } from '@/core/models/tasks';
import {
  getPredecessors,
  getSuccessors,
  addDependency,
  removeDependency,
} from '@/core/models/dependencies';
import { searchTasks } from '@/core/models/search';
import { listEntriesForTask, totalSecondsForTask } from '@/core/models/timeEntries';
import type { Task, TimeEntry } from '@/core/models/types';
import { humanizeRRule } from '@/core/recurrence/rrule';

/**
 * Task detail — the canonical place to edit a single task.
 *  - Shows title, due, recurrence (humanised), priority.
 *  - Lists predecessors / successors with add/remove.
 *  - Shows total focus time + last 5 sessions.
 *  - Start Focus button routes to /focus?task_id=...
 */
export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { palette, spacing, fonts, radius } = useTheme();
  const [task, setTask] = useState<Task | null>(null);
  const [predecessors, setPredecessors] = useState<Task[]>([]);
  const [successors, setSuccessors] = useState<Task[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [totalS, setTotalS] = useState(0);

  const load = useCallback(async () => {
    if (!id) return;
    const [t, pre, suc, ent, tot] = await Promise.all([
      getTask(id),
      getPredecessors(id),
      getSuccessors(id),
      listEntriesForTask(id),
      totalSecondsForTask(id),
    ]);
    setTask(t);
    setPredecessors(pre);
    setSuccessors(suc);
    setEntries(ent);
    setTotalS(tot);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const isBlocked = predecessors.some((p) => p.status === 'open');

  const onToggle = async () => {
    if (!task) return;
    if (task.status === 'done') await reopenTask(task.id);
    else await completeTask(task.id);
    load();
  };

  const onAddPredecessor = async () => {
    // Quick one-tap picker: show recent open tasks as Alert buttons.
    const recent = await searchTasks({ status: 'open', limit: 8 });
    const candidates = recent.filter((x) => x.id !== id && !predecessors.some((p) => p.id === x.id));
    if (candidates.length === 0) {
      Alert.alert('Aucune tâche disponible', 'Crée une tâche d\'abord ou marque-en comme ouverte.');
      return;
    }
    Alert.alert('Bloquée par…', 'Choisis la tâche qui doit finir avant.', [
      ...candidates.slice(0, 5).map((c) => ({
        text: c.title.slice(0, 40),
        onPress: async () => {
          try { await addDependency(c.id, id as string); load(); } catch (e) { Alert.alert('Oups', String(e)); }
        },
      })),
      { text: 'Annuler', style: 'cancel' as const },
    ]);
  };

  const onRemovePredecessor = async (predId: string) => {
    await removeDependency(predId, id as string);
    load();
  };

  const onDelete = () => {
    Alert.alert('Supprimer ?', 'Cette tâche disparaîtra.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        await deleteTask(id as string);
        router.back();
      } },
    ]);
  };

  const card = { backgroundColor: palette.surface, borderRadius: radius.card, marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.lg };

  if (!task) {
    return <View style={{ flex: 1, backgroundColor: palette.background }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={palette.accent} />
        </Pressable>
        <Text style={[fonts.title2, { color: palette.text, flex: 1 }]} numberOfLines={2}>{task.title}</Text>
        <Pressable onPress={onToggle} hitSlop={10}>
          <Ionicons
            name={task.status === 'done' ? 'checkmark-circle' : 'ellipse-outline'}
            size={28}
            color={task.status === 'done' ? palette.success : palette.textMuted}
          />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
        {/* Meta chips */}
        <View style={[card, { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }]}>
          {task.priority > 1 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <PriorityFlag priority={task.priority} />
              <Text style={[fonts.footnote, { color: palette.textSecondary }]}>P{task.priority}</Text>
            </View>
          ) : null}
          {task.due_at ? (
            <Text style={[fonts.footnote, { color: palette.textSecondary }]}>
              📅 {new Date(task.due_at).toLocaleDateString()}{task.due_has_time ? ` ${new Date(task.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
            </Text>
          ) : null}
          {task.recurrence_rrule ? (
            <Text style={[fonts.footnote, { color: palette.textSecondary }]}>
              🔁 {humanizeRRule(task.recurrence_rrule)}
            </Text>
          ) : null}
          {isBlocked ? (
            <Text style={[fonts.footnote, { color: palette.warning }]}>
              🔒 Bloquée par {predecessors.filter((p) => p.status === 'open').length} tâche(s)
            </Text>
          ) : null}
        </View>

        {task.description ? (
          <View style={card}>
            <Text style={[fonts.body, { color: palette.text }]}>{task.description}</Text>
          </View>
        ) : null}

        {/* Focus button */}
        <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.lg }}>
          <WarmButton
            title={`Focus · total ${formatDuration(totalS)}`}
            onPress={() => router.push({ pathname: '/focus', params: { task_id: id } } as never)}
            fullWidth
          />
        </View>

        {/* Predecessors */}
        <View style={card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
            <Text style={[fonts.headline, { color: palette.text }]}>Bloquée par</Text>
            <Pressable onPress={onAddPredecessor} hitSlop={8}>
              <Ionicons name="add-circle" size={22} color={palette.accent} />
            </Pressable>
          </View>
          {predecessors.length === 0 ? (
            <Text style={[fonts.footnote, { color: palette.textMuted }]}>Rien ne la bloque.</Text>
          ) : predecessors.map((p) => (
            <Pressable
              key={p.id}
              onLongPress={() => onRemovePredecessor(p.id)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs }}
            >
              <Ionicons
                name={p.status === 'done' ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={p.status === 'done' ? palette.success : palette.warning}
              />
              <Text style={[fonts.callout, { flex: 1, color: palette.text, textDecorationLine: p.status === 'done' ? 'line-through' : 'none' }]} numberOfLines={1}>
                {p.title}
              </Text>
            </Pressable>
          ))}
          {predecessors.length > 0 ? (
            <Text style={[fonts.caption, { color: palette.textMuted, marginTop: spacing.xs }]}>Long-press pour retirer un lien.</Text>
          ) : null}
        </View>

        {/* Successors */}
        {successors.length > 0 ? (
          <View style={card}>
            <Text style={[fonts.headline, { color: palette.text, marginBottom: spacing.xs }]}>Débloque</Text>
            {successors.map((s) => (
              <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs }}>
                <Ionicons name="arrow-forward" size={14} color={palette.textMuted} />
                <Text style={[fonts.callout, { flex: 1, color: palette.text }]} numberOfLines={1}>{s.title}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Attachments */}
        <View style={card}>
          <Attachments taskId={id as string} />
        </View>

        {/* Recent focus sessions */}
        {entries.length > 0 ? (
          <View style={card}>
            <Text style={[fonts.headline, { color: palette.text, marginBottom: spacing.xs }]}>Dernières sessions</Text>
            {entries.slice(0, 5).map((e) => (
              <View key={e.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xxs }}>
                <Text style={[fonts.footnote, { color: palette.textSecondary }]}>
                  {new Date(e.started_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Text style={[fonts.footnote, { color: palette.textMuted }]}>
                  {formatDuration(e.duration_s ?? 0)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Destructive */}
        <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.xxl }}>
          <WarmButton title="Supprimer" onPress={onDelete} variant="ghost" fullWidth />
        </View>
      </ScrollView>
    </View>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h${String(rem).padStart(2, '0')}`;
}

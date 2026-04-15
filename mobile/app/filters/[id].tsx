import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/design/theme';
import { WarmButton } from '@/design/components/WarmButton';
import { TaskRow } from '@/design/components/TaskRow';
import { EmptyState } from '@/design/components/EmptyState';
import { listFilters, createFilter, updateFilter, type SavedFilter } from '@/core/filters/filters';
import { searchTasks, type SearchOptions } from '@/core/models/search';
import { completeTask, reopenTask } from '@/core/models/tasks';
import type { Task } from '@/core/models/types';
import { t } from '@/core/i18n/strings';

/**
 * Filter editor + live preview.
 *  - `/filters/new` → blank form
 *  - `/filters/<id>` → loaded from DB, live results below
 */
export default function FilterEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { palette, spacing, fonts, radius } = useTheme();
  const isNew = id === 'new';

  const [name, setName] = useState('');
  const [query, setQuery] = useState<SearchOptions>({});
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const all = await listFilters();
      const f = all.find((x) => x.id === id);
      if (f) {
        setName(f.name);
        setQuery(f.query ?? {});
      }
    })();
  }, [id, isNew]);

  // Live preview of current query — rerun whenever it changes.
  useEffect(() => {
    setLoading(true);
    const handle = setTimeout(async () => {
      try { setTasks(await searchTasks(query)); } catch { setTasks([]); }
      finally { setLoading(false); }
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  const onSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('filter_name'), 'Donne un nom à ton filtre.');
      return;
    }
    try {
      if (isNew) await createFilter(name.trim(), query);
      else await updateFilter(id as string, { name: name.trim(), query });
      router.back();
    } catch {
      Alert.alert(t('something_slipped'));
    }
  };

  const togglePriority = (p: 1 | 2 | 3 | 4) => {
    setQuery((q) => ({ ...q, priority: q.priority === p ? undefined : p }));
  };

  const count = tasks.length;

  const onToggle = async (task: Task) => {
    setTasks((prev) => prev.map((x) => (x.id === task.id ? { ...x, status: task.status === 'done' ? 'open' : 'done' } : x)));
    try {
      if (task.status === 'done') await reopenTask(task.id);
      else await completeTask(task.id);
    } catch { /* next run refreshes */ }
  };

  const card = { backgroundColor: palette.surface, borderRadius: radius.card, marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.lg };

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.md }}>
          <Text style={[fonts.title, { color: palette.text }]}>{isNew ? t('filter_new') : name || '…'}</Text>
        </View>

        <View style={card}>
          <Text style={[fonts.footnote, { color: palette.textMuted, marginBottom: spacing.xs }]}>{t('filter_name')}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ex: P4 sans date"
            placeholderTextColor={palette.textMuted}
            style={{ color: palette.text, fontSize: 16, paddingVertical: spacing.xs }}
          />
        </View>

        <View style={card}>
          <Text style={[fonts.footnote, { color: palette.textMuted, marginBottom: spacing.xs }]}>{t('filter_query')}</Text>
          <TextInput
            value={query.query ?? ''}
            onChangeText={(v) => setQuery((q) => ({ ...q, query: v || undefined }))}
            placeholder="mot clé…"
            placeholderTextColor={palette.textMuted}
            autoCapitalize="none"
            style={{ color: palette.text, fontSize: 16, paddingVertical: spacing.xs }}
          />
        </View>

        <View style={card}>
          <Text style={[fonts.footnote, { color: palette.textMuted, marginBottom: spacing.xs }]}>{t('filter_priority')}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
            {[1, 2, 3, 4].map((p) => {
              const selected = query.priority === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => togglePriority(p as 1 | 2 | 3 | 4)}
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs,
                    borderRadius: radius.pill,
                    backgroundColor: selected ? palette.accent : palette.surfaceElevated,
                  }}
                >
                  <Text style={{ color: selected ? palette.background : palette.text, fontWeight: '600' }}>P{p}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[card, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
          <Text style={[fonts.body, { color: palette.text }]}>{t('filter_with_due')}</Text>
          <Switch
            value={!!query.withDue}
            onValueChange={(v) => setQuery((q) => ({ ...q, withDue: v }))}
            trackColor={{ false: palette.outline, true: palette.accentSoft }}
            thumbColor={query.withDue ? palette.accent : palette.surfaceElevated}
          />
        </View>

        <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.lg }}>
          <WarmButton title={t('save')} onPress={onSave} fullWidth />
        </View>

        <Text style={[fonts.footnote, { color: palette.textMuted, marginHorizontal: spacing.lg, marginTop: spacing.xl }]}>
          {loading ? '…' : `${count} résultat${count > 1 ? 's' : ''}`}
        </Text>

        {tasks.length === 0 && !loading ? (
          <EmptyState icon="🫖" title={t('search_empty')} />
        ) : (
          <FlatList
            scrollEnabled={false}
            data={tasks.slice(0, 50)}
            keyExtractor={(x) => x.id}
            renderItem={({ item }) => (
              <TaskRow
                title={item.title}
                priority={item.priority}
                completed={item.status === 'done'}
                meta={item.due_at ? new Date(item.due_at).toLocaleDateString() : undefined}
                onToggle={() => onToggle(item)}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: palette.outline, marginLeft: spacing.xl + 24 }} />}
          />
        )}
      </ScrollView>
    </View>
  );
}

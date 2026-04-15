import { useEffect, useMemo, useState } from 'react';
import { FlatList, TextInput, View, Text, Pressable } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/design/theme';
import { TaskRow } from '@/design/components/TaskRow';
import { EmptyState } from '@/design/components/EmptyState';
import { searchTasks } from '@/core/models/search';
import { completeTask, reopenTask } from '@/core/models/tasks';
import type { Task } from '@/core/models/types';
import { t } from '@/core/i18n/strings';

/**
 * Search screen — text match on task.title + optional filters.
 * Debounced 250ms so each keystroke doesn't hammer Supabase.
 */
export default function SearchScreen() {
  const { palette, spacing, fonts, radius } = useTheme();
  const params = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(params.q ?? '');
  const [results, setResults] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounce — avoid a round trip on every keystroke.
  useEffect(() => {
    const handle = setTimeout(async () => {
      if (query.trim().length === 0) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const r = await searchTasks({ query });
        setResults(r);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  const onToggle = async (task: Task) => {
    setResults((prev) => prev.map((x) => (x.id === task.id ? { ...x, status: task.status === 'done' ? 'open' : 'done' } : x)));
    try {
      if (task.status === 'done') await reopenTask(task.id);
      else await completeTask(task.id);
    } catch {
      // let the next keystroke refresh
    }
  };

  const hint = useMemo(
    () => (query.trim().length === 0 ? t('search_hint') : null),
    [query],
  );

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <Stack.Screen options={{ title: t('tab_settings') /* unused */, headerShown: false }} />

      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.md, gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: palette.surface, borderRadius: radius.chip, paddingHorizontal: spacing.md }}>
          <Ionicons name="search" size={18} color={palette.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('search_placeholder')}
            placeholderTextColor={palette.textMuted}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            style={{ flex: 1, paddingVertical: spacing.md, color: palette.text, fontSize: 16 }}
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={palette.textMuted} />
            </Pressable>
          ) : null}
        </View>
        {hint ? <Text style={[fonts.footnote, { color: palette.textMuted }]}>{hint}</Text> : null}
      </View>

      <FlatList
        data={results}
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
        ListEmptyComponent={
          query.trim().length > 0 && !loading ? (
            <EmptyState icon="🔎" title={t('search_empty')} message="" />
          ) : null
        }
      />
    </View>
  );
}

import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/design/theme';
import { WarmButton } from '@/design/components/WarmButton';
import { EmptyState } from '@/design/components/EmptyState';
import { listFilters, deleteFilter, type SavedFilter } from '@/core/filters/filters';
import { t } from '@/core/i18n/strings';

/**
 * Saved filters list. Tap → opens the filter's results in the search screen
 * seeded with the saved query. Long-press → delete.
 */
export default function FiltersScreen() {
  const { palette, spacing, fonts, radius } = useTheme();
  const router = useRouter();
  const [filters, setFilters] = useState<SavedFilter[]>([]);

  const load = useCallback(async () => {
    try { setFilters(await listFilters()); } catch { /* offline; keep list */ }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onDelete = (f: SavedFilter) => {
    Alert.alert(f.name, 'Supprimer ce filtre ?', [
      { text: t('cancel'), style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          await deleteFilter(f.id);
          load();
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={[fonts.title, { color: palette.text }]}>{t('filters_title')}</Text>
        <Pressable onPress={() => router.push('/filters/new')} hitSlop={10}>
          <Ionicons name="add-circle" size={28} color={palette.accent} />
        </Pressable>
      </View>

      <FlatList
        data={filters}
        keyExtractor={(f) => f.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/filters/${item.id}`)}
            onLongPress={() => onDelete(item)}
            style={({ pressed }) => ({
              marginHorizontal: spacing.lg,
              marginVertical: spacing.xs,
              padding: spacing.lg,
              backgroundColor: palette.surface,
              borderRadius: radius.card,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Text style={[fonts.headline, { color: palette.text }]}>{item.name}</Text>
            <Text style={[fonts.footnote, { color: palette.textMuted, marginTop: spacing.xxs }]} numberOfLines={1}>
              {describe(item.query)}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="🧭"
            title={t('filters_empty')}
            action={<WarmButton title={t('filter_new')} onPress={() => router.push('/filters/new')} />}
          />
        }
        contentContainerStyle={filters.length === 0 ? { flex: 1 } : undefined}
      />
    </View>
  );
}

function describe(q: Record<string, unknown>): string {
  const bits: string[] = [];
  if (q.query) bits.push(`"${q.query}"`);
  if (q.priority) bits.push(`P${q.priority}`);
  if (q.status) bits.push(String(q.status));
  if (q.withDue) bits.push('avec date');
  return bits.join(' · ') || 'sans critère';
}

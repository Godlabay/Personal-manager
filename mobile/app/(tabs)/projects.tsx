import { useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/design/theme';
import { EmptyState } from '@/design/components/EmptyState';
import { listProjects } from '@/core/models/projects';
import type { Project } from '@/core/models/types';

export default function ProjectsScreen() {
  const { palette, spacing, fonts, radius } = useTheme();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);

  const load = useCallback(async () => {
    try {
      setProjects(await listProjects());
    } catch {
      // ignore
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <FlatList
      style={{ backgroundColor: palette.background }}
      data={projects}
      keyExtractor={(p) => p.id}
      contentContainerStyle={projects.length === 0 ? { flex: 1 } : { padding: spacing.lg, gap: spacing.md }}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push({ pathname: '/project/[id]', params: { id: item.id } } as never)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            padding: spacing.lg,
            backgroundColor: palette.surface,
            borderRadius: radius.card,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: item.color ?? palette.accent,
            }}
          />
          <Text style={[fonts.headline, { color: palette.text, flex: 1 }]}>{item.name}</Text>
          <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
        </Pressable>
      )}
      ListEmptyComponent={
        <EmptyState
          icon="🗂️"
          title="No projects yet"
          message="Projects help cluster tasks. Create one from the AI chat or here soon."
        />
      }
    />
  );
}

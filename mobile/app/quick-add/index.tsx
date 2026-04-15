import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/design/theme';
import { WarmButton } from '@/design/components/WarmButton';
import { Chip } from '@/design/components/Chip';
import { PriorityFlag } from '@/design/components/PriorityFlag';
import { parseQuickAdd } from '@/core/nlp/dateParser';
import { createTask } from '@/core/models/tasks';
import { t } from '@/core/i18n/strings';

const PRIORITY_LABELS = ['', 'P1', 'P2', 'P3', 'P4'];

export default function QuickAddScreen() {
  const { palette, spacing, fonts, radius } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ initialText?: string }>();
  const [input, setInput] = useState(params.initialText ?? '');
  const [saving, setSaving] = useState(false);
  const ref = useRef<TextInput>(null);

  const parsed = parseQuickAdd(input);

  useEffect(() => {
    // Auto-focus on mount with a tiny delay so the keyboard animates in.
    const t = setTimeout(() => ref.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  const onSave = async () => {
    if (!parsed.title.trim()) return;
    setSaving(true);
    try {
      await createTask({
        title: parsed.title.trim(),
        due_at: parsed.dueAt?.toISOString() ?? null,
        due_has_time: parsed.hasTime,
        priority: parsed.priority,
      });
      router.back();
    } catch {
      setSaving(false);
    }
  };

  const hasParsedDate = !!parsed.dueAt;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: palette.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Dimmed backdrop — tap to dismiss */}
      <Pressable
        style={{ flex: 1 }}
        onPress={() => router.back()}
      />

      <View
        style={{
          backgroundColor: palette.surface,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          padding: spacing.xl,
          gap: spacing.md,
        }}
      >
        <TextInput
          ref={ref}
          value={input}
          onChangeText={setInput}
          placeholder={t('quick_add_placeholder')}
          placeholderTextColor={palette.textMuted}
          style={[fonts.title3, { color: palette.text }]}
          multiline
          returnKeyType="done"
          blurOnSubmit
          onSubmitEditing={onSave}
        />

        {/* Parsed preview chips */}
        {(hasParsedDate || parsed.priority > 1 || parsed.labels.length > 0) && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {hasParsedDate && (
              <Chip
                label={formatDate(parsed.dueAt!, parsed.hasTime)}
                selected
                leading={<Text style={{ fontSize: 12 }}>📅</Text>}
              />
            )}
            {parsed.priority > 1 && (
              <Chip
                label={PRIORITY_LABELS[parsed.priority]}
                selected
                leading={<PriorityFlag priority={parsed.priority} size={8} />}
              />
            )}
            {parsed.labels.map((l) => (
              <Chip key={l} label={`#${l}`} selected />
            ))}
          </View>
        )}

        <Text style={[fonts.caption, { color: palette.textMuted }]}>{t('quick_add_hint')}</Text>

        <View style={{ flexDirection: 'row', gap: spacing.md, justifyContent: 'flex-end' }}>
          <WarmButton title={t('cancel')} variant="ghost" onPress={() => router.back()} />
          <WarmButton
            title={t('quick_add_save')}
            onPress={onSave}
            loading={saving}
            disabled={!parsed.title.trim()}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function formatDate(d: Date, hasTime: boolean): string {
  if (hasTime) {
    return d.toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/design/theme';
import { EmptyState } from '@/design/components/EmptyState';
import { WarmButton } from '@/design/components/WarmButton';
import { AgentRunner } from '@/core/ai/runner';
import { getCurrentProvider } from '@/core/ai/providerRegistry';
import { SYSTEM_PROMPT } from '@/core/ai/systemPrompt';
import { t } from '@/core/i18n/strings';

type UIMessage =
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'assistant'; text: string }
  | { id: string; kind: 'tool'; name: string; summary: string };

export default function AIChatScreen() {
  const { palette, spacing, fonts, radius } = useTheme();
  const router = useRouter();
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [hasProvider, setHasProvider] = useState<boolean | null>(null);
  const runnerRef = useRef<AgentRunner | null>(null);
  const listRef = useRef<FlatList<UIMessage>>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const provider = await getCurrentProvider();
      if (!alive) return;
      setHasProvider(!!provider);
      if (provider) {
        runnerRef.current = new AgentRunner({
          provider,
          systemPrompt: SYSTEM_PROMPT,
          cacheKey: 'pm-system-v1',
          onEvent: (e) => {
            if (e.type === 'tool_call') {
              setMessages((prev) => [
                ...prev,
                { id: `tool-${Date.now()}-${e.name}`, kind: 'tool', name: e.name, summary: `→ ${e.name}` },
              ]);
            }
          },
        });
      }
    })();
    return () => { alive = false; };
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || busy || !runnerRef.current) return;
    setInput('');
    setBusy(true);
    const userMsg: UIMessage = { id: `u-${Date.now()}`, kind: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    try {
      const reply = await runnerRef.current.run(text);
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, kind: 'assistant', text: reply || '…' },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, kind: 'assistant', text: msg }]);
    } finally {
      setBusy(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  if (hasProvider === false) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.background }}>
        <EmptyState
          icon="🔑"
          title={t('ai_setup_title')}
          message={t('ai_setup_msg')}
          action={<WarmButton title={t('ai_open_settings')} onPress={() => router.push('/(tabs)/settings')} />}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: palette.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        renderItem={({ item }) => {
          if (item.kind === 'tool') {
            return (
              <View style={{ alignSelf: 'center' }}>
                <Text style={[fonts.caption, { color: palette.textMuted, fontStyle: 'italic' }]}>
                  {item.summary}
                </Text>
              </View>
            );
          }
          const isUser = item.kind === 'user';
          return (
            <View
              style={{
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                backgroundColor: isUser ? palette.accent : palette.surface,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.lg,
                borderRadius: radius.card,
              }}
            >
              <Text style={[fonts.body, { color: isUser ? palette.background : palette.text }]}>
                {item.text}
              </Text>
            </View>
          );
        }}
      />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          padding: spacing.md,
          borderTopWidth: 1,
          borderTopColor: palette.outline,
          backgroundColor: palette.background,
        }}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={busy ? t('ai_thinking') : t('ai_input_placeholder')}
          placeholderTextColor={palette.textMuted}
          editable={!busy}
          style={{
            flex: 1,
            color: palette.text,
            backgroundColor: palette.surface,
            borderRadius: radius.card,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.lg,
            fontSize: 16,
          }}
          multiline
          onSubmitEditing={send}
        />
        <Pressable
          onPress={send}
          disabled={!input.trim() || busy}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: palette.accent,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: !input.trim() || busy ? 0.4 : pressed ? 0.8 : 1,
          })}
        >
          <Ionicons name="arrow-up" size={20} color={palette.background} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

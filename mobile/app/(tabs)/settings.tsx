import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme } from '@/design/theme';
import { WarmButton } from '@/design/components/WarmButton';
import { KarmaBadge } from '@/design/components/KarmaBadge';
import {
  PROVIDERS,
  clearAllKeys,
  getApiKey,
  getSelectedProvider,
  setApiKey,
  setSelectedProvider,
  validateKeyShape,
  type ProviderId,
} from '@/core/ai/keys';
import { buildProvider } from '@/core/ai/providerRegistry';
import { signOut } from '@/core/auth/auth';
import { getKarma, type KarmaState } from '@/core/karma/karma';
import { t } from '@/core/i18n/strings';
import type { ThemeChoice } from '@/design/theme';
import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';

const THEME_OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'ember', label: 'Ember 🔥' },
  { value: 'midnight', label: 'Midnight 🌙' },
  { value: 'parchment', label: 'Parchment 📜' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { palette, spacing, fonts, radius, choice, setChoice } = useTheme();
  const [selectedProvider, setSelectedProviderState] = useState<ProviderId>('openai');
  const [keyInput, setKeyInput] = useState('');
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [testError, setTestError] = useState('');
  const [karma, setKarmaState] = useState<KarmaState | null>(null);

  useEffect(() => {
    (async () => {
      const p = await getSelectedProvider();
      setSelectedProviderState(p);
      const k = await getApiKey(p);
      setSavedKey(k);
      const karmaState = await getKarma();
      setKarmaState(karmaState);
    })();
  }, []);

  const onProviderChange = async (id: ProviderId) => {
    setSelectedProviderState(id);
    await setSelectedProvider(id);
    const k = await getApiKey(id);
    setSavedKey(k);
    setKeyInput('');
    setTestStatus('idle');
  };

  const onSaveKey = async () => {
    if (!validateKeyShape(selectedProvider, keyInput)) {
      Alert.alert('Clé invalide', `Le format ne ressemble pas à une clé ${selectedProvider}.`);
      return;
    }
    await setApiKey(selectedProvider, keyInput);
    setSavedKey(keyInput.trim());
    setKeyInput('');
    setTestStatus('idle');
  };

  const onTestKey = async () => {
    const key = savedKey ?? keyInput.trim();
    if (!key) return;
    setTestStatus('loading');
    setTestError('');
    const provider = buildProvider(selectedProvider, key);
    if (!provider) { setTestStatus('error'); setTestError('Provider not implemented'); return; }
    const result = await provider.ping();
    if (result.ok) {
      setTestStatus('ok');
    } else {
      setTestStatus('error');
      setTestError(result.error);
    }
  };

  const onClearKeys = () => {
    Alert.alert(
      'Effacer les clés ?',
      'Toutes les clés API seront supprimées du Keychain.',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: 'Effacer', style: 'destructive',
          onPress: async () => {
            await clearAllKeys();
            setSavedKey(null);
            setKeyInput('');
            setTestStatus('idle');
          },
        },
      ],
    );
  };

  const masked = (k: string) => k.slice(0, 6) + '••••••' + k.slice(-4);

  const bg = palette.background;
  const card = { backgroundColor: palette.surface, borderRadius: radius.card, marginHorizontal: spacing.lg, marginTop: spacing.lg };
  const sectionTitle = { color: palette.textMuted, fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.5, textTransform: 'uppercase' as const, marginHorizontal: spacing.lg, marginTop: spacing.xxl, marginBottom: spacing.xs };
  const row = { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: bg }} contentContainerStyle={{ paddingBottom: 80 }}>

      {/* Karma + streak */}
      {karma ? (
        <View style={[card, { padding: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
          <View style={{ flex: 1 }}>
            <Text style={[fonts.headline, { color: palette.text }]}>{t('karma_title')}</Text>
            <Text style={[fonts.footnote, { color: palette.textMuted, marginTop: spacing.xxs }]}>
              {karma.longest_streak > 0
                ? t('karma_sub_longest').replace('{n}', String(karma.longest_streak))
                : t('karma_sub_empty')}
            </Text>
          </View>
          <KarmaBadge karma={karma.karma} currentStreak={karma.current_streak} longestStreak={karma.longest_streak} />
        </View>
      ) : null}

      {/* Theme */}
      <Text style={sectionTitle}>{t('settings_theme')}</Text>
      <View style={card}>
        {THEME_OPTIONS.map((opt, i) => (
          <Pressable
            key={opt.value}
            onPress={() => setChoice(opt.value)}
            style={[row, i > 0 && { borderTopWidth: 1, borderTopColor: palette.outline }]}
          >
            <Text style={[fonts.body, { flex: 1, color: palette.text }]}>{opt.label}</Text>
            {choice === opt.value && <Text style={{ color: palette.accent, fontSize: 18 }}>✓</Text>}
          </Pressable>
        ))}
      </View>

      {/* AI Provider */}
      <Text style={sectionTitle}>{t('settings_ai')}</Text>
      <View style={card}>
        {PROVIDERS.map((p, i) => (
          <Pressable
            key={p.id}
            onPress={() => onProviderChange(p.id)}
            style={[row, i > 0 && { borderTopWidth: 1, borderTopColor: palette.outline }]}
          >
            <Text style={[fonts.body, { flex: 1, color: palette.text }]}>{p.label}</Text>
            {selectedProvider === p.id && <Text style={{ color: palette.accent, fontSize: 18 }}>✓</Text>}
          </Pressable>
        ))}
      </View>

      {/* API Key */}
      <Text style={sectionTitle}>Clé API — {PROVIDERS.find(p => p.id === selectedProvider)?.label}</Text>
      <View style={[card, { padding: spacing.lg, gap: spacing.md }]}>
        {savedKey ? (
          <Text style={[fonts.callout, { color: palette.textSecondary }]}>
            Clé enregistrée : {masked(savedKey)}
          </Text>
        ) : null}
        <TextInput
          value={keyInput}
          onChangeText={setKeyInput}
          placeholder={savedKey ? 'Remplacer la clé…' : 'Coller ta clé ici'}
          placeholderTextColor={palette.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          style={{
            backgroundColor: palette.surfaceElevated,
            color: palette.text,
            borderRadius: radius.chip,
            padding: spacing.md,
            fontSize: 15,
          }}
        />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          {keyInput.length > 0 && (
            <WarmButton title="Enregistrer" onPress={onSaveKey} />
          )}
          {savedKey && (
            <WarmButton
              title={testStatus === 'loading' ? 'Test…' : testStatus === 'ok' ? '✓ OK' : 'Tester'}
              onPress={onTestKey}
              variant="secondary"
              loading={testStatus === 'loading'}
            />
          )}
        </View>
        {testStatus === 'error' && (
          <Text style={[fonts.footnote, { color: palette.danger }]}>{testError || 'Erreur de connexion.'}</Text>
        )}
        {testStatus === 'ok' && (
          <Text style={[fonts.footnote, { color: palette.success }]}>Connexion réussie.</Text>
        )}

        {savedKey && (
          <Pressable onPress={onClearKeys}>
            <Text style={[fonts.footnote, { color: palette.danger }]}>Effacer toutes les clés</Text>
          </Pressable>
        )}
      </View>

      {/* Shortcuts */}
      <Text style={sectionTitle}>Raccourcis</Text>
      <View style={card}>
        <Pressable onPress={() => router.push('/filters')} style={row}>
          <Text style={[fonts.body, { flex: 1, color: palette.text }]}>{t('filters_title')}</Text>
          <Text style={{ color: palette.textMuted, fontSize: 18 }}>›</Text>
        </Pressable>
        <View style={{ height: 1, backgroundColor: palette.outline }} />
        <Pressable onPress={() => router.push('/search')} style={row}>
          <Text style={[fonts.body, { flex: 1, color: palette.text }]}>{t('search_placeholder')}</Text>
          <Text style={{ color: palette.textMuted, fontSize: 18 }}>›</Text>
        </Pressable>
      </View>

      {/* Sign out */}
      <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.xxl }}>
        <WarmButton
          title={t('settings_sign_out')}
          variant="ghost"
          onPress={() => {
            Alert.alert('Se déconnecter ?', '', [
              { text: t('cancel'), style: 'cancel' },
              { text: 'Oui', onPress: () => signOut() },
            ]);
          }}
          fullWidth
        />
      </View>
    </ScrollView>
  );
}

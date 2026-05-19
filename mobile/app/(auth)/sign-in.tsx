import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { useTheme } from '@/design/theme';
import { WarmButton } from '@/design/components/WarmButton';
import { sendMagicLink } from '@/core/auth/auth';
import { t } from '@/core/i18n/strings';

export default function SignInScreen() {
  const { palette, spacing, fonts, radius } = useTheme();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSend = async () => {
    if (!email.includes('@')) return;
    setLoading(true);
    setError(null);
    const res = await sendMagicLink(email.trim());
    setLoading(false);
    if (res.error) setError(res.error);
    else setSent(true);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: palette.background }}
    >
      <View style={{ flex: 1, padding: spacing.xl, justifyContent: 'center', gap: spacing.lg }}>
        <Text style={[fonts.largeTitle, { color: palette.text }]}>{t('sign_in_title')}</Text>
        <Text style={[fonts.body, { color: palette.textSecondary }]}>{t('sign_in_subtitle')}</Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder={t('email_placeholder')}
          placeholderTextColor={palette.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          editable={!sent}
          style={{
            backgroundColor: palette.surface,
            color: palette.text,
            borderRadius: radius.card,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            fontSize: 17,
            marginTop: spacing.md,
          }}
        />

        {error ? (
          <Text style={[fonts.footnote, { color: palette.danger }]}>{error}</Text>
        ) : null}

        {sent ? (
          <Text style={[fonts.callout, { color: palette.accent }]}>{t('magic_link_sent')}</Text>
        ) : (
          <WarmButton
            title={t('send_magic_link')}
            onPress={onSend}
            loading={loading}
            disabled={!email.includes('@')}
            fullWidth
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

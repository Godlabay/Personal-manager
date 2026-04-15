import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useTheme } from '@/design/theme';
import { WarmButton } from '@/design/components/WarmButton';

type Phase = 'idle' | 'listening' | 'done' | 'error';

/**
 * Voice capture screen — full-screen sheet.
 * Records speech on-device (requiresOnDeviceRecognition where available),
 * shows live transcript, then routes to QuickAdd pre-filled with the text.
 *
 * Opened via long-press on the + FAB or from the AI chat panel.
 */
export default function VoiceCaptureScreen() {
  const { palette, spacing, fonts, radius } = useTheme();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const pulse = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  // Mic pulse animation while listening.
  useEffect(() => {
    if (phase === 'listening') {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.25, duration: 700, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulse.setValue(1);
    }
  }, [phase, pulse]);

  // Speech recognition events.
  useSpeechRecognitionEvent('result', (e) => {
    const text = e.results?.[0]?.transcript ?? '';
    setTranscript(text);
    if (e.isFinal) setPhase('done');
  });

  useSpeechRecognitionEvent('error', (e) => {
    setErrorMsg(e.message ?? 'Erreur de reconnaissance.');
    setPhase('error');
  });

  useSpeechRecognitionEvent('end', () => {
    if (phase === 'listening') setPhase('done');
  });

  const startListening = async () => {
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      setErrorMsg('Micro non autorisé. Active-le dans Réglages.');
      setPhase('error');
      return;
    }
    setTranscript('');
    setPhase('listening');
    ExpoSpeechRecognitionModule.start({
      lang: 'fr-CA',
      interimResults: true,
      requiresOnDeviceRecognition: false, // true on iOS 17+ for full privacy
      addsPunctuation: true,
    });
  };

  const stopListening = () => {
    ExpoSpeechRecognitionModule.stop();
    setPhase('done');
  };

  const onConfirm = () => {
    if (!transcript.trim()) return;
    router.replace({ pathname: '/quick-add', params: { initialText: transcript } } as never);
  };

  const onRetry = () => {
    setTranscript('');
    setPhase('idle');
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.background, alignItems: 'center', justifyContent: 'center', gap: spacing.xxl, padding: spacing.xl }}>
      {/* Close */}
      <Pressable
        onPress={() => router.back()}
        style={{ position: 'absolute', top: spacing.xl, right: spacing.xl }}
        hitSlop={12}
      >
        <Text style={{ color: palette.textMuted, fontSize: 28 }}>✕</Text>
      </Pressable>

      {/* Mic button */}
      <Pressable
        onPress={phase === 'listening' ? stopListening : startListening}
        disabled={phase === 'done'}
      >
        <Animated.View
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: phase === 'listening' ? palette.accent : palette.surface,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale: pulse }],
            borderWidth: phase === 'idle' ? 1.5 : 0,
            borderColor: palette.outline,
          }}
        >
          <Text style={{ fontSize: 42 }}>
            {phase === 'listening' ? '⏹' : '🎤'}
          </Text>
        </Animated.View>
      </Pressable>

      {/* Status label */}
      <Text style={[fonts.callout, { color: palette.textSecondary, textAlign: 'center' }]}>
        {phase === 'idle' && 'Appuie sur le micro et parle.'}
        {phase === 'listening' && 'Écoute… appuie pour arrêter.'}
        {phase === 'done' && 'Bon, j\'ai capté ça :'}
        {phase === 'error' && errorMsg}
      </Text>

      {/* Transcript */}
      {transcript ? (
        <View style={{ backgroundColor: palette.surface, borderRadius: radius.card, padding: spacing.lg, width: '100%' }}>
          <Text style={[fonts.body, { color: palette.text }]}>{transcript}</Text>
        </View>
      ) : null}

      {/* Actions */}
      {phase === 'done' && transcript && (
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <WarmButton title="Recommencer" variant="secondary" onPress={onRetry} />
          <WarmButton title="Ajouter →" onPress={onConfirm} />
        </View>
      )}
      {phase === 'error' && (
        <WarmButton title="Réessayer" onPress={onRetry} />
      )}
    </View>
  );
}

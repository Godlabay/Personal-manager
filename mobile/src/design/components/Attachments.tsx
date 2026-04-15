import { useCallback, useEffect, useState } from 'react';
import { ActionSheetIOS, Alert, Image, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import {
  listAttachments,
  pickAndUpload,
  signedUrl,
  deleteAttachment,
  type Attachment,
} from '@/core/attachments/attachments';

interface Props {
  taskId: string;
}

/**
 * Horizontal strip of image thumbnails + "+" tile that opens camera/library.
 * Signed URLs are resolved lazily per item and kept in local state to avoid
 * refetching every render.
 */
export function Attachments({ taskId }: Props) {
  const { palette, spacing, fonts, radius } = useTheme();
  const [items, setItems] = useState<Attachment[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await listAttachments(taskId);
      setItems(list);
      // Resolve signed URLs in parallel — cheap enough for the typical < 10 attachments.
      const pairs = await Promise.all(list.map(async (a) => [a.id, (await signedUrl(a.storage_path)) ?? ''] as const));
      setUrls(Object.fromEntries(pairs));
    } catch {
      // offline / blip
    }
  }, [taskId]);

  useEffect(() => { load(); }, [load]);

  const onAdd = () => {
    const pick = async (source: 'camera' | 'library') => {
      setUploading(true);
      try {
        await pickAndUpload(taskId, source);
        await load();
      } catch (e) {
        Alert.alert('Oups', String(e));
      } finally {
        setUploading(false);
      }
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Photo', 'Bibliothèque', 'Annuler'], cancelButtonIndex: 2 },
        (idx) => {
          if (idx === 0) pick('camera');
          if (idx === 1) pick('library');
        },
      );
    } else {
      Alert.alert('Ajouter', '', [
        { text: 'Photo', onPress: () => pick('camera') },
        { text: 'Bibliothèque', onPress: () => pick('library') },
        { text: 'Annuler', style: 'cancel' },
      ]);
    }
  };

  const onDelete = (a: Attachment) => {
    Alert.alert('Supprimer ?', 'La pièce jointe sera effacée.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => { await deleteAttachment(a); load(); },
      },
    ]);
  };

  const tileSize = 84;

  return (
    <View>
      <Text style={[fonts.headline, { color: palette.text, marginBottom: spacing.xs }]}>Pièces jointes</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        <Pressable
          onPress={onAdd}
          disabled={uploading}
          style={{
            width: tileSize,
            height: tileSize,
            borderRadius: radius.chip,
            backgroundColor: palette.surfaceElevated,
            borderWidth: 1,
            borderColor: palette.outline,
            borderStyle: 'dashed',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: uploading ? 0.5 : 1,
          }}
        >
          <Ionicons name={uploading ? 'hourglass-outline' : 'add'} size={28} color={palette.textMuted} />
        </Pressable>

        {items.map((a) => {
          const url = urls[a.id];
          return (
            <Pressable
              key={a.id}
              onLongPress={() => onDelete(a)}
              style={{ width: tileSize, height: tileSize, borderRadius: radius.chip, overflow: 'hidden', backgroundColor: palette.surfaceElevated }}
            >
              {url ? (
                <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="image-outline" size={24} color={palette.textMuted} />
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
      {items.length > 0 ? (
        <Text style={[fonts.caption, { color: palette.textMuted, marginTop: spacing.xs }]}>Long-press pour supprimer.</Text>
      ) : null}
    </View>
  );
}

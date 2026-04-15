import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../supabase/client';

/**
 * Attachments — upload images (camera / gallery) to Supabase Storage and index
 * them in the `attachments` table. Path convention: <user_id>/<task_id>/<uuid>.ext
 *
 * RLS is enforced server-side on both `attachments` (user_id = auth.uid()) and
 * the storage bucket (first path segment = auth.uid()).
 */

export interface Attachment {
  id: string;
  task_id: string;
  user_id: string;
  storage_path: string;
  mime: string | null;
  size: number | null;
  created_at: string;
}

const BUCKET = 'attachments';

export async function pickAndUpload(taskId: string, source: 'camera' | 'library'): Promise<Attachment | null> {
  const perm = source === 'camera'
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const result = source === 'camera'
    ? await ImagePicker.launchCameraAsync({ quality: 0.8, base64: false })
    : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, base64: false, mediaTypes: ImagePicker.MediaTypeOptions.Images });

  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  const userId = userData.user.id;

  // Prefer the file's real mime; fall back to jpeg since ImagePicker returns JPEG on iOS by default.
  const mime = asset.mimeType ?? 'image/jpeg';
  const ext = mime.split('/')[1] ?? 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${userId}/${taskId}/${filename}`;

  // Supabase needs an ArrayBuffer / Blob. The safe cross-platform route is fetch(uri).blob().
  const res = await fetch(asset.uri);
  const blob = await res.blob();

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: mime,
    upsert: false,
  });
  if (upErr) throw upErr;

  const size = asset.fileSize ?? blob.size ?? null;
  const { data, error } = await supabase
    .from('attachments')
    .insert({ task_id: taskId, storage_path: path, mime, size })
    .select()
    .single();
  if (error) {
    // Best-effort cleanup if the DB insert fails.
    await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
    throw error;
  }

  return data as Attachment;
}

export async function listAttachments(taskId: string): Promise<Attachment[]> {
  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Attachment[];
}

/**
 * Signed URL for display. Bucket is private so we can't use publicUrl; the
 * signed URL is short-lived (1 hour default here) and regenerated on each
 * fetch — attachments aren't viewed often enough to justify caching.
 */
export async function signedUrl(storagePath: string, expiresIn = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, expiresIn);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function deleteAttachment(a: Attachment): Promise<void> {
  await supabase.storage.from(BUCKET).remove([a.storage_path]);
  await supabase.from('attachments').delete().eq('id', a.id);
}

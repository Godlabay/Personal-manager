import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../supabase/client';

/**
 * Time-based reminders.
 *
 * We schedule them on-device via UNUserNotificationCenter / Android AlarmManager
 * (expo-notifications) and persist a pointer in the `reminders` table so the
 * user sees them across devices. The local notif_id lets us cancel cleanly when
 * the reminder is deleted or the task completed.
 *
 * We do NOT use push (APNs/FCM) in Phase 2 — local notifs don't need a server
 * key or dev account, which is a hard prerequisite for MVP.
 */

// Make banners show even when the app is foregrounded — TDAH-friendly: the user
// should see the nudge exactly when they asked for it, not silently swallowed.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestPermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  const req = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }
  return req.granted;
}

/**
 * Schedule a one-shot reminder for a task and persist a pointer row.
 * Returns the `reminders.id` or null on failure.
 */
export async function scheduleTaskReminder(taskId: string, title: string, fireAt: Date): Promise<string | null> {
  const granted = await requestPermission();
  if (!granted) return null;
  if (fireAt.getTime() <= Date.now()) return null;

  const notifId = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🫖 Rappel doux',
      body: title,
      data: { taskId, kind: 'reminder' },
      sound: 'default',
    },
    // expo-notifications 0.28 accepts { date: Date } for a one-shot trigger.
    trigger: { date: fireAt } as Notifications.NotificationTriggerInput,
  });

  const { data, error } = await supabase
    .from('reminders')
    .insert({
      task_id: taskId,
      kind: 'time',
      fire_at: fireAt.toISOString(),
      notif_id: notifId,
    })
    .select('id')
    .single();

  if (error || !data) {
    await Notifications.cancelScheduledNotificationAsync(notifId).catch(() => {});
    return null;
  }
  return (data as { id: string }).id;
}

export async function cancelTaskReminder(reminderId: string): Promise<void> {
  const { data } = await supabase
    .from('reminders')
    .select('notif_id')
    .eq('id', reminderId)
    .maybeSingle();
  const notifId = (data as { notif_id?: string } | null)?.notif_id;
  if (notifId) await Notifications.cancelScheduledNotificationAsync(notifId).catch(() => {});
  await supabase.from('reminders').delete().eq('id', reminderId);
}

/**
 * Called on task completion. Cancels any pending local notifs for this task so
 * we don't nudge after the user already ticked it off.
 */
export async function cancelRemindersForTask(taskId: string): Promise<void> {
  const { data } = await supabase
    .from('reminders')
    .select('id, notif_id')
    .eq('task_id', taskId);
  for (const r of (data ?? []) as Array<{ id: string; notif_id: string | null }>) {
    if (r.notif_id) await Notifications.cancelScheduledNotificationAsync(r.notif_id).catch(() => {});
  }
  await supabase.from('reminders').delete().eq('task_id', taskId);
}

export async function listRemindersForTask(taskId: string) {
  const { data } = await supabase
    .from('reminders')
    .select('*')
    .eq('task_id', taskId)
    .order('fire_at', { ascending: true });
  return data ?? [];
}

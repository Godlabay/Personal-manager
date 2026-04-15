import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';

/**
 * i18n bundle for Personal Manager.
 * Keys are flat (no nesting) to keep the TS surface predictable.
 *
 * Warm-tone rules:
 *  - No "Error" → "Oups", "Ça n'a pas marché", "Something slipped"
 *  - No "Overdue" as a section → "Still on your plate"
 *  - No "Failed" → "Didn't save yet"
 */

const i18n = new I18n({
  en: {
    app_name: 'Personal Manager',

    // Auth
    sign_in_title: 'Welcome back',
    sign_in_subtitle: 'We\'ll send a magic link to your email — no password to remember.',
    email_placeholder: 'you@example.com',
    send_magic_link: 'Send magic link',
    magic_link_sent: 'Check your inbox. The link opens straight back here.',

    // Tabs
    tab_today: 'Today',
    tab_upcoming: 'Upcoming',
    tab_projects: 'Projects',
    tab_ai: 'Chat',
    tab_settings: 'Settings',

    // Empty states
    empty_today_title: 'Clean slate',
    empty_today_msg: 'Nothing due today. Savour it, or add one thing.',
    empty_inbox_title: 'Inbox is empty',
    empty_inbox_msg: 'Capture the next thing rattling in your head.',

    // Quick add
    quick_add_placeholder: 'Finish report tomorrow 9am #work',
    quick_add_hint: 'Try "demain 14h", "next friday", "dans 3 jours", #labels, !! for priority.',
    quick_add_save: 'Add',

    // AI / Settings
    ai_setup_title: 'Bring your own AI key',
    ai_setup_msg: 'Paste your own API key — it stays in your phone\'s Keychain.',
    ai_open_settings: 'Open Settings',
    ai_input_placeholder: 'What\'s on your mind?',
    ai_thinking: 'Thinking…',

    settings_ai: 'AI provider',
    settings_theme: 'Theme',
    settings_language: 'Language',
    settings_sign_out: 'Sign out',

    // Focus
    focus_start: 'Start focus',
    focus_stop: 'Stop',
    focus_done_warm: 'Nice. One small win.',

    // Karma
    karma_title: 'Karma & streak',
    karma_sub_empty: 'Your first done task lights the fire.',
    karma_sub_longest: 'Best streak so far: {n} days.',

    // Search
    search_placeholder: 'Search your tasks…',
    search_hint: 'Search by title. Tap a result to jump in.',
    search_empty: 'Nothing matches. Try fewer words.',

    // Filters
    filters_title: 'Saved filters',
    filters_empty: 'No filters yet. Save one to come back fast.',
    filter_new: 'New filter',
    filter_name: 'Name',
    filter_query: 'Search query',
    filter_priority: 'Priority',
    filter_with_due: 'Only with a due date',

    // Reminders / notifications
    reminders_permission_title: 'Enable gentle reminders',
    reminders_permission_msg: 'We\'ll nudge you only for tasks you opted in.',
    reminder_scheduled: 'Reminder set.',

    // Kanban
    kanban_view: 'Kanban',
    list_view: 'List',
    col_todo: 'To do',
    col_doing: 'Doing',
    col_done: 'Done',
    col_blocked: 'Blocked',

    // Generic
    cancel: 'Cancel',
    save: 'Save',
    add: 'Add',
    retry: 'Try again',
    something_slipped: 'Something slipped. Try again in a moment.',
  },
  fr: {
    app_name: 'Personal Manager',

    sign_in_title: 'On se retrouve',
    sign_in_subtitle: 'Un lien magique par courriel — pas de mot de passe à retenir.',
    email_placeholder: 'toi@exemple.com',
    send_magic_link: 'Envoyer le lien',
    magic_link_sent: 'Regarde ta boîte. Le lien te ramène ici direct.',

    tab_today: 'Aujourd\'hui',
    tab_upcoming: 'À venir',
    tab_projects: 'Projets',
    tab_ai: 'Chat',
    tab_settings: 'Réglages',

    empty_today_title: 'Rien au menu',
    empty_today_msg: 'Rien pour aujourd\'hui. Profites-en, ou ajoute un truc.',
    empty_inbox_title: 'Inbox vide',
    empty_inbox_msg: 'Capture ce qui trotte dans ta tête.',

    quick_add_placeholder: 'Finir rapport demain 9h #travail',
    quick_add_hint: 'Essaie « demain 14h », « vendredi prochain », « dans 3 jours », #labels, !! pour priorité.',
    quick_add_save: 'Ajouter',

    ai_setup_title: 'Ta propre clé IA',
    ai_setup_msg: 'Colle ta clé API — elle reste dans le Keychain de ton téléphone.',
    ai_open_settings: 'Ouvrir Réglages',
    ai_input_placeholder: 'Qu\'est-ce qui se passe ?',
    ai_thinking: 'Je réfléchis…',

    settings_ai: 'Fournisseur IA',
    settings_theme: 'Thème',
    settings_language: 'Langue',
    settings_sign_out: 'Se déconnecter',

    focus_start: 'Focus',
    focus_stop: 'Arrêter',
    focus_done_warm: 'Beau boulot. Une petite victoire.',

    // Karma
    karma_title: 'Karma & série',
    karma_sub_empty: 'Ta première tâche terminée allume le feu.',
    karma_sub_longest: 'Meilleure série : {n} jours.',

    // Search
    search_placeholder: 'Cherche une tâche…',
    search_hint: 'Recherche par titre. Tape un résultat pour l\'ouvrir.',
    search_empty: 'Rien ne correspond. Essaie moins de mots.',

    // Filters
    filters_title: 'Filtres enregistrés',
    filters_empty: 'Aucun filtre. Enregistres-en un pour revenir vite.',
    filter_new: 'Nouveau filtre',
    filter_name: 'Nom',
    filter_query: 'Recherche',
    filter_priority: 'Priorité',
    filter_with_due: 'Seulement celles avec date',

    // Reminders / notifications
    reminders_permission_title: 'Rappels doux',
    reminders_permission_msg: 'On te fera signe seulement pour ce que tu as choisi.',
    reminder_scheduled: 'Rappel programmé.',

    // Kanban
    kanban_view: 'Kanban',
    list_view: 'Liste',
    col_todo: 'À faire',
    col_doing: 'En cours',
    col_done: 'Fait',
    col_blocked: 'Bloqué',

    cancel: 'Annuler',
    save: 'Enregistrer',
    add: 'Ajouter',
    retry: 'Réessayer',
    something_slipped: 'Un petit accroc. Réessaie dans un instant.',
  },
});

i18n.enableFallback = true;
i18n.defaultLocale = 'fr';
// expo-localization returns a list of BCP-47 tags; first segment is lang.
const tag = Localization.getLocales()[0]?.languageCode ?? 'fr';
i18n.locale = tag === 'en' ? 'en' : 'fr';

export function t(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options);
}

export function setLocale(locale: 'fr' | 'en'): void {
  i18n.locale = locale;
}

export function getLocale(): 'fr' | 'en' {
  return i18n.locale.startsWith('en') ? 'en' : 'fr';
}

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

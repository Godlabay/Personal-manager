# Supabase Setup — Personal Manager

## 1. Créer le projet

1. Va sur https://supabase.com → **New project**
2. Donne-lui un nom (ex: `personal-manager`)
3. Choisis une région proche (ex: `us-east-1`)
4. Attends ~2 minutes que le projet démarre

## 2. Récupérer les clés

Dans ton projet Supabase → **Settings → API** :

- **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
- **anon public** → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Colle ces deux valeurs dans `mobile/.env`.

## 3. Appliquer les migrations

Dans Supabase → **SQL Editor** → clique **New query**.

### Migration 1 — Schéma

Copie-colle tout le contenu de `supabase/migrations/0001_init.sql` et clique **Run**.

### Migration 2 — RLS (Row Level Security)

Copie-colle tout le contenu de `supabase/migrations/0002_rls.sql` et clique **Run**.

### Migration 3 — Storage (pour les pièces jointes)

Copie-colle tout le contenu de `supabase/migrations/0003_storage.sql` et clique **Run**.
Ça crée le bucket `attachments` (privé) + les policies d'accès par utilisateur.

## 4. Activer le magic link

Dans Supabase → **Authentication → Providers → Email** :
- Active **"Enable email provider"**
- Active **"Confirm email"** (pour magic link)

Dans **Authentication → URL Configuration** :
- **Site URL** : `personalmanager://`
- **Redirect URLs** : ajoute `personalmanager://auth-callback`

## 5. Vérifier

Dans **Table Editor**, tu devrais voir les tables :
`user_profile`, `projects`, `sections`, `tasks`, `labels`, `task_labels`,
`comments`, `time_entries`, `reminders`, `ai_conversations`, `ai_messages`, etc.

## 6. Optionnel — Activer le Realtime

Dans **Database → Replication** → active le toggle pour les tables :
`tasks`, `projects`, `sections`, `labels`

(Les migrations l'activent déjà via `supabase_realtime` publication, mais l'UI
permet de confirmer.)

---

## Dépannage fréquent

| Erreur | Cause | Fix |
|---|---|---|
| `Invalid API key` | Mauvaise clé dans `.env` | Revérifie Settings → API |
| `relation "tasks" does not exist` | Migration pas appliquée | Relance 0001_init.sql |
| `permission denied for table tasks` | RLS bloque | Relance 0002_rls.sql |
| Magic link ne redirige pas | Redirect URL manquante | Ajoute `personalmanager://auth-callback` |
| `bucket "attachments" does not exist` | Migration storage pas appliquée | Relance 0003_storage.sql |
| Upload pièce jointe échoue (`new row violates row-level security`) | Policies storage pas créées | Relance 0003_storage.sql |

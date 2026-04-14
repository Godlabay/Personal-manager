-- Row-Level Security policies for Phase 1.
-- Every table isolates rows by auth.uid() so an anon key alone cannot leak data.

-- =========================================================================
-- Enable RLS on every table
-- =========================================================================

alter table user_profile       enable row level security;
alter table projects           enable row level security;
alter table sections           enable row level security;
alter table labels             enable row level security;
alter table tasks              enable row level security;
alter table task_labels        enable row level security;
alter table comments           enable row level security;
alter table attachments        enable row level security;
alter table time_entries       enable row level security;
alter table reminders          enable row level security;
alter table task_dependencies  enable row level security;
alter table saved_filters      enable row level security;
alter table ai_conversations   enable row level security;
alter table ai_messages        enable row level security;
alter table project_members    enable row level security;

-- =========================================================================
-- Direct-owner tables (user_id column)
-- =========================================================================

drop policy if exists own_rows on user_profile;
create policy own_rows on user_profile for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists own_rows on projects;
create policy own_rows on projects for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists own_rows on labels;
create policy own_rows on labels for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists own_rows on tasks;
create policy own_rows on tasks for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists own_rows on comments;
create policy own_rows on comments for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists own_rows on attachments;
create policy own_rows on attachments for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists own_rows on time_entries;
create policy own_rows on time_entries for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists own_rows on reminders;
create policy own_rows on reminders for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists own_rows on saved_filters;
create policy own_rows on saved_filters for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists own_rows on ai_conversations;
create policy own_rows on ai_conversations for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- =========================================================================
-- Child tables (verify ownership via parent)
-- =========================================================================

drop policy if exists own_rows on sections;
create policy own_rows on sections for all
  using (exists (
    select 1 from projects p
    where p.id = sections.project_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from projects p
    where p.id = sections.project_id and p.user_id = auth.uid()
  ));

drop policy if exists own_rows on task_labels;
create policy own_rows on task_labels for all
  using (exists (
    select 1 from tasks t
    where t.id = task_labels.task_id and t.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from tasks t
    where t.id = task_labels.task_id and t.user_id = auth.uid()
  ));

drop policy if exists own_rows on task_dependencies;
create policy own_rows on task_dependencies for all
  using (exists (
    select 1 from tasks t
    where t.id = task_dependencies.predecessor_id and t.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from tasks t
    where t.id = task_dependencies.predecessor_id and t.user_id = auth.uid()
  ));

drop policy if exists own_rows on ai_messages;
create policy own_rows on ai_messages for all
  using (exists (
    select 1 from ai_conversations c
    where c.id = ai_messages.conversation_id and c.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from ai_conversations c
    where c.id = ai_messages.conversation_id and c.user_id = auth.uid()
  ));

drop policy if exists own_rows on project_members;
create policy own_rows on project_members for all
  using (
    user_id = auth.uid()
    or exists (
      select 1 from projects p
      where p.id = project_members.project_id and p.user_id = auth.uid()
    )
  )
  with check (exists (
    select 1 from projects p
    where p.id = project_members.project_id and p.user_id = auth.uid()
  ));

-- =========================================================================
-- Auto-create user_profile on signup
-- =========================================================================

create or replace function handle_new_user()
returns trigger
security definer
language plpgsql
as $$
begin
  insert into public.user_profile (user_id, display_name, locale)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), 'fr')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

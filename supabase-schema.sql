-- ============================================================================
-- Sprint Room — canonical database schema
-- ============================================================================
-- Run this in the Supabase SQL editor, or apply it with:
--   npm run db:schema        (reads SUPABASE_DB_* env vars, see below)
--
-- WARNING: this script drops and recreates every table. All progress is lost.
-- ============================================================================

drop table if exists sprint_completions cascade;
drop table if exists sprint_tasks cascade;
drop table if exists sprint_days cascade;
drop table if exists sprint_categories cascade;
drop table if exists sprints cascade;
drop table if exists reactions cascade;
drop table if exists progress cascade;
drop table if exists users cascade;
drop function if exists public.can_write_user(uuid) cascade;

create extension if not exists "pgcrypto";

-- ── users ───────────────────────────────────────────────────────────────────
-- A profile is created either by "quick join" (name only, auth_user_id null)
-- or by signing in with a magic link (auth_user_id set). Once auth_user_id is
-- set the profile is claimed and only that account can write to it.
create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  nickname text,
  email text,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  start_date date,
  created_at timestamptz not null default now()
);

create index users_auth_idx on users(auth_user_id);

-- ── progress ────────────────────────────────────────────────────────────────
-- One row per (user, day) with a boolean per built-in plan category.
create table progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  day_number int not null check (day_number between 1 and 21),
  aptitude boolean not null default false,
  reasoning boolean not null default false,
  verbal boolean not null default false,
  cs_fundamentals boolean not null default false,
  java_core boolean not null default false,
  dsa_concept boolean not null default false,
  leetcode boolean not null default false,
  gpp_project boolean not null default false,
  notes text,
  updated_at timestamptz not null default now(),
  unique (user_id, day_number)
);

create index progress_user_idx on progress(user_id);
-- ── reactions ───────────────────────────────────────────────────────────────
-- Lightweight encouragement between squad members.
create table reactions (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references users(id) on delete cascade,
  to_user_id uuid not null references users(id) on delete cascade,
  day_number int check (day_number is null or day_number between 1 and 21),
  type text not null check (type in ('cheer', 'fire', 'clap', 'star')),
  created_at timestamptz not null default now()
);

create index reactions_to_idx on reactions(to_user_id, created_at desc);
create index reactions_from_idx on reactions(from_user_id);

-- ── custom sprints ──────────────────────────────────────────────────────────
-- The built-in 21-day plan lives in src/lib/plan.ts. These tables let a user
-- build their own sprint (any length, any categories) without touching the
-- fixed-column `progress` table above.
create table sprints (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  name text not null,
  description text,
  total_days int not null check (total_days between 1 and 180),
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create index sprints_owner_idx on sprints(owner_id);

create table sprint_categories (
  id uuid primary key default gen_random_uuid(),
  sprint_id uuid not null references sprints(id) on delete cascade,
  key text not null,
  label text not null,
  sort_order int not null default 0,
  unique (sprint_id, key)
);

create index sprint_categories_sprint_idx on sprint_categories(sprint_id, sort_order);
-- One row per (sprint, day, category) holding the task description.
create table sprint_tasks (
  id uuid primary key default gen_random_uuid(),
  sprint_id uuid not null references sprints(id) on delete cascade,
  day_number int not null check (day_number >= 1),
  category_key text not null,
  title text not null,
  unique (sprint_id, day_number, category_key)
);

create index sprint_tasks_day_idx on sprint_tasks(sprint_id, day_number);

-- One row per ticked box. Absence of a row means "not done".
create table sprint_completions (
  id uuid primary key default gen_random_uuid(),
  sprint_id uuid not null references sprints(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  day_number int not null check (day_number >= 1),
  category_key text not null,
  done boolean not null default true,
  notes text,
  updated_at timestamptz not null default now(),
  unique (sprint_id, user_id, day_number, category_key)
);

create index sprint_completions_lookup_idx
  on sprint_completions(sprint_id, user_id, day_number);

-- ── row level security ──────────────────────────────────────────────────────
-- Everything is world-readable (it's a shared squad room), but writes are
-- restricted to the profile's owner. An unclaimed profile (auth_user_id null)
-- stays writable so the name-only "quick join" flow keeps working.
create or replace function public.can_write_user(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = target
      and (u.auth_user_id is null or u.auth_user_id = auth.uid())
  );
$$;

revoke all on function public.can_write_user(uuid) from public;
grant execute on function public.can_write_user(uuid) to anon, authenticated;
alter table users enable row level security;
alter table progress enable row level security;
alter table reactions enable row level security;
alter table sprints enable row level security;
alter table sprint_categories enable row level security;
alter table sprint_tasks enable row level security;
alter table sprint_completions enable row level security;

-- users: anyone can read the roster; you may only edit an unclaimed profile
-- or the one linked to your own auth account.
create policy "read users" on users
  for select using (true);
create policy "create users" on users
  for insert with check (auth_user_id is null or auth_user_id = auth.uid());
create policy "update own user" on users
  for update
  using (auth_user_id is null or auth_user_id = auth.uid())
  with check (auth_user_id is null or auth_user_id = auth.uid());

-- progress: public read, owner-only write.
create policy "read progress" on progress
  for select using (true);
create policy "insert own progress" on progress
  for insert with check (public.can_write_user(user_id));
create policy "update own progress" on progress
  for update
  using (public.can_write_user(user_id))
  with check (public.can_write_user(user_id));

-- reactions: public read, you can only send as yourself.
create policy "read reactions" on reactions
  for select using (true);
create policy "insert own reactions" on reactions
  for insert with check (public.can_write_user(from_user_id));

-- custom sprints: public sprints are readable by everyone, editable by owner.
create policy "read sprints" on sprints
  for select using (is_public or public.can_write_user(owner_id));
create policy "insert own sprints" on sprints
  for insert with check (public.can_write_user(owner_id));
create policy "update own sprints" on sprints
  for update
  using (public.can_write_user(owner_id))
  with check (public.can_write_user(owner_id));
create policy "delete own sprints" on sprints
  for delete using (public.can_write_user(owner_id));
create or replace function public.owns_sprint(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.sprints s
    join public.users u on u.id = s.owner_id
    where s.id = target
      and (u.auth_user_id is null or u.auth_user_id = auth.uid())
  );
$$;

revoke all on function public.owns_sprint(uuid) from public;
grant execute on function public.owns_sprint(uuid) to anon, authenticated;

create policy "read sprint categories" on sprint_categories
  for select using (true);
create policy "write sprint categories" on sprint_categories
  for all using (public.owns_sprint(sprint_id)) with check (public.owns_sprint(sprint_id));

create policy "read sprint tasks" on sprint_tasks
  for select using (true);
create policy "write sprint tasks" on sprint_tasks
  for all using (public.owns_sprint(sprint_id)) with check (public.owns_sprint(sprint_id));

-- completions: public read (that's the whole point of a shared room),
-- but you can only tick your own boxes.
create policy "read sprint completions" on sprint_completions
  for select using (true);
create policy "insert own sprint completions" on sprint_completions
  for insert with check (public.can_write_user(user_id));
create policy "update own sprint completions" on sprint_completions
  for update
  using (public.can_write_user(user_id))
  with check (public.can_write_user(user_id));
create policy "delete own sprint completions" on sprint_completions
  for delete using (public.can_write_user(user_id));

-- ── realtime ────────────────────────────────────────────────────────────────
-- Full replica identity so UPDATE payloads carry the previous row.
alter table progress replica identity full;
alter table users replica identity full;
alter table sprint_completions replica identity full;

do $$
begin
  alter publication supabase_realtime add table progress;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table users;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table reactions;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table sprint_completions;
exception when duplicate_object then null;
end $$;

-- Additive migration — brings an existing Sprint Room database up to the
-- current schema without dropping any table or row. Safe to run repeatedly.
--
-- Adds: progress.notes, users.email, users.auth_user_id, the reactions table,
-- the custom-sprint tables, the auth-aware RLS policies and realtime.
--
-- Apply with `npm run db:migrate`, or paste this file into the Supabase
-- dashboard → SQL Editor and run it there.

create extension if not exists "pgcrypto";

alter table progress add column if not exists notes text;
alter table users add column if not exists email text;
alter table users add column if not exists auth_user_id uuid;

do $$ begin
  alter table users add constraint users_auth_user_id_key unique (auth_user_id);
exception when duplicate_table or duplicate_object then null;
end $$;

create index if not exists users_auth_idx on users(auth_user_id);
create index if not exists progress_user_idx on progress(user_id);

create table if not exists reactions (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references users(id) on delete cascade,
  to_user_id uuid not null references users(id) on delete cascade,
  day_number int check (day_number is null or day_number between 1 and 21),
  type text not null check (type in ('cheer', 'fire', 'clap', 'star')),
  created_at timestamptz not null default now()
);

create index if not exists reactions_to_idx on reactions(to_user_id, created_at desc);
create index if not exists reactions_from_idx on reactions(from_user_id);

create table if not exists sprints (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  name text not null,
  description text,
  total_days int not null check (total_days between 1 and 180),
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists sprints_owner_idx on sprints(owner_id);

create table if not exists sprint_categories (
  id uuid primary key default gen_random_uuid(),
  sprint_id uuid not null references sprints(id) on delete cascade,
  key text not null,
  label text not null,
  sort_order int not null default 0,
  unique (sprint_id, key)
);
create index if not exists sprint_categories_sprint_idx on sprint_categories(sprint_id, sort_order);

create table if not exists sprint_tasks (
  id uuid primary key default gen_random_uuid(),
  sprint_id uuid not null references sprints(id) on delete cascade,
  day_number int not null check (day_number >= 1),
  category_key text not null,
  title text not null,
  unique (sprint_id, day_number, category_key)
);

create index if not exists sprint_tasks_day_idx on sprint_tasks(sprint_id, day_number);

create table if not exists sprint_completions (
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

create index if not exists sprint_completions_lookup_idx
  on sprint_completions(sprint_id, user_id, day_number);

-- Row-level security leans on these helpers so a policy never has to read the
-- users table directly (which would recurse through its own policy).
create or replace function public.can_write_user(target uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (
    select 1 from public.users u
    where u.id = target and (u.auth_user_id is null or u.auth_user_id = auth.uid())
  );
$fn$;

create or replace function public.owns_sprint(target uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (
    select 1 from public.sprints s
    join public.users u on u.id = s.owner_id
    where s.id = target and (u.auth_user_id is null or u.auth_user_id = auth.uid())
  );
$fn$;

revoke all on function public.can_write_user(uuid) from public;
revoke all on function public.owns_sprint(uuid) from public;
grant execute on function public.can_write_user(uuid) to anon, authenticated;
grant execute on function public.owns_sprint(uuid) to anon, authenticated;

alter table users enable row level security;
alter table progress enable row level security;
alter table reactions enable row level security;
alter table sprints enable row level security;
alter table sprint_categories enable row level security;
alter table sprint_tasks enable row level security;
alter table sprint_completions enable row level security;

-- Replace the old permissive policies with owner-scoped ones. Rows whose
-- auth_user_id is still null stay writable, so nobody who signed up before
-- magic-link auth existed gets locked out of their own progress.
drop policy if exists "public can read users" on users;
drop policy if exists "public can create users" on users;
drop policy if exists "public can update users" on users;
drop policy if exists "public can read progress" on progress;
drop policy if exists "public can create progress" on progress;
drop policy if exists "public can update progress" on progress;
drop policy if exists "public can read reactions" on reactions;
drop policy if exists "public can create reactions" on reactions;

drop policy if exists "read users" on users;
drop policy if exists "create users" on users;
drop policy if exists "update own user" on users;
create policy "read users" on users for select using (true);
create policy "create users" on users for insert
  with check (auth_user_id is null or auth_user_id = auth.uid());
create policy "update own user" on users for update
  using (auth_user_id is null or auth_user_id = auth.uid())
  with check (auth_user_id is null or auth_user_id = auth.uid());

drop policy if exists "read progress" on progress;
drop policy if exists "insert own progress" on progress;
drop policy if exists "update own progress" on progress;
create policy "read progress" on progress for select using (true);
create policy "insert own progress" on progress for insert
  with check (public.can_write_user(user_id));
create policy "update own progress" on progress for update
  using (public.can_write_user(user_id)) with check (public.can_write_user(user_id));

drop policy if exists "read reactions" on reactions;
drop policy if exists "insert own reactions" on reactions;
create policy "read reactions" on reactions for select using (true);
create policy "insert own reactions" on reactions for insert
  with check (public.can_write_user(from_user_id));

drop policy if exists "read sprints" on sprints;
drop policy if exists "insert own sprints" on sprints;
drop policy if exists "update own sprints" on sprints;
drop policy if exists "delete own sprints" on sprints;
create policy "read sprints" on sprints for select
  using (is_public or public.can_write_user(owner_id));
create policy "insert own sprints" on sprints for insert
  with check (public.can_write_user(owner_id));
create policy "update own sprints" on sprints for update
  using (public.can_write_user(owner_id)) with check (public.can_write_user(owner_id));
create policy "delete own sprints" on sprints for delete
  using (public.can_write_user(owner_id));

drop policy if exists "read sprint categories" on sprint_categories;
drop policy if exists "write sprint categories" on sprint_categories;
create policy "read sprint categories" on sprint_categories for select using (true);
create policy "write sprint categories" on sprint_categories for all
  using (public.owns_sprint(sprint_id)) with check (public.owns_sprint(sprint_id));

drop policy if exists "read sprint tasks" on sprint_tasks;
drop policy if exists "write sprint tasks" on sprint_tasks;
create policy "read sprint tasks" on sprint_tasks for select using (true);
create policy "write sprint tasks" on sprint_tasks for all
  using (public.owns_sprint(sprint_id)) with check (public.owns_sprint(sprint_id));

drop policy if exists "read sprint completions" on sprint_completions;
drop policy if exists "insert own sprint completions" on sprint_completions;
drop policy if exists "update own sprint completions" on sprint_completions;
drop policy if exists "delete own sprint completions" on sprint_completions;
create policy "read sprint completions" on sprint_completions for select using (true);
create policy "insert own sprint completions" on sprint_completions for insert
  with check (public.can_write_user(user_id));
create policy "update own sprint completions" on sprint_completions for update
  using (public.can_write_user(user_id)) with check (public.can_write_user(user_id));
create policy "delete own sprint completions" on sprint_completions for delete
  using (public.can_write_user(user_id));

-- Realtime needs full row images to diff updates for subscribers.
alter table progress replica identity full;
alter table users replica identity full;
alter table sprint_completions replica identity full;

do $$ begin alter publication supabase_realtime add table progress;
exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table users;
exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table reactions;
exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table sprint_completions;
exception when duplicate_object then null; end $$;

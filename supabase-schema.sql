-- Run this once in your Supabase project's SQL Editor (Dashboard → SQL Editor → New query).

create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  nickname text,
  start_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists progress (
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
  updated_at timestamptz not null default now(),
  unique (user_id, day_number)
);

-- Safe migration in case progress table was already created
alter table progress add column if not exists gpp_project boolean not null default false;

-- Row Level Security
alter table users enable row level security;
alter table progress enable row level security;

-- This app has no passwords — anyone with the deployed link can read and write.
-- That's fine for a small trusted friend group. Do not use this schema for
-- anything containing sensitive data.
create policy "public can read users" on users
  for select using (true);
create policy "public can create users" on users
  for insert with check (true);
create policy "public can update users" on users
  for update using (true);

create policy "public can read progress" on progress
  for select using (true);
create policy "public can create progress" on progress
  for insert with check (true);
create policy "public can update progress" on progress
  for update using (true);

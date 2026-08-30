-- Run this in your Supabase project's SQL Editor (Dashboard → SQL Editor → New query)
-- This cleanly drops any existing tables and recreates them fresh.

drop table if exists progress cascade;
drop table if exists users cascade;

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

-- Row Level Security
alter table users enable row level security;
alter table progress enable row level security;

-- Policies (Open for friend group sprint room)
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

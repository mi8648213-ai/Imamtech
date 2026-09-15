-- Imamtech secure-link MVP schema for Supabase.
-- Run this in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null default 'Browser',
  role text not null default 'Linked Device',
  online boolean not null default false,
  last_seen timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.device_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid references public.devices(id) on delete set null,
  name text not null,
  number text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid references public.devices(id) on delete set null,
  name text not null,
  path text,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

alter table public.devices enable row level security;
alter table public.device_links enable row level security;
alter table public.contacts enable row level security;
alter table public.files enable row level security;

-- Main account can read/manage its own dashboard data.
drop policy if exists devices_owner_select on public.devices;
create policy devices_owner_select on public.devices for select using (owner_id = auth.uid());
drop policy if exists devices_owner_insert on public.devices;
create policy devices_owner_insert on public.devices for insert with check (owner_id = auth.uid());
drop policy if exists devices_owner_update on public.devices;
create policy devices_owner_update on public.devices for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists devices_owner_delete on public.devices;
create policy devices_owner_delete on public.devices for delete using (owner_id = auth.uid());

create policy contacts_owner_all on public.contacts for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy files_owner_all on public.files for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Links are created/read only by the authenticated owner.
create policy links_owner_all on public.device_links for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Realtime: enable device status changes for the owner dashboard.
alter publication supabase_realtime add table public.devices;

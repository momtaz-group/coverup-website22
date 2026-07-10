create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  phone text,
  username text unique,
  address text,
  city text,
  notes text,
  location jsonb not null default '[]'::jsonb,
  auth_provider text not null default 'email',
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

alter table public.profiles add column if not exists location jsonb not null default '[]'::jsonb;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_profiles_updated_at();

create or replace function public.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    phone,
    username,
    auth_provider,
    email_confirmed_at,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'username',
    coalesce(new.raw_app_meta_data ->> 'provider', 'email'),
    new.email_confirmed_at,
    new.last_sign_in_at,
    coalesce(new.created_at, now()),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    phone = coalesce(excluded.phone, public.profiles.phone),
    username = coalesce(excluded.username, public.profiles.username),
    auth_provider = excluded.auth_provider,
    email_confirmed_at = excluded.email_confirmed_at,
    last_sign_in_at = excluded.last_sign_in_at,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists sync_profile_from_auth_user on auth.users;
create trigger sync_profile_from_auth_user
  after insert or update of email, raw_user_meta_data, raw_app_meta_data, email_confirmed_at, last_sign_in_at
  on auth.users
  for each row execute function public.sync_profile_from_auth_user();

insert into public.profiles (
  id,
  email,
  full_name,
  phone,
  username,
  auth_provider,
  email_confirmed_at,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  users.id,
  lower(users.email),
  coalesce(users.raw_user_meta_data ->> 'full_name', users.raw_user_meta_data ->> 'name'),
  users.raw_user_meta_data ->> 'phone',
  users.raw_user_meta_data ->> 'username',
  coalesce(users.raw_app_meta_data ->> 'provider', 'email'),
  users.email_confirmed_at,
  users.last_sign_in_at,
  coalesce(users.created_at, now()),
  now()
from auth.users
where users.email is not null
on conflict (id) do update set
  email = excluded.email,
  full_name = coalesce(excluded.full_name, public.profiles.full_name),
  phone = coalesce(excluded.phone, public.profiles.phone),
  username = coalesce(excluded.username, public.profiles.username),
  auth_provider = excluded.auth_provider,
  email_confirmed_at = excluded.email_confirmed_at,
  last_sign_in_at = excluded.last_sign_in_at,
  updated_at = now();

do $$
begin
  if to_regclass('public.customers') is not null then
    update public.profiles
    set
      full_name = coalesce(nullif(customers.name, ''), public.profiles.full_name),
      phone = coalesce(nullif(customers.phone, ''), public.profiles.phone),
      username = coalesce(nullif(customers.username, ''), public.profiles.username),
      address = coalesce(nullif(customers.address, ''), public.profiles.address),
      city = coalesce(nullif(customers.city, ''), public.profiles.city),
      notes = coalesce(nullif(customers.notes, ''), public.profiles.notes),
      updated_at = now()
    from public.customers
    where public.profiles.id = customers.id;
  end if;
end;
$$;

drop table if exists public.email_verifications;
drop table if exists public.password_resets;
drop table if exists public.customer_sessions;
drop table if exists public.customers;

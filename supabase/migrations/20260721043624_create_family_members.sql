create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phone_id uuid references public.user_phones(id) on delete set null,
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  relationship text not null default 'other' check (relationship in ('me', 'father', 'mother', 'wife', 'husband', 'son', 'daughter', 'sister', 'brother', 'grandfather', 'grandmother', 'friend', 'other')),
  avatar_key text not null default 'other' check (avatar_key in ('me', 'father', 'mother', 'sister', 'brother', 'friend', 'other')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.family_members enable row level security;

grant select, insert, update, delete on public.family_members to authenticated;
grant select, insert, update, delete on public.family_members to service_role;

create index if not exists family_members_user_id_created_at_idx
  on public.family_members (user_id, created_at desc);

create index if not exists family_members_phone_id_idx
  on public.family_members (phone_id);

drop policy if exists "family_members_select_own" on public.family_members;
create policy "family_members_select_own"
  on public.family_members
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "family_members_insert_own" on public.family_members;
create policy "family_members_insert_own"
  on public.family_members
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "family_members_update_own" on public.family_members;
create policy "family_members_update_own"
  on public.family_members
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "family_members_delete_own" on public.family_members;
create policy "family_members_delete_own"
  on public.family_members
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.set_family_members_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_family_members_updated_at on public.family_members;
create trigger set_family_members_updated_at
  before update on public.family_members
  for each row execute function public.set_family_members_updated_at();

do $$
begin
  if to_regclass('public.family_rep_visits') is not null then
    alter table public.family_rep_visits
      add column if not exists family_member_id uuid references public.family_members(id) on delete set null,
      add column if not exists family_member_name text,
      add column if not exists family_member_relationship text;

    create index if not exists family_rep_visits_family_member_id_idx
      on public.family_rep_visits (family_member_id);
  end if;
end $$;

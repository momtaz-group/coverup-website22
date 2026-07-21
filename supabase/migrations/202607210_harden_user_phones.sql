create table if not exists public.user_phones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phone_name text not null check (char_length(trim(phone_name)) between 1 and 80),
  brand text not null check (char_length(trim(brand)) between 1 and 80),
  model text not null check (char_length(trim(model)) between 1 and 120),
  design_key text not null default 'pro' check (design_key in ('pro', 'dual', 'triple', 'ultra')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_phones enable row level security;

grant select, insert, update, delete on public.user_phones to authenticated;
grant select, insert, update, delete on public.user_phones to service_role;

create index if not exists user_phones_user_id_created_at_idx
  on public.user_phones (user_id, created_at desc);

drop policy if exists "user_phones_select_own" on public.user_phones;
create policy "user_phones_select_own"
  on public.user_phones
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "user_phones_insert_own" on public.user_phones;
create policy "user_phones_insert_own"
  on public.user_phones
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_phones_update_own" on public.user_phones;
create policy "user_phones_update_own"
  on public.user_phones
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_phones_delete_own" on public.user_phones;
create policy "user_phones_delete_own"
  on public.user_phones
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.set_user_phones_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_phones_updated_at on public.user_phones;
create trigger set_user_phones_updated_at
  before update on public.user_phones
  for each row execute function public.set_user_phones_updated_at();

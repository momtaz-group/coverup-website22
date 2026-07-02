create extension if not exists pgcrypto;

create table if not exists public.products (
  id text primary key,
  name text not null,
  category text not null default 'منتجات',
  price numeric(10, 2) not null default 0,
  image text not null default '',
  badge text not null default 'متوفر',
  description text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer jsonb not null default '{}'::jsonb,
  items jsonb not null default '[]'::jsonb,
  total numeric(10, 2) not null default 0,
  channel text not null default 'website',
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  phone text not null default '',
  rating int not null default 5 check (rating between 1 and 5),
  message text not null default '',
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  phone text not null default '',
  order_ref text not null default '',
  message text not null default '',
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  phone text not null default '',
  message text not null default '',
  reply text not null default '',
  transcript jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.reviews enable row level security;
alter table public.complaints enable row level security;
alter table public.chats enable row level security;

drop policy if exists "public can read active products" on public.products;
create policy "public can read active products"
on public.products for select
to anon
using (is_active = true);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

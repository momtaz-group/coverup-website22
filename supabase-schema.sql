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
  customer_id uuid,
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

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  phone text not null default '',
  email text not null default '',
  username text not null unique,
  password_hash text not null,
  password_salt text not null,
  address text not null default '',
  city text not null default '',
  notes text not null default '',
  email_verified_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists customers_email_unique
on public.customers (lower(email))
where email <> '';

create unique index if not exists customers_phone_unique
on public.customers (phone)
where phone <> '';

create table if not exists public.password_resets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  email text not null default '',
  phone text not null default '',
  token_hash text not null default '',
  status text not null default 'requested',
  expires_at timestamptz not null default now() + interval '30 minutes',
  created_at timestamptz not null default now()
);

create table if not exists public.email_verifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  email text not null default '',
  code_hash text not null default '',
  status text not null default 'pending',
  expires_at timestamptz not null default now() + interval '15 minutes',
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.orders add column if not exists customer_id uuid;
alter table public.orders enable row level security;
alter table public.reviews enable row level security;
alter table public.complaints enable row level security;
alter table public.chats enable row level security;
alter table public.customers add column if not exists email_verified_at timestamptz;
alter table public.customers enable row level security;
alter table public.password_resets enable row level security;
alter table public.email_verifications enable row level security;

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

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'orders_customer_id_fkey'
  ) then
    alter table public.orders
    add constraint orders_customer_id_fkey
    foreign key (customer_id) references public.customers(id)
    on delete set null;
  end if;
end $$;

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

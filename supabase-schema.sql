create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.products (
  id text primary key,
  name text not null,
  category text not null default 'منتجات',
  price numeric(10, 2) not null default 0,
  image text not null default '',
  badge text not null default 'متوفر',
  description text not null default '',
  sku text not null default '',
  stock_quantity integer not null default 0,
  is_in_stock boolean not null default true,
  compatible_models jsonb not null default '[]'::jsonb,
  colors jsonb not null default '[]'::jsonb,
  material text not null default '',
  featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  customer jsonb not null default '{}'::jsonb,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(10, 2) not null default 0,
  total numeric(10, 2) not null default 0,
  grand_total numeric(10, 2) not null default 0,
  channel text not null default 'website',
  status text not null default 'new',
  status_history jsonb not null default '[]'::jsonb,
  payment_method text not null default 'cash',
  payment_status text not null default 'pending',
  payment_transaction_id text not null default '',
  payment_reference text not null default '',
  payment_payload jsonb,
  discount_code text not null default '',
  discount_amount numeric(10, 2) not null default 0,
  delivery_method text not null default 'delivery',
  delivery_fee numeric(10, 2) not null default 0,
  location_link text not null default '',
  notes text not null default '',
  inventory_reserved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
  avatar_url text not null default '',
  email_verified_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_sessions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  token_hash text not null unique,
  user_agent text not null default '',
  ip_address text not null default '',
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  created_at timestamptz not null default now()
);

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

alter table public.products add column if not exists sku text not null default '';
alter table public.products add column if not exists stock_quantity integer not null default 0;
alter table public.products add column if not exists is_in_stock boolean not null default true;
alter table public.products add column if not exists compatible_models jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists colors jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists material text not null default '';
alter table public.products add column if not exists featured boolean not null default false;

alter table public.orders add column if not exists customer_id uuid;
alter table public.orders add column if not exists subtotal numeric(10, 2) not null default 0;
alter table public.orders add column if not exists grand_total numeric(10, 2) not null default 0;
alter table public.orders add column if not exists status_history jsonb not null default '[]'::jsonb;
alter table public.orders add column if not exists payment_method text not null default 'cash';
alter table public.orders add column if not exists payment_status text not null default 'pending';
alter table public.orders add column if not exists payment_transaction_id text not null default '';
alter table public.orders add column if not exists payment_reference text not null default '';
alter table public.orders add column if not exists payment_payload jsonb;
alter table public.orders add column if not exists discount_code text not null default '';
alter table public.orders add column if not exists discount_amount numeric(10, 2) not null default 0;
alter table public.orders add column if not exists delivery_method text not null default 'delivery';
alter table public.orders add column if not exists delivery_fee numeric(10, 2) not null default 0;
alter table public.orders add column if not exists location_link text not null default '';
alter table public.orders add column if not exists notes text not null default '';
alter table public.orders add column if not exists inventory_reserved boolean not null default false;
alter table public.orders add column if not exists updated_at timestamptz not null default now();

alter table public.customers add column if not exists avatar_url text not null default '';
alter table public.customers add column if not exists email_verified_at timestamptz;
alter table public.customers add column if not exists updated_at timestamptz not null default now();

create unique index if not exists customers_email_unique
on public.customers (lower(email))
where email <> '';

create unique index if not exists customers_phone_unique
on public.customers (phone)
where phone <> '';

create unique index if not exists products_sku_unique
on public.products (sku)
where sku <> '';

create unique index if not exists orders_payment_reference_unique
on public.orders (payment_reference)
where payment_reference <> '';

create unique index if not exists customer_sessions_token_hash_unique
on public.customer_sessions (token_hash);

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.reviews enable row level security;
alter table public.complaints enable row level security;
alter table public.chats enable row level security;
alter table public.customers enable row level security;
alter table public.customer_sessions enable row level security;
alter table public.password_resets enable row level security;
alter table public.email_verifications enable row level security;

drop policy if exists "public can read active products" on public.products;
create policy "public can read active products"
on public.products for select
to anon
using (is_active = true);

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('customer-avatars', 'customer-avatars', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "public can read product images" on storage.objects;
create policy "public can read product images"
on storage.objects for select
to public
using (bucket_id = 'product-images');

drop policy if exists "public can read customer avatars" on storage.objects;
create policy "public can read customer avatars"
on storage.objects for select
to public
using (bucket_id = 'customer-avatars');

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

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

alter table public.products
add column if not exists product_type text not null default 'simple';

alter table public.products
drop constraint if exists products_product_type_check;

alter table public.products
add constraint products_product_type_check
check (product_type in ('simple', 'device_versions'));

create unique index if not exists products_sku_unique_when_present_idx
on public.products (lower(sku))
where coalesce(trim(sku), '') <> '';

create table if not exists public.brands (
  id text primary key,
  name text not null unique check (char_length(trim(name)) between 1 and 80),
  slug text not null unique check (char_length(trim(slug)) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.device_families (
  id text primary key,
  brand_id text not null references public.brands(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  slug text not null check (char_length(trim(slug)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint device_families_brand_slug_unique unique (brand_id, slug)
);

create table if not exists public.device_models (
  id text primary key,
  brand_id text not null references public.brands(id) on delete cascade,
  family_id text not null references public.device_families(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  slug text not null check (char_length(trim(slug)) between 1 and 140),
  release_year integer,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint device_models_family_slug_unique unique (family_id, slug)
);

alter table public.brands enable row level security;
alter table public.device_families enable row level security;
alter table public.device_models enable row level security;

grant select on table public.brands, public.device_families, public.device_models to anon, authenticated;
grant select, insert, update, delete on table public.brands, public.device_families, public.device_models to service_role;

drop policy if exists "Public can read brands" on public.brands;
create policy "Public can read brands"
on public.brands
for select
to anon, authenticated
using (true);

drop policy if exists "Public can read device families" on public.device_families;
create policy "Public can read device families"
on public.device_families
for select
to anon, authenticated
using (true);

drop policy if exists "Public can read active device models" on public.device_models;
create policy "Public can read active device models"
on public.device_models
for select
to anon, authenticated
using (active = true);

alter table public.product_versions
add column if not exists device_model_id text,
add column if not exists version_name text,
add column if not exists brand_id text,
add column if not exists family_id text,
add column if not exists brand text not null default '',
add column if not exists product_family text not null default '',
add column if not exists barcode text,
add column if not exists compare_at_price numeric(12, 2),
add column if not exists main_image_url text,
add column if not exists status text not null default 'active',
add column if not exists sort_order integer not null default 0,
add column if not exists deleted_at timestamptz;

insert into public.brands (id, name, slug)
values ('unknown', 'Unknown', 'unknown')
on conflict (id) do nothing;

insert into public.device_families (id, brand_id, name, slug)
values ('unknown-devices', 'unknown', 'Unknown Devices', 'unknown-devices')
on conflict (id) do nothing;

update public.product_versions
set version_name = coalesce(nullif(trim(version_name), ''), phone_model),
    device_model_id = coalesce(nullif(trim(device_model_id), ''), regexp_replace(lower(phone_model), '[^a-z0-9]+', '-', 'g')),
    brand_id = coalesce(nullif(trim(brand_id), ''), 'unknown'),
    family_id = coalesce(nullif(trim(family_id), ''), 'unknown-devices'),
    status = case when is_active then 'active' else 'inactive' end
where version_name is null or device_model_id is null or brand_id is null or family_id is null;

insert into public.device_models (id, brand_id, family_id, name, slug, active)
select distinct
  coalesce(nullif(trim(device_model_id), ''), regexp_replace(lower(phone_model), '[^a-z0-9]+', '-', 'g')),
  'unknown',
  'unknown-devices',
  phone_model,
  regexp_replace(lower(phone_model), '[^a-z0-9]+', '-', 'g'),
  true
from public.product_versions
where coalesce(trim(phone_model), '') <> ''
on conflict (id) do nothing;

alter table public.product_versions
alter column version_name set not null,
alter column device_model_id set not null,
alter column brand_id set not null,
alter column family_id set not null,
alter column price set not null,
alter column stock_quantity set not null;

alter table public.product_versions
drop constraint if exists product_versions_device_model_fkey;
alter table public.product_versions
add constraint product_versions_device_model_fkey
foreign key (device_model_id) references public.device_models(id) on delete restrict;

alter table public.product_versions
drop constraint if exists product_versions_brand_fkey;
alter table public.product_versions
add constraint product_versions_brand_fkey
foreign key (brand_id) references public.brands(id) on delete restrict;

alter table public.product_versions
drop constraint if exists product_versions_family_fkey;
alter table public.product_versions
add constraint product_versions_family_fkey
foreign key (family_id) references public.device_families(id) on delete restrict;

alter table public.product_versions
drop constraint if exists product_versions_status_check;
alter table public.product_versions
add constraint product_versions_status_check
check (status in ('active', 'inactive'));

alter table public.product_versions
drop constraint if exists product_versions_compare_at_price_check;
alter table public.product_versions
add constraint product_versions_compare_at_price_check
check (compare_at_price is null or compare_at_price >= 0);

alter table public.product_versions
drop constraint if exists product_versions_product_phone_unique;

create unique index if not exists product_versions_product_device_model_unique_idx
on public.product_versions (product_id, device_model_id)
where deleted_at is null;

create unique index if not exists product_versions_sku_unique_when_present_idx
on public.product_versions (lower(sku))
where coalesce(trim(sku), '') <> '' and deleted_at is null;

create index if not exists product_versions_device_model_id_idx
on public.product_versions (device_model_id);

create index if not exists product_versions_status_idx
on public.product_versions (status)
where deleted_at is null;

create index if not exists product_versions_product_sort_idx
on public.product_versions (product_id, sort_order, created_at)
where deleted_at is null;

create table if not exists public.product_version_images (
  id uuid primary key default gen_random_uuid(),
  product_version_id uuid not null references public.product_versions(id) on delete cascade,
  image_url text not null check (char_length(trim(image_url)) > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.product_version_images enable row level security;

grant select on table public.product_version_images to anon, authenticated;
grant select, insert, update, delete on table public.product_version_images to service_role;

drop policy if exists "Public can read active product version images" on public.product_version_images;
create policy "Public can read active product version images"
on public.product_version_images
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.product_versions pv
    where pv.id = product_version_images.product_version_id
      and pv.status = 'active'
      and pv.deleted_at is null
  )
);

create index if not exists product_version_images_version_sort_idx
on public.product_version_images (product_version_id, sort_order, created_at);

drop policy if exists "Public can read active product versions" on public.product_versions;
create policy "Public can read active product versions"
on public.product_versions
for select
to anon, authenticated
using (status = 'active' and deleted_at is null);

create table if not exists public.product_versions (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete cascade,
  phone_model text not null check (char_length(trim(phone_model)) between 1 and 120),
  sku text not null default '',
  price numeric(12, 2) check (price is null or price >= 0),
  stock_quantity integer check (stock_quantity is null or stock_quantity >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_versions_product_phone_unique unique (product_id, phone_model)
);

alter table public.product_versions enable row level security;

grant select on table public.product_versions to anon, authenticated;
grant select, insert, update, delete on table public.product_versions to service_role;

drop policy if exists "Public can read active product versions" on public.product_versions;
create policy "Public can read active product versions"
on public.product_versions
for select
to anon, authenticated
using (is_active = true);

create index if not exists product_versions_product_id_idx
on public.product_versions (product_id);

create index if not exists product_versions_phone_model_idx
on public.product_versions (phone_model)
where is_active = true;

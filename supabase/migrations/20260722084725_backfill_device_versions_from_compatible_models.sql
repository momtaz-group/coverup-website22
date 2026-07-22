update public.products
set product_type = 'device_versions'
where lower(coalesce(category, '') || ' ' || coalesce(category_en, '')) similar to
  '%(phone cases|phone covers|cases|covers|screen protectors|screen protection|كفر|كفرات|حماية الشاشة|اسكرينة|سكرينة)%'
  and jsonb_array_length(coalesce(compatible_models, '[]'::jsonb)) > 0;

with source_versions as (
  select
    p.id as product_id,
    p.name as product_name,
    coalesce(nullif(trim(p.brand), ''), 'Unknown') as brand_name,
    coalesce(nullif(trim(p.product_family), ''), 'Devices') as family_name,
    model.value #>> '{}' as phone_model,
    p.price,
    p.stock_quantity,
    p.image,
    p.sku,
    row_number() over (partition by p.id order by model.ordinality) - 1 as sort_order
  from public.products p
  cross join lateral jsonb_array_elements(coalesce(p.compatible_models, '[]'::jsonb)) with ordinality as model(value, ordinality)
  where p.product_type = 'device_versions'
),
ids as (
  select
    *,
    coalesce(nullif(trim(regexp_replace(lower(brand_name), '[^a-z0-9]+', '-', 'g')), ''), 'unknown') as brand_id,
    coalesce(nullif(trim(regexp_replace(lower(brand_name), '[^a-z0-9]+', '-', 'g') || '-' || regexp_replace(lower(family_name), '[^a-z0-9]+', '-', 'g')), '-'), 'unknown-devices') as family_id,
    coalesce(nullif(trim(regexp_replace(lower(brand_name), '[^a-z0-9]+', '-', 'g') || '-' || regexp_replace(lower(family_name), '[^a-z0-9]+', '-', 'g') || '-' || regexp_replace(lower(phone_model), '[^a-z0-9]+', '-', 'g')), '--'), regexp_replace(lower(phone_model), '[^a-z0-9]+', '-', 'g')) as model_id,
    coalesce(nullif(trim(regexp_replace(lower(phone_model), '[^a-z0-9]+', '-', 'g')), ''), 'model') as model_slug
  from source_versions
  where coalesce(trim(phone_model), '') <> ''
)
insert into public.brands (id, name, slug)
select distinct brand_id, brand_name, brand_id
from ids
on conflict (id) do nothing;

with source_versions as (
  select
    coalesce(nullif(trim(p.brand), ''), 'Unknown') as brand_name,
    coalesce(nullif(trim(p.product_family), ''), 'Devices') as family_name,
    model.value #>> '{}' as phone_model
  from public.products p
  cross join lateral jsonb_array_elements(coalesce(p.compatible_models, '[]'::jsonb)) as model(value)
  where p.product_type = 'device_versions'
),
ids as (
  select distinct
    coalesce(nullif(trim(regexp_replace(lower(brand_name), '[^a-z0-9]+', '-', 'g')), ''), 'unknown') as brand_id,
    coalesce(nullif(trim(regexp_replace(lower(brand_name), '[^a-z0-9]+', '-', 'g') || '-' || regexp_replace(lower(family_name), '[^a-z0-9]+', '-', 'g')), '-'), 'unknown-devices') as family_id,
    family_name,
    coalesce(nullif(trim(regexp_replace(lower(family_name), '[^a-z0-9]+', '-', 'g')), ''), 'devices') as family_slug
  from source_versions
  where coalesce(trim(phone_model), '') <> ''
)
insert into public.device_families (id, brand_id, name, slug)
select family_id, brand_id, family_name, family_slug
from ids
on conflict (id) do nothing;

with source_versions as (
  select
    coalesce(nullif(trim(p.brand), ''), 'Unknown') as brand_name,
    coalesce(nullif(trim(p.product_family), ''), 'Devices') as family_name,
    model.value #>> '{}' as phone_model
  from public.products p
  cross join lateral jsonb_array_elements(coalesce(p.compatible_models, '[]'::jsonb)) as model(value)
  where p.product_type = 'device_versions'
),
ids as (
  select distinct
    coalesce(nullif(trim(regexp_replace(lower(brand_name), '[^a-z0-9]+', '-', 'g')), ''), 'unknown') as brand_id,
    coalesce(nullif(trim(regexp_replace(lower(brand_name), '[^a-z0-9]+', '-', 'g') || '-' || regexp_replace(lower(family_name), '[^a-z0-9]+', '-', 'g')), '-'), 'unknown-devices') as family_id,
    coalesce(nullif(trim(regexp_replace(lower(brand_name), '[^a-z0-9]+', '-', 'g') || '-' || regexp_replace(lower(family_name), '[^a-z0-9]+', '-', 'g') || '-' || regexp_replace(lower(phone_model), '[^a-z0-9]+', '-', 'g')), '--'), regexp_replace(lower(phone_model), '[^a-z0-9]+', '-', 'g')) as model_id,
    phone_model,
    coalesce(nullif(trim(regexp_replace(lower(phone_model), '[^a-z0-9]+', '-', 'g')), ''), 'model') as model_slug
  from source_versions
  where coalesce(trim(phone_model), '') <> ''
)
insert into public.device_models (id, brand_id, family_id, name, slug, active)
select model_id, brand_id, family_id, phone_model, model_slug, true
from ids
on conflict (id) do nothing;

with source_versions as (
  select
    p.id as product_id,
    p.name as product_name,
    coalesce(nullif(trim(p.brand), ''), 'Unknown') as brand_name,
    coalesce(nullif(trim(p.product_family), ''), 'Devices') as family_name,
    model.value #>> '{}' as phone_model,
    p.price,
    p.stock_quantity,
    p.image,
    p.sku,
    row_number() over (partition by p.id order by model.ordinality) - 1 as sort_order
  from public.products p
  cross join lateral jsonb_array_elements(coalesce(p.compatible_models, '[]'::jsonb)) with ordinality as model(value, ordinality)
  where p.product_type = 'device_versions'
),
ids as (
  select
    *,
    coalesce(nullif(trim(regexp_replace(lower(brand_name), '[^a-z0-9]+', '-', 'g')), ''), 'unknown') as brand_id,
    coalesce(nullif(trim(regexp_replace(lower(brand_name), '[^a-z0-9]+', '-', 'g') || '-' || regexp_replace(lower(family_name), '[^a-z0-9]+', '-', 'g')), '-'), 'unknown-devices') as family_id,
    coalesce(nullif(trim(regexp_replace(lower(brand_name), '[^a-z0-9]+', '-', 'g') || '-' || regexp_replace(lower(family_name), '[^a-z0-9]+', '-', 'g') || '-' || regexp_replace(lower(phone_model), '[^a-z0-9]+', '-', 'g')), '--'), regexp_replace(lower(phone_model), '[^a-z0-9]+', '-', 'g')) as model_id
  from source_versions
  where coalesce(trim(phone_model), '') <> ''
)
insert into public.product_versions (
  product_id,
  version_name,
  device_model_id,
  brand_id,
  family_id,
  brand,
  product_family,
  phone_model,
  sku,
  price,
  stock_quantity,
  main_image_url,
  status,
  is_active,
  sort_order
)
select
  product_id,
  product_name || ' - ' || phone_model,
  model_id,
  brand_id,
  family_id,
  brand_name,
  family_name,
  phone_model,
  left(coalesce(nullif(trim(sku), ''), product_id) || '-' || regexp_replace(lower(phone_model), '[^a-z0-9]+', '-', 'g'), 120),
  greatest(0, coalesce(price, 0)),
  greatest(0, coalesce(stock_quantity, 0)),
  coalesce(image, ''),
  case when coalesce(stock_quantity, 0) > 0 then 'active' else 'inactive' end,
  coalesce(stock_quantity, 0) > 0,
  sort_order
from ids
on conflict do nothing;

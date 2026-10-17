-- Slender Hub storefront v3: persistent games/categories, product presentation fields,
-- and admin-managed public images. Apply once to project pypfcdczatmsnqjuggiq.
begin;

create table if not exists public.store_games (
  id text primary key,
  name text not null,
  thumb text,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint store_games_name_not_blank check (length(btrim(name)) > 0)
);
create unique index if not exists store_games_name_unique on public.store_games (lower(name));
create index if not exists store_games_sort_idx on public.store_games (sort_order, name);
alter table public.store_games enable row level security;
create policy store_games_read on public.store_games for select to anon, authenticated using (true);
create policy store_games_insert on public.store_games for insert to authenticated with check ((select public.is_admin()));
create policy store_games_update on public.store_games for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy store_games_delete on public.store_games for delete to authenticated using ((select public.is_admin()));
grant select on public.store_games to anon, authenticated;
grant insert, update, delete on public.store_games to authenticated;

insert into public.store_games (id, name, thumb, description, sort_order) values
  ('game-1', 'Pet Simulator 99', '/images/fire_dragon.jpg', 'Pets, itens e encantamentos', 1),
  ('game-2', 'Tap Simulator Reborn', '/images/shinigami.jpg', 'Pets e multiplicadores', 2),
  ('game-3', 'Blox Fruits', '/images/hero_banner.jpg', 'Frutas e gamepasses', 3),
  ('game-4', 'Blade Ball', '/images/gargantuan.jpg', 'Itens e espadas', 4),
  ('game-5', 'Toilet Tower Defense', '/images/shinigami.jpg', 'Unidades e itens', 5),
  ('game-6', 'Outros Jogos', '/images/hero_banner.jpg', 'Outros jogos Roblox', 6)
on conflict (id) do nothing;

create table if not exists public.store_categories (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now(),
  constraint store_categories_name_not_blank check (length(btrim(name)) > 0)
);
create unique index if not exists store_categories_name_unique on public.store_categories (lower(name));
alter table public.store_categories enable row level security;
create policy store_categories_read on public.store_categories for select to anon, authenticated using (true);
create policy store_categories_insert on public.store_categories for insert to authenticated with check ((select public.is_admin()));
create policy store_categories_update on public.store_categories for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy store_categories_delete on public.store_categories for delete to authenticated using ((select public.is_admin()));
grant select on public.store_categories to anon, authenticated;
grant insert, update, delete on public.store_categories to authenticated;
insert into public.store_categories (id, name) values
  ('cat-1', 'Pets'), ('cat-2', 'Gamepasses'), ('cat-3', 'Itens / Enchantments'),
  ('cat-4', 'Contas Roblox'), ('cat-5', 'Gargantuan Pets'), ('cat-6', 'Moedas / Robux')
on conflict (id) do nothing;

alter table public.products
  add column if not exists game_name text,
  add column if not exists short_description text,
  add column if not exists original_price numeric,
  add column if not exists delivery_mode text not null default 'manual',
  add column if not exists is_draft boolean not null default false;
alter table public.products
  add constraint products_original_price_nonnegative check (original_price is null or original_price >= 0),
  add constraint products_delivery_mode_valid check (delivery_mode in ('manual', 'digital'));
create index if not exists products_game_name_idx on public.products (lower(game_name));
create index if not exists products_live_idx on public.products (created_at desc) where is_draft = false;

-- Existing open SELECT policies need to be replaced so drafts stay in the admin UI.
drop policy if exists "Leitura publica de produtos" on public.products;
drop policy if exists products_select_all on public.products;
create policy products_read_live_or_admin on public.products for select to anon, authenticated
  using (is_draft = false or (select public.is_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('store-media', 'store-media', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = excluded.allowed_mime_types;
create policy store_media_insert_admin on storage.objects for insert to authenticated
  with check (bucket_id = 'store-media' and (select public.is_admin()));
create policy store_media_delete_admin on storage.objects for delete to authenticated
  using (bucket_id = 'store-media' and (select public.is_admin()));

create or replace function public.save_store_product(p_product jsonb, p_create boolean)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_product public.products%rowtype;
  v_variant jsonb;
  v_variants jsonb := coalesce(p_product->'variants', '[]'::jsonb);
  v_ids text[] := array[]::text[];
  v_id text := p_product->>'id';
  v_price numeric;
  v_rows integer;
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false) then
    raise exception 'Acesso restrito a administradores.' using errcode = '42501';
  end if;
  if p_create is null or jsonb_typeof(p_product) is distinct from 'object'
    or coalesce(btrim(v_id), '') = ''
    or coalesce(btrim(p_product->>'title'), '') = ''
    or coalesce(btrim(p_product->>'description'), '') = ''
    or coalesce(btrim(p_product->>'category'), '') = '' then
    raise exception 'Preencha título, descrição e categoria.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_product->'price') is distinct from 'number'
    or (p_product->>'price')::numeric < 0
    or jsonb_typeof(p_product->'stock') is distinct from 'number'
    or (p_product->>'stock')::numeric < 0
    or (p_product->>'stock')::numeric <> trunc((p_product->>'stock')::numeric)
    or jsonb_typeof(v_variants) is distinct from 'array'
    or (p_product->>'original_price') is not null and (
      jsonb_typeof(p_product->'original_price') is distinct from 'number'
      or (p_product->>'original_price')::numeric < 0)
    or coalesce(p_product->>'delivery_mode', 'manual') not in ('manual', 'digital') then
    raise exception 'Preço, estoque ou variantes inválidos.' using errcode = '22023';
  end if;

  for v_variant in select value from jsonb_array_elements(v_variants) loop
    if coalesce(btrim(v_variant->>'id'), '') = ''
      or v_variant->>'id' = any(v_ids)
      or coalesce(btrim(v_variant->>'name'), '') = ''
      or jsonb_typeof(v_variant->'price') is distinct from 'number'
      or (v_variant->>'price')::numeric < 0 then
      raise exception 'Nome, identificador ou preço de variante inválido.' using errcode = '22023';
    end if;
    if v_variant->>'stock' is not null and (
      jsonb_typeof(v_variant->'stock') is distinct from 'number'
      or (v_variant->>'stock')::numeric < 0
      or (v_variant->>'stock')::numeric <> trunc((v_variant->>'stock')::numeric)) then
      raise exception 'Estoque de variante inválido.' using errcode = '22023';
    end if;
    v_ids := array_append(v_ids, v_variant->>'id');
  end loop;
  select coalesce(min((value->>'price')::numeric), (p_product->>'price')::numeric)
    into v_price from jsonb_array_elements(v_variants);

  if p_create then
    insert into public.products (id, title, description, price, image, category, stock, featured,
      game_name, short_description, original_price, delivery_mode, is_draft)
    values (v_id, btrim(p_product->>'title'), btrim(p_product->>'description'), v_price,
      coalesce(p_product->>'image', ''), btrim(p_product->>'category'),
      (p_product->>'stock')::integer, coalesce((p_product->>'featured')::boolean, false),
      nullif(btrim(p_product->>'game_name'), ''), nullif(btrim(p_product->>'short_description'), ''),
      (p_product->>'original_price')::numeric, coalesce(p_product->>'delivery_mode', 'manual'),
      coalesce((p_product->>'is_draft')::boolean, false))
    returning * into v_product;
  else
    update public.products set
      title = btrim(p_product->>'title'), description = btrim(p_product->>'description'),
      price = v_price, image = coalesce(p_product->>'image', ''),
      category = btrim(p_product->>'category'), stock = (p_product->>'stock')::integer,
      featured = coalesce((p_product->>'featured')::boolean, false),
      game_name = nullif(btrim(p_product->>'game_name'), ''),
      short_description = nullif(btrim(p_product->>'short_description'), ''),
      original_price = (p_product->>'original_price')::numeric,
      delivery_mode = coalesce(p_product->>'delivery_mode', 'manual'),
      is_draft = coalesce((p_product->>'is_draft')::boolean, false)
    where id = v_id returning * into v_product;
    if not found then
      raise exception 'Produto não encontrado ou edição não autorizada.' using errcode = 'P0002';
    end if;
  end if;

  for v_variant in select value from jsonb_array_elements(v_variants) loop
    insert into public.product_variants (id, product_id, name, price, image, category, stock)
    values (v_variant->>'id', v_id, btrim(v_variant->>'name'), (v_variant->>'price')::numeric,
      v_variant->>'image', nullif(btrim(v_variant->>'category'), ''), (v_variant->>'stock')::integer)
    on conflict (id) do update set name = excluded.name, price = excluded.price,
      image = excluded.image, category = excluded.category, stock = excluded.stock
    where public.product_variants.product_id = v_id;
    get diagnostics v_rows = row_count;
    if v_rows <> 1 then
      raise exception 'A variante pertence a outro produto.' using errcode = '22023';
    end if;
  end loop;
  delete from public.product_variants where product_id = v_id and not (id = any(v_ids));
  if exists (select 1 from public.product_variants where product_id = v_id and not (id = any(v_ids))) then
    raise exception 'A remoção das variantes não foi autorizada.' using errcode = '42501';
  end if;
  return to_jsonb(v_product) || jsonb_build_object('variants', coalesce(
    (select jsonb_agg(to_jsonb(v) order by v.created_at, v.id) from public.product_variants v where v.product_id = v_id),
    '[]'::jsonb));
end;
$$;
revoke all on function public.save_store_product(jsonb, boolean) from public, anon;
grant execute on function public.save_store_product(jsonb, boolean) to authenticated;
notify pgrst, 'reload schema';
commit;

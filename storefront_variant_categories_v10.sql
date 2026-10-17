-- Reuse existing variant groups as storefront item filters.
begin;

insert into public.store_categories (id, name, game_id)
select 'cat-ps99-' || seed.slug, seed.name, game.id
from public.store_games game
cross join (values
  ('diamantes', 'Diamantes'),
  ('encantamentos', 'Encantamentos'),
  ('ovos', 'Ovos'),
  ('itens', 'Itens')
) as seed(slug, name)
where game.name = 'Pet Simulator 99'
on conflict do nothing;

insert into public.store_categories (id, name, game_id)
select 'cat-' || seed.slug || '-' || game.id, seed.name, game.id
from public.store_games game
join (values
  ('Tap Simulator Reborn', 'secretos', 'Secretos'),
  ('99 Nights in the Forest', 'diamantes', 'Diamantes')
) as seed(game_name, slug, name) on seed.game_name = game.name
on conflict do nothing;

update public.product_variants variant
set category = case variant.category
  when 'Secret' then 'Secretos'
  when 'Titanics' then 'Titãs'
  when 'Diamonds' then 'Diamantes'
  when 'EGGS' then 'Ovos'
  when 'Enchants' then 'Encantamentos'
  when 'Accounts' then 'Contas Roblox'
  else variant.category
end
from public.products product
where variant.product_id = product.id
  and product.game_name = 'Pet Simulator 99'
  and variant.category in ('Secret', 'Titanics', 'Diamonds', 'EGGS', 'Enchants', 'Accounts');

update public.product_variants variant
set category = 'Secretos'
from public.products product
where variant.product_id = product.id
  and product.game_name = 'Tap Simulator Reborn'
  and variant.category = 'Secret';

update public.product_variants variant
set category = 'Diamantes'
from public.products product
where variant.product_id = product.id
  and product.game_name = '99 Nights in the Forest'
  and variant.category = 'Diamonds';

commit;

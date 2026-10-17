-- Categories can be global or specific to a Roblox game.
begin;

alter table public.store_categories
  add column if not exists game_id text references public.store_games(id) on delete cascade;

drop index if exists public.store_categories_name_unique;
create unique index if not exists store_categories_scope_name_unique
  on public.store_categories (coalesce(game_id, ''), lower(name));
create index if not exists store_categories_game_id_idx
  on public.store_categories (game_id);

insert into public.store_categories (id, name, game_id)
select 'cat-ps99-' || seed.slug, seed.name, game.id
from public.store_games game
cross join (values
  ('gargantuan', 'Gargantuan'),
  ('hats', 'Hats'),
  ('huges', 'Huges'),
  ('titans', 'Titãs'),
  ('secretos', 'Secretos'),
  ('outros-pets', 'Outros Pets')
) as seed(slug, name)
where game.name = 'Pet Simulator 99'
on conflict do nothing;

notify pgrst, 'reload schema';
commit;

begin;

insert into public.store_games (id, name, thumb, description, sort_order)
select 'game-99-nights', '99 Nights in the Forest', p.image, 'Itens para 99 Nights in the Forest', 7
from public.products p
where p.title ilike '%99 Nights in the Forest%'
limit 1
on conflict do nothing;

update public.products set game_name = 'Tap Simulator Reborn'
where game_name is null and title ilike '%Tap Simulator Reborn%';
update public.products set game_name = 'Pet Simulator 99'
where game_name is null and (title ilike '%Pet Simulator 99%' or title ilike 'Ps99%');
update public.products set game_name = '99 Nights in the Forest'
where game_name is null and title ilike '%99 Nights in the Forest%';

notify pgrst, 'reload schema';
commit;

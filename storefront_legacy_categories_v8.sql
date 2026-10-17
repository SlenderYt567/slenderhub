-- Align the five legacy catalog records with categories shown in the product editor.
-- Only old `item` rows with these exact titles are changed.
begin;

update public.products
set category = case title
  when 'Tap Simulator Reborn Pets' then 'Pets'
  when 'Pet Simulator 99 Pets/Gems' then 'Pets'
  when 'Pet Simulator 99 Accounts' then 'Contas Roblox'
  when 'Ps99 Enchantments/Itens/Eggs' then 'Itens / Enchantments'
  when 'Diamonds: 99 Nights in the Forest' then 'Moedas / Robux'
  else category
end
where category = 'item'
  and title in (
    'Tap Simulator Reborn Pets',
    'Pet Simulator 99 Pets/Gems',
    'Pet Simulator 99 Accounts',
    'Ps99 Enchantments/Itens/Eggs',
    'Diamonds: 99 Nights in the Forest'
  );

commit;

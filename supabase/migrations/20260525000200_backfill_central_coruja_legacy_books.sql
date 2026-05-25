-- Backfill 11 orphan collections (brand_id IS NULL) that belong to Central Coruja.
-- These were created before brand scoping was enforced and leaked into Kaboo's catalog.

UPDATE collections
SET brand_id = 'bb43daa4-31d7-4517-9acd-423949d09239'
WHERE brand_id IS NULL
  AND title IN (
    'Apresentação da Clara (legenda em inglês)',
    'Belinha Rapper',
    '1. Uhuhuh Nasceu Belinha',
    'As Formas do Jardim',
    'O Enigma Numérico',
    'A Aventura dos Animais',
    'Árvore Guia',
    'Trombone Silencioso',
    'Dia de Piquenique',
    'As Cores da Amizade',
    'Conhecendo a Liga das Corujinhas'
  );

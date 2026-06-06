update public.collections
set
  collection_type = 'kit',
  kit_cover_image = '/mock/covers/kaboo-carta-misteriosa-kit.svg',
  kit_book_ids = array_remove(array[
    (select id::text from public.collections where title = 'Blado e a Caixa dos Sentimentos' limit 1),
    (select id::text from public.collections where title = 'Batatinha e o Espelho da Alegria' limit 1),
    (select id::text from public.collections where title = 'Papa e o Plano Furado' limit 1)
  ], null::text)
where title = 'Kaboo e a Carta Misteriosa';
update public.collections
set
  collection_type = 'kit',
  kit_cover_image = '/mock/covers/mensageiro-cancao-certa-kit.svg',
  kit_book_ids = array_remove(array[
    (select id::text from public.collections where title = 'Gaio e a Hora de Voar Alto' limit 1),
    (select id::text from public.collections where title = 'Blado e a Caixa dos Sentimentos' limit 1),
    (select id::text from public.collections where title = 'Papa e o Plano Furado' limit 1)
  ], null::text)
where title = 'Mensageiro e a Canção Certa';
update public.collections
set
  collection_type = 'kit',
  kit_cover_image = '/mock/covers/baratinha-baratao-labirinto-eco-kit.svg',
  kit_book_ids = array_remove(array[
    (select id::text from public.collections where title = 'Batatinha e o Espelho da Alegria' limit 1),
    (select id::text from public.collections where title = 'Gaio e a Hora de Voar Alto' limit 1)
  ], null::text)
where title = 'Baratinha e Baratão no Labirinto do Eco';
update public.collections
set
  collection_type = 'kit',
  kit_cover_image = '/mock/covers/kaboo-desafio-cores-kit.svg',
  kit_book_ids = array_remove(array[
    (select id::text from public.collections where title = 'Blado e a Caixa dos Sentimentos' limit 1),
    (select id::text from public.collections where title = 'Papa e o Plano Furado' limit 1),
    (select id::text from public.collections where title = 'Gaio e a Hora de Voar Alto' limit 1)
  ], null::text)
where title = 'Kaboo e o Desafio das Cores';

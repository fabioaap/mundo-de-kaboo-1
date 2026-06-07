-- ==============================================================
-- Migration: Seed library hub content
-- Source: /data/library-hubs/*.mock.ts
-- Tables: media_items, media_shelves, media_shelf_items, media_collection_links
--
-- Hub mapping:
--   videos     → 5 unique media_items (media_kind=video,  provider=youtube)
--   music      → 7 unique media_items (media_kind=audio,  provider=external_audio)
--   formations → 7 unique media_items (media_kind=training, provider=external_audio, mime_type=application/pdf)
--   materials  → 7 unique media_items (media_kind=document, provider=external_audio, mime_type=application/pdf)
--
-- Collection ID corrections (3 mock IDs did not exist in DB):
--   784b3238 (Kaboo Carta Misteriosa) → c9da6ab9 (book/reading) | 7cac9059 (book/audio)
--   c6334710 (Mensageiro)             → 588e380a (book/reading) | 67822d3f (book/audio)
--   ad037be3 (Desafio das Cores)      → a9e199ea (book/reading)
--
-- NOTE: Items without real URLs use placeholder 'https://kaboo.dev/content/pending'
-- ==============================================================

-- ─── 1. MEDIA ITEMS (26 rows) ─────────────────────────────────
-- Idempotent: ON CONFLICT DO NOTHING covers both id and slug unique constraints.

INSERT INTO media_items (
  id, hub, media_kind, provider, access_mode,
  title, slug, summary, description,
  status, featured_order,
  external_url, mime_type, duration_seconds,
  metadata, published_at,
  created_at, updated_at
) VALUES

-- ════════════════════════════════════════════════════════════
-- VIDEOS HUB  (5 items)
-- ════════════════════════════════════════════════════════════

-- vid_gaio — featured hero + also in videos-live-now
(
  'a1000001-0001-4001-a001-000000000001',
  'videos', 'video', 'youtube', 'active_subscription',
  'Gaio e o Vento da Coragem, vídeo da coleção',
  'video-gaio-vento-coragem',
  'Vídeo real',
  'Uma entrada forte para abrir a biblioteca com um vídeo que já existe no catálogo infantil e abre direto no player, sem camadas artificiais.',
  'published', 1,
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/video/33efdbb5-abed-4037-9eed-bb7017d19f7a/1769203911843-r8hqd9p-Gaio_e_vento_da_coragem_OK.mov',
  'video/quicktime', NULL,
  '{"eyebrow":"Vídeo disponível","chips":["Educação Infantil"],"ctaLabel":"Abrir coleção","coverImage":"/mock/covers/gaio-vento-coragem.png"}',
  NOW(), NOW(), NOW()
),

-- vid_animation_carta — in videos-carta-pack + videos-live-now
(
  'a1000001-0001-4001-a001-000000000002',
  'videos', 'video', 'youtube', 'active_subscription',
  'Kaboo e a Carta Misteriosa, desenho animado',
  'video-kaboo-carta-animado',
  'Animação',
  'A versão animada abre a área com um conteúdo infantil claro, reconhecível e já pronto para reprodução.',
  'published', 0,
  'https://kaboo.dev/content/pending',
  'video/mp4', NULL,
  '{"eyebrow":"Desenho","chips":["Infantil"],"ctaLabel":"Abrir coleção","coverImage":"/mock/covers/kaboo-carta-misteriosa.png"}',
  NOW(), NOW(), NOW()
),

-- vid_libras — in videos-carta-pack
(
  'a1000001-0001-4001-a001-000000000003',
  'videos', 'video', 'youtube', 'active_subscription',
  'Versão com Libras de Kaboo e a Carta Misteriosa',
  'video-kaboo-carta-libras',
  'Libras',
  'Uma porta de entrada acessível que já mostra a biblioteca como espaço de uso real, não como promessa futura.',
  'published', 0,
  'https://kaboo.dev/content/pending',
  'video/mp4', NULL,
  '{"eyebrow":"Acessível","chips":["Acessível"],"ctaLabel":"Ver coleção","coverImage":"/mock/covers/kaboo-carta-misteriosa-kit.svg"}',
  NOW(), NOW(), NOW()
),

-- vid_how_to — in videos-carta-pack
(
  'a1000001-0001-4001-a001-000000000004',
  'videos', 'video', 'youtube', 'active_subscription',
  'Como jogar com a coleção sem quebrar o ritmo',
  'video-kaboo-como-jogar',
  'Como jogar',
  'Vídeo curto para o adulto entender como conduzir a experiência sem transformar a área em tutorial pesado.',
  'published', 0,
  'https://kaboo.dev/content/pending',
  'video/mp4', NULL,
  '{"eyebrow":"Uso guiado","chips":["Professor"],"ctaLabel":"Abrir coleção","coverImage":"/mock/covers/kaboo-carta-misteriosa.png"}',
  NOW(), NOW(), NOW()
),

-- vid_lesson — in videos-carta-pack
(
  'a1000001-0001-4001-a001-000000000005',
  'videos', 'video', 'youtube', 'active_subscription',
  'Kaboo e a Carta Misteriosa, videoaula de apoio',
  'video-kaboo-carta-videoaula',
  'Videoaula',
  'Uma peça com cara de repertório pedagógico, útil para preparar a conversa antes ou depois da leitura.',
  'published', 0,
  'https://kaboo.dev/content/pending',
  'video/mp4', NULL,
  '{"eyebrow":"Mediação","chips":["Professor"],"ctaLabel":"Abrir coleção","coverImage":"/mock/covers/kaboo-carta-misteriosa.png"}',
  NOW(), NOW(), NOW()
),

-- ════════════════════════════════════════════════════════════
-- MUSIC HUB  (7 items)
-- ════════════════════════════════════════════════════════════

-- mus_mensageiro — featured hero
-- Real audio: Mensageiro.wav in yevysgqlnhonhkczkyhu project (67822d3f)
(
  'a1000002-0001-4001-a001-000000000001',
  'music', 'audio', 'external_audio', 'active_subscription',
  'Mensageiro e a Canção Certa, faixa de acolhimento',
  'audio-mensageiro-cancao-certa',
  '3 min • Faixa destaque • Escuta e presença',
  'Uma abertura que já sugere ritmo, pausa e escuta. O objetivo é fazer a área parecer repertório logo no primeiro contato.',
  'published', 1,
  'https://yevysgqlnhonhkczkyhu.supabase.co/storage/v1/object/public/collections/audio/67822d3f-54a8-48b7-8b1b-8de2012f6603/1780511584463-sh9tn6b-mensageiro.wav',
  'audio/wav', 180,
  '{"eyebrow":"Tocando hoje","chips":["Roda","Acolhimento","1º ao 3º ano"],"ctaLabel":"Abrir coleção","coverImage":"/mock/covers/mensageiro-cancao-certa.png","progress":38}',
  NOW(), NOW(), NOW()
),

-- mus_kaboo_belonging — in music-now
-- Real audio: Carta_misteriosa.wav in yevysgqlnhonhkczkyhu project (7cac9059)
(
  'a1000002-0001-4001-a001-000000000002',
  'music', 'audio', 'external_audio', 'active_subscription',
  'Carta Misteriosa, escuta de coragem',
  'audio-kaboo-carta-escuta',
  '2 min • Abertura • Pertencimento',
  'Uma faixa de abertura para acolher o grupo e preparar a leitura compartilhada sem formalidade excessiva.',
  'published', 0,
  'https://yevysgqlnhonhkczkyhu.supabase.co/storage/v1/object/public/collections/audio/7cac9059-84d6-4551-a4af-77d58ce83585/1780511610066-foej14c-Carta_misteriosa.wav',
  'audio/wav', 120,
  '{"eyebrow":"Faixa curta","chips":["Escuta","Coragem"],"ctaLabel":"Abrir coleção","coverImage":"/mock/covers/kaboo-carta-misteriosa.png"}',
  NOW(), NOW(), NOW()
),

-- mus_gaio_breathe — in music-now
-- Real audio: batatinha-e-o-giro-das-emocoes.mp3 in uuaiacefzdmsdbsvsuoj project (66627622)
(
  'a1000002-0001-4001-a001-000000000003',
  'music', 'audio', 'external_audio', 'active_subscription',
  'Gaio e a Hora de Voar Alto, respirar antes da conversa',
  'audio-gaio-hora-voar-breathe',
  '3 min • Respiro • Autoconsciência',
  'Uma faixa com clima mais aberto para entrada em roda, com pouca fricção e sensação de continuidade.',
  'published', 0,
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/audio/66627622-235a-43f6-ba4b-35522086165c/1768192501446-f3gri8i-batatinha-e-o-giro-das-emocoes.mp3',
  'audio/mpeg', 180,
  '{"eyebrow":"Pausa guiada","chips":["Respiração","Roda"],"ctaLabel":"Abrir coleção","coverImage":"/mock/covers/gaio-hora-voar-alto.png"}',
  NOW(), NOW(), NOW()
),

-- mus_eco_dialogue — in music-now  (Labirinto do Eco — no audio asset exists yet)
(
  'a1000002-0001-4001-a001-000000000004',
  'music', 'audio', 'external_audio', 'active_subscription',
  'Labirinto do Eco, batida para ouvir o outro',
  'audio-labirinto-eco-dialogo',
  '4 min • Batida leve • Convivência',
  'Uma faixa que ajuda a biblioteca a comunicar relação entre som, presença e diálogo sem parecer utilitário.',
  'published', 0,
  'https://kaboo.dev/content/pending',
  'audio/mpeg', 240,
  '{"eyebrow":"Escuta coletiva","chips":["Grupo","Diálogo"],"ctaLabel":"Abrir coleção","coverImage":"/mock/covers/baratinha-baratao-labirinto-eco.png"}',
  NOW(), NOW(), NOW()
),

-- mus_colors — in music-linked  (Desafio das Cores — no audio asset exists yet)
(
  'a1000002-0001-4001-a001-000000000005',
  'music', 'audio', 'external_audio', 'active_subscription',
  'Desafio das Cores, trilha para reparar o clima',
  'audio-desafio-cores-trilha',
  '3 min • Sequência guiada • Conflito e diálogo',
  'Uma faixa de clima mais delicado para acompanhar conversas sobre conflito, cor e convivência.',
  'published', 0,
  'https://kaboo.dev/content/pending',
  'audio/mpeg', 180,
  '{"eyebrow":"Reconciliação","chips":["Reconciliação","Cores"],"ctaLabel":"Abrir coleção","coverImage":"/mock/covers/kaboo-desafio-cores.png"}',
  NOW(), NOW(), NOW()
),

-- mus_mensageiro_playlist — in music-linked  (re-uses Mensageiro audio as playlist entry)
(
  'a1000002-0001-4001-a001-000000000006',
  'music', 'audio', 'external_audio', 'active_subscription',
  'Canções para começar a escutar devagar',
  'audio-mensageiro-playlist',
  '3 faixas • Playlist • Escuta com calma',
  'Uma mini seleção que ajuda a biblioteca de áudios a parecer montada por alguém do time, não por template.',
  'published', 0,
  'https://yevysgqlnhonhkczkyhu.supabase.co/storage/v1/object/public/collections/audio/67822d3f-54a8-48b7-8b1b-8de2012f6603/1780511584463-sh9tn6b-mensageiro.wav',
  'audio/wav', NULL,
  '{"eyebrow":"Sequência curta","chips":["Playlist","Silêncio"],"ctaLabel":"Abrir coleção","coverImage":"/mock/covers/mensageiro-cancao-certa.png"}',
  NOW(), NOW(), NOW()
),

-- mus_kaboo_circle — in music-linked
(
  'a1000002-0001-4001-a001-000000000007',
  'music', 'audio', 'external_audio', 'active_subscription',
  'Kaboo, canção para abrir a conversa em grupo',
  'audio-kaboo-cancao-roda',
  '2 min • Uso imediato • Primeira dobra',
  'Uma faixa de roda que sinaliza utilidade prática e ajuda a biblioteca a sair da abstração.',
  'published', 0,
  'https://yevysgqlnhonhkczkyhu.supabase.co/storage/v1/object/public/collections/audio/7cac9059-84d6-4551-a4af-77d58ce83585/1780511610066-foej14c-Carta_misteriosa.wav',
  'audio/wav', 120,
  '{"eyebrow":"Roda","chips":["Grupo","Início"],"ctaLabel":"Abrir coleção","coverImage":"/mock/covers/kaboo-carta-misteriosa.png"}',
  NOW(), NOW(), NOW()
),

-- ════════════════════════════════════════════════════════════
-- FORMATIONS HUB  (7 items, media_kind=training, mime_type=application/pdf)
-- Using external_audio provider to comply with existing check constraint
-- (media_kind=training + mime_type=pdf identifies these as formation guides)
-- ════════════════════════════════════════════════════════════

-- form_mediation — featured hero
-- PDF: Kaboo e a Carta Misteriosa reading book (c9da6ab9, yevysgqlnhonhkczkyhu project)
(
  'a1000003-0001-4001-a001-000000000001',
  'formations', 'training', 'external_audio', 'active_subscription',
  'Pertencimento e escuta com Carta Misteriosa',
  'formation-kaboo-carta-pertencimento',
  '3 etapas • mediação • Antes, durante e depois',
  'Uma entrada forte para mostrar que formação aqui significa organizar uma boa conversa em sequência curta, sem desviar o adulto para uma interface de curso.',
  'published', 1,
  'https://yevysgqlnhonhkczkyhu.supabase.co/storage/v1/object/public/collections/pdfs/c9da6ab9-4eeb-4b23-a090-3e510139dedf/1780505538646-ctk9jf6-EFAI1_Livro_Kaboo_e_a_Carta_Misteriosa_app.pdf',
  'application/pdf', NULL,
  '{"eyebrow":"Percurso para hoje","chips":["Professor","Roda","Sequência curta"],"ctaLabel":"Abrir guia","coverImage":"/mock/covers/kaboo-carta-misteriosa-kit.svg","previewSteps":3,"progress":24}',
  NOW(), NOW(), NOW()
),

-- form_belonging — in formations-start
(
  'a1000003-0001-4001-a001-000000000002',
  'formations', 'training', 'external_audio', 'active_subscription',
  'Acolher antes da leitura compartilhada',
  'formation-kaboo-carta-acolhida',
  '2 etapas • acolhida • Antes da leitura',
  'Um percurso breve para abrir contexto, pergunta disparadora e fechamento sem transformar a mediação em palestra.',
  'published', 0,
  'https://yevysgqlnhonhkczkyhu.supabase.co/storage/v1/object/public/collections/pdfs/c9da6ab9-4eeb-4b23-a090-3e510139dedf/1780505538646-ctk9jf6-EFAI1_Livro_Kaboo_e_a_Carta_Misteriosa_app.pdf',
  'application/pdf', NULL,
  '{"eyebrow":"Pertencimento","chips":["Acolhimento","Professor"],"ctaLabel":"Abrir guia","coverImage":"/mock/covers/kaboo-carta-misteriosa.png","previewSteps":2}',
  NOW(), NOW(), NOW()
),

-- form_silence — in formations-start
-- PDF: Mensageiro reading book (588e380a, yevysgqlnhonhkczkyhu project)
(
  'a1000003-0001-4001-a001-000000000003',
  'formations', 'training', 'external_audio', 'active_subscription',
  'Silêncio, pausa e presença com Mensageiro',
  'formation-mensageiro-escuta',
  '3 etapas • escuta • Roda de conversa',
  'Uma entrada de escuta qualificada para usar pausa, som e presença como parte da mediação, com apoio do guia da obra.',
  'published', 0,
  'https://yevysgqlnhonhkczkyhu.supabase.co/storage/v1/object/public/collections/pdfs/588e380a-c673-4e81-af86-955d2e7e8532/1780507864633-xvxyumh-EFAI8_Livro_Mensageiro_e_a_Canc_a_o_Certa_app.pdf',
  'application/pdf', NULL,
  '{"eyebrow":"Escuta","chips":["Som","Presença"],"ctaLabel":"Abrir guia","coverImage":"/mock/covers/mensageiro-cancao-certa.png","previewSteps":3}',
  NOW(), NOW(), NOW()
),

-- form_dialogue — in formations-start  (Labirinto — no teacher guide exists yet)
(
  'a1000003-0001-4001-a001-000000000004',
  'formations', 'training', 'external_audio', 'active_subscription',
  'Diálogo sem eco automático no Labirinto do Eco',
  'formation-labirinto-dialogo',
  '2 etapas • convivência • Depois da escuta',
  'Um percurso curto para trabalhar escuta ativa, pergunta de devolução e convivência com leitura simples de uso.',
  'published', 0,
  'https://kaboo.dev/content/pending',
  'application/pdf', NULL,
  '{"eyebrow":"Convivência","chips":["Grupo","Escuta"],"ctaLabel":"Abrir guia","coverImage":"/mock/covers/baratinha-baratao-labirinto-eco.png","previewSteps":2}',
  NOW(), NOW(), NOW()
),

-- form_gaio — in formations-linked
-- PDF: Guia do Professor Gaio Hora de Voar (uuaiacefzdmsdbsvsuoj, extra_material)
(
  'a1000003-0001-4001-a001-000000000005',
  'formations', 'training', 'external_audio', 'active_subscription',
  'Coragem e acolhimento com Gaio e a Hora de Voar Alto',
  'formation-gaio-hora-voar',
  '15 min • acolhimento • Entrada guiada',
  'Uma entrada curta para apoiar acolhimento, coragem e preparação de conversa com o grupo a partir do guia pedagógico.',
  'published', 0,
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/extras/66627622-235a-43f6-ba4b-35522086165c/1771619433282-czkenw6-Guia_do_Professor_-_Gaio_e_a_Hora_de_Voar_Alto.pdf',
  'application/pdf', NULL,
  '{"eyebrow":"Percurso guiado","chips":["Professor","Roda"],"ctaLabel":"Abrir guia","coverImage":"/mock/covers/gaio-hora-voar-alto.png","previewSteps":1}',
  NOW(), NOW(), NOW()
),

-- form_colors — in formations-linked
-- PDF: Desafio das Cores reading book (a9e199ea, yevysgqlnhonhkczkyhu project)
(
  'a1000003-0001-4001-a001-000000000006',
  'formations', 'training', 'external_audio', 'active_subscription',
  'Conversa e reparo com Desafio das Cores',
  'formation-desafio-cores-conversa',
  '25 min • reparo • Mediação de conflito',
  'Um percurso para apoiar situações de conflito e reparo com leitura direta de uso e guia pedagógico disponível.',
  'published', 0,
  'https://yevysgqlnhonhkczkyhu.supabase.co/storage/v1/object/public/collections/pdfs/a9e199ea-5e72-4665-a3d4-cce969f4f958/1780507509267-0c00el4-EFAI6_Livro_Kaboo_e_o_Desafio_das_Cores_app.pdf',
  'application/pdf', NULL,
  '{"eyebrow":"Conflitos","chips":["Convivência","Diálogo"],"ctaLabel":"Abrir guia","coverImage":"/mock/covers/kaboo-desafio-cores.png","previewSteps":2}',
  NOW(), NOW(), NOW()
),

-- form_papa — in formations-linked
-- PDF: Guia do Professor Papa e o Plano Furado (uuaiacefzdmsdbsvsuoj, extra_material)
(
  'a1000003-0001-4001-a001-000000000007',
  'formations', 'training', 'external_audio', 'active_subscription',
  'Erro e recomeço com Papa e o Plano Furado',
  'formation-papa-recomezo',
  '20 min • recomeço • Aplicação prática',
  'Um percurso para trabalhar tentativa, erro e recomeço com linguagem leve e apoio concreto de guia pedagógico.',
  'published', 0,
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/extras/ce726511-73df-422d-b5fb-b2d0518e164a/1771619445683-622yht4-Guia_do_Professor_-_Papa_e_o_Plano_Furado.pdf',
  'application/pdf', NULL,
  '{"eyebrow":"Criatividade","chips":["Criatividade","Recomeço"],"ctaLabel":"Abrir guia","coverImage":"/mock/covers/papa-plano-furado.png","previewSteps":2}',
  NOW(), NOW(), NOW()
),

-- ════════════════════════════════════════════════════════════
-- MATERIALS HUB  (7 items, media_kind=document, mime_type=application/pdf)
-- ════════════════════════════════════════════════════════════

-- mat_carta_guide — featured hero
(
  'a1000004-0001-4001-a001-000000000001',
  'materials', 'document', 'external_audio', 'active_subscription',
  'Guia do professor, Kaboo e a Carta Misteriosa',
  'material-kaboo-carta-guia',
  'PDF • guia do professor • PDF direto',
  'Um destaque que já posiciona a área como biblioteca de consulta: documento concreto, abertura rápida e vínculo claro com uma coleção real.',
  'published', 1,
  'https://yevysgqlnhonhkczkyhu.supabase.co/storage/v1/object/public/collections/pdfs/c9da6ab9-4eeb-4b23-a090-3e510139dedf/1780505538646-ctk9jf6-EFAI1_Livro_Kaboo_e_a_Carta_Misteriosa_app.pdf',
  'application/pdf', NULL,
  '{"eyebrow":"Consulta imediata","chips":["Professor","Mediação","PDF"],"ctaLabel":"Abrir coleção","coverImage":"/mock/covers/kaboo-carta-misteriosa.png"}',
  NOW(), NOW(), NOW()
),

-- mat_papa_guide — in materials-practical
-- PDF: Guia do Professor Papa (uuaiacefzdmsdbsvsuoj, extra_material)
(
  'a1000004-0001-4001-a001-000000000002',
  'materials', 'document', 'external_audio', 'active_subscription',
  'Guia do professor, Papa e o Plano Furado',
  'material-papa-guia',
  'PDF • guia pedagógico • Consulta rápida',
  'Documento de consulta para entrar em criatividade, erro e recomeço com leitura breve e retomada rápida da prática.',
  'published', 0,
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/extras/ce726511-73df-422d-b5fb-b2d0518e164a/1771619445683-622yht4-Guia_do_Professor_-_Papa_e_o_Plano_Furado.pdf',
  'application/pdf', NULL,
  '{"eyebrow":"PDF direto","chips":["Professor","Criatividade"],"ctaLabel":"Abrir coleção","coverImage":"/mock/covers/papa-plano-furado.png"}',
  NOW(), NOW(), NOW()
),

-- mat_gaio_guide — in materials-practical
-- PDF: Guia do Professor Gaio Hora de Voar (uuaiacefzdmsdbsvsuoj, extra_material)
(
  'a1000004-0001-4001-a001-000000000003',
  'materials', 'document', 'external_audio', 'active_subscription',
  'Guia do professor, Gaio e a Hora de Voar Alto',
  'material-gaio-hora-voar-guia',
  'PDF • apoio de aula • Uso imediato',
  'Um apoio de aula para acolhimento e coragem, com leitura rápida de proposta e retorno imediato para a roda.',
  'published', 0,
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/extras/66627622-235a-43f6-ba4b-35522086165c/1771619433282-czkenw6-Guia_do_Professor_-_Gaio_e_a_Hora_de_Voar_Alto.pdf',
  'application/pdf', NULL,
  '{"eyebrow":"Apoio de aula","chips":["Coragem","Roda"],"ctaLabel":"Abrir coleção","coverImage":"/mock/covers/gaio-hora-voar-alto.png"}',
  NOW(), NOW(), NOW()
),

-- mat_mensageiro_guide — in materials-practical
-- PDF: Mensageiro reading book (588e380a, yevysgqlnhonhkczkyhu project)
(
  'a1000004-0001-4001-a001-000000000004',
  'materials', 'document', 'external_audio', 'active_subscription',
  'Guia do professor, Mensageiro e a Canção Certa',
  'material-mensageiro-guia',
  'PDF • guia pedagógico • Planejamento rápido',
  'Um apoio de consulta curta que já comunica formato, público e contexto editorial com o mínimo de ruído possível.',
  'published', 0,
  'https://yevysgqlnhonhkczkyhu.supabase.co/storage/v1/object/public/collections/pdfs/588e380a-c673-4e81-af86-955d2e7e8532/1780507864633-xvxyumh-EFAI8_Livro_Mensageiro_e_a_Canc_a_o_Certa_app.pdf',
  'application/pdf', NULL,
  '{"eyebrow":"Consulta curta","chips":["Professor","Apoio"],"ctaLabel":"Abrir coleção","coverImage":"/mock/covers/mensageiro-cancao-certa.png"}',
  NOW(), NOW(), NOW()
),

-- mat_labirinto_guide — in materials-linked  (no teacher guide PDF exists yet)
(
  'a1000004-0001-4001-a001-000000000005',
  'materials', 'document', 'external_audio', 'active_subscription',
  'Guia do professor, Baratinha e Baratão no Labirinto do Eco',
  'material-labirinto-guia',
  'PDF • guia pedagógico • Convivência',
  'Apoio pensado para consulta em grupo, escuta e resposta com leitura rápida de referência.',
  'published', 0,
  'https://kaboo.dev/content/pending',
  'application/pdf', NULL,
  '{"eyebrow":"Consulta por obra","chips":["Grupo","Diálogo"],"ctaLabel":"Abrir coleção","coverImage":"/mock/covers/baratinha-baratao-labirinto-eco.png"}',
  NOW(), NOW(), NOW()
),

-- mat_colors_guide — in materials-linked
-- PDF: Desafio das Cores reading book (a9e199ea, yevysgqlnhonhkczkyhu project)
(
  'a1000004-0001-4001-a001-000000000006',
  'materials', 'document', 'external_audio', 'active_subscription',
  'Guia do professor, Kaboo e o Desafio das Cores',
  'material-desafio-cores-guia',
  'PDF • guia pedagógico • Conflitos',
  'Um apoio de consulta curta para orientar conversa, conflito e reparo sem virar leitura densa demais.',
  'published', 0,
  'https://yevysgqlnhonhkczkyhu.supabase.co/storage/v1/object/public/collections/pdfs/a9e199ea-5e72-4665-a3d4-cce969f4f958/1780507509267-0c00el4-EFAI6_Livro_Kaboo_e_o_Desafio_das_Cores_app.pdf',
  'application/pdf', NULL,
  '{"eyebrow":"PDF de apoio","chips":["Cores","Professor"],"ctaLabel":"Abrir coleção","coverImage":"/mock/covers/kaboo-desafio-cores.png"}',
  NOW(), NOW(), NOW()
),

-- mat_onde_esta_gaio — in materials-linked
-- PDF: Guia do Professor Onde está Gaio (uuaiacefzdmsdbsvsuoj, extra_material)
(
  'a1000004-0001-4001-a001-000000000007',
  'materials', 'document', 'external_audio', 'active_subscription',
  'Guia do professor, Onde está Gaio?',
  'material-onde-esta-gaio-guia',
  'PDF • guia pedagógico • Exploração guiada',
  'Apoio curto para brincar com pistas, cooperação e conversa sem alongar a navegação nem a leitura.',
  'published', 0,
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/extras/410acf81-6d7d-4569-85e4-02ed2fb28762/1771619596214-cj9uqbk-Guia_do_Professor_-_Onde_Esta_Gaio.pdf',
  'application/pdf', NULL,
  '{"eyebrow":"Guia rápido","chips":["Cooperação","Pistas"],"ctaLabel":"Abrir coleção","coverImage":"/mock/covers/onde-esta-gaio.png"}',
  NOW(), NOW(), NOW()
)

ON CONFLICT DO NOTHING;


-- ─── 2. MEDIA SHELVES (12 rows: 3 per hub) ────────────────────
-- shelf_type: 'hero' for featured section, 'rail' for horizontal rails
-- order_index: 0=hero, 1=first rail, 2=second rail

INSERT INTO media_shelves (
  id, hub, shelf_type, title, slug, description, order_index, is_published,
  created_at, updated_at
) VALUES

-- VIDEOS
('b1000001-0001-4001-b001-000000000001', 'videos', 'hero', 'Vídeo em destaque',                                     'videos-hero',        'Vídeo destaque da biblioteca',                                                  0, true, NOW(), NOW()),
('b1000001-0001-4001-b001-000000000002', 'videos', 'rail', 'Os formatos que já existem dentro da mesma coleção',    'videos-carta-pack',  'Pacote Carta Misteriosa — desenho, Libras, como jogar e videoaula.',            1, true, NOW(), NOW()),
('b1000001-0001-4001-b001-000000000003', 'videos', 'rail', 'O que já abre no player fora do pacote principal',      'videos-live-now',    'Também disponíveis — vídeos além do pacote principal.',                         2, true, NOW(), NOW()),

-- MUSIC
('b1000002-0001-4001-b001-000000000001', 'music',  'hero', 'Faixa em destaque',                                     'music-hero',         'Faixa destaque da biblioteca de áudios.',                                       0, true, NOW(), NOW()),
('b1000002-0001-4001-b001-000000000002', 'music',  'rail', 'Faixas de entrada com leitura muito rápida',            'music-now',          'Para ouvir agora — faixas de entrada com convite direto ao play.',              1, true, NOW(), NOW()),
('b1000002-0001-4001-b001-000000000003', 'music',  'rail', 'Quando a música reforça uma coleção, isso aparece',     'music-linked',       'Ligadas a obras — contexto editorial opcional.',                                2, true, NOW(), NOW()),

-- FORMATIONS
('b1000003-0001-4001-b001-000000000001', 'formations', 'hero', 'Formação em destaque',                              'formations-hero',    'Percurso destaque da biblioteca de formações.',                                 0, true, NOW(), NOW()),
('b1000003-0001-4001-b001-000000000002', 'formations', 'rail', 'Entradas que já mostram aplicação prática',         'formations-start',   'Primeiros percursos — ligados a obras específicas com guia disponível.',        1, true, NOW(), NOW()),
('b1000003-0001-4001-b001-000000000003', 'formations', 'rail', 'Cada percurso nasce de uma obra e de um guia concreto', 'formations-linked', 'Aplicação por obra — percursos com guia e coleção de origem visível.',      2, true, NOW(), NOW()),

-- MATERIALS
('b1000004-0001-4001-b001-000000000001', 'materials', 'hero', 'Material em destaque',                               'materials-hero',     'Documento destaque da biblioteca de materiais.',                                0, true, NOW(), NOW()),
('b1000004-0001-4001-b001-000000000002', 'materials', 'rail', 'Documentos para localizar e abrir sem pensar',       'materials-practical','Para usar hoje — documentos de consulta rápida.',                               1, true, NOW(), NOW()),
('b1000004-0001-4001-b001-000000000003', 'materials', 'rail', 'Apoios por obra quando o contexto ajuda a busca',    'materials-linked',   'Por coleção — acervo com origem visível.',                                      2, true, NOW(), NOW())

ON CONFLICT DO NOTHING;


-- ─── 3. MEDIA SHELF ITEMS (28 rows) ───────────────────────────
-- Unique constraint: (shelf_id, media_item_id)
-- Same media_item can appear in multiple shelves (e.g. vid_gaio in hero + live-now)

INSERT INTO media_shelf_items (
  id, shelf_id, media_item_id, order_index, highlight_label, created_at
) VALUES

-- VIDEOS: hero (1)
('c1000001-0001-4001-c001-000000000001', 'b1000001-0001-4001-b001-000000000001', 'a1000001-0001-4001-a001-000000000001', 0, 'Destaque', NOW()),

-- VIDEOS: videos-carta-pack (4)
('c1000001-0001-4001-c001-000000000002', 'b1000001-0001-4001-b001-000000000002', 'a1000001-0001-4001-a001-000000000002', 0, NULL, NOW()),
('c1000001-0001-4001-c001-000000000003', 'b1000001-0001-4001-b001-000000000002', 'a1000001-0001-4001-a001-000000000003', 1, NULL, NOW()),
('c1000001-0001-4001-c001-000000000004', 'b1000001-0001-4001-b001-000000000002', 'a1000001-0001-4001-a001-000000000004', 2, NULL, NOW()),
('c1000001-0001-4001-c001-000000000005', 'b1000001-0001-4001-b001-000000000002', 'a1000001-0001-4001-a001-000000000005', 3, NULL, NOW()),

-- VIDEOS: videos-live-now (2) — same media_items as above but different shelf
('c1000001-0001-4001-c001-000000000006', 'b1000001-0001-4001-b001-000000000003', 'a1000001-0001-4001-a001-000000000001', 0, NULL, NOW()),
('c1000001-0001-4001-c001-000000000007', 'b1000001-0001-4001-b001-000000000003', 'a1000001-0001-4001-a001-000000000002', 1, NULL, NOW()),

-- MUSIC: hero (1)
('c1000002-0001-4001-c001-000000000001', 'b1000002-0001-4001-b001-000000000001', 'a1000002-0001-4001-a001-000000000001', 0, 'Destaque', NOW()),

-- MUSIC: music-now (3)
('c1000002-0001-4001-c001-000000000002', 'b1000002-0001-4001-b001-000000000002', 'a1000002-0001-4001-a001-000000000002', 0, NULL, NOW()),
('c1000002-0001-4001-c001-000000000003', 'b1000002-0001-4001-b001-000000000002', 'a1000002-0001-4001-a001-000000000003', 1, NULL, NOW()),
('c1000002-0001-4001-c001-000000000004', 'b1000002-0001-4001-b001-000000000002', 'a1000002-0001-4001-a001-000000000004', 2, NULL, NOW()),

-- MUSIC: music-linked (3)
('c1000002-0001-4001-c001-000000000005', 'b1000002-0001-4001-b001-000000000003', 'a1000002-0001-4001-a001-000000000005', 0, NULL, NOW()),
('c1000002-0001-4001-c001-000000000006', 'b1000002-0001-4001-b001-000000000003', 'a1000002-0001-4001-a001-000000000006', 1, NULL, NOW()),
('c1000002-0001-4001-c001-000000000007', 'b1000002-0001-4001-b001-000000000003', 'a1000002-0001-4001-a001-000000000007', 2, NULL, NOW()),

-- FORMATIONS: hero (1)
('c1000003-0001-4001-c001-000000000001', 'b1000003-0001-4001-b001-000000000001', 'a1000003-0001-4001-a001-000000000001', 0, 'Destaque', NOW()),

-- FORMATIONS: formations-start (3)
('c1000003-0001-4001-c001-000000000002', 'b1000003-0001-4001-b001-000000000002', 'a1000003-0001-4001-a001-000000000002', 0, NULL, NOW()),
('c1000003-0001-4001-c001-000000000003', 'b1000003-0001-4001-b001-000000000002', 'a1000003-0001-4001-a001-000000000003', 1, NULL, NOW()),
('c1000003-0001-4001-c001-000000000004', 'b1000003-0001-4001-b001-000000000002', 'a1000003-0001-4001-a001-000000000004', 2, NULL, NOW()),

-- FORMATIONS: formations-linked (3)
('c1000003-0001-4001-c001-000000000005', 'b1000003-0001-4001-b001-000000000003', 'a1000003-0001-4001-a001-000000000005', 0, NULL, NOW()),
('c1000003-0001-4001-c001-000000000006', 'b1000003-0001-4001-b001-000000000003', 'a1000003-0001-4001-a001-000000000006', 1, NULL, NOW()),
('c1000003-0001-4001-c001-000000000007', 'b1000003-0001-4001-b001-000000000003', 'a1000003-0001-4001-a001-000000000007', 2, NULL, NOW()),

-- MATERIALS: hero (1)
('c1000004-0001-4001-c001-000000000001', 'b1000004-0001-4001-b001-000000000001', 'a1000004-0001-4001-a001-000000000001', 0, 'Destaque', NOW()),

-- MATERIALS: materials-practical (3)
('c1000004-0001-4001-c001-000000000002', 'b1000004-0001-4001-b001-000000000002', 'a1000004-0001-4001-a001-000000000002', 0, NULL, NOW()),
('c1000004-0001-4001-c001-000000000003', 'b1000004-0001-4001-b001-000000000002', 'a1000004-0001-4001-a001-000000000003', 1, NULL, NOW()),
('c1000004-0001-4001-c001-000000000004', 'b1000004-0001-4001-b001-000000000002', 'a1000004-0001-4001-a001-000000000004', 2, NULL, NOW()),

-- MATERIALS: materials-linked (3)
('c1000004-0001-4001-c001-000000000005', 'b1000004-0001-4001-b001-000000000003', 'a1000004-0001-4001-a001-000000000005', 0, NULL, NOW()),
('c1000004-0001-4001-c001-000000000006', 'b1000004-0001-4001-b001-000000000003', 'a1000004-0001-4001-a001-000000000006', 1, NULL, NOW()),
('c1000004-0001-4001-c001-000000000007', 'b1000004-0001-4001-b001-000000000003', 'a1000004-0001-4001-a001-000000000007', 2, NULL, NOW())

ON CONFLICT DO NOTHING;


-- ─── 4. MEDIA COLLECTION LINKS (26 rows) ──────────────────────
-- One per media_item; link_type = 'primary_source'
-- Unique: (media_item_id, collection_id, link_type)
-- NOTE: Some mock collectionIds were remapped to real DB IDs:
--   c9da6ab9 = Kaboo e a Carta Misteriosa (book, reading PDF)
--   7cac9059 = Kaboo e a Carta Misteriosa (book, audio)
--   67822d3f = Mensageiro e a Canção Certa (book, audio)
--   588e380a = Mensageiro e a Canção Certa (book, reading PDF)
--   a9e199ea = Kaboo e o Desafio das Cores (book)

INSERT INTO media_collection_links (
  id, media_item_id, collection_id, link_type, order_index, created_at
) VALUES

-- VIDEOS
('d1000001-0001-4001-d001-000000000001', 'a1000001-0001-4001-a001-000000000001', '33efdbb5-abed-4037-9eed-bb7017d19f7a', 'primary_source', 0, NOW()),  -- Gaio Vento video
('d1000001-0001-4001-d001-000000000002', 'a1000001-0001-4001-a001-000000000002', 'c9da6ab9-4eeb-4b23-a090-3e510139dedf', 'primary_source', 0, NOW()),  -- Carta animado
('d1000001-0001-4001-d001-000000000003', 'a1000001-0001-4001-a001-000000000003', 'c9da6ab9-4eeb-4b23-a090-3e510139dedf', 'primary_source', 0, NOW()),  -- Carta Libras
('d1000001-0001-4001-d001-000000000004', 'a1000001-0001-4001-a001-000000000004', 'c9da6ab9-4eeb-4b23-a090-3e510139dedf', 'primary_source', 0, NOW()),  -- Como jogar
('d1000001-0001-4001-d001-000000000005', 'a1000001-0001-4001-a001-000000000005', 'c9da6ab9-4eeb-4b23-a090-3e510139dedf', 'primary_source', 0, NOW()),  -- Videoaula

-- MUSIC
('d1000002-0001-4001-d001-000000000001', 'a1000002-0001-4001-a001-000000000001', '67822d3f-54a8-48b7-8b1b-8de2012f6603', 'primary_source', 0, NOW()),  -- Mensageiro faixa (audio)
('d1000002-0001-4001-d001-000000000002', 'a1000002-0001-4001-a001-000000000002', '7cac9059-84d6-4551-a4af-77d58ce83585', 'primary_source', 0, NOW()),  -- Carta escuta (audio)
('d1000002-0001-4001-d001-000000000003', 'a1000002-0001-4001-a001-000000000003', '66627622-235a-43f6-ba4b-35522086165c', 'primary_source', 0, NOW()),  -- Gaio breathe
('d1000002-0001-4001-d001-000000000004', 'a1000002-0001-4001-a001-000000000004', '6a93b60f-b4e9-4fe6-9fed-7c6f7391745c', 'primary_source', 0, NOW()),  -- Labirinto Eco
('d1000002-0001-4001-d001-000000000005', 'a1000002-0001-4001-a001-000000000005', 'a9e199ea-5e72-4665-a3d4-cce969f4f958', 'primary_source', 0, NOW()),  -- Desafio Cores trilha
('d1000002-0001-4001-d001-000000000006', 'a1000002-0001-4001-a001-000000000006', '67822d3f-54a8-48b7-8b1b-8de2012f6603', 'primary_source', 0, NOW()),  -- Mensageiro playlist
('d1000002-0001-4001-d001-000000000007', 'a1000002-0001-4001-a001-000000000007', '7cac9059-84d6-4551-a4af-77d58ce83585', 'primary_source', 0, NOW()),  -- Kaboo roda

-- FORMATIONS
('d1000003-0001-4001-d001-000000000001', 'a1000003-0001-4001-a001-000000000001', 'c9da6ab9-4eeb-4b23-a090-3e510139dedf', 'primary_source', 0, NOW()),  -- Pertencimento
('d1000003-0001-4001-d001-000000000002', 'a1000003-0001-4001-a001-000000000002', 'c9da6ab9-4eeb-4b23-a090-3e510139dedf', 'primary_source', 0, NOW()),  -- Acolhida
('d1000003-0001-4001-d001-000000000003', 'a1000003-0001-4001-a001-000000000003', '588e380a-c673-4e81-af86-955d2e7e8532', 'primary_source', 0, NOW()),  -- Mensageiro escuta (reading)
('d1000003-0001-4001-d001-000000000004', 'a1000003-0001-4001-a001-000000000004', '6a93b60f-b4e9-4fe6-9fed-7c6f7391745c', 'primary_source', 0, NOW()),  -- Labirinto dialogo
('d1000003-0001-4001-d001-000000000005', 'a1000003-0001-4001-a001-000000000005', '66627622-235a-43f6-ba4b-35522086165c', 'primary_source', 0, NOW()),  -- Gaio voar
('d1000003-0001-4001-d001-000000000006', 'a1000003-0001-4001-a001-000000000006', 'a9e199ea-5e72-4665-a3d4-cce969f4f958', 'primary_source', 0, NOW()),  -- Desafio Cores
('d1000003-0001-4001-d001-000000000007', 'a1000003-0001-4001-a001-000000000007', 'ce726511-73df-422d-b5fb-b2d0518e164a', 'primary_source', 0, NOW()),  -- Papa

-- MATERIALS
('d1000004-0001-4001-d001-000000000001', 'a1000004-0001-4001-a001-000000000001', 'c9da6ab9-4eeb-4b23-a090-3e510139dedf', 'primary_source', 0, NOW()),  -- Carta guia
('d1000004-0001-4001-d001-000000000002', 'a1000004-0001-4001-a001-000000000002', 'ce726511-73df-422d-b5fb-b2d0518e164a', 'primary_source', 0, NOW()),  -- Papa guia
('d1000004-0001-4001-d001-000000000003', 'a1000004-0001-4001-a001-000000000003', '66627622-235a-43f6-ba4b-35522086165c', 'primary_source', 0, NOW()),  -- Gaio voar guia
('d1000004-0001-4001-d001-000000000004', 'a1000004-0001-4001-a001-000000000004', '588e380a-c673-4e81-af86-955d2e7e8532', 'primary_source', 0, NOW()),  -- Mensageiro guia (reading)
('d1000004-0001-4001-d001-000000000005', 'a1000004-0001-4001-a001-000000000005', '6a93b60f-b4e9-4fe6-9fed-7c6f7391745c', 'primary_source', 0, NOW()),  -- Labirinto guia
('d1000004-0001-4001-d001-000000000006', 'a1000004-0001-4001-a001-000000000006', 'a9e199ea-5e72-4665-a3d4-cce969f4f958', 'primary_source', 0, NOW()),  -- Desafio Cores guia
('d1000004-0001-4001-d001-000000000007', 'a1000004-0001-4001-a001-000000000007', '410acf81-6d7d-4569-85e4-02ed2fb28762', 'primary_source', 0, NOW())   -- Onde está Gaio guia

ON CONFLICT DO NOTHING;

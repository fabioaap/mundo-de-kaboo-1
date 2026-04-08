-- ============================================================
-- Mundo de Kaboo — Supabase Seed Script
-- Fonte: data/catalog.seed.json v1
-- 16 coleções | 14 collection_resources
--
-- Uso:
--   psql "$DATABASE_URL" -f data/seed.sql
--   ou cole no Supabase Dashboard → SQL Editor
--
-- collections      : upsert idempotente via ON CONFLICT (id)
-- collection_resources : DELETE + INSERT escopado pelos 16 IDs
--
-- ATENÇÃO: cover_image usa caminhos locais /mock/covers/*.png
-- Para produção real, atualize para URLs do Supabase Storage.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. COLLECTIONS (16 registros)
-- ============================================================
INSERT INTO collections (
  id,
  title,
  cover_image,
  level,
  color_theme,
  theme,
  learning_objectives,
  characters,
  bncc_skills,
  casel_competencies,
  age_grade,
  pdf_url,
  audio_url,
  video_url,
  extra_materials
) VALUES

-- 1. Kaboo e a Carta Misteriosa
(
  '784b3238-0916-4922-af3c-8627d74cc16c',
  'Kaboo e a Carta Misteriosa',
  '/mock/covers/kaboo-carta-misteriosa.png',
  'Fundamental I',
  '#B9373B',
  'Pertencimento e diversidade',
  'Convidar ao pertencimento e à descoberta de que a diversidade é força. A história mostra que pertencer significa escutar, valorizar e respeitar as diferenças; a amizade protege, permitindo compartilhar histórias, brincar, rir e chorar juntos.',
  ARRAY['Kaboo','Batatinha','Blado','Papa','Gaio','Dr. Ratazana'],
  ARRAY['EF15LP01','EF15LP03','EF15LP04','EF15LP09','EF15LP10','EF15LP18','EF01LP02','EF01LP12','EF02LP13','EF02LP16','EF01ER01','EF01HI08'],
  ARRAY['Habilidades de Relacionamento','Consciência Social'],
  ARRAY['1º ano','2º ano','3º ano'],
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/pdfs/784b3238-0916-4922-af3c-8627d74cc16c/1768192341842-heqozuo-EFAI1_Livro_Kaboo_e_a_Carta_Misteriosa_app_compres',
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/audio/784b3238-0916-4922-af3c-8627d74cc16c/1769708145715-6jwjx6e-08_Kaboo_e_a_carta_misteriosa_OK.WAV',
  NULL,
  ARRAY['https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/extras/784b3238-0916-4922-af3c-8627d74cc16c/1771619357711-x4phiuh-Guia_do_Professor_-_Kaboo_e_a_Carta_Misteriosa.pdf']
),

-- 2. Mensageiro e a Canção Certa
(
  'c6334710-6117-426f-995c-07be8d87d872',
  'Mensageiro e a Canção Certa',
  '/mock/covers/mensageiro-cancao-certa.png',
  'Fundamental I',
  '#325C41',
  'Sensibilidade, regulação sensorial e respeito ao silêncio',
  'Valorizar sons sutis e o silêncio como parte da escuta atenta. Regular a atenção e os sentidos para "escutar com o coração, com o olhar atento e com a presença".',
  ARRAY['Kaboo','Blado','Papa','Batatinha','Gaio','Dr. Ratazana'],
  ARRAY['EF15AR04','EF15LP03','EF15LP04','EF15LP09','EF15LP10','EF15LP11','EF15LP12','EF15LP13','EF01ER06'],
  ARRAY['Autoconsciência','Autogestão'],
  ARRAY['1º ano','2º ano','3º ano'],
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/pdfs/c6334710-6117-426f-995c-07be8d87d872/1768192364095-xwrdb3g-EFAI8_Livro_Mensageiro_e_a_Canc_a_o_Certa_app_comp',
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/audio/c6334710-6117-426f-995c-07be8d87d872/1769477855454-zibkmtu-06_O_mensageiro_e_a_can__o_certa_ok.WAV',
  NULL,
  ARRAY['https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/extras/c6334710-6117-426f-995c-07be8d87d872/1771619379928-bj8hhqu-Guia_do_Professor_-_Mensageiro_e_a_Can__o_Certa.pd']
),

-- 3. Baratinha e Baratão no Labirinto do Eco
(
  '6a93b60f-b4e9-4fe6-9fed-7c6f7391745c',
  'Baratinha e Baratão no Labirinto do Eco',
  '/mock/covers/baratinha-baratao-labirinto-eco.png',
  'Fundamental I',
  '#2E4179',
  'Escuta ativa e diálogo',
  'Perceber que repetir não é compreender; escutar "com o corpo, os olhos e o coração" favorece entendimento e convivência. A magia acontece com o diálogo, quando todos escutam e são escutados.',
  ARRAY['Baratinha','Baratão','Dr. Ratazana','Kaboo','Papa','Gaio','Blado'],
  ARRAY['EF15LP03','EF15LP04','EF15LP09','EF15LP10','EF15LP11','EF15LP12'],
  ARRAY['Habilidades de Relacionamento'],
  ARRAY['3º ano','4º ano','5º ano'],
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/pdfs/6a93b60f-b4e9-4fe6-9fed-7c6f7391745c/1768192379610-sublbh0-EFAI7_Livro_Baratinha_e_Barata_o_no_Labirinto_do_E',
  NULL,
  NULL,
  ARRAY['https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/extras/6a93b60f-b4e9-4fe6-9fed-7c6f7391745c/1771619403995-xyystt9-Guia_do_Professor_-_Baratinha_e_Barat_o_no_Labirin']
),

-- 4. Kaboo e o Desafio das Cores
(
  'ad037be3-ad9f-43d3-a913-549337aef9ef',
  'Kaboo e o Desafio das Cores',
  '/mock/covers/kaboo-desafio-cores.png',
  'Fundamental I',
  '#1D64A1',
  'Conflitos, respeito e reconciliação',
  'Valorizar o diálogo e a escuta como caminhos de mediação de conflitos. As diferenças (cores) se unem para formar algo novo, onde todas têm lugar e brilho.',
  ARRAY['Kaboo','Batatinha','Blado','Papa','Gaio','Dr. Ratazana'],
  ARRAY['EF15LP03','EF01ER01','EF15LP09','EF15LP10','EF15LP11','EF15LP12','EF15LP13','EF15AR05','EF01ER03','EF01ER04','EF01ER05','EF01ER06','EF12LP04','EF15AR19'],
  ARRAY['Consciência Social','Habilidades de Relacionamento'],
  ARRAY['1º ano','2º ano','3º ano'],
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/pdfs/ad037be3-ad9f-43d3-a913-549337aef9ef/1768192393562-cqysd42-EFAI6_Livro_Kaboo_e_o_Desafio_das_Cores_app_compre',
  NULL,
  NULL,
  ARRAY['https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/extras/ad037be3-ad9f-43d3-a913-549337aef9ef/1771619416692-ct3biwr-Guia_do_Professor_-_Kaboo_e_o_Desafio_das_Cores.pd']
),

-- 5. Gaio e a Hora de Voar Alto
(
  '66627622-235a-43f6-ba4b-35522086165c',
  'Gaio e a Hora de Voar Alto',
  '/mock/covers/gaio-hora-voar-alto.png',
  'Fundamental I',
  '#D94625',
  'Coragem e superação',
  'Entender que coragem não é ausência de medo, mas avançar com ele ao lado, em passos pequenos e determinados. Enfrentar medos traz conquistas e fortalece a autoconfiança.',
  ARRAY['Gaio','Papa','Batatinha','Blado','Kaboo'],
  ARRAY['EF15LP03','EF15LP04','EF15LP09','EF15LP10','EF15LP11','EF15LP18','EF01LP02','EF01LP12','EF02CI04','EF03CI07','EF15LP02'],
  ARRAY['Autogestão','Autoconsciência'],
  ARRAY['3º ano','4º ano','5º ano'],
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/pdfs/66627622-235a-43f6-ba4b-35522086165c/1768192518631-ldtdhg7-EFAI5_Livro_Gaio_e_a_Hora_de_Voar_Alto_app_compres',
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/audio/66627622-235a-43f6-ba4b-35522086165c/1768192501446-f3gri8i-batatinha-e-o-giro-das-emocoes.mp3',
  NULL,
  ARRAY['https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/extras/66627622-235a-43f6-ba4b-35522086165c/1771619433282-czkenw6-Guia_do_Professor_-_Gaio_e_a_Hora_de_Voar_Alto.pdf']
),

-- 6. Papa e o Plano Furado
(
  'ce726511-73df-422d-b5fb-b2d0518e164a',
  'Papa e o Plano Furado',
  '/mock/covers/papa-plano-furado.png',
  'Fundamental I',
  '#006361',
  'Criatividade, erro e recomeço',
  'Compreender o erro como parte do processo criativo e do aprender; um "plano furado" pode virar uma boa invenção. Recomeçar fortalece e não diminui a inteligência.',
  ARRAY['Papa','Kaboo','Blado','Gaio','Batatinha','Dr. Ratazana'],
  ARRAY['EF15AR05','EF15LP02','EF15LP03','EF15LP09','EF15LP10','EF15LP18','EF02HI09','EF03HI03','EF04CI01'],
  ARRAY['Autogestão','Tomada de Decisão Responsável'],
  ARRAY['3º ano','4º ano','5º ano'],
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/pdfs/ce726511-73df-422d-b5fb-b2d0518e164a/1768192538644-hads9fz-EFAI4_Livro_Papa_e_o_Plano_Furado_app_compressed.p',
  NULL,
  NULL,
  ARRAY['https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/extras/ce726511-73df-422d-b5fb-b2d0518e164a/1771619445683-622yht4-Guia_do_Professor_-_Papa_e_o_Plano_Furado.pdf']
),

-- 7. Batatinha e o Espelho da Alegria
(
  '5ff4a457-5cc8-4095-8a2d-f51604bbc7f8',
  'Batatinha e o Espelho da Alegria',
  '/mock/covers/batatinha-espelho-alegria.png',
  'Fundamental I',
  '#80307A',
  'Autoimagem e identidade',
  'Reconhecer que o "espelho" também reflete emoções, forças e histórias internas, incentivando o olhar para si com carinho e valorizando a singularidade de cada um.',
  ARRAY['Batatinha','Kaboo','Blado','Papa','Gaio'],
  ARRAY['EF15AR04','EF15LP03','EF15LP04','EF15LP09','EF15LP10','EF15LP11','EF15LP18','EF01CI03','EF01ER02','EF12LP04'],
  ARRAY['Autoconsciência'],
  ARRAY['3º ano','4º ano','5º ano'],
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/pdfs/5ff4a457-5cc8-4095-8a2d-f51604bbc7f8/1768192555847-fngscfn-EFAI3_Livro_Batatinha_e_o_Espelho_da_Alegria_app_c',
  NULL,
  NULL,
  ARRAY['https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/extras/5ff4a457-5cc8-4095-8a2d-f51604bbc7f8/1771619459909-duzk0vo-Guia_do_Professor_-_Batatinha_e_o_Espelho_da_Alegr']
),

-- 8. Blado e a Caixa dos Sentimentos
(
  '5993fc3f-8e1f-4d32-98f8-447676e31a39',
  'Blado e a Caixa dos Sentimentos',
  '/mock/covers/blado-caixa-sentimentos.png',
  'Fundamental I',
  '#5D1F58',
  'Confiança, emoções, sentimentos e segurança emocional',
  'Diferenciar emoção (sinais do corpo) de sentimento (o que permanece), e compreender que guardar ou compartilhar o que sentimos exige confiança, cuidado e respeito pelo tempo de cada um. Mensagem-síntese: carinho + respeito pelos sentimentos = superpoder da amizade.',
  ARRAY['Blado','Kaboo','Batatinha','Gaio','Papa'],
  ARRAY['EF15LP02','EF15LP03','EF15LP04','EF15LP05','EF15LP09','EF15LP10','EF15LP11','EF15LP18','EF01LP02','EF01LP12','EF02LP14','EF01ER05','EF15LP01','EF01ER06'],
  ARRAY['Autoconsciência','Habilidades de Relacionamento'],
  ARRAY['1º ano','2º ano','3º ano'],
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/pdfs/5993fc3f-8e1f-4d32-98f8-447676e31a39/1768192574050-bnb6rvg-EFAI2_Livro_Blado_e_a_Caixa_dos_Sentimentos__app_c',
  NULL,
  NULL,
  ARRAY['https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/extras/5993fc3f-8e1f-4d32-98f8-447676e31a39/1771619482234-0jjmad7-Guia_do_Professor_-_Blado_e_a_Caixa_dos_Sentimento']
),

-- 9. Gaio e o Vento da Coragem
(
  '33efdbb5-abed-4037-9eed-bb7017d19f7a',
  'Gaio e o Vento da Coragem',
  '/mock/covers/gaio-vento-coragem.png',
  'Educação Infantil',
  '#5C3B77',
  'Coragem, enfrentamento do medo e autoconfiança',
  'Identificar situações que despertam medo; Reconhecer que sentir medo é natural e válido, e que em muitas situações ele pode nos proteger; Usar gestos, desenhos ou palavras para expressar seu medo e sua coragem; Participar de rituais coletivos de acolhimento (como mural ou roda); Compreender que coragem é aprender a seguir adiante mesmo com medo.',
  ARRAY['Gaio','Kaboo','Papa'],
  ARRAY['EI03EF03','EI03EO02','EI03EF01','EF15LP10'],
  ARRAY['Autogerenciamento','Tomada de Decisão Responsável'],
  ARRAY['3 anos','4 anos','5 anos','1º ano','2º ano'],
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/pdfs/33efdbb5-abed-4037-9eed-bb7017d19f7a/1768193219329-0x88gqk-EI_KabooLivro8_GaioVentoCoragem_app_compressed.pdf',
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/audio/33efdbb5-abed-4037-9eed-bb7017d19f7a/1769477877251-ohxkfe4-07_gaio_e_o_vento_da_coragem_OK.WAV',
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/video/33efdbb5-abed-4037-9eed-bb7017d19f7a/1769203911843-r8hqd9p-Gaio_e_vento_da_coragem_OK.mov',
  ARRAY['https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/extras/33efdbb5-abed-4037-9eed-bb7017d19f7a/1771619497800-j0xqqfd-Guia_do_Professor_-_Gaio_e_o_Vento_da_Coragem.pdf']
),

-- 10. Batatinha e o Giro das Emoções
(
  '1faea193-81fb-42e6-af37-e3416ac43a2b',
  'Batatinha e o Giro das Emoções',
  '/mock/covers/batatinha-giro-emocoes.png',
  'Educação Infantil',
  '#1F804C',
  'Alfabetização emocional por meio da música',
  'Identificar e nomear emoções em diferentes situações; Reconhecer que toda emoção é válida e pode ser acolhida; Usar música, gestos e cores para expressar sentimentos; Participar de momentos coletivos de escuta, canto e acolhimento; Compreender que a música pode ser uma ponte de empatia e convivência saudável.',
  ARRAY['Batatinha'],
  ARRAY['EI03TS03','EI03CG02','EF15AR15','EF12LP07','ΕI03ΕF03','ΕI03ΕO02'],
  ARRAY['Autoconsciência','Habilidades de Relacionamento'],
  ARRAY['3 anos','4 anos','5 anos','1º ano','2º ano'],
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/pdfs/1faea193-81fb-42e6-af37-e3416ac43a2b/1768329386027-mlk5k6q-EI_KabooLivro7_BatatinhaGiroSentir_New.pdf',
  NULL,
  NULL,
  ARRAY['https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/extras/1faea193-81fb-42e6-af37-e3416ac43a2b/1771619561294-k926w6d-Guia_do_Professor_-_Batatinha_e_o_Giro_do_Sentir.p']
),

-- 11. Blado e a Escolha do Dia
(
  '224f863c-0048-41f5-a660-fbf15e5d632c',
  'Blado e a Escolha do Dia',
  '/mock/covers/blado-escolha-dia.png',
  'Educação Infantil',
  '#DC4244',
  'Tomada de decisão, empatia e reparação',
  'Identificar e nomear pequenas decisões cotidianas que envolvem cuidado com o outro; Reconhecer o valor da partilha, da escuta e da reparação; Usar frases e gestos para resolver situações de conflito com apoio do adulto; Criar registros simbólicos (como estrelas) de boas ações praticadas; Compreender que errar faz parte, mas é possível consertar com carinho.',
  ARRAY['Blado','Papa'],
  ARRAY['EI03EO02','EI03EF03','EI03EO03','EI03CG04','EI03CG05','EI03ECG04','EF01GE04','EF01HI04','EF02HI01'],
  ARRAY['Autogerenciamento','Tomada de Decisão Responsável','Habilidades de Relacionamento'],
  ARRAY['3 anos','4 anos','5 anos','1º ano','2º ano'],
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/pdfs/224f863c-0048-41f5-a660-fbf15e5d632c/1768193069596-um7618a-EI_KabooLivro6_BladoEscolhaDia_app_compressed.pdf',
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/audio/224f863c-0048-41f5-a660-fbf15e5d632c/1769477754231-bd1149x-03_Blado_e_a_escolha_do_dia___sem_trilha_.WAV',
  NULL,
  ARRAY[]::text[]
),

-- 12. Kaboo e o Espelho das Emoções
(
  '8a02c40e-6cbe-4281-bf90-8cc524ca3cc4',
  'Kaboo e o Espelho das Emoções',
  '/mock/covers/kaboo-espelho-emocoes.png',
  'Educação Infantil',
  '#257DBD',
  'Nomeação das emoções, expressão verbal e escuta empática',
  'Reconhecer e nomear sentimentos com apoio verbal e visual; Demonstrar abertura para compartilhar emoções com os colegas; Repetir frases que validam o próprio sentir com intencionalidade; Escutar o outro com empatia, mesmo quando o sentimento dele for diferente do seu.',
  ARRAY['Kaboo','Gaio'],
  ARRAY['EI03EF01','EI03EF03','EI03EO01','EI03EO03','EI03CG01','EF15AR04','EI03EO04'],
  ARRAY['Autoconsciência','Habilidades de Relacionamento'],
  ARRAY['3 anos','4 anos','5 anos','1º ano','2º ano'],
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/pdfs/8a02c40e-6cbe-4281-bf90-8cc524ca3cc4/1768192975597-nplbvre-EI_KabooLivro5_EspelhoEmocoes_app_compressed.pdf',
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/audio/8a02c40e-6cbe-4281-bf90-8cc524ca3cc4/1769477677920-z4mnezj-02_kaboo_e_o_espelho_das_emo__es_ok.WAV',
  NULL,
  ARRAY['https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/extras/8a02c40e-6cbe-4281-bf90-8cc524ca3cc4/1771619578600-9uufecq-Guia_do_Professor_-_Kaboo_e_o_Espelho_das_Emocoes.']
),

-- 13. Batatinha e o Ritmo do Acolhimento
(
  '78942184-3cab-47c9-92a1-4ba56932e440',
  'Batatinha e o Ritmo do Acolhimento',
  '/mock/covers/batatinha-ritmo-acolhimento.png',
  'Educação Infantil',
  '#923E90',
  'Acolhimento, rotina e pertencimento',
  'Reconhecer e nomear momentos da rotina escolar; Demonstrar atitudes de acolhimento e escuta de colegas novos; Repetir frases e gestos de boas-vindas com intencionalidade; Participar da construção de um ambiente coletivo respeitoso; Relacionar música e ritmo a momentos do dia.',
  ARRAY['Batatinha','Kaboo'],
  ARRAY['EI03CG01','EI03CG04','EI03EO02','EI03EF03','EI03ET06'],
  ARRAY['Habilidades de Relacionamento','Autoconsciência'],
  ARRAY['3 anos','4 anos','5 anos'],
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/pdfs/78942184-3cab-47c9-92a1-4ba56932e440/1768192877873-wg09c61-EI_KabooLivro4_BatatinhaAcolhimento_app_compressed',
  NULL,
  NULL,
  ARRAY['https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/extras/78942184-3cab-47c9-92a1-4ba56932e440/1771619532327-nj5zsam-Guia_do_Professor_-_Batatinha_e_o_Ritmo_do_Acolhim']
),

-- 14. Onde está Gaio?
(
  '410acf81-6d7d-4569-85e4-02ed2fb28762',
  'Onde está Gaio?',
  '/mock/covers/onde-esta-gaio.png',
  'Educação Infantil',
  '#E35E37',
  'Cooperação, pensamento investigativo e brincadeira simbólica',
  'Participar de brincadeiras cooperativas com pistas e desafios; Fazer inferências com base em indícios visuais ou verbais; Respeitar diferentes formas de participação nas brincadeiras em grupo; Demonstrar curiosidade e persistência ao seguir pistas; Relatar como se sentiu e reconhecer o valor do trabalho em equipe.',
  ARRAY[]::text[],
  ARRAY['EI03ET03','EI03EO01','EI03CG05','EI03EO03','EI03EF03','EI03CG04','EI03ET06'],
  ARRAY['Habilidades de Relacionamento','Tomada de Decisão Responsável'],
  ARRAY['3 anos','4 anos','5 anos'],
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/pdfs/410acf81-6d7d-4569-85e4-02ed2fb28762/1768192779387-i5lmwcw-EI_KabooLivro3_OndeEstaGaio_app_compressed.pdf',
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/audio/410acf81-6d7d-4569-85e4-02ed2fb28762/1768842640202-h0s902q-onde_esta__o_Gaio.WAV',
  NULL,
  ARRAY['https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/extras/410acf81-6d7d-4569-85e4-02ed2fb28762/1771619596214-cj9uqbk-Guia_do_Professor_-_Onde_Esta_Gaio.pdf']
),

-- 15. Blado e os Sons que Brilham
(
  '76ea478e-a796-48b7-b9f5-67187a777cb8',
  'Blado e os Sons que Brilham',
  '/mock/covers/blado-sons-brilham.png',
  'Educação Infantil',
  '#007C73',
  'Percepção sensorial e escuta ativa',
  'Nomear e reconhecer alguns sons externos e sons internos; Reproduzir sons com o corpo ou outros materiais; Valorizar o silêncio como momento de atenção e presença; Perceber emoções associadas a sons (medo, calma, alegria, raiva, etc.); Expressar o que escutou por meio de linguagem verbal e não verbal; Demonstrar atitudes de escuta ativa e respeito no convívio.',
  ARRAY['Blado','Kaboo'],
  ARRAY['EI03ET02','EI03CG01','EI03EF03'],
  ARRAY['Habilidades de Relacionamento','Autoconsciência'],
  ARRAY['3 anos','4 anos','5 anos'],
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/pdfs/76ea478e-a796-48b7-b9f5-67187a777cb8/1768192650106-9x0kc27-EI_KabooLivro2_BladoSonsBrilham_app_compressed.pdf',
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/audio/76ea478e-a796-48b7-b9f5-67187a777cb8/1769477771898-n4rfbh1-04_Blado_e_os_sons_que_brilham_ok.WAV',
  NULL,
  ARRAY['https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/extras/76ea478e-a796-48b7-b9f5-67187a777cb8/1771619612190-iotoj3h-Guia_do_Professor_-_Blado_e_os_Sons_que_Brilham.pd']
),

-- 16. A Cor do Sentir
(
  'df28d7f4-7eed-4417-ae8c-81e457d61bd5',
  'A Cor do Sentir',
  '/mock/covers/a-cor-do-sentir.png',
  'Educação Infantil',
  '#474A90',
  'Emoções Básicas',
  'Nomear e reconhecer emoções básicas; relacionar sentimentos a cores, sons e gestos; acolher o sentir do outro com empatia; expressar emoções por palavras, desenhos ou movimentos.',
  ARRAY['Kaboo','Batatinha'],
  ARRAY['EI03EF04','EI03CG03','EI03EF03','EI03EF01'],
  ARRAY['Autoconsciência'],
  ARRAY['3 anos','4 anos','5 anos'],
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/pdfs/df28d7f4-7eed-4417-ae8c-81e457d61bd5/1768192671272-atimo0w-EI_KabooLivro1_ACordoSentir_app_compressed.pdf',
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/audio/df28d7f4-7eed-4417-ae8c-81e457d61bd5/1769477834084-p3qcsg8-05_a_cor_do_sentir_ok.WAV',
  NULL,
  ARRAY[]::text[]
)

ON CONFLICT (id) DO UPDATE SET
  title               = EXCLUDED.title,
  cover_image         = EXCLUDED.cover_image,
  level               = EXCLUDED.level,
  color_theme         = EXCLUDED.color_theme,
  theme               = EXCLUDED.theme,
  learning_objectives = EXCLUDED.learning_objectives,
  characters          = EXCLUDED.characters,
  bncc_skills         = EXCLUDED.bncc_skills,
  casel_competencies  = EXCLUDED.casel_competencies,
  age_grade           = EXCLUDED.age_grade,
  pdf_url             = EXCLUDED.pdf_url,
  audio_url           = EXCLUDED.audio_url,
  video_url           = EXCLUDED.video_url,
  extra_materials     = EXCLUDED.extra_materials;

-- ============================================================
-- 2. COLLECTION_RESOURCES (14 registros)
-- Limpa recursos existentes para estas coleções e reinere.
-- Seguro executar múltiplas vezes (idempotente).
-- ============================================================
DELETE FROM collection_resources
WHERE collection_id IN (
  '784b3238-0916-4922-af3c-8627d74cc16c',
  'c6334710-6117-426f-995c-07be8d87d872',
  '6a93b60f-b4e9-4fe6-9fed-7c6f7391745c',
  'ad037be3-ad9f-43d3-a913-549337aef9ef',
  '66627622-235a-43f6-ba4b-35522086165c',
  'ce726511-73df-422d-b5fb-b2d0518e164a',
  '5ff4a457-5cc8-4095-8a2d-f51604bbc7f8',
  '5993fc3f-8e1f-4d32-98f8-447676e31a39',
  '33efdbb5-abed-4037-9eed-bb7017d19f7a',
  '1faea193-81fb-42e6-af37-e3416ac43a2b',
  '224f863c-0048-41f5-a660-fbf15e5d632c',
  '8a02c40e-6cbe-4281-bf90-8cc524ca3cc4',
  '78942184-3cab-47c9-92a1-4ba56932e440',
  '410acf81-6d7d-4569-85e4-02ed2fb28762',
  '76ea478e-a796-48b7-b9f5-67187a777cb8',
  'df28d7f4-7eed-4417-ae8c-81e457d61bd5'
);

INSERT INTO collection_resources (collection_id, title, type, url, size) VALUES

-- Kaboo e a Carta Misteriosa
(
  '784b3238-0916-4922-af3c-8627d74cc16c',
  '1771619357711-x4phiuh-Guia_do_Professor_-_Kaboo_e_a_Carta_Misteriosa.pdf',
  'pdf',
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/extras/784b3238-0916-4922-af3c-8627d74cc16c/1771619357711-x4phiuh-Guia_do_Professor_-_Kaboo_e_a_Carta_Misteriosa.pdf',
  NULL
),

-- Mensageiro e a Canção Certa
(
  'c6334710-6117-426f-995c-07be8d87d872',
  '1771619379928-bj8hhqu-Guia_do_Professor_-_Mensageiro_e_a_Can__o_Certa.pd',
  'pdf',
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/extras/c6334710-6117-426f-995c-07be8d87d872/1771619379928-bj8hhqu-Guia_do_Professor_-_Mensageiro_e_a_Can__o_Certa.pd',
  NULL
),

-- Baratinha e Baratão no Labirinto do Eco
(
  '6a93b60f-b4e9-4fe6-9fed-7c6f7391745c',
  '1771619403995-xyystt9-Guia_do_Professor_-_Baratinha_e_Barat_o_no_Labirin',
  'pdf',
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/extras/6a93b60f-b4e9-4fe6-9fed-7c6f7391745c/1771619403995-xyystt9-Guia_do_Professor_-_Baratinha_e_Barat_o_no_Labirin',
  NULL
),

-- Kaboo e o Desafio das Cores
(
  'ad037be3-ad9f-43d3-a913-549337aef9ef',
  '1771619416692-ct3biwr-Guia_do_Professor_-_Kaboo_e_o_Desafio_das_Cores.pd',
  'pdf',
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/extras/ad037be3-ad9f-43d3-a913-549337aef9ef/1771619416692-ct3biwr-Guia_do_Professor_-_Kaboo_e_o_Desafio_das_Cores.pd',
  NULL
),

-- Gaio e a Hora de Voar Alto
(
  '66627622-235a-43f6-ba4b-35522086165c',
  '1771619433282-czkenw6-Guia_do_Professor_-_Gaio_e_a_Hora_de_Voar_Alto.pdf',
  'pdf',
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/extras/66627622-235a-43f6-ba4b-35522086165c/1771619433282-czkenw6-Guia_do_Professor_-_Gaio_e_a_Hora_de_Voar_Alto.pdf',
  NULL
),

-- Papa e o Plano Furado
(
  'ce726511-73df-422d-b5fb-b2d0518e164a',
  '1771619445683-622yht4-Guia_do_Professor_-_Papa_e_o_Plano_Furado.pdf',
  'pdf',
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/extras/ce726511-73df-422d-b5fb-b2d0518e164a/1771619445683-622yht4-Guia_do_Professor_-_Papa_e_o_Plano_Furado.pdf',
  NULL
),

-- Batatinha e o Espelho da Alegria
(
  '5ff4a457-5cc8-4095-8a2d-f51604bbc7f8',
  '1771619459909-duzk0vo-Guia_do_Professor_-_Batatinha_e_o_Espelho_da_Alegr',
  'pdf',
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/extras/5ff4a457-5cc8-4095-8a2d-f51604bbc7f8/1771619459909-duzk0vo-Guia_do_Professor_-_Batatinha_e_o_Espelho_da_Alegr',
  NULL
),

-- Blado e a Caixa dos Sentimentos
(
  '5993fc3f-8e1f-4d32-98f8-447676e31a39',
  '1771619482234-0jjmad7-Guia_do_Professor_-_Blado_e_a_Caixa_dos_Sentimento',
  'pdf',
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/extras/5993fc3f-8e1f-4d32-98f8-447676e31a39/1771619482234-0jjmad7-Guia_do_Professor_-_Blado_e_a_Caixa_dos_Sentimento',
  NULL
),

-- Gaio e o Vento da Coragem
(
  '33efdbb5-abed-4037-9eed-bb7017d19f7a',
  '1771619497800-j0xqqfd-Guia_do_Professor_-_Gaio_e_o_Vento_da_Coragem.pdf',
  'pdf',
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/extras/33efdbb5-abed-4037-9eed-bb7017d19f7a/1771619497800-j0xqqfd-Guia_do_Professor_-_Gaio_e_o_Vento_da_Coragem.pdf',
  NULL
),

-- Batatinha e o Giro das Emoções
(
  '1faea193-81fb-42e6-af37-e3416ac43a2b',
  '1771619561294-k926w6d-Guia_do_Professor_-_Batatinha_e_o_Giro_do_Sentir.p',
  'pdf',
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/extras/1faea193-81fb-42e6-af37-e3416ac43a2b/1771619561294-k926w6d-Guia_do_Professor_-_Batatinha_e_o_Giro_do_Sentir.p',
  NULL
),

-- Kaboo e o Espelho das Emoções
(
  '8a02c40e-6cbe-4281-bf90-8cc524ca3cc4',
  '1771619578600-9uufecq-Guia_do_Professor_-_Kaboo_e_o_Espelho_das_Emocoes.',
  'pdf',
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/extras/8a02c40e-6cbe-4281-bf90-8cc524ca3cc4/1771619578600-9uufecq-Guia_do_Professor_-_Kaboo_e_o_Espelho_das_Emocoes.',
  NULL
),

-- Batatinha e o Ritmo do Acolhimento
(
  '78942184-3cab-47c9-92a1-4ba56932e440',
  '1771619532327-nj5zsam-Guia_do_Professor_-_Batatinha_e_o_Ritmo_do_Acolhim',
  'pdf',
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/extras/78942184-3cab-47c9-92a1-4ba56932e440/1771619532327-nj5zsam-Guia_do_Professor_-_Batatinha_e_o_Ritmo_do_Acolhim',
  NULL
),

-- Onde está Gaio?
(
  '410acf81-6d7d-4569-85e4-02ed2fb28762',
  '1771619596214-cj9uqbk-Guia_do_Professor_-_Onde_Esta_Gaio.pdf',
  'pdf',
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/extras/410acf81-6d7d-4569-85e4-02ed2fb28762/1771619596214-cj9uqbk-Guia_do_Professor_-_Onde_Esta_Gaio.pdf',
  NULL
),

-- Blado e os Sons que Brilham
(
  '76ea478e-a796-48b7-b9f5-67187a777cb8',
  '1771619612190-iotoj3h-Guia_do_Professor_-_Blado_e_os_Sons_que_Brilham.pd',
  'pdf',
  'https://uuaiacefzdmsdbsvsuoj.supabase.co/storage/v1/object/public/collections/extras/76ea478e-a796-48b7-b9f5-67187a777cb8/1771619612190-iotoj3h-Guia_do_Professor_-_Blado_e_os_Sons_que_Brilham.pd',
  NULL
);

COMMIT;

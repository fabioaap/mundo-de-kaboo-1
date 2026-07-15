---
id: roadmap
title: A fazer / Backlog
sidebar_position: 2
---

# A fazer / Backlog

{/* Consolidação dos backlogs diferidos de docs/docs/roadmap/ + gaps de usabilidade + GTM (docs/docs/gtm/code-backlog.md). Dedupe do que já aparece no done-log. */}

Backlog agrupado por tema. **Prioridade:** 🔴 alta · 🟡 média · 🟢 baixa · 📋 diferido/estrutural
(não iniciar durante a validação do MVP; exige aprovação explícita para promover). O que já foi
entregue está em [Feito / Entregue](./historico); o que falta especificamente para produção está em
[Pra lançar / Go-live](./pra-lancar).

Salvo indicação, itens de dados/estrutura tocam **as duas marcas** (mesmo banco); mudanças no
acervo/branding da Central Coruja exigem **aprovação separada** do dono da marca.

## Documentação viva / doc-sync (recém-entregue — ativar e evoluir)

O sistema (wiki + assistente + doc-sync) já está na `main` (ver [Feito](./historico)). Falta:

- 🔴 **Ativar o CI** (config, não código): secrets `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
  (re-index no merge) e variables públicas `WIKI_SUPABASE_URL` + `WIKI_SUPABASE_ANON_KEY` (Camada 2).
  Sem isso, o re-index automático e o rascunho por IA ficam em standby (o gate já funciona).
- 🟡 **Camada 2 — evoluir para auto-commit:** hoje a IA **comenta** o rascunho no PR; o próximo nível
  é **commitar** no PR (com revisão humana). Exige permissão de escrita + cuidado com loop de CI.
- 🟡 **RAG semântico (pgvector):** subir da busca lexical para embeddings — respostas mais precisas
  (hoje às vezes rankeia um doc parecido). Aditivo, não muda o widget nem a função.
- 🟢 **Silenciar o bot de docs em PR:** ajustar `update-docs.yml` pra não comentar/comitar em PR
  (elimina o ruído de `action_required` no head).

## Mídia canônica (estrutural, 📋 diferido)

A espinha dorsal de vários itens abaixo. Hoje cada mídia vive como JSON embutido em
`collections.collection_assets`, **sem identidade própria** — deduplicada só por URL. O mesmo
arquivo aparece em coleções diferentes com título/descrição divergentes.

:::note Status verificado (2026-07-12) — não confundir com o backbone de mídia
Duas coisas parecidas, mas diferentes:
- **Backbone de mídia** (`media_items` + hubs de Vídeos/Áudios/Formações/Materiais) — ✅ **entregue**
  (ver [Feito](./historico)). É o catálogo dos hubs (base do "mini YouTube").
- **Mídia canônica** (tabela `media_assets` + `source_key`, desacoplar do `collection_assets` JSON) —
  ❌ **nunca iniciada**. Checado exaustivamente em **todo o histórico git** (28 worktrees, 29 branches
  remotas, `git log --all`): `media_assets` **nunca virou migration** e `source_key` **nunca existiu**
  em `supabase/` — o termo só aparece como **proposta** nestes docs de backlog.
:::

- 📋 **Identidade canônica de mídia** (`media_assets` + `collection_media_assets`) — dedup **por
  marca** com ID único por arquivo (`source_key` = caminho no storage ou `youtube:<id>`, não a URL
  crua). Migração aditiva (só cria tabelas e faz backfill; não apaga a JSONB nem os campos legados).
  Problema medido em prod (06/06): 100 linhas de mídia, 79 URLs distintas, 21 duplicadas, 7 URLs com
  título divergente. Fonte: `backlog-midia-canonica`.
- 📋 **Capa por mídia** — desacoplar a capa da mídia da capa da coleção. Hoje a mídia **não tem capa
  própria**; o campo "Imagem de Capa" do drawer escreve em `collection.cover_image`, então editar a
  capa de um vídeo/áudio **sobrescreve** a capa da coleção/kit. Paliativo de exibição aplicado
  (`getLibraryAssetCoverImage`: thumbnail do YouTube → capa da coleção de origem → capa da dona), mas
  o acoplamento estrutural continua. Fonte: `backlog-capa-por-midia`.
- 📋 **Livro vincula mídias cadastradas** — cadastro de livro passa a **vincular** áudios/vídeos/
  materiais da Biblioteca de Mídias (como a Coleção), em vez de upload inline com toggle de
  publicação por mídia. Depende da fundação canônica. Remove o toggle duplicado "Publicar
  audiolivro" vs "Status de publicação do livro" (incidente real 13/06). Fonte:
  `backlog-livro-vincula-midias`.
- 🟡 **Achados correlatos:** entidades de mídia duplicadas (ex.: dois "Blado e os Sons que Brilham");
  URLs cross-projeto apontando para o Supabase antigo (`uuaiacefzdmsdbsvsuoj`); sem dedup por URL na
  grade principal do admin; sem trigger de `updated_at` em `collections`.

## Mini YouTube / Mini Spotify privados (📋 épica de mídia)

Subsistema de descoberta + player para Vídeos e Músicas fora do modelo legado por coleção. Backbone
de dados (`media_items`, `media_collection_links`, `media_shelves`, etc.) já existe; a leitura já é
brand-escopada (ver homologação). Backlog pronto para sprint em `backlog-executavel-mini-youtube-spotify`.

:::note Status confirmado no app rodando (2026-07-12)
A épica está **muito mais entregue** do que o marcador "diferido" sugere — confirmado no app em
produção + pelo dono do produto:
- ✅ **Entregue e em uso:** backbone, **admin de mídia** (criar, upload, publicar, editar — módulos
  Vídeos/Músicas/Formações/Materiais em `AdminCollectionsScreen`), hubs, players com
  **continue-watching** (`user_media_progress`) e **favoritos** (`user_media_favorites`).
- 📋 **Falta:** **proteção avançada de mídia** (streaming segmentado HLS/DASH, watermark) — no radar,
  pós-MVP; e **telemetria de reprodução** — avaliar **GA4** (eventos custom / medição de vídeo do
  YouTube) para o agregado, com atenção a **LGPD** (dados de crianças). Tabela `media_play_*` só se
  precisar de dado auditável/consultável dentro do app.
:::

- 📋 **P0.1 Backbone de mídia** · **P0.2 Adapter de leitura** · **P0.3 Admin de mídia** (CRUD,
  publish/archive, validação de provider) · **P0.4/P0.6 Hubs** de Vídeos e Músicas · **P0.5/P0.7
  Players** com continuidade/fila leve.
- 🟡 **P1.1 Favoritos e recentes** · **P1.2 Saúde de links + telemetria de mídia**
  (`media_play_*`, health check) · **P1.3 Preparação de Formações/Materiais** no mesmo backbone.
- 📋 **P1.4 Hardening de proteção de mídia privada** — bucket privado, URL assinada curta, entrega
  segmentada (HLS/DASH), watermark opcional. Pós-MVP; multi-DRM comercial fica opcional, não
  pré-requisito.
- 🔴 **`media_items` está 100% em rascunho — os hubs do Kaboo estão quase vazios** (achado de
  2026-07-14). A tabela tem **26 entradas, todas com `status = 'draft'`**; nenhuma publicada. Como
  **só o Kaboo lê `media_items`** (a Coruja monta os hubs a partir das coleções — ver
  [Coruja × Kaboo](../architecture/coruja-vs-kaboo)), o efeito aparece só no Kaboo:

  | Hub | Kaboo | Central Coruja |
  |---|---|---|
  | Vídeos | **2** | 20 |
  | Músicas | **0** | 8 |

  O conteúdo **existe** (19 coleções do Kaboo com vídeo, 19 com áudio) — ele só não sobe para as
  bibliotecas, que é justamente a promessa do "mini YouTube / mini Spotify". **Ação:** publicar as
  entradas de `media_items` e verificar se o admin de mídia realmente as publica.

## Vitrine / Remoção de mocks (📋 diferido, alta prioridade pós-MVP)

A descrição "100% mock" está **desatualizada** (verificado no código). A vitrine pública
(`LibraryHubScreen`) de Áudios/Vídeos/Formações/Materiais é hoje **dirigida por dados AO VIVO**:
`shouldUseMediaApi=true` fixo (`LibraryHubScreen.tsx:912`), os itens vêm de `api.getMediaHub()`
(`:966`) e os rails vêm dos shelves da API (`:1103`, `:1628`). Os arquivos
`data/library-hubs/*.mock.ts` **ainda existem mas são código morto** (não alimentam a renderização —
podem ser deletados). Auditoria completa em `backlog-remocao-mocks-vitrine`.

- 🔴 **Decisão de produto:** rails curados manualmente vs automáticos vs híbrido.
- ✅ **Fase 1** — stat cards dinâmicos: **moot** — não há stat cards renderizados hoje (foram
  removidos).
- 🟢 **Fase 2** — rails dinâmicos sem estrutura editorial hardcoded: **majoritariamente feita**
  (resíduo hardcoded = só rótulos de chip).
- 📋 **Fase 3** — curadoria configurável no admin (nova tabela + UI). Segue aberta.
- 🟢 **Deletar os `*.mock.ts`** (`data/library-hubs/*.mock.ts`) — dead code, não alimenta a
  renderização.
- 🟡 **Remover dados fake de vouchers** (`lib/mockVoucherData.ts`, `lib/mockData.ts`) quando o
  fallback não for mais necessário.

## GTM — Aquisição e conversão

Estado verificado no código pós-PR #81 (2026-07-08). Legenda: 🔌 alavanca já existe (fiação) · 🎨
precisa de design no Figma antes · 🗄️ precisa migration/DB. Fonte: `gtm/code-backlog`.

| ID | O que fazer | Prioridade | Notas |
|---|---|---|---|
| **GTM-03** | Camada de telemetria (`lib/analytics.ts`) + eventos (play/leitura, conclusão, upsell, renovação, resgate) | 🔴 alta | Sem isso nada é mensurável. **Zero telemetria no app hoje.** |
| **GTM-01** 🔌 | Botão CTA "Renovar/Comprar" no banner de pré-expiração → abre `store_url` (hoje só "Fechar") | 🔴 alta | `store_url` já existe; é fiação. Maior ROI. |
| **GTM-02** 🔌 | Caminho de recompra na tela de acesso expirado → botão pra `store_url` | 🔴 alta | idem GTM-01. |
| **MKT-B3** ✅ | Badge de cadeado / paywall em conteúdo bloqueado — **JÁ FEITO**: `Card3D` tem prop `locked` (overlay de cadeado) + gate central `App.tsx:883` abre `VoucherUpsellModal` (`components/VoucherUpsellModal.tsx`) com "Comprar na loja" via `store_url` (`App.tsx:1462`) | ✅ feito | Ressalva: badge visual só na **Home**, ainda não na `LibraryHubScreen`. |
| **MKT-C4** 🎨 | Estados do banner por urgência (dias restantes / expira hoje / expirado) | 🟡 média | — |
| **MKT-B2** 🎨 | Empty states com CTA (biblioteca vazia → explorar/adquirir) | 🟡 média | — |
| **GTM-05** 🗄️🎨 | Campo `value_prop`/`tagline` por marca (migration + admin + hero) | 🟡 média | Não existe hoje. |
| **G-MKT-10** 🎨 | E-mails: reativar templates + passar `brand_id` no envio | 🟡 média | Layout é Figma. |

> Aquisição pura (landing pages, captura de lead, social) é design/externo (Figma), fora deste
> backlog — a fiação mínima (`store_url`/`lead_capture_url`) já existe.

## Gaps de usabilidade (testes MVP, 2026-06-06)

Fonte: `backlog-gaps-testes-usabilidade`. Muitos já foram fechados (ver histórico); os abertos:

- 🔴 **G1 — Cloudflare Access bloqueia usuários externos** (prod exige `@educacross.com.br`). Config
  Cloudflare, fora do código. Bloqueia qualquer usuário real / evento.
- ✅ **G10 — Verificação de acesso real-time** — **JÁ FEITO.** Implementado em `App.tsx:797`
  (`setInterval` 60s + subscription Realtime de `profiles` + `setTimeout` no momento exato da
  expiração), com a migration `20260606000100_profiles_realtime_publication.sql`. O roadmap apontava
  o arquivo errado (`lib/access.ts`).
- 🟡 **G11 — Formações/Materiais escondidos no "Mais" do BottomNav mobile** — PARCIAL: o **badge
  numérico** (uma das 2 alternativas propostas) **já existe** (`BottomNav.tsx:226`); falta só a
  promoção a item primário.
- ✅ **G12 — Sidebar de vídeos relacionados em 768–1024px** — **JÁ FEITO**: renderiza a partir do
  breakpoint `md` (`VideoPlayerScreen.tsx:1091` `md:flex-row`, `:1470` `hidden md:block`).
- 🟢 **G4** posição de leitura do PDF não é salva · **G5** sem loader no player de áudio durante
  buffer · **G6** botões Ler/Ouvir/Assistir aparecem sem ativo · **G7** busca da Home não indexa
  Formações e Materiais.

## UX / Conteúdo (média)

- 🟡 **Modal deslizante** (Coleção → Livro → Player sem empilhar modais) — drill-down deslizante
  padrão Apple/iPad com pilha de navegação interna (`framer-motion`). Correção mínima antes: toque no
  livro abre **o modal do livro**, não o leitor direto. Fonte: `backlog-modal-deslizante`.
- 🟡 **Filtros avançados das bibliotecas com dados ao vivo** — `LibraryHubScreen` deriva filtros do
  `catalog.seed.json` (estático); plumbar as coleções reais.
- 🟡 **Tags obrigatórias no card de coleção:** idade recomendada (família) + ano escolar (escola).
- ✅ **Mesclar versões parciais (só-PDF + só-áudio)** — **JÁ FEITO**: verificado no banco de produção
  (2026-07-14), *Gaio e o Vento da Coragem*, *Kaboo e a Cartas Misteriosa*, *Mensageiro e a Canção
  Certa* já têm PDF **e** áudio no mesmo registro, sem duplicata de título na marca Kaboo (0
  duplicatas). *"Onde está Gaio?"* não é mais o mesmo caso: o registro do Kaboo é outro, movido da
  Central Coruja em 2026-07-14 (rascunho, PDF no projeto Supabase legado — ver
  [débito do projeto legado](#ativos-no-projeto-supabase-legado-novo--2026-07-14)).
- 🟡 **"Idade adequada" (Home) é estático 0–12** — não data-driven; oferece idades sem conteúdo.
- 🟡 **Padronizar cards de coleção para 1:1** (crop/zoom estilo foto de perfil).
- 🟡 **Taxonomia/categorias de vídeo** (formação, contação, desenho, treinamento).
- 🟡 **Auto-conclusão de aula por progresso do vídeo (≥90%)** via YouTube IFrame API — hoje o
  professor marca manualmente (MVP funcional). Adiar até validar abandono.
- 🟢 **Decisão:** "Baratinha e Baratão no Labirinto do Eco" existe como book + kit — manter os dois?
- ✅ Atualizar copyright do rodapé para 2026 — **FEITO/obsoleto**: o rodapé usa ano dinâmico
  `new Date().getFullYear()` (`components/BottomNav.tsx:44`).

## Mídia — bugs conhecidos (média)

- 🟡 **Player de vídeo (YouTube) não dá play no Android/Edge** — fix de controles nativos no touch
  funcionou no iPad mas não no Android. Tentativas de fullscreen/rotate quebraram e foram revertidas
  (`VideoPlayerScreen.tsx` no estado estável do commit `87cec5c` + só o fix de controls). Próximo
  passo: reproduzir com device real (chrome://inspect) — não mexer às cegas.
- 🟡 **Vídeo `.mov` no projeto Supabase antigo** — "Gaio e o Vento da Coragem" aponta para
  `uuaiacefzdmsdbsvsuoj` em formato `.mov` (Edge/Chrome não tocam). Reupload como `.mp4`.
- 🟡 **Thumbnail de vídeos enviados como `.mp4`** — hoje caem na capa da coleção; gerar poster no
  upload.

## Cadastro em lote (📋 diferido)

- 📋 **Carga inicial em massa** de livros/coleções (PDF + metadados + capa) via um script
  **proposto** `scripts/import-books-to-prod.mjs` (service-role, dry-run por padrão, `--commit`,
  assert de marca só-Kaboo). **Ainda não construído** — é uma proposta de operação pontual, não
  fluxo do produto e não capacidade atual. O cadastro pela UI (com auto-título, capa automática do
  PDF e sugestão de sinopse por IA) já cobre o dia a dia. Fonte: `backlog-cadastro-em-lote`.

## Organização do projeto / desempenho (tech-debt)

Fonte: `backlog-organizacao-projeto-desempenho`. Grupo A não toca a Central Coruja; Grupo B exige
aprovação separada.

- ✅ **A (backup Kaboo)** — **RESOLVIDO**: `public/kaboo-assets/` **não existe mais** (verificado em
  2026-07-14). Restam os itens menores do grupo A: `.gitattributes` LFS órfão, podar branches
  mergeadas, revisar remotes `fork`/`origin-legacy`.
- 🔴 **B1** — PDFs Central Coruja em `public/central-coruja/pdfs/` — **pior do que o registrado, e
  provavelmente peso morto puro** (medido em 2026-07-14):

  | Fato | Valor |
  |---|---|
  | Tamanho real | **180 MB** em **8 arquivos** |
  | Estado no git | **Versionados** (`git ls-files` confirma) — não são untracked |
  | Referenciados no código? | **Não.** `grep` por `central-coruja/pdfs` só acha menções nestes docs de backlog |
  | O app usa? | **Não.** O `pdf_url` das 8 coleções aponta para o **Supabase Storage**, não para `/public` |

  Ou seja: 180 MB entram no build a cada deploy **sem serem servidos a ninguém**. A ação provável é
  **deletar do repositório** (não "migrar para o Storage" — já estão lá). **Requer confirmação da
  Central Coruja** antes de remover, e o histórico do git continuará pesado (exige `filter-repo` se
  quiserem recuperar o espaço de verdade).
- 🟡 **B** — Ambiente de staging; Playwright E2E no CI; bundle splitting (`lib/api.ts` ~104 KB).

## Ativos no projeto Supabase legado (novo — 2026-07-14)

- 🟡 **PDFs hospedados em `uuaiacefzdmsdbsvsuoj.supabase.co`** — projeto Supabase **antigo**, distinto do
  de produção (`yevysgqlnhonhkczkyhu`). Descoberto na higiene do catálogo da Coruja: os livros do Kaboo
  importados por backfill apontavam para lá. Os arquivos **respondem HTTP 200 hoje**, mas dependem de um
  projeto que pode ser desligado a qualquer momento.

  **Escopo exato (banco de prod, 2026-07-14):** **12 coleções** referenciam esse host — 10 na
  `central-coruja` e 2 no `kaboo`. **Nenhuma publicada.** Ou seja: **nada no ar depende do projeto
  legado** — o risco está contido nos rascunhos.

  **Ação (não bloqueia go-live):** migrar esses arquivos para o bucket de produção e reescrever as URLs.
  Só então publicar *A Cor do Sentir* e *Onde está Gaio?* no Kaboo.

## Testes (tech-debt)

- 🟡 **~50 testes E2E desatualizados** após a refatoração single-brand/admin (2026-06-15) —
  parcialmente superado: `white-label.spec.ts` **já foi realinhado à UI single-brand** e roda como
  **gate obrigatório no CI** (logo passa). Rever os demais (`admin-collections-usability*`,
  `central-coruja-*-jtbd`, que referenciam UI removida — não são bugs de feature).
- 🟡 **Playwright E2E só roda parcialmente no CI** — parcialmente superado: `.github/workflows/ci.yml`
  roda os jobs `e2e-brand-isolation` (`playwright test white-label auth-guard`) + `rls-tests` (pgTAP)
  em todo PR. Falta só rodar a suíte E2E **completa** no CI.
- ✅ `npx playwright test` puro quebra ao carregar um vitest dentro de `tests/` — **JÁ FEITO:**
  `playwright.config.ts:5-11` já tem `testMatch: '**/*.spec.ts'` (com comentário).

## Futuro / v2.0 (fora do gate de go-live)

- Vídeo com Libras + vídeo animado/IA (campos existem, UX não exposta) — 🟡 Parcial.
- Conta Empatia (Google Play + Apple) + build nativo (Capacitor/TWA) — 🔴 depende de infra/lojas.
- CPF opcional no cadastro (ECA digital, validação jurídica); assinatura digital pós-voucher; login
  OAuth Educa Cross.
- Servidor/banco separado para a Central Coruja (decisão de infra).
- Favoritos e recentes; academia/formação do professor; gamificação adulta; perfil infantil.
- Telemetria de mídia; hardening de proteção de mídia privada.
- 📋 **[EPIC] Migração da infra white-label para Educacross (Docker)** — 3 instâncias em containers
  (app Kaboo, app Central Coruja, wiki Docusaurus), cada uma serviço isolado (imagem, env,
  domínio/subdomínio próprio). Substitui o deploy atual via GitHub Pages.

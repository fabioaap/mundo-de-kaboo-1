# Backlog Consolidado — Mundo de Kaboo

> Gerado em 2026-06-14, consolidando: QA (testes + typecheck), varredura de bugs/regressões e inventário dos docs (`docs/`, `docs/docs/roadmap/`, notas Gemini, checklist go-live).
> Marque `[x]` conforme for resolvendo. Itens agrupados por prioridade; tema entre parênteses.

## Saúde atual (2026-06-14)
- ✅ **Unit tests:** 95/95 passando (24 arquivos, vitest).
- ✅ **Typecheck:** **0 erros** (`npx tsc --noEmit --skipLibCheck`). Eram 43 (revelados ao remover os arquivos corrompidos); todos corrigidos em 2026-06-14.
- ✅ **Refatoração single-brand (Configurações):** verificada; sem regressão funcional. Resíduos limpos (ver P3).
- ✅ Filtro de idade (G3-G5), BNCC por faixa, save de personagens, guards do cadastro: verificados e corretos.

### Lote de limpeza rápida — feito em 2026-06-14
- ✅ Removidos os 2 arquivos órfãos/corrompidos da raiz (`jtbd_full_mock.mjs`, `test-jtbd.spec.ts`).
- ✅ " Sequências do Dia": **não-issue** — nenhuma coleção no banco tem espaço sobrando no título.
- ✅ White Label: removida a UI de alerting/dispatch da aba Auditoria ("Histórico de entregas" + "Payload de alertas") e o `useEffect` de auto-dispatch inerte.

---

## Teste de navegação do voucher — rodada 2026-06-15 (viewer real, voucher `KABOO-DEGUST-TESTE` cobrindo só o kit "Cores do Sentir")

### ✅ Funcionando (validado ao vivo)
- Home: card concedido com capa cheia; card não-coberto com **cadeado**.
- Clicar material bloqueado → **modal de upsell** ("Material não incluído / Conteúdo de degustação"), texto correto.
- CTA **"Comprar na loja"** abre `https://loja.educabox.com.br/` em nova aba. ✅
- Kit concedido abre os **detalhes** normalmente (sem modal).
- Gate cobre as **bibliotecas** (clicar áudio de coleção não-concedida → modal).
- Nomenclatura **G3/G4/G5** aparece nas tags do detalhe do livro.

### 🔴 CRÍTICO (bloqueia go-live do voucher) — conteúdo do kit CONCEDIDO fica inacessível
- O voucher concede o **kit** "Cores do Sentir" (`8a593fb9`), mas o **livro/áudio** "A Cordo Sentir" é uma **coleção separada** (`39602737`) que NÃO está nos grants. Resultado: "Ler livro", "Ouvir" e o áudio na biblioteca **disparam o modal de upsell** — o usuário tem o kit mas **não consegue abrir o conteúdo dele**.
- **Causa:** `redeem_voucher` concede só os `collection_id` do model_snapshot (o kit); não expande para os livros vinculados (`kit_book_ids`). **Fix (decidir onde):** (a) no redeem, conceder também as coleções vinculadas ao kit; ou (b) `canAccessCollection` resolver kit→livro (um livro de um kit concedido é acessível). Liga-se à épica de mídia/kit canônico.

### 🟡 UX (menor/médio)
- **Sem indicador de cadeado nas bibliotecas** — Home mostra cadeado, mas Áudios/Vídeos/etc. não; só descobre que está bloqueado ao clicar. Inconsistente.
- **Modal não fecha após "Comprar na loja"** — abre a loja em nova aba e mantém o modal aberto na aba original. Avaliar fechar automaticamente.

### 🔴 CRIAÇÃO de voucher pela UI (admin) — testada ao vivo, e está QUEBRADA
Como `admin@mundodekaboo.dev` (sessão real, não expirada), fiz o wizard de criação de voucher (Etapa 1 config → Etapa 2 "selecionar exatamente os conteúdos" → Etapa 3 revisão; liberei só o livro "A Cordo Sentir"). ✅ O wizard de liberação é claro e funciona até o save. Mas:
- **"Salvar e ativar" falha com 403** — `POST /rest/v1/voucher_models` retorna **403 (RLS)** e o modelo NÃO é criado. Contradição a investigar: a sessão é admin que gerencia Kaboo (`296eab71`), o brand cacheado no bootstrap é o correto (`296eab71`), e `can_manage_brand('296eab71')` retorna **true** isolado (testado via JWT simulado). Próximo passo: capturar o `brand_id` real do corpo do POST / logs do Supabase (pode ser timing/estado do `wizardBrand = useBrandConfig().bootstrap.brand` no momento do submit). **Bloqueia o go-live: admin não consegue emitir voucher pela UI.**
- **Falha silenciosa** — `VouchersModule.handleSave` faz `catch { setSavingWizard(false); }` (VouchersModule:598) **sem toast** → o wizard congela na Etapa 3 sem nenhuma mensagem de erro. Corrigir para exibir o erro.
- **Modelos criados fora da UI (via SQL) não aparecem na lista** — "Nenhum modelo criado" mesmo com modelo `brand=kaboo` no banco (RLS/escopo de brand + `created_by` null). Menos crítico, mas confirma o acoplamento com brand/RLS.
- Nota de modelagem: a tela deixa claro que *"o tipo de pacote organiza a oferta, mas os conteúdos liberados são definidos apenas pelas seleções abaixo"* — a liberação é escolher exatamente as coleções. Reforça o bug do kit→livro acima (escolher um kit não inclui o livro vinculado).

## P0 — Gates de Go-Live (`checklist-go-live-v1-3.md`)
- [ ] **Vouchers ponta a ponta com a gráfica** sem mock (geração → distribuição → resgate → operação). (Vouchers)
- [ ] **Isolamento por marca homologado** (Kaboo × Central Coruja, sem vazamento de leitura/escrita). (White-label)
- [ ] **Catálogo real da Central Coruja** (≥3 coleções, 2 personagens, 1 ativo por tipo, visíveis). (Conteúdo)
- [ ] **Hardening operacional homologado** (offline, feature flags, health checks como processo real + runbook). (Infra)

## P1 — Alta (bloqueadores funcionais / integridade)
- [x] ~~**VouchersModule 100% mock → integração Supabase**~~ — **JÁ INTEGRADO** (verificado 2026-06-15). `lib/apiVouchers.ts` é 100% Supabase (`voucher_models`/`voucher_batches`/`vouchers`/`audit_log` + RPC `emit_voucher_batch`); `VouchersModule` usa `apiVouchers.*` em todas as abas quando `isSupabaseConfigured`, com mock só como fallback. Banco real: 1 modelo, 1 lote, 14 vouchers. **Cleanup futuro:** remover o caminho mock / `lib/mockVoucherData.ts` quando o fallback não for mais necessário. (Vouchers)
- [x] ~~**Redeem de voucher depende de localStorage entre etapas**~~ — corrigido 2026-06-15 (migração aplicada em prod): coluna `profiles.pending_voucher_code` + trigger `handle_new_user` grava o código do `signUp` metadata; `registerWithVoucher` envia o código; LoginScreen/AccessExpiredScreen leem do PERFIL (DB) com localStorage como fallback. Sobrevive a troca de dispositivo. `G3` (Vouchers)
- [ ] **Cloudflare Access bloqueia usuários externos** (prod exige `@educacross.com.br`) — config Cloudflare, fora do código. `G1` (Infra/UX)
- [ ] **Tags obrigatórias no card de coleção: idade recomendada (família) + ano escolar (escola)** — notas Gemini. (Conteúdo/UX)
- [ ] **Mesclar versões parciais** (só-PDF + só-áudio) de: *Gaio e o Vento da Coragem*, *Kaboo e a Carta Misteriosa*, *Mensageiro e a Canção Certa*, *Onde está Gaio?* (Conteúdo)
- [ ] **Verificação de acesso não é real-time** durante a sessão (expiração só reflete após reload) — polling/Realtime (`lib/access.ts:20,49`). `G10` (UX)

## P2 — Média (UX, conteúdo, mídia)
- [x] ~~**Estado "material fora do voucher" (degustação → upsell)**~~ — feito 2026-06-15: modal de upsell (`components/VoucherUpsellModal.tsx`) + gate central em `App.navigate` (e no render do modal de detalhes p/ deep-link) usando `canAccessCollection(contentGrants, id)`. Material não coberto abre o modal "Comprar na loja" em vez do conteúdo. CTA aponta para `VOUCHER_UPSELL_STORE_URL` = `https://loja.educabox.com.br/`. **Pendente:** verificação ao vivo com conta *viewer* + grants (admin não passa pelo gate); gate de players via deep-link (cobertos via navigate in-app).
- [x] ~~**Busca não ignorava acento em vários lugares**~~ — corrigido 2026-06-15 (commit a910820): NFD strip em query+dado no admin (grade de Coleções, pickers de mídia), `SearchableMultiSelect`, Admin Materiais/Formações e Vouchers. Home e bibliotecas já ignoravam (confirmado ao vivo).
- [x] ~~**PDF de livro vazava na biblioteca de Materiais**~~ — corrigido 2026-06-15 (commit a910820): hub de Materiais não inclui mais `reading`; Guia do Professor (extra_material) volta a aparecer.
- [x] ~~**Modal "Filtros" das bibliotecas abria vazio**~~ — corrigido 2026-06-15 (commit a910820): botão/modal escondido quando não há opções. **Causa estrutural pendente (P3):** `LibraryHubScreen` deriva os filtros (personagem/ano/BNCC/CASEL) de um lookup no `catalog.seed.json` (estático), não das coleções ao vivo — por isso vazio em conteúdo real.
- [ ] **Filtros avançados das bibliotecas com dados ao vivo** — plumbar as coleções reais até `LibraryHubScreen` (hoje `libraryCollectionsById` vem do catalog seed) para o modal de Filtros funcionar fora do seed. (UX/Dados)
- [ ] **"Idade adequada" (Home) é estático 0–12** — não data-driven como Ano escolar; oferece idades sem conteúdo. Cosmético. (UX)
- [ ] **Player de vídeo (YouTube) não dá play no celular Android (Edge)** — diagnosticado 2026-06-15. O fix de **controles nativos do YouTube no touch** (`controls=1` quando `ontouchstart`/`maxTouchPoints`, + não renderizar o play customizado no touch+YouTube) **funcionou no iPad**, mas no **Android/Edge nenhum controle dá play**. Tentativas de tela cheia/girar (`documentElement` fullscreen + lock landscape, autoplay mudo) **quebraram** e foram **revertidas** — `VideoPlayerScreen.tsx` está no estado estável do commit `87cec5c` + APENAS o fix de controls nativos (diff +11/−2). **Próximo passo:** reproduzir com device real (chrome://inspect via USB) ou DevTools device mode (touch emulado) para ver console + comportamento do iframe; NÃO mexer às cegas. Arquivo: `screens/VideoPlayerScreen.tsx` (`youtubeEmbedUrl`, `isTouchDevice`). (Mídia/UX)
- [ ] **Vídeo nativo `.mov` no projeto Supabase antigo** — "Gaio e o Vento da Coragem" (animation) aponta para `uuaiacefzdmsdbsvsuoj` + formato `.mov`/QuickTime (Edge/Chrome não tocam). Reupload como `.mp4` no projeto atual. (Conteúdo/Mídia)
- [ ] **Padronizar cards de coleção para 1:1** (crop/zoom de capa, estilo foto de perfil) — notas Gemini. (UX)
- [x] ~~**" Sequências do Dia" — título com espaço no início**~~ — não-issue (banco sem títulos com espaço sobrando). (Conteúdo)
- [ ] **Thumbnail de vídeos enviados como `.mp4`** (hoje caem na capa da coleção; gerar poster no upload). (Mídia)
- [ ] **Botões Ler/Ouvir/Assistir aparecem sem ativo disponível** — condicionar à existência do ativo. `G6` (UX)
- [ ] **Busca da Home não indexa Formações e Materiais.** `G7` (UX)
- [ ] **Posição de leitura do PDF não é salva** (sempre abre na pág. 1). `G4` (UX)
- [ ] **Sem loader no player de áudio durante buffer.** `G5` (UX)
- [ ] **Formações/Materiais escondidos no "Mais" do BottomNav mobile** (`components/BottomNav.tsx`). `G11` (UX)
- [ ] **Sidebar de vídeos relacionados ausente em 768–1024px** (`screens/VideoPlayerScreen.tsx`). `G12` (UX)
- [ ] **Busca + listagem compacta de livros no admin** (escala >200 livros, picker de mídias). (UX/Admin)
- [ ] **Decisão: "Baratinha e Baratão no Labirinto do Eco" existe como book + kit** — manter os dois? (Conteúdo)
- [ ] **Modal deslizante** (Coleção→Livro→Player sem empilhar modais) — `backlog-modal-deslizante.md`. (UX)
- [ ] **Taxonomia/categorias de vídeo** (formação, contação, desenho, treinamento). (Conteúdo)
- [ ] **Padronizar player de YouTube embed** + redimensionamento de imagens nos breakpoints + margens do admin — notas Gemini. (UX)
- [ ] **Atualizar copyright do rodapé para 2026** (verificar se já aplicado). (UX)

## P3 — Tech-debt / Limpeza (inclui resíduos da sessão)
- [x] ~~**Remover arquivos de rascunho corrompidos da raiz**~~ — feito (`git rm`).
- [x] ~~**43 erros de tipo pré-existentes**~~ — **corrigidos** (2026-06-14). `tsconfig` exclui `supabase/functions` (Deno) e `docs` (Docusaurus); corrigidos: `VouchersOnboardingBanner` (interface quebrada), Toast sem `isVisible` (4×), `pdfCover` (pdfjs v5 `canvas`), `api.ts` (continueItemIds, cast strip-retry), `mockVoucherData` (`'kit'`→`'collection'`), `SLOT_MEDIA_TYPE` (+formation/story_video), `setUserFormData` (+password), `layoutSpacing` (+pageIntro/pageContent), `VideoPlayerScreen` (orientation.lock, assetUrl), `FlipbookLoader` (cast react-pageflip), `Icons.stories`, e 2 testes. **Typecheck = 0.**
- [x] **White Label / Configurações — código morto removido:**
  - [x] ~~Aba Auditoria com alerting/dispatch + `useEffect` de auto-dispatch~~ — removidos.
  - [x] ~~`ROLLOUT_WAVES` + handlers `changeRolloutWave`/`saveAlertingConfig`/`sendAlertTest`/`sendOperationalAlerts`/`applyCorujaPreset`/`selectBrand`~~ — removidos (184 linhas).
  - [ ] Resíduo inofensivo restante (sem impacto no build): imports/estado/`useMemo` de rollout/alerting agora sem uso (`rolloutConfig`, `alertingConfig`, `operationalAlertPayload`, etc.) e branches `alert_dispatch`/`rollout_wave` na timeline. Limpeza profunda opcional.
- [x] ~~**Travar este front em Kaboo**~~ — feito (2026-06-14): `VITE_BRAND_SLUG=kaboo` no `.env.local` + `resolveBrandSlug` tornou o env **autoritativo** (acima do preview override), então uma sessão de preview antiga não troca mais a marca silenciosamente. Exige restart do dev server (feito).
- [x] ~~**Configurações sem referências a outra marca**~~ — feito (2026-06-14): `AdminWhiteLabelScreen` 100% brand-agnostic (BRAND_ACCENTS data-driven, placeholder/baseline/default genéricos, fallback via `appBrandSlug`). Cada front vê só a sua marca.
- [ ] **(Opcional/diferido) Tema data-driven no app inteiro** — `isCorujaHomeLayout` / `isCentralCoruja` / `tone === 'central-coruja'` espalhados em ~15 arquivos (tema escuro do Coruja). NÃO é bug (as duas marcas renderizam ok); é tech-debt. Migrar incrementalmente **com QA visual por marca** — alto risco sem verificação visual.
- [ ] **Ambiente de staging** (hoje push em `main`/`v1.1` vai direto a prod; migrations rodam direto em produção). (Infra)
- [ ] **Backup Kaboo em `public/kaboo-assets/` (162 MB, untracked)** → mover para `supabase/backups/storage/`. (Tech-debt)
- [ ] **PDFs Central Coruja em `public/central-coruja/pdfs/` (~183 MB)** → avaliar Supabase Storage / Git LFS. (Tech-debt)
- [ ] **`.gitattributes` LFS órfão** — remover/esvaziar. (Tech-debt)
- [ ] **Higiene de branches/remotes** (9 branches mergeadas para podar; remotes `fork`/`origin-legacy`). (Tech-debt)
- [ ] **Bundle splitting** (`lib/api.ts` ~104 KB; telas ~100 KB). (Performance)
- [ ] **Sem trigger de `updated_at` em `collections`** (campo não confiável para auditoria). (DB)
- [ ] **Playwright E2E só roda local (não no CI)** — regressões passam em deploys. (Testes)
- [ ] **~50 testes E2E desatualizados após a refatoração single-brand/admin (2026-06-15)** — `white-label.spec.ts` (28) + favicon/shell (2) referenciam "Gestão de Marca"/seletor de marcas/rollout/alerting (removidos); `admin-collections-usability*` (13) seletores do drawer/aba de mídia; `central-coruja-*-jtbd` (6). Não são bugs de feature — precisam ser atualizados para a UI atual. (Testes)
- [ ] **`npx playwright test` puro quebra** — `tests/hooks.useBrandConfig.central-coruja.regression.test.ts` é vitest dentro de `tests/`; o glob do Playwright tenta carregá-lo (`Cannot redefine property Symbol($$jest-matchers-object)`). Estreitar `testMatch` para `*.spec.ts`. (Testes)
- [x] ~~**E2E do gate de upsell de voucher**~~ — adicionado 2026-06-15 (`tests/voucher-upsell.spec.ts`, commit d39ba90): viewer com grant parcial → material fora do voucher abre o modal; material coberto abre normal. Mock auth, sem conta real. (Testes)
- [ ] **Alinhar idioma do strip-retry** em `createCollection` vs `updateCollection` (`lib/api.ts:2461`/`:2525`) — cosmético. (Tech-debt)

## Mídia canônica (estrutural — diferido, mas referenciado por vários itens)
- [~] **Áudios/biblioteca duplicados (kit copia mídia do livro)** — diagnosticado 2026-06-14: ex. kit "Cores do Sentir" copiou o áudio do livro "A Cordo Sentir" (mesma URL, asset_id novo). **Paliativo aplicado e CONFIRMADO (admin + vitrine):** dedup por URL atribuindo ao dono (livro) em `AdminCollectionsScreen.libraryAssetItems` (admin) e `api.getCollectionBackedItemsForHub` (vitrine pública). Não aparece mais 2×. **Falta o fix estrutural:** kit REFERENCIAR a mídia do livro sem copiar — exige que `inferCollectionAssets` derive do livro vinculado (`kit_book_ids`) em todos os caminhos de leitura (card, detalhes, save) + migração de dados (remover cópias). É a épica abaixo.
- [ ] **Identidade canônica de mídia** (`media_assets` + `collection_media_assets`; dedup hoje só por URL). `backlog-midia-canonica.md`
- [ ] **Capa por mídia** (desacoplar capa de mídia × coleção; editar capa de mídia sobrescreve `collection.cover_image`). `backlog-capa-por-midia.md`
- [ ] **Livro vincula mídias cadastradas** (picker da biblioteca em vez de upload inline) — depende da fundação canônica. `backlog-livro-vincula-midias.md`
- [ ] **Cadastro de conteúdo em lote** (`scripts/import-books-to-prod.mjs`). `backlog-cadastro-em-lote.md`
- [ ] **Entidades de mídia duplicadas + URLs cross-projeto** (ex.: dois "Blado e os Sons que Brilham"; assets apontando para outro projeto Supabase).

## Vitrine / Remoção de mocks
- [ ] **Vitrines públicas 100% mock** (Áudios, Vídeos, Formações, Materiais) — `data/library-hubs/*.mock.ts`; refatorar `LibraryHubScreen` para dados dinâmicos. `backlog-remocao-mocks-vitrine.md`
- [ ] **Decisão de produto:** rails curados manualmente vs automáticos (bloqueia Fase 2). 
- [ ] **Remover dados fake de vouchers** (`lib/mockVoucherData.ts`, `lib/mockData.ts`) quando o módulo real ligar.
- [ ] **Vitrine de componentes físicos** (carrossel/galeria das peças das coleções) — futuro.

## Futuro / v2.0 (fora do gate de go-live)
- [ ] Vídeo com Libras + vídeo animado/IA (campos existem, UX não exposta).
- [ ] Conta Empatia (Google Play + Apple) + build nativo (Capacitor/TWA).
- [ ] CPF opcional (ECA digital, validação jurídica); assinatura digital pós-voucher; login OAuth Educa Cross.
- [ ] Favoritos e recentes; academia/formação do professor; gamificação adulta; perfil infantil.
- [ ] Hardening de proteção de mídia privada (URL assinada curta, HLS/DASH, watermark).
- [ ] Telemetria de mídia (`media_play_*`, health check de links, alerta no admin).

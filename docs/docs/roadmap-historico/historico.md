---
id: historico
title: Feito / Entregue
sidebar_position: 1
---

# Feito / Entregue — Histórico do Produto

{/* Consolidação (dedupe) de docs/STATUS-FEATURES.md, docs/docs/roadmap/changelog-ajustes-kaboo-2026-06-08.md, o done-log de docs/BACKLOG-CONSOLIDADO-2026-06-14.md e a homologação de isolamento por marca. */}

Este é o registro do que **já foi entregue**. As duas marcas (Kaboo e Central Coruja) compartilham
o mesmo código e backend; salvo indicação, o que é entregue vale para as duas (a diferença é tema +
feature flags). Para o que ainda falta, ver [A fazer / Backlog](./roadmap) e
[Pra lançar / Go-live](./pra-lancar).

## Placar geral (fonte: STATUS-FEATURES, 2026-05-25)

| Status | Qtd |
|---|---|
| ✅ Entregue | 44 |
| 🟡 Parcial | 2 |
| 🔴 Pendente | 9 |
| **Total** | **55** (~82% entregue) |

> O placar acima é gerado por `scripts/update-feature-status.mjs` e reflete 2026-05-25. As seções
> de changelog abaixo registram entregas posteriores (junho e julho de 2026) que ainda não estavam
> nesse placar.

## Features entregues por área (até 2026-05-25)

### Auth e acesso

- Login e cadastro por e-mail/senha (v1.2).
- Voucher temporal: resgate, renovação, expiração (v1.2).
- Duração de voucher 1/3/6/9/12 meses (v1.2).
- Content grants: liberação de conteúdo por voucher (v1.2).
- Convite de colaboradores / invite flow (v1.2).

### Catálogo e vitrine

- 16 coleções reais com covers (v1.2).
- Distinção **kit vs livro** com badge visual e capa própria (v1.2).
- Segmentos editoriais (E.F. Anos Iniciais, Ed. Infantil) (v1.2).
- Sinopse por coleção; ordenação por ano escolar (v1.2).

### Detalhe da coleção

- Leitor de PDF (flipbook) + modo texto acessível (v1.2).
- CTAs tipados (Leitura, Contação, Animado, Libras, Como Jogar, Videoaula) (v1.2).
- Biblioteca estruturada de Materiais da Coleção (v1.2).
- Tooltip BNCC rico (1.397 habilidades) + Tooltip CASEL rico (5 competências) (v1.2).

### Descoberta / Home

- Busca inline com overlay sobre a grade (v1.2).
- Filtro puro → grade direta com chip ativa (v1.2).
- Chips de ano escolar; filtro por personagem com avatares (v1.2).
- Afuniladores avançados de BNCC no mobile (`BnccPickerSheet`) — por etapa, componente e faixa (v1.3, 2026-04-20).

### Personagens

- Catálogo canônico com 8 personagens (v1.2).
- CMS admin: CRUD, foto, aliases, status; persistência remota no Supabase; página pública (v1.2).

### CMS Admin

- CRUD de coleções (kit e livro) (v1.2).
- CMS de vouchers: modelos, lotes, códigos, auditoria (v1.2).
- Exportação XLSX para gráfica; dados de resgate (usuário, e-mail, data de ativação) (v1.2).
- Gestão de usuários com convite e exclusão (v1.2).
- **Mídia e vinculação (v1.3, maio):** seleção de frame de vídeo como capa; segregação de mídia por
  tipo no painel; vínculo de mídia com radio buttons visuais (thumbnails 64×64, dedup por URL);
  botão Limpar remove asset vinculado; `SearchableMultiSelect` com herança de campos pedagógicos.

### Infraestrutura

- Deploy GitHub Pages (v1.2).
- Design system (17+ componentes) (v1.2).
- Backend Supabase remoto validado end-to-end (v1.3, 2026-05-25) — projeto `yevysgqlnhonhkczkyhu`
  (São Paulo).

### White Label / Branding

- Engine white-label com slug, tema, menu e feature flags por marca (v1.3, 2026-04-29) — bootstrap
  via `useBrandConfig`; rotas por slug; isolamento Kaboo × Central Coruja.
- Backbone de mídia privada (storage por marca) (v1.3).
- Controle de acesso por marca (RLS por brand) (v1.3).
- Flag de conteúdo offline por item de catálogo (v1.3, 2026-05-13).

### QA / Testes

- Suíte Playwright Central Coruja (50 testes: jornadas, JTBD, edge cases) — 39 passed, 11 skipped (v1.3).
- Suíte Playwright Kaboo (23 testes) — 23/23 passed (v1.3).

## Changelog — Sessão de ajustes Kaboo (2026-06-08)

> Escopo: **somente marca Kaboo**. Central Coruja não foi tocada (tenant separado).

- **Player de áudio:** título centralizado (pill em `absolute inset-x-0`), sem corte; removido o
  botão "Sugestões".
- **Player de vídeo:** corrigido o "expande/encolhe" ao trocar de vídeo; "Assistir de novo"
  funciona para YouTube; "Próximos vídeos" não repete o vídeo atual (exclui por `id` **e** por URL).
- **Modal de detalhes / "Itens dessa coleção":** cards ganharam capa (64×64) + nome real do
  material; cada item usa a capa da sua coleção de origem; vídeos usam a thumbnail do YouTube; regra
  de download aplicada (vídeo nunca baixa; clicar em "visualizar" num vídeo abre o player).
- **Capas:** `getCollectionDisplayCover` passa a preferir a `cover_image` real sobre o badge
  genérico de kit.
- **Regra de download:** novo campo `CollectionAsset.download_available` + helper
  `canDownloadCollectionAsset` (vídeo nunca baixa); toggle "Disponível para download" no cadastro.
- **Admin de coleções:** toggle de publicação padronizado abaixo do título; gaveta abre no topo ao
  editar; grids alinhados às dimensões da vitrine; título canônico nos cards.
- **Card3D:** removido código morto `COLLECTION_FORMAT_META`; ícones de hover ajustados.
- **Bug de duplicação de assets — causa-raiz fechada:** caminho de edição (`executeSave`) promove
  `temp → permanente` via helper único `promoteAndSync`; script `dedupe-collection-assets.mjs` limpou
  9 duplicatas reais.
- **Limpeza de dados (Kaboo):** apagadas 14 coleções de teste + 5 (kits vazios/duplicata). Central
  Coruja preservada (21 coleções, acervo real).

> **Incidente/lição aprendida:** o script de dedup tinha um bug de identidade de objeto que esvaziou
> 8 coleções reais; restauradas do backup `2026-06-08T17-31-35`. O script passou a deduplicar **por
> nome de arquivo** (só colapsa temp+permanente do mesmo arquivo). Lição: validar scripts de dados
> comparando **contagem de assets antes/depois**, não só ausência de duplicatas.

## Done-log — Backlog consolidado (2026-06-14 / 15)

### Saúde da base

- ✅ Typecheck: **0 erros** (eram 43, corrigidos em 2026-06-14).
- ⚠️ Unit tests: 94/95 (1 falha pré-existente não relacionada a vouchers, em investigação).
- ✅ Refatoração single-brand (Configurações) verificada sem regressão; `AdminWhiteLabelScreen`
  100% brand-agnostic; front travado em Kaboo via `VITE_BRAND_SLUG` autoritativo.

### Gates de go-live fechados

- ✅ **Isolamento por marca homologado (Kaboo × Central Coruja)** — APROVADO 2026-06-15. Gaps de
  leitura do subsistema de mídia fechados (migration `20260615170000`). Ver
  [Homologação — Isolamento por Marca](../operacao/homologacao-isolamento-marca).
- ✅ **URLs white-label editáveis por marca** — loja de upsell, captação de lead e contato de
  suporte viraram `brand_links` em `menu_config`, editáveis na seção "Links da marca" do
  `AdminWhiteLabelScreen` (Kaboo → Empatia Editora; Central Coruja → Universo Educacross).
- ~ **Hardening operacional** — runbook criado + hardening de DB aplicado. Ver
  [Runbook Operacional](../operacao/runbook-operacional).
- ~ **Catálogo real da Central Coruja** — parcial: 18 coleções publicadas; falta personagens +
  viewer + reforçar vídeo. Ver [Checklist Catálogo Coruja](../operacao/checklist-catalogo-coruja).

### Correções de voucher (2026-06-15)

- ✅ **Criação de voucher pela UI (admin)** — era GRANT faltando (não RLS). Migration
  `20260615120000_grant_voucher_tables_to_authenticated.sql` concedeu ao `authenticated` os
  privilégios que batem com as políticas; lista de modelos/lotes/códigos/auditoria voltou a carregar.
- ✅ **Conteúdo de kit concedido acessível (kit → livro)** — `redeem_voucher` passou a expandir
  `kit_book_ids` (cliente via `api.expandKitGrants` + migration `20260615150000` com backfill).
- ✅ **Redeem não depende mais de localStorage entre etapas** — coluna
  `profiles.pending_voucher_code` + trigger `handle_new_user`; sobrevive a troca de dispositivo.
- ✅ **VouchersModule integrado ao Supabase** (verificado 2026-06-15) — `lib/apiVouchers.ts` 100%
  Supabase, mock só como fallback.

### Correções de UX / conteúdo (2026-06-15)

- ✅ Estado "material fora do voucher" → **modal de upsell** ("Comprar na loja") com gate central em
  `App.navigate` via `canAccessCollection`.
- ✅ Busca ignora acento em todos os lugares do admin (NFD strip em query+dado).
- ✅ PDF de livro não vaza mais na biblioteca de Materiais; Guia do Professor volta a aparecer.
- ✅ Modal "Filtros" das bibliotecas não abre mais vazio (escondido quando não há opções).
- ✅ Removidos arquivos órfãos/corrompidos da raiz; código morto de rollout/alerting removido do
  White Label (184 linhas).
- ✅ E2E do gate de upsell de voucher adicionado (`tests/voucher-upsell.spec.ts`).

## 2026-07 (PR #81)

Rodada de unificação do tema da Central Coruja e ajustes de admin white-label, com fix de segurança
e suíte BDD. Estado verificado no código pós-PR #81 (2026-07-08).

### Tema Central Coruja (unificação visual)

- **Barra glass** (navegação com efeito de vidro), **card escuro + dourado** e **tabs/chips glass**
  padronizados — consolida a identidade navy/dourado da marca sem afetar o Kaboo.

### Admin White Label

- **Offline vira interruptor-mestre** (um controle global em vez de toggle disperso).
- **Removido o card de Publicação** do painel.
- **Fonte por seletor** (escolha de fonte da marca via seletor).
- **Parallax / hero só-Coruja** (efeito exclusivo da Central Coruja).
- **Menu "Músicas" movido** para a aba **Menus**.

### Segurança

- **Fix anti-enumeração** (#59 / C5) — GoTrue valida senha antes de `email_confirmed_at`, evitando
  vazar existência de conta por diferença de resposta.

### QA

- **Suíte BDD:** 5 specs Playwright (comportamento) adicionadas.

> Falta de fiação de GTM verificada pós-PR #81 (telemetria zero no app, `store_url` existe mas não
> está ligado ao banner de renovação) — ver [A fazer / Backlog](./roadmap#gtm--aquisição-e-conversão).

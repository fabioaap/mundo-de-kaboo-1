# Backlog — Identidade Canônica de Mídia (`media_assets`)

> Data: 06/06/2026
> Escopo: deduplicação e identidade única de mídias vinculadas a coleções
> Tipo: backlog (diferido) — **não iniciar durante a validação do MVP**
> Status: 📋 Planejado / em backlog

---

## 1. Contexto e problema

Hoje cada mídia vive como JSON embutido em `collections.collection_assets` (JSONB), **sem
identidade própria** — deduplicada apenas por **URL**. O mesmo arquivo de áudio/vídeo/PDF
aparece em coleções diferentes com **título e descrição divergentes**, e o sistema não sabe
qual é o "correto".

**Tamanho real do problema (medido em produção em 06/06/2026):**

| Métrica | Valor |
|---|---:|
| Linhas de mídia (assets) no total | 100 |
| URLs distintas | 79 |
| Linhas duplicadas (mesma URL reusada) | 21 |
| Linhas com **título divergente** para a mesma URL | 15 |
| URLs distintas com conflito de título | **7** |

> Esses **7 URLs** são exatamente os "áudios/mídias duplicados com título diferente"
> relatados. São eles que o dry-run (Fase 0) pede para o responsável resolver.

---

## 2. Por que está no backlog

O produto está em **MVP**, com jornadas ainda em validação. Esta é uma mudança
**estrutural** no núcleo de dados (a tabela `collections` e o modelo de mídia), que toca
produção das **duas marcas** e ~60% do read-path. Não deve atravessar a fase de validação
do protótipo. Promover para sprint exige aprovação explícita após o MVP estabilizar.

---

## 3. Restrições de produção (validadas)

- **Alvo é produção**, não mock: `.env.local` → projeto Supabase `yevysgqlnhonhkczkyhu`
  (sa-east-1, ACTIVE_HEALTHY), com service_role key.
- **Sem branch de staging** disponível no plano atual — migrations rodariam direto na prod.
- **Afeta as duas marcas** (mesmo banco / mesma tabela `collections`):
  **Mundo de Kaboo = 41 coleções**, **Central Coruja = 31**. A dedup é **por marca**
  (não se cruzam), mas o backfill percorre todas as coleções.
- **Migração aditiva**: só cria tabelas novas e preenche a partir da JSONB existente; não
  altera nem apaga `collection_assets` nem os campos legados. Rollback = dropar as tabelas
  novas.

---

## 4. Decisões de produto (fechadas)

1. **Dedup por marca**, com **ID único por arquivo canônico**.
2. **Identidade = o arquivo no storage** (caminho/nome) ou `youtube:<id>` — **não** a URL
   crua, e **não** hash de conteúdo. Reenviar/renomear o arquivo cria uma mídia nova.
3. Título/descrição **canônico + override contextual opcional** por coleção.
4. **Manter** JSONB + campos legados como **cache derivado** (write-through). Não matar agora.

---

## 5. Antítese — gaps que invalidaram a abordagem ingênua

A primeira proposta deduplicava por `UNIQUE(url)` e matava os campos legados. Investigação
no código mostrou que isso **não funciona**:

- **Chave por URL é instável.** `promoteCollectionAssets` (`lib/collectionAssets.ts:326-359`)
  move o arquivo de `/temp/` para o caminho permanente **depois de salvar** → a URL muda.
  YouTube é guardado cru, sem normalizar `youtu.be` vs `watch?v=` (`lib/api.ts:858-879`).
- **Isolamento por marca** (RLS, `20260604000300_fix_rls_brand_isolation.sql`): um catálogo
  global por URL faria a edição de uma marca afetar a outra. O `media_items` existente já
  sofre disso (sem `brand_id`).
- **Read-path depende dos legados**: `BookReaderScreen`, `AudioPlayerScreen`,
  `VideoPlayerScreen`, `DetailsScreen` e o cache offline (`lib/offline.ts`) leem
  `pdf_url`/`audio_url`/`video_url`/`extra_materials` como fallback ativo.
- **Regras de cascata** (publicar/despublicar) são keyed por URL — mudar a identidade para
  ID exigiria reescrevê-las.

---

## 6. Abordagem recomendada (de-riscada)

### 6.1 Modelo de dados (migração aditiva)

**`media_assets`** — identidade canônica, por marca:

```sql
CREATE TABLE public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  source_key TEXT NOT NULL,          -- identidade estável (ver 6.2)
  url TEXT NOT NULL,                 -- URL de apresentação (pode mudar; não é a chave)
  media_type TEXT NOT NULL,          -- 'audio' | 'video' | 'document'
  title TEXT NOT NULL,               -- título CANÔNICO (editar propaga)
  description TEXT,
  lyrics_url TEXT,
  offline_available BOOLEAN,         -- offline pertence à mídia
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (brand_id, source_key)      -- dedup POR MARCA
);
```

**`collection_media_assets`** — link N:N com contexto:

```sql
CREATE TABLE public.collection_media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  media_asset_id UUID NOT NULL REFERENCES public.media_assets(id) ON DELETE RESTRICT,
  category TEXT NOT NULL,            -- CollectionAssetCategory (10 valores)
  scope TEXT NOT NULL DEFAULT 'primary',
  display_title TEXT,               -- override contextual OPCIONAL (null = usa canônico)
  display_description TEXT,
  is_published BOOLEAN,             -- visibilidade por-vínculo
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (collection_id, media_asset_id, category)
);
```

RLS espelha as policies de `collections` (reuso de `can_manage_brand`,
`is_white_label_super_admin`; atenção a recursão — lição do
`20260530000100_fix_media_items_rls_recursion.sql`).

### 6.2 Derivação do `source_key`

- **Upload Supabase**: path após `/object/public/collections/`, **removendo** o segmento
  volátil de coleção → ex.: `audio/<filename>` (estável pré/pós promoção).
- **YouTube**: `youtube:<id>` (normaliza `youtu.be`/`watch?v=`/`embed`, reusar
  `getYouTubeVideoId`).
- **Outros**: URL normalizada (sem query/hash), minúsculas.

### 6.3 Camadas de aplicação

- **Tipos** (`types.ts`): `MediaAsset`, `CollectionMediaAsset`; `CollectionAsset` permanece
  como tipo de **projeção**.
- **API** (`lib/api.ts`): CRUD de media_assets; `getCollections` **hidrata**
  `collection_assets` a partir do relacional (aplica `display_title ?? title`) → readers
  intactos; `create/updateCollection` faz upsert por `(brand_id, source_key)` + sincroniza
  links + **continua** chamando `syncCollectionWithAssets` (write-through dos legados).
- **Admin**: nova tela **Biblioteca de Mídias** (`AdminMediaLibraryScreen`) com CRUD, busca
  e badge "usado em N coleções"; `AdminCollectionsScreen` lê o picker da nova biblioteca,
  grava override por slot e edita offline na mídia.

### 6.4 Migração de dados

1. **Fase 0 — Dry-run (só leitura):** relatório dos 7 `source_key` com títulos divergentes
   para o responsável escolher o vencedor. Nada é gravado.
2. **Fase 1 — Backfill (idempotente, transacional):** cria `media_assets` por
   `(brand_id, source_key)` e popula `collection_media_assets`. Não toca na JSONB/legados.

### 6.5 Fora de escopo (fase futura)

Matar a JSONB `collection_assets` e os campos legados — alto risco, baixo valor imediato;
só após estabilização e migração de todos os readers.

---

## 7. Arquivos previstos

- **Novo**: `supabase/migrations/<data>_media_assets_backbone.sql`
- **Novo**: `scripts/sql/media-assets-conflict-report.sql` (dry-run Fase 0)
- **Novo**: `screens/AdminMediaLibraryScreen.tsx`
- `types.ts`, `lib/collectionAssets.ts` (`deriveSourceKey` + hidratação),
  `lib/api.ts` (CRUD + hidratação + upsert), `screens/AdminCollectionsScreen.tsx`,
  navegação admin (item "Biblioteca de Mídias").

## 8. Verificação (quando for implementado)

Dry-run revisado → backup `collections_backup_<data>` → migração aditiva → testar:
editar título na Biblioteca propaga às coleções; override mantém o canônico nas demais;
mesmo arquivo em 2 coleções = 1 `media_asset`; promoção de URL preserva o `source_key`;
players e regras de cascata seguem funcionando (projeção + legados); offline reflete em
todas as coleções.

## 9. Pré-condições para sair do backlog

- MVP estabilizado e jornadas validadas.
- Aprovação explícita (mudança estrutural em produção das duas marcas).
- Janela com backup confirmado e responsável para revisar os 7 conflitos do dry-run.

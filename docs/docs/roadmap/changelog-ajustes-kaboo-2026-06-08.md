# Changelog & Backlog — Sessão de Ajustes Kaboo (2026-06-08)

> Escopo: **somente marca Kaboo**. Central Coruja é tenant separado (white-label por `brand_id`) — não é tocada.
> Banco: Supabase prod `yevysgqlnhonhkczkyhu` (sem staging; migrations rodam direto na prod).

---

## ✅ Feito nesta sessão

### Player de áudio (`screens/AudioPlayerScreen.tsx`)
- Título centralizado de verdade (pill em `absolute inset-x-0`, alinhado com disco/controles) e sem corte.
- Removido o botão **"Sugestões"** do header.

### Player de vídeo (`screens/VideoPlayerScreen.tsx`)
- Corrigido o "expande/encolhe" ao trocar de vídeo (não limpa `relatedItems` antes do refetch).
- "Assistir de novo" agora funciona para YouTube (`ytPostMessage seekTo+playVideo`).
- **"Próximos vídeos" não repete o vídeo atual** — exclui por `id` **e** por URL do vídeo (cobre abertura sem `mediaItemId` e o mesmo vídeo em coleções diferentes).

### Modal de detalhes / "Itens dessa coleção" (`screens/DetailsScreen.tsx`)
- Cards dos itens ganharam **capa (64×64) + nome real** do material (não só ícone/label genérico).
- Cada item usa a **capa da sua coleção de origem** (casa com a vitrine); **vídeos** usam a **thumbnail do YouTube**.
- Card "Materiais da Coleção" mostra thumbnail do vídeo vinculado.
- **Regra de download** aplicada: ícone de baixar só aparece para material **não-vídeo** e marcado como baixável; **vídeo nunca baixa**. Clicar em "visualizar" num vídeo **redireciona pro player** (sem modal sobre modal).

### Capas (`lib/collectionPresentation.ts`)
- `getCollectionDisplayCover` agora **prefere a `cover_image` real** sobre o badge genérico de kit (`-kit.svg`). Alinha vitrine ao admin.

### Regra de download (modelo + admin)
- Novo campo `CollectionAsset.download_available` (`types.ts`) + helper canônico **`canDownloadCollectionAsset`** (`lib/collectionAssets.ts`): **vídeo nunca baixa**; demais respeitam o toggle.
- Toggle **"Disponível para download"** no cadastro (gaveta de biblioteca em `screens/AdminCollectionsScreen.tsx`), exibido só para materiais não-vídeo.

### Admin de coleções (`screens/AdminCollectionsScreen.tsx`)
- Toggle de publicação padronizado **abaixo do título** em todas as gavetas; removidos toggles duplicados.
- Gaveta **abre no topo** ao editar (scroll-to-top + sem highlight-scroll em modo biblioteca).
- Grids do admin alinhados às dimensões da vitrine (coleções e área de vídeos).
- Título do card de biblioteca usa `collection.title` canônico (placeholders genéricos caem pro título da coleção).

### Card3D (`components/Card3D.tsx`)
- Removido código morto `COLLECTION_FORMAT_META`.
- Ícone de hover: Library (coleção), Video (vídeo puro), Headphones (áudio).

### Bug de duplicação de assets — **causa-raiz fechada**
- **Parte A (código):** o caminho de **edição** (`executeSave`) agora promove `temp→permanente` e re-deriva os campos legados, via helper único **`promoteAndSync`** (usado por criar **e** editar). Impede o surgimento de novas duplicatas/URLs `/temp/`.
- **Parte B (dados):** script `scripts/dedupe-collection-assets.mjs` limpou as 9 duplicatas reais (temp+permanente do mesmo arquivo).

### Limpeza de dados (Kaboo)
- Apagadas **14 coleções de teste** (títulos-lixo: "Teste", "sdadasd", "ghgjhgj", etc.).
- Apagadas **5** (4 kits vazios + 1 duplicata "Descobertas" com título com espaço).
- **Central Coruja preservada** (21 coleções — acervo real, não tocar).

---

## ⚠️ Incidente registrado (lição aprendida)

O script de dedup tinha um **bug de identidade de objeto** que removia **os dois** assets em vez de manter o permanente → **esvaziou 8 coleções reais**. Detectado ao auditar "publicadas vazias".

- **Restauradas** as 8 a partir do backup `supabase/backups/2026-06-08T17-31-35/` (cada uma com seu asset permanente).
- **Script corrigido:** dedup agora é **por nome de arquivo** (só colapsa temp+permanente do *mesmo* arquivo); nunca remove conteúdo distinto (kits com vários livros estão seguros); casos incertos viram `SAME_NAME_REVIEW` (report-only).
- **Lição:** validar scripts de dados comparando **contagem de assets antes/depois**, não só "ausência de duplicatas" (uma coleção vazia também tem 0 duplicatas).

---

## ⏳ Pendente (Kaboo)

### Conteúdo / dados
- **Versões parciais** (lote 03/06, partidas em só-PDF + só-áudio) — mesclar cada par numa coleção: `Gaio e o Vento da Coragem`, `Kaboo e a Carta Misteriosa`, `Mensageiro e a Canção Certa`, `Onde está Gaio?`. *(Decisão/merge manual — as completas estão na Central Coruja, mas é outro tenant: não copiar.)*
- **"Baratinha e Baratão no Labirinto do Eco"** existe como **book** + **kit** — decidir se mantém os dois.
- **" Sequências do Dia"** — título com espaço na frente (corrigir trim).

### Código
- **Commitar** todas as mudanças desta sessão (ainda no working tree).
- **Thumbnail de vídeos enviados como arquivo** (`.mp4` no storage): hoje caem na capa da coleção. Para thumbnail real, gerar/armazenar um poster no upload (item à parte).
- Toggle "Disponível para download" hoje aparece na **gaveta de biblioteca**; avaliar estendê-lo ao fluxo de "Mídias vinculadas" de kits, se necessário.

---

## 🧹 Higiene de dados — fluxo seguro (padrão a repetir)
1. `node scripts/backup-kaboo-data.mjs` (backup antes de qualquer escrita destrutiva).
2. Levantar **ids exatos** com `SELECT` e revisar.
3. Confirmação **explícita** do usuário sobre a lista exata (deleções em prod exigem isso).
4. Aplicar e **reverificar** (contagens antes/depois).

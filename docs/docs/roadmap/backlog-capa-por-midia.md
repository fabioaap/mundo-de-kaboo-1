# Backlog — Capa por Mídia (desacoplar capa de mídia × capa de coleção)

> Data: 09/06/2026
> Escopo: capa/thumbnail de mídias (vídeo, áudio, livro) no admin e no app
> Tipo: backlog (diferido) — não implementar durante a validação do MVP
> Status: 📋 Planejado / em backlog

---

## 1. Sintoma relatado

Ao vincular uma mídia (vídeo do YouTube, áudio ou livro) a uma coleção/kit, a **capa da
mídia aparece como a capa da coleção** (ex.: vídeo "Como Jogar" exibindo a arte do kit
"Asas da Coragem" em vez do thumbnail do YouTube). O usuário descreveu como "a capa original
da mídia foi substituída".

## 2. Causa-raiz (investigação 2026-06-09, produção `yevysgqlnhonhkczkyhu`, read-only)

São **dois** problemas sobrepostos:

### 2.1 🟡 Exibição (paliativo já aplicado)
As listagens do admin derivavam a capa de cada mídia a partir da **coleção dona da
listagem**, sem thumbnail próprio:
- `screens/AdminCollectionsScreen.tsx` → `libraryAssetItems` (grade Vídeos/Áudios) e
  `mediaLibraryByCategory` (picker) usavam `getCollectionDisplayCover(collection) || collection.cover_image`.

Resultado: uma mídia linkada num kit mostrava a capa do kit. **Corrigido (display)** via
`getLibraryAssetCoverImage` em `lib/collectionPresentation.ts`, que prefere, em ordem:
thumbnail do YouTube (vídeo) → capa da coleção **de origem** (id embutido na URL do arquivo)
→ capa da coleção dona. (Ver §4 para os limites desse paliativo.)

### 2.2 🔴 Acoplamento estrutural (NÃO resolvido — é o cerne deste backlog)
**Mídia não possui campo de capa próprio.** Capas moram em `collections.cover_image`.
Na área de biblioteca, o campo **"Imagem de Capa" do drawer escreve em
`collection.cover_image`** (`AdminCollectionsScreen.tsx:3594-3603` → `executeSave` →
`api.updateCollection`). Como editar uma mídia **abre a coleção dona** (`editingId` = a
coleção/kit), **a capa da mídia e a capa da coleção são o MESMO campo**:

- Setar a capa de um vídeo/áudio na biblioteca **sobrescreve** a capa da coleção/kit.
- Setar a capa da coleção **muda** a capa exibida da mídia.

Esse acoplamento é a causa real de "capa substituída" e **não** se resolve por completo no
rendering.

> **Mitigação parcial já aplicada (09/06/2026):**
> - **Listas do admin** (Vídeos/Áudios) derivam a capa por-mídia (`getLibraryAssetCoverImage`).
> - **Vitrine pública** (Bibliotecas → Áudios/Vídeos): `getCollectionBackedAssetThumbnail`
>   (`lib/api.ts`) passou a usar a capa da **coleção de origem** do arquivo (id na URL) para
>   mídia reusada, em vez da capa do kit.
> - **Drawer da biblioteca** (`AdminCollectionsScreen.tsx`): quando a mídia é **vídeo do
>   YouTube**, mostra a miniatura do YouTube; quando é **mídia reusada** (arquivo pertence a
>   outra coleção — ex.: áudio do kit), mostra a capa da coleção de origem e **esconde o
>   upload**, para não sobrescrever a capa da coleção/kit. Mídia **própria** mantém o upload.
>
> **Continua em aberto (estrutural):** vídeos `.mp4` (sem id do YouTube), assets em `/temp/`
> sem id de origem, e o fato de a mídia ainda **não ter capa própria persistida** — então
> editar a capa de uma mídia própria ainda grava em `collection.cover_image`.

## 3. Achados de dado correlatos (mesma investigação)

- **Sem trigger de `updated_at`** em `collections` → o campo não é confiável para auditar
  escritas (o kit "Asas da Coragem" teve a capa gravada às 21:58 mas a linha marca 21:50).
- **Entidades de mídia duplicadas**: dois livros "Blado e os Sons que Brilham"
  (`76ea478e…` e `11b18c7e…`) para o mesmo conteúdo.
- **URLs cross-projeto**: parte dos assets aponta para `uuaiacefzdmsdbsvsuoj.supabase.co`
  (projeto diferente do atual `yevysgqlnhonhkczkyhu`).
- **Sem dedup por URL na grade principal** (`libraryAssetItems`): só o picker
  (`mediaLibraryByCategory`) deduplica → a mesma mídia aparece em vários cards.
- **Título da mídia na biblioteca** é forçado para `collection.title`
  (`AdminCollectionsScreen.tsx:824-826`), então o vídeo "Labirinto do Diálogo" aparece como
  "Asas da Coragem" — sintoma irmão do de capa (mídia herda identidade da coleção).

## 4. Limites do paliativo (por isso o estrutural continua necessário)

O `getLibraryAssetCoverImage` melhora as **listas**, mas:
- **Não** corrige o drawer (§2.2) — editar a capa da mídia ainda muda a capa da coleção.
- **Falha** para assets em `/temp/` (URL sem id de coleção de origem) → cai na capa da coleção.
- **Falha** para vídeos `.mp4` enviados como arquivo (sem id do YouTube) → cai na capa da
  coleção (já listado como pendência na sessão de 2026-06-08).

## 5. Ação proposta (pós-MVP, sob aprovação)

Modelo de **capa por-mídia**, desacoplado da coleção:
1. Dar à mídia uma identidade/capa própria (campo de cover no asset, ou tabela de mídias
   canônicas — alinhar com o backlog [Identidade Canônica de Mídia](./backlog-midia-canonica)).
2. Drawer da biblioteca passa a editar a capa **da mídia**, não `collection.cover_image`.
3. Vídeo do YouTube: capa derivada do thumbnail por padrão (sem gravar capa de coleção).
4. Vídeo `.mp4`: extrair frame (já existe `VideoFramePicker`) e gravar como capa da mídia.
5. Dedup de entidades duplicadas e normalização de URLs cross-projeto.
6. Dedup por URL também na grade principal.

## 6. Riscos e cuidados

- **Só Kaboo** — não tocar conteúdo/branding da Central Coruja sem aprovação separada.
- **Prod sem staging**: qualquer migração de capa por-mídia roda direto na produção →
  exige backup + confirmação com ids exatos.
- Alinhar com o backlog de **Identidade Canônica de Mídia** para não criar dois modelos
  concorrentes de "mídia".

## 7. Referências de código

- `lib/collectionPresentation.ts` — `getLibraryAssetCoverImage`, `getYoutubeThumbnail`,
  `extractSourceCollectionId`, `getCollectionDisplayCover` (paliativo de exibição).
- `screens/AdminCollectionsScreen.tsx` — `libraryAssetItems` (~790-850),
  `mediaLibraryByCategory` (~1373-1421), drawer "Imagem de Capa" (~3594-3625).
- `screens/DetailsScreen.tsx` — `getAssetCover` / `getYoutubeThumb` (lado app, já correto).

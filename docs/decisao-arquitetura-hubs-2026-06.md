# Decisão de Arquitetura — Escopo dos Hubs (Tipo + Flag)

**Data:** 2026-06-20
**Status:** Aceita (em validação no worktree, ainda não em PROD)
**Contexto:** separação de música / audiolivro / vídeo nos hubs do app (Kaboo + Central Coruja).

## Problema

Os hubs (Músicas, Vídeos, Formações, Materiais) misturavam dois tipos de mídia que têm
propósitos diferentes:

- **Conteúdo de catálogo** — o usuário navega/descobre (faixa de música, animação avulsa).
- **Acompanhamento de uma obra** — narração do livro, Libras, "Como Jogar" de um kit. Faz
  sentido **dentro da obra**, não como card solto no hub.

Misturar os dois polui o hub e quebra o modelo mental do usuário.

## Benchmark (como produtos de referência resolvem)

| Produto | Eixo primário | Mídia presa à obra | Regra |
|---|---|---|---|
| **Spotify** | Tipo (abas Música / Podcasts / Audiolivros) | — | O **tipo** define a superfície |
| **Netflix** | Catálogo de títulos | Trailers/extras = dentro do título | Relação **pai-filho** (companion) |
| **Epic / Vooks** | Tipo (Livros / Audiolivros / Vídeos) | Narração read-along = dentro do livro | **Tipo** + companion intrínseco |
| **CMS headless** | Content type (taxonomia) | — | **Tipo como default** + flag de exceção |

## Decisão — regra de 3 camadas

A escolha "categoria **vs** flag" é falsa. Os produtos usam **as duas em camadas**:

1. **Tipo de conteúdo = espinha dorsal.** O tipo decide o lugar natural da mídia (qual hub).
   Previsível e alinhado ao modelo mental do usuário.
2. **Mídia-acompanhamento mora dentro da obra.** Narração, Libras, "Como Jogar": nunca são
   cards soltos no hub; aparecem no contexto da obra-pai.
3. **Flag editorial = exceção.** `is_published` por-asset (decisão D1 do plano) promove/esconde
   um item específico de uma superfície sem mudar o tipo.

> **Tipo decide o lugar natural; o flag cobre os casos especiais.**

## Mapeamento por categoria

Categoria → é **catálogo** (aparece no hub) ou **acompanhamento** (só dentro da obra):

### Áudio (hub Músicas)
| Categoria | Label | Natureza | No hub? |
|---|---|---|---|
| `music` | Música | catálogo | ✅ sim |
| `storytelling` | Audiolivro | acompanhamento (narração do livro) | ❌ dentro do livro |

### Vídeo (hub Vídeos)
| Categoria | Label | Natureza | No hub? |
|---|---|---|---|
| `animation` | Desenho Animado | catálogo | ✅ sim |
| `story_video` | Contação em vídeo | catálogo (a confirmar) | ✅ sim (ponto aberto) |
| `accessible_video` | Com Libras | acompanhamento (variante da obra) | ❌ dentro da obra |
| `how_to_play` | Como Jogar | acompanhamento (instrução do kit) | ❌ dentro do kit |
| `video_lesson` / `formation` | Videoaula / Formação | pertence a **Formações** | (fora do escopo desta decisão) |

## Implementação

A regra já é expressa por `COLLECTION_BACKED_HUB_CATEGORIES` (camada tipo→hub) +
filtro `asset.is_published !== false` (camada flag). Aplicar a decisão = **curar essas listas**
para que categorias-acompanhamento não entrem nos hubs.

- `lib/api.ts` → `COLLECTION_BACKED_HUB_CATEGORIES`:
  - `music: ['music']` (removido `storytelling`)
  - `videos: ['animation', 'story_video', 'video_lesson', 'formation']` (removidos `accessible_video`, `how_to_play`)
- Admin continua gerenciando **todas** as categorias (o hub é a camada de curadoria do usuário,
  não do admin).

## Pontos abertos (confirmar no teste)

1. **`story_video`** — é o análogo em vídeo da narração. Mantido no hub por ora; se quiser
   consistência total com o áudio (onde narração saiu), tirar também.
2. **Libras (`accessible_video`) acessível dentro da obra** — ao sair do hub, precisa estar
   alcançável no detalhe da obra-pai (asset `scope: primary`). Verificar na validação.
3. **`video_lesson` / `formation` no hub Vídeos** — overlap pré-existente com Formações; revisar
   à parte.

## Entrega (PROD)

Mudança de comportamento de hub. Conforme o plano (gap de processo aberto, app sem staging):
**embrulhar atrás de feature flag + rollback** antes de subir. Hoje validado só no worktree.

## Dados de prod (2026-06-20, baseline)

- Coruja: animation 29, accessible_video 8, story_video 2, formation 4, video_lesson 1
- Kaboo: how_to_play 15 (em kits, já fora do hub), story_video 3
- Áudio (Coruja): 9 faixas `music`; audiolivros `storytelling` ficam no livro

---
id: coruja-vs-kaboo
title: Onde a Central Coruja diverge do Kaboo
sidebar_position: 10
---

# Onde a Central Coruja diverge do Kaboo

> **Por que este doc existe:** o white-label promete que "cada marca é só tema + feature flags sobre o
> mesmo código". Isso é **quase** verdade. Existem divergências **no código**, não em configuração —
> e elas são **invisíveis** para quem olha só o produto. Sem este mapa, um hub vazio parece falta de
> conteúdo quando na verdade é uma decisão de arquitetura.

| Campo | Valor |
|---|---|
| **Módulos-chave** | `lib/contentHygiene.ts` · `lib/api.ts` |
| **Última verificação** | 2026-07-14 (código + banco de produção) |

## Resumo das divergências

| Comportamento | Kaboo | Central Coruja | Onde |
|---|---|---|---|
| Fonte dos hubs de mídia | tabela `media_items` | **as próprias coleções** | `api.ts:2239` |
| Materiais centrais | recebe (do seed) | **bloqueado — sempre vazio** | `contentHygiene.ts:141` |
| Filtro de higiene de conteúdo | não aplica | **aplica** (ids de seed, marcadores de teste) | `contentHygiene.ts:98` |
| Tema | roxo | glass + dourado, hero parallax exclusivo | `design-system/tokens/themes.ts` |
| Flag `content.offline` | sem override (default `false`) | override explícito `false` | banco (`brand_feature_overrides`) |

---

## 1. A Coruja não usa o backbone de mídia

`shouldUseSharedMediaCatalog('central-coruja')` retorna **`false`** (`contentHygiene.ts:94`). Em
`api.ts:2239`, o `getMediaHub()` faz um **early return** antes de consultar a tabela:

```ts
if (!shouldUseSharedMediaCatalog(_activeBrandSlugForApi)) {
  return preferredFallbackResponse;   // <- a Coruja para aqui
}

const { data: items } = await supabase
  .from('media_items')
  .select('*')
  .eq('hub', hub)
  .eq('status', 'published')          // <- só o Kaboo chega aqui
```

**Consequência:** os hubs de Vídeos/Músicas/Formações/Materiais da Coruja são montados a partir das
**coleções da própria marca** (`collectionBackedResponse`). Os do Kaboo consultam `media_items`.

:::danger Isto explica um paradoxo real observado em produção (2026-07-14)
| | Kaboo | Coruja |
|---|---|---|
| Vídeos no hub | **2** | **20** |
| Músicas no hub | **0** | **8** |

A marca **principal** tem os hubs quase vazios, e a marca cliente tem os hubs cheios. O motivo não é
conteúdo: a tabela `media_items` tem **26 entradas, todas com `status = 'draft'`** — **nenhuma
publicada**. Como só o Kaboo lê essa tabela, só o Kaboo sofre. A Coruja, que lê das coleções, não
percebe o problema.

**Ação:** publicar as entradas de `media_items` (hoje todas em rascunho) para que os hubs do Kaboo
reflitam o acervo real (19 coleções com vídeo, 19 com áudio).
:::

## 2. A Coruja não recebe materiais centrais

`filterCentralMaterialsForBrand` (`contentHygiene.ts:141`) retorna **array vazio** para a Coruja:

```ts
export const filterCentralMaterialsForBrand = (materials, brandSlug) => {
  if (!isHygieneBrand(brandSlug)) {
    return materials;
  }
  return [];   // <- Coruja nunca vê materiais centrais
};
```

:::warning Os materiais centrais são SEED, não conteúdo de banco
`api.getCentralMaterials()` (`api.ts:2622`) **nunca consulta o Supabase** — sempre retorna
`getMockCentralMaterials()`, que lê de `data/central-materials.seed.json`.

Ou seja: os **15 "Guias do Professor"** que aparecem na biblioteca de Materiais do **Kaboo em
produção** são **dados de seed versionados no repositório**, não conteúdo cadastrado pelo admin.

**Pergunta de produto em aberto:** isso é intencional (materiais são parte do produto, não do
catálogo editável) ou é dívida que deveria virar tabela + CMS?
:::

**Consequência:** a biblioteca de Materiais da Coruja aparece **vazia por decisão de código**.
Não adianta "popular Materiais" pelo admin — o caminho está bloqueado antes.

## 3. Filtro de higiene de conteúdo

Exclusivo da Coruja. Documentado em detalhe em [Higiene de conteúdo](./higiene-de-conteudo).

## Como saber se um comportamento é código ou conteúdo

Antes de abrir um item de backlog do tipo *"falta conteúdo na marca X"*, cheque nesta ordem:

1. **É a Coruja e envolve um hub de mídia?** → o hub vem das **coleções**, não de `media_items`.
2. **É a Coruja e envolve Materiais?** → está **bloqueado no código**. Não é conteúdo.
3. **É o Kaboo e o hub está vazio?** → provavelmente as `media_items` estão em **rascunho**.
4. **Some conteúdo só na Coruja?** → pode ser o [filtro de higiene](./higiene-de-conteudo).

Só depois de descartar os quatro é que "falta conteúdo" é a explicação certa.

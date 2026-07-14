---
id: higiene-de-conteudo
title: Higiene de conteúdo (filtro por marca)
sidebar_position: 9
---

# Higiene de conteúdo — o filtro da Central Coruja

> **Por que isto existe:** a Central Coruja é uma marca **de cliente**. Nada de conteúdo do Kaboo
> (nem seed, nem mock, nem teste) pode vazar para a vitrine dela. O módulo `lib/contentHygiene.ts`
> é a última linha de defesa contra esse vazamento.

| Campo | Valor |
|---|---|
| **Módulo** | `lib/contentHygiene.ts` |
| **Marca protegida** | `central-coruja` (constante `HYGIENE_BRAND_SLUG`) |
| **Chamado por** | `lib/api.ts` — `getCollections()` e o hit de cache |
| **Última revisão** | 2026-07-14 |

## Como funciona

Toda coleção passa por `filterCollectionsForBrand(collections, brandSlug, brandId, options)`.

Para **qualquer marca que não seja a Coruja**, o filtro só aplica o escopo de marca (`brand_id`) e
devolve o resto. **A higiene só age na Central Coruja.**

Para a Coruja, o comportamento depende de **quem está olhando** e de **de onde vieram os dados**:

| Quem | Origem | O que é removido |
|---|---|---|
| **Vitrine** (usuário final) | qualquer | Ids de seed do Kaboo · capas `/mock/` · qualquer marcador de teste no título/assets (`qa`, `demo`, `mock`, `sample`, `tmp`, `dummy`, `bug`, `regression`) · URLs de exemplo |
| **Admin** | **banco remoto** | Só capas `/mock/`. **Ids de seed são exibidos.** |
| **Admin** | seed/mock local | Ids de seed · capas `/mock/` |

## A regra que não é óbvia: por que o admin remoto vê ids de seed

Um id de seed **no caminho local** é dado de mock — poluir o admin de dev com ele não ajuda ninguém.

Mas um id de seed **vindo do banco de produção** é outra coisa completamente: é uma **linha real**,
gravada na marca errada. Foi exatamente o que aconteceu — a migration
`20260525000200_backfill_central_coruja_legacy_books.sql` atribuiu coleções órfãs à Coruja **casando
por título**, e arrastou 12 livros do Kaboo junto (com os UUIDs originais do seed).

Enquanto o admin também escondia esses ids, o resultado era o pior dos mundos:

> o lixo estava **publicado** em produção, o app o escondia da vitrine, e o admin **não conseguia
> vê-lo nem removê-lo**. Ficou invisível **e ingerenciável** por meses.

Por isso o parâmetro `fromRemote`: no caminho remoto, o admin **vê** essas linhas e pode limpá-las.
A vitrine continua escondendo (via `isMockOrTestCollection`), então o usuário final nunca é exposto.

:::warning Não remova o `fromRemote`
Sem ele, lixo importado por backfill volta a ser invisível para quem tem o poder de corrigi-lo.
O comportamento está travado por `lib/contentHygiene.adminVisibility.test.ts`.
:::

## Pegadinha do regex

`MOCK_MARKER_REGEX` usa limites de palavra (`\b`). Isso significa que **`test` casa, mas `Teste`
(português) não** — o `e` final destrói o limite de palavra. Foi assim que um kit intitulado
**"Teste "** chegou a ficar publicado como o **primeiro card** da vitrine da Coruja, em produção.

**Lição:** o filtro de código é uma rede de segurança, **não** um substituto para higiene de dados.
Conteúdo em produção precisa de auditoria no banco — ver o
[histórico da higiene do catálogo](../roadmap-historico/historico).

## Funções irmãs

- `filterCharactersForBrand` — mesma ideia para personagens (ids de seed + marcadores).
- `filterCentralMaterialsForBrand` — a Coruja **não usa** materiais centrais: retorna sempre vazio.
- `shouldUseSharedMediaCatalog` — `false` para a Coruja (ela não compartilha o catálogo de mídia).

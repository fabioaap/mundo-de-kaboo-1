---
id: admin-formacoes
title: Formações
sidebar_position: 5
---

# Módulo Formações

## Para que serve

Cria **percursos de formação** para professores — trilhas com aulas em vídeo e
materiais de apoio. No consumidor aparecem como "Percurso" nos hubs de biblioteca
(`ITEM_LABELS.formation = 'Percurso'`, `screens/LibraryHubScreen.tsx:34`) e abrem no
`screens/FormationPlayerScreen.tsx`.

## Quem pode usar

Editores e admins (tela própria `AdminFormationsScreen`, `screens/AdminScreen.tsx:225`).

## Como abrir

Administração → **Formações**. O topo mostra o título "Formações" e uma busca
(`screens/AdminFormationsScreen.tsx:252`).

## Passo a passo — criar uma formação

1. Clique em **Nova Formação** — abre o editor "Nova Formação"
   (`screens/AdminFormationsScreen.tsx:393`).
2. Preencha:
   - **Nome da formação** (`:434`).
   - **Descrição / objetivo** (`:462`).
   - **Duração** estimada, ex.: "2 horas" (`:495`).
3. **Assets de apoio** — adicione recursos com **Título do asset** e **URL do arquivo**
   (`:565`, `:574`).
4. **Aulas** — para cada aula informe:
   - **Título da aula** (`:604`).
   - **Descrição** (opcional) (`:611`).
   - **URL do vídeo (YouTube)** (`:619`).
5. **Salvar**.

## Editar

Clique numa formação da lista; o editor abre com "Editar Formação" e os campos
preenchidos (`screens/AdminFormationsScreen.tsx:393`).

## O que muda no consumidor

Formações publicadas entram no hub de formações. O professor assiste às aulas em
sequência e baixa os assets de apoio, sujeito ao acesso liberado pelo voucher.

## Kaboo × Central Coruja

Menu **Formações** controlado por `menu.formations`. Catálogo forkado por marca.

---
id: admin-materiais
title: Materiais
sidebar_position: 6
---

# Módulo Materiais

## Para que serve

Cadastra **materiais de apoio** — PDFs, guias, atividades e recursos avulsos que o
professor usa em sala. No consumidor aparecem como "Material" nos hubs de biblioteca
(`ITEM_LABELS.material = 'Material'`, `screens/LibraryHubScreen.tsx:34`).

## Quem pode usar

Editores e admins (tela própria `AdminMaterialsScreen`, `screens/AdminScreen.tsx:227`).

## Como abrir

Administração → **Materiais**. O topo exibe "Materiais" e uma busca
(`screens/AdminMaterialsScreen.tsx:202`).

## Passo a passo — adicionar um material

1. Clique em **Novo Material** — abre o editor "Novo Material"
   (`screens/AdminMaterialsScreen.tsx:339`).
2. Preencha:
   - **Nome do material** (`:380`).
   - **Descrição** (`:408`).
   - **Arquivo/URL** do recurso e metadados (nível, tema).
3. **Salvar**.

## Editar

Selecione um material da lista para abrir "Editar Material" com os campos preenchidos.

## O que muda no consumidor

Materiais publicados ficam disponíveis para download/consulta no hub de materiais,
respeitando o acesso do usuário.

## Kaboo × Central Coruja

Menu **Materiais** controlado por `menu.materials`. Catálogo forkado por marca.

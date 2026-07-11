---
id: admin-colecoes
title: Coleções (Kits)
sidebar_position: 2
---

# Módulo Coleções

## Para que serve

Coleções são os **kits** do acervo — agrupamentos temáticos que reúnem livros, vídeos,
áudios e materiais em torno de um objetivo. No consumidor, elas aparecem na Home como
cartões de kit (`getCollectionTypeMeta().type === 'kit'`, ver `screens/HomeScreen.tsx:75`).

No código, uma coleção e um livro são a mesma entidade com `collection_type` diferente:
`'kit'` para coleções e `'book'` para livros (`screens/AdminCollectionsScreen.tsx:626`).
Este módulo edita as de tipo **kit**; livros avulsos ficam em [Livros](./admin-livros.md).

## Quem pode usar

Editores e admins. Faz parte de `EDITOR_MODULES`.

## Como abrir

1. Administração → **Coleções** na barra lateral/abas.
2. A tela abre em modo catálogo de kits (`initialTab='collections'`, `screens/AdminScreen.tsx:213`).

| Painel administrativo | Gestão de coleções |
|:---:|:---:|
| ![Ponto de entrada do painel administrativo](/screenshots/09-admin.png) | ![Catálogo de coleções na administração](/screenshots/17-admin-collections.png) |

## Passo a passo — criar um kit

1. Clique em **Novo** (botão no topo do catálogo).
2. Abre-se o painel lateral com a aba **Dados da Coleção** (`screens/AdminCollectionsScreen.tsx:3494`).
3. Preencha os campos de identificação:
   - **Título** e **Descrição**.
   - **Capa** — envie a imagem (upload em `collection-collection-cover-upload`).
   - **Nível / Ano(s) escolar(es) / Idade(s)** — usados nos filtros da Home.
   - **Tema**, **Objetivos de aprendizado**, personagens, competências BNCC/CASEL.
4. **Vincule o conteúdo do kit** — adicione os livros/mídias que compõem a coleção.
   Livros vinculados a um kit precisam ser livros reais (`collection_type='book'`);
   o editor impede vincular outra coleção como se fosse livro
   (`screens/AdminCollectionsScreen.tsx:1812`).
5. Clique em **Salvar**.

## Publicar / despublicar

- Um kit só aparece para o consumidor quando **publicado** (botão **Publicar**,
  `screens/AdminCollectionsScreen.tsx:3308`).
- Para **excluir**, primeiro despublique — o sistema bloqueia a exclusão de item publicado
  (`screens/AdminCollectionsScreen.tsx:2354`).

## O que muda no consumidor

- Kits publicados entram na Home e no acervo da marca, respeitando filtros de
  personagem, BNCC, CASEL e idade.
- O acesso ao conteúdo do kit depende do **voucher/grant** do usuário — publicar
  torna visível, mas não libera o acesso (isso vem do [voucher](./admin-vouchers.md)).

## Kaboo × Central Coruja

O catálogo é **forkado por marca**: cada marca tem suas próprias coleções. Um kit criado
para Kaboo não aparece na Central Coruja. Presença dos menus (ex.: se *Coleções* aparece)
é controlada em [Configurações → Menus](./admin-configuracoes.md).

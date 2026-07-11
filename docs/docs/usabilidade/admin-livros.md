---
id: admin-livros
title: Livros
sidebar_position: 3
---

# Módulo Livros

## Para que serve

Gerencia os **livros** do acervo. Um livro é a mesma entidade de uma coleção, mas com
`collection_type='book'` (`screens/AdminCollectionsScreen.tsx:634`). Regra do modelo de
conteúdo: **um livro sempre tem um PDF**; sem PDF, ele é tratado como conteúdo avulso.

O módulo reaproveita a tela de Coleções em *modo catálogo de livros*
(`isBooksCatalogMode`, ativado por `initialLibraryArea='books'`, `screens/AdminScreen.tsx:221`),
então a mecânica de criar/editar/publicar é idêntica — mudam apenas os rótulos
("Dados do Livro", "Sinopse" em vez de "Descrição").

## Quem pode usar

Editores e admins.

## Como abrir

Administração → **Livros**.

## Passo a passo — cadastrar um livro

1. Clique em **Novo**.
2. Na aba **Dados do Livro** preencha:
   - **Título** e **Sinopse** (`screens/AdminCollectionsScreen.tsx:4184`).
   - **Capa** do livro (`catalog-book-cover-upload`).
   - **Ano(s) escolar(es)**, **idade(s)**, tema e objetivos.
3. **Anexe a mídia do livro** — é aqui que se vincula o **PDF** e outras mídias
   (leitura, áudio de narração, vídeo). O vínculo de mídia é feito no próprio editor do
   livro. Cole o link ou envie o arquivo no bloco de mídia
   (`screens/AdminCollectionsScreen.tsx:3747` — "Nova mídia — Tag").
4. **Salvar** e depois **Publicar**.

## Livro dentro de um kit

Um kit referencia livros por `kit_book_ids`. Ao montar uma [coleção](./admin-colecoes.md),
você seleciona livros já cadastrados aqui. Por isso cadastre os livros **antes** de
montar o kit que os agrupa.

## Áudio de narração (audiolivro)

A narração de um livro (audiolivro) é anexada **no próprio livro**, e não aparece como
faixa solta no hub de músicas. Já músicas/canções ficam no hub de áudio. A visibilidade
é definida pela **estrutura** do conteúdo, não por uma flag.

## O que muda no consumidor

- Livros publicados aparecem na biblioteca/Home e abrem no **leitor de livro**
  (`screens/BookReaderScreen.tsx`) ou no **player de áudio** para a narração.
- Acesso efetivo depende do voucher do usuário.

## Kaboo × Central Coruja

Acervo forkado por marca. O menu **Livros** pode estar ligado numa marca e desligado
noutra (feature flag `menu.books`, `screens/AdminScreen.tsx:41`).

---
id: admin-personagens
title: Personagens
sidebar_position: 8
---

# Módulo Personagens

## Para que serve

Cadastra os **personagens** do universo da marca (ex.: mascotes e figuras das histórias).
Personagens alimentam os **filtros da Home** do consumidor: o usuário pode filtrar o
acervo por personagem (`filterCharacter`, `screens/HomeScreen.tsx:48`).

## Quem pode usar

Editores e admins (tela própria `AdminCharactersScreen`, `screens/AdminScreen.tsx:231`).
O módulo é controlado pela flag `module.characters`.

## Como abrir

Administração → **Personagens**. O cabeçalho mostra "Gerenciar"
(`screens/AdminCharactersScreen.tsx:270`) com busca de personagem.

## Passo a passo — criar um personagem

1. Clique em **Novo Personagem** (`screens/AdminCharactersScreen.tsx:448`).
2. Preencha:
   - **Nome** — ex.: "Nome do personagem" (`:318`).
   - **Descrição** — quem é e como aparece nas histórias (`:341`).
   - **Traços** — digite um traço e pressione Enter para adicionar (`:349`).
   - **Imagem/avatar** e cor associada.
3. **Salvar**.

## Alterações não salvas

Se você tentar sair com edições pendentes, o módulo pede confirmação
("Você tem alterações não salvas. Deseja descartá-las?",
`screens/AdminCharactersScreen.tsx:157`). O mesmo vale ao trocar de módulo no painel.

## O que muda no consumidor

- Personagens aparecem como opção de **filtro** na Home e nas telas de personagens
  (`screens/CharactersScreen.tsx`).
- Ajudam a criar navegação temática do acervo.

## Kaboo × Central Coruja

Cada marca tem seus próprios personagens. A marca pode ocultar o módulo desligando
`module.characters`.

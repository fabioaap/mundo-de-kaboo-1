---
id: admin-usuarios
title: Usuários
sidebar_position: 10
---

# Módulo Usuários

## Para que serve

Gerencia as **contas de acesso** ao painel e ao app — criação, papel (role) e exclusão
de usuários. É exclusivo de **admin** (parte de `ALL_MODULES`, não de `EDITOR_MODULES`,
`screens/AdminScreen.tsx:36`). A tela é a de Coleções em aba de usuários
(`initialTab='users'`, `screens/AdminCollectionsScreen.tsx:2029`).

## Papéis (roles)

Há três papéis (`UserRole`, `screens/AdminCollectionsScreen.tsx:5230`):

| Papel | Rótulo na tela | Pode |
|-------|----------------|------|
| `viewer` | Visualizador | Consumir conteúdo (consumidor) |
| `editor` | Editor | Gerenciar conteúdo (`EDITOR_MODULES`) |
| `admin` | Administrador | Tudo, incluindo usuários, vouchers e configurações |

## Como abrir

Administração → **Usuários**.

![Tela de gestão de usuários na administração](/screenshots/18-admin-users.png)

## Passo a passo — criar um usuário

1. Preencha o formulário de novo usuário: **E-mail**, **Nome completo**, **Senha** e
   **Papel** (`userFormData`, `screens/AdminCollectionsScreen.tsx:2155`).
2. Confirme. Apenas administradores podem criar — não-admin recebe o aviso
   "Apenas administradores podem criar usuários." (`:2133`).

## Passo a passo — editar / excluir

- **Editar** — abra o usuário e ajuste **Nome** e **Papel** no seletor de role
  (Administrador / Editor / Visualizador, `:5223`).
- **Excluir** — também restrito a admin ("Apenas administradores podem excluir
  usuários.", `:2229`).

## O que muda no consumidor / no painel

- Elevar alguém a **editor/admin** dá acesso à Administração e altera quais módulos ele
  enxerga.
- Rebaixar para **viewer** remove o acesso ao painel; a pessoa passa a usar só o app.

## Acesso e voucher

Papel (role) controla **permissão de gestão**. O **acesso ao conteúdo** do consumidor é
separado e vem do **voucher/grant** — ver [Vouchers](./admin-vouchers.md) e a
[tela de acesso expirado](./consumidor.md#acesso-expirado).

## Kaboo × Central Coruja

Contas e acesso são vinculados a uma marca (`profile.brand_id`). Um perfil pertence a uma
marca; o resgate de voucher de outra marca é bloqueado. Confirme a marca ao criar contas.

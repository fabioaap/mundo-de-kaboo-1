---
id: journeys
title: Jornadas do Usuário
sidebar_position: 1
---

# Jornadas do Usuário

> Screenshots capturados em viewport **1440×900 (desktop)**.

Esta seção documenta todas as jornadas do usuário no Mundo de Kaboo, do primeiro acesso ao uso avançado pelo admin.

---

## Navegação

| Seção | Descrição | Link |
|-------|-----------|------|
| **Autenticação** | Login, cadastro com voucher, recuperação de senha | [→ Autenticação](./auth) |
| **Pós-Login** | Home, busca, perfil, admin CMS, acesso expirado | [→ Pós-Login](./post-login) |
| **Referência Técnica** | Arquitetura de componentes, fluxo de dados, módulos | [→ Referência](./reference) |

---

## Visão Geral dos Fluxos

```mermaid
flowchart TD
    Start([Usuário abre o app]) --> Entry[Tela Entry]

    Entry --> HasVoucher[Tem código de acesso]
    Entry --> HasAccount[Já tem conta]

    HasVoucher --> Validate[Valida voucher]
    Validate --> NewUser[Novo no Kaboo?]
    Validate --> ExistingUser[Já tem conta?]

    NewUser --> Register[Cadastro]
    ExistingUser --> LoginWithVoucher[Login + Resgate]

    HasAccount --> Login[Login direto]

    Register --> Home
    LoginWithVoucher --> Home
    Login --> CheckAccess{{"access_status?"}}

    CheckAccess -- active --> Home[HomeScreen ✅]
    CheckAccess -- expired/pending --> Expired[AccessExpiredScreen ⚠️]

    Expired --> Redeem[Inserir novo voucher]
    Redeem --> Home
```

---

## Telas — Visão Rápida

| Entry | Home | Busca | Perfil |
|:---:|:---:|:---:|:---:|
| ![Entry](/screenshots/01-entry.png) | ![Home](/screenshots/08-home.png) | ![Busca](/screenshots/13-search.png) | ![Perfil](/screenshots/15-profile.png) |


---

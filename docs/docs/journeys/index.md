---
id: journeys
title: Jornadas do Usuário
sidebar_position: 1
---

# Jornadas e Arquitetura

> Screenshots capturados em viewport **390 × 844 px** (iPhone 14 Pro Mobile).

---

## Índice

1. [Visão Geral do Fluxo de Autenticação](#1-visão-geral-do-fluxo-de-autenticação)
2. [Máquina de Estados — LoginScreen](#2-máquina-de-estados--loginscreen)
3. [Jornada 1A — Novo usuário com voucher](#3-jornada-1a--novo-usuário-com-voucher)
4. [Jornada 1B — Usuário existente com voucher](#4-jornada-1b--usuário-existente-com-voucher)
5. [Jornada 2 — Login direto](#5-jornada-2--login-direto-sem-voucher)
6. [Telas Capturadas](#6-telas-capturadas)
7. [Arquitetura de Componentes](#7-arquitetura-de-componentes--loginscreen)
8. [Fluxo de Dados — API Calls](#8-fluxo-de-dados--api-calls)
9. [Arquitetura Geral — Módulos do App](#9-arquitetura-geral--módulos-do-app)
10. [Fluxo de Acesso Pós-Login](#10-fluxo-de-acesso-pós-login)

---

## 1. Visão Geral do Fluxo de Autenticação

O app tem dois pontos de entrada principais na tela de login:

- **"Tenho um código de acesso"** → Fluxo de voucher (cadastro ou login + resgate)
- **"Já tenho conta"** → Login direto

<div style={{textAlign: 'center'}}>
  <img src="/screenshots/01-entry.png" alt="Entry Screen" width="280" />
  <p><em>Tela de entrada</em></p>
</div>

---

## 2. Máquina de Estados — LoginScreen

A `LoginScreen` implementa uma máquina de estados linear com 6 passos. Cada transição é controlada pelos handlers `goBack()` e pelos fluxos de submit.

```mermaid
stateDiagram-v2
    direction LR

    [*] --> entry : app carrega / usuário desloga

    entry --> voucher : clica "Tenho um código de acesso"
    entry --> login   : clica "Já tenho conta"

    voucher --> account_choice : validateVoucher() OK + clica "Continuar"
    voucher --> entry          : ← Voltar

    account_choice --> register          : clica "Sou novo no Kaboo"
    account_choice --> login_with_voucher : clica "Já tenho uma conta"
    account_choice --> voucher            : ← Voltar

    register          --> [*]              : registerWithVoucher() OK → Home
    register          --> email_confirmation : e-mail precisa de confirmação
    register          --> login            : conta criada, precisa logar
    register          --> account_choice   : ← Voltar

    login_with_voucher --> [*]             : signIn() + redeemVoucher() → Home
    login_with_voucher --> account_choice  : ← Voltar

    login --> [*] : signIn() OK → Home
    login --> entry : ← Voltar
```

### Estados

| Estado | Descrição | Step Dots |
|--------|-----------|-----------|
| `entry` | Tela inicial — dois botões de escolha | — |
| `voucher` | Digitar e validar o código | 1/3 |
| `account_choice` | Novo ou usuário existente? | 2/3 |
| `register` | Formulário de cadastro | 3/3 |
| `login_with_voucher` | Login para resgatar o voucher | 3/3 |
| `login` | Login direto sem voucher | — |

---

## 3. Jornada 1A — Novo usuário com voucher

Fluxo completo de um usuário que recebeu um código de acesso via escola/gráfica e quer criar sua conta pela primeira vez.

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário
    participant LS as LoginScreen
    participant API as api.ts
    participant SB as Supabase / Mock

    U->>LS: Abre o app (entry)
    U->>LS: Clica "Tenho um código de acesso"
    LS->>LS: step = voucher

    U->>LS: Digita KABOO-9MESES-2026
    U->>LS: Clica "Validar"
    LS->>API: validateVoucher(code)
    API->>SB: rpc('validate_voucher', {p_code})
    SB-->>API: {success:true, voucher:{duration_months:9, …}}
    API-->>LS: {success:true, voucher}
    LS->>LS: validatedVoucher = voucher
    LS->>U: VoucherBadge verde + "9 meses ✓"

    U->>LS: Clica "Continuar →"
    LS->>LS: step = account_choice

    U->>LS: Clica "Sou novo no Kaboo"
    LS->>LS: step = register

    U->>LS: Preenche nome, escola, e-mail, senha, aceita termos
    U->>LS: Clica "Criar Conta"
    LS->>API: registerWithVoucher({email, password, full_name, school_name, voucherCode})
    API->>SB: auth.signUp({email, password})
    SB-->>API: {user, session}
    API->>SB: insert profiles + redeem_voucher
    SB-->>API: {success:true, profile}
    API-->>LS: {success:true, profile, requiresEmailConfirmation:false}

    LS->>LS: savePendingSignupVoucher(voucherCode)
    LS->>LS: clearPendingSignupVoucher()
    LS-->>U: navega → Home
```

### Screenshots — Jornada 1A

<div style={{display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center'}}>
  <div style={{textAlign: 'center'}}>
    <img src="/screenshots/02-voucher-vazio.png" alt="Voucher vazio" width="200" />
    <p><em>Voucher vazio</em></p>
  </div>
  <div style={{textAlign: 'center'}}>
    <img src="/screenshots/03-voucher-validado.png" alt="Voucher validado" width="200" />
    <p><em>Voucher validado</em></p>
  </div>
  <div style={{textAlign: 'center'}}>
    <img src="/screenshots/04-account-choice.png" alt="Escolha do perfil" width="200" />
    <p><em>Escolha do perfil</em></p>
  </div>
  <div style={{textAlign: 'center'}}>
    <img src="/screenshots/05-register.png" alt="Formulário de cadastro" width="200" />
    <p><em>Formulário de cadastro</em></p>
  </div>
</div>

---

## 4. Jornada 1B — Usuário existente com voucher

Fluxo de um usuário que já tem conta no Kaboo e recebeu um novo voucher para resgatar.

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário
    participant LS as LoginScreen
    participant API as api.ts
    participant SB as Supabase / Mock

    U->>LS: entry → "Tenho um código"
    LS->>LS: step = voucher

    U->>LS: Digita código + clica "Validar"
    LS->>API: validateVoucher(code)
    API->>SB: rpc('validate_voucher')
    SB-->>API: {success:true, voucher}
    LS->>U: VoucherBadge + "Continuar →"

    U->>LS: "Continuar →" → step = account_choice
    U->>LS: Clica "Já tenho uma conta"
    LS->>LS: step = login_with_voucher

    U->>LS: Preenche e-mail e senha
    U->>LS: Clica "Entrar e resgatar"
    LS->>API: signIn(email, password)
    API->>SB: auth.signInWithPassword()
    SB-->>API: {success:true, profile}

    note over LS,API: Verifica pendingSignupVoucher no localStorage
    LS->>API: redeemVoucher(voucherCode)
    API->>SB: rpc('redeem_voucher', {p_code, p_user_id})
    SB-->>API: {success:true, profile:{access_status:'active'}}
    API-->>LS: {success:true, profile}

    LS->>LS: clearPendingSignupVoucher()
    LS-->>U: navega → Home
```

<div style={{textAlign: 'center'}}>
  <img src="/screenshots/06-login-com-voucher.png" alt="Login com voucher" width="280" />
  <p><em>Login para resgatar o voucher</em></p>
</div>

---

## 5. Jornada 2 — Login direto (sem voucher)

Fluxo de usuário com conta ativa que acessa o app normalmente.

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário
    participant LS as LoginScreen
    participant API as api.ts
    participant SB as Supabase / Mock

    U->>LS: entry → "Já tenho conta"
    LS->>LS: step = login

    U->>LS: Preenche e-mail e senha
    U->>LS: Clica "Entrar"
    LS->>API: signIn(email, password)
    API->>SB: auth.signInWithPassword()
    SB-->>API: {user, session}
    API->>SB: select profiles where id = user.id
    SB-->>API: profile
    API-->>LS: {success:true, profile}

    note over LS,API: Verifica pendingSignupVoucher no localStorage
    LS->>LS: onAuthSuccess(profile)
    LS-->>U: navega → Home

    note over U,LS: Se access_status = 'expired' ou 'pending_voucher'
    LS-->>U: navega → AccessExpiredScreen
```

<div style={{textAlign: 'center'}}>
  <img src="/screenshots/07-login-direto.png" alt="Login direto" width="280" />
  <p><em>Login direto sem voucher</em></p>
</div>

---

## 6. Telas Capturadas

Todas as telas foram capturadas em viewport **390 × 844 px** (iPhone 14 Pro).

### Autenticação

<div style={{display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center'}}>
  <div style={{textAlign: 'center'}}>
    <img src="/screenshots/01-entry.png" alt="Entry" width="180" />
    <p><em>Entry</em></p>
  </div>
  <div style={{textAlign: 'center'}}>
    <img src="/screenshots/02-voucher-vazio.png" alt="Voucher vazio" width="180" />
    <p><em>Voucher (vazio)</em></p>
  </div>
  <div style={{textAlign: 'center'}}>
    <img src="/screenshots/03-voucher-validado.png" alt="Voucher validado" width="180" />
    <p><em>Voucher (validado)</em></p>
  </div>
  <div style={{textAlign: 'center'}}>
    <img src="/screenshots/04-account-choice.png" alt="Escolha" width="180" />
    <p><em>Escolha de perfil</em></p>
  </div>
  <div style={{textAlign: 'center'}}>
    <img src="/screenshots/05-register.png" alt="Cadastro" width="180" />
    <p><em>Cadastro</em></p>
  </div>
  <div style={{textAlign: 'center'}}>
    <img src="/screenshots/06-login-com-voucher.png" alt="Login c/ Voucher" width="180" />
    <p><em>Login c/ Voucher</em></p>
  </div>
  <div style={{textAlign: 'center'}}>
    <img src="/screenshots/07-login-direto.png" alt="Login direto" width="180" />
    <p><em>Login direto</em></p>
  </div>
</div>

### App Principal

<div style={{display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center'}}>
  <div style={{textAlign: 'center'}}>
    <img src="/screenshots/08-home.png" alt="Home" width="200" />
    <p><em>Home</em></p>
  </div>
  <div style={{textAlign: 'center'}}>
    <img src="/screenshots/09-admin.png" alt="Admin" width="200" />
    <p><em>Admin</em></p>
  </div>
  <div style={{textAlign: 'center'}}>
    <img src="/screenshots/10-perfil.png" alt="Perfil" width="200" />
    <p><em>Perfil</em></p>
  </div>
</div>

---

## 7. Arquitetura de Componentes — LoginScreen

```mermaid
graph TD
    LS["LoginScreen"]

    LS --> Header["Header\n(logo + botão Voltar)"]
    LS --> StepDots["StepDots\n(progress indicator)"]
    LS --> Body["Área principal\n(scroll)"]
    LS --> Footer["Botão de submit"]

    Body --> EntryView["EntryView\n(step=entry)"]
    Body --> VoucherView["VoucherView\n(step=voucher)"]
    Body --> AccountChoiceView["AccountChoiceView\n(step=account_choice)"]
    Body --> RegisterView["RegisterView\n(step=register)"]
    Body --> LoginWithVoucherView["LoginWithVoucherView\n(step=login_with_voucher)"]
    Body --> LoginView["LoginView\n(step=login)"]

    AccountChoiceView --> VoucherBadge["VoucherBadge\n(shared)"]
    RegisterView --> VoucherBadge
    LoginWithVoucherView --> VoucherBadge
    Body --> FeedbackArea["FeedbackArea\n(errors + success)"]

    subgraph Shared["Componentes compartilhados"]
        VoucherBadge
        FeedbackArea
        StepDots
    end
```

### Estado local do componente

| Estado | Tipo | Descrição |
|--------|------|-----------|
| `step` | `LoginStep` | Controla qual view é renderizada |
| `validatedVoucher` | `Voucher \| null` | Resultado de `validateVoucher()` |
| `loading` | `boolean` | Bloqueia double-submit |
| `errorMsg` | `string \| null` | Mensagem de erro |
| `successMsg` | `string \| null` | Mensagem de sucesso |
| `showContinueToHome` | `boolean` | Link safety net após falha de resgate |

### Persistência localStorage

| Chave | Propósito |
|-------|-----------|
| `kaboo_pending_signup_voucher` | Preserva o voucher entre cadastro e confirmação de e-mail |

---

## 8. Fluxo de Dados — API Calls

```mermaid
flowchart LR
    subgraph "LoginScreen"
        validateVoucher["validateVoucher(code)"]
        registerWithVoucher["registerWithVoucher({...})"]
        signIn["signIn(email, pwd)"]
        redeemVoucher["redeemVoucher(code)"]
    end

    subgraph "api.ts"
        direction TB
        isSupabase{{"isSupabaseConfigured?"}}
        mockPath["Mock (lib/mockData.ts)"]
        supabasePath["Supabase (lib/supabase.ts)"]
    end

    subgraph "Backend"
        validate_voucher_rpc["rpc('validate_voucher')"]
        auth_signUp["auth.signUp()"]
        auth_signIn["auth.signInWithPassword()"]
        redeem_voucher_rpc["rpc('redeem_voucher')"]
        profiles_table["table: profiles"]
        vouchers_table["table: vouchers"]
        grants_table["table: user_content_grants"]
    end

    validateVoucher --> isSupabase
    registerWithVoucher --> isSupabase
    signIn --> isSupabase
    redeemVoucher --> isSupabase

    isSupabase -- Não --> mockPath
    isSupabase -- Sim --> supabasePath

    supabasePath --> validate_voucher_rpc --> vouchers_table
    supabasePath --> auth_signUp --> profiles_table
    supabasePath --> auth_signIn --> profiles_table
    supabasePath --> redeem_voucher_rpc --> vouchers_table
    redeem_voucher_rpc --> grants_table
```

### Tratamento de erros

| Erro Supabase bruto | Mensagem exibida ao usuário |
|---------------------|----------------------------|
| `Invalid login credentials` | "E-mail ou senha incorretos." |
| `User already registered` | "Este e-mail já está cadastrado." |
| `Email not confirmed` | "Confirme seu e-mail…" → redireciona para `EmailConfirmationScreen` |
| `rate limit` | "Muitas tentativas. Por segurança, aguarde…" |

---

## 9. Arquitetura Geral — Módulos do App

```mermaid
graph TD
    subgraph "Entrypoint"
        App["App.tsx\n(roteador de telas)"]
    end

    subgraph "Autenticação"
        LoginScreen
        EmailConfirmationScreen
        ForgotPasswordScreen
        AccessExpiredScreen
    end

    subgraph "App Principal"
        HomeScreen["HomeScreen\n(grid de coleções)"]
        LibraryScreen
        SearchScreen
        DetailsScreen
        BookReaderScreen
        AudioPlayerScreen
        VideoPlayerScreen
    end

    subgraph "Admin"
        AdminScreen
        AdminCollectionsScreen["AdminCollectionsScreen\n(tabs: Coleções / Usuários / Vouchers)"]
        VouchersModule["VouchersModule\n(Modelos / Lotes / Códigos / Auditoria)"]
    end

    subgraph "Perfil"
        ProfileScreen
        MyDataScreen
        ExtraToolsScreen
    end

    subgraph "Lib"
        API["api.ts\n(facade: mock ↔ Supabase)"]
        Access["access.ts\n(regras de acesso puras)"]
        MockData["mockData.ts\n(auth local multiusuário)"]
        Supabase["supabase.ts\n(cliente Supabase)"]
    end

    App --> LoginScreen
    App --> HomeScreen
    App --> AdminScreen
    App --> ProfileScreen
    App --> AccessExpiredScreen

    AdminCollectionsScreen --> VouchersModule
    AdminScreen --> AdminCollectionsScreen

    HomeScreen --> API
    LoginScreen --> API
    AccessExpiredScreen --> API
    VouchersModule --> API

    API --> MockData
    API --> Supabase
    API --> Access
```

---

## 10. Fluxo de Acesso Pós-Login

```mermaid
flowchart TD
    Auth["signIn() / registerWithVoucher()\nretorna profile"] --> Check{{"profile.access_status?"}}

    Check -- "'active'" --> Home["HomeScreen ✅"]
    Check -- "'pending_voucher'" --> Expired["AccessExpiredScreen ⚠️"]
    Check -- "'expired'" --> Expired
    Check -- "'blocked'" --> Expired
    Check -- "null / sem perfil" --> Login["LoginScreen"]

    Expired --> Redeem["Digita novo voucher\nredeemVoucher()"]
    Redeem -- "sucesso" --> Home
    Redeem -- "falha" --> Expired
```

### Status de acesso

| `access_status` | Tela exibida | Ação disponível |
|----------------|-------------|-----------------|
| `active` | HomeScreen | Acesso total ao conteúdo |
| `pending_voucher` | AccessExpiredScreen | Inserir voucher |
| `expired` | AccessExpiredScreen | Inserir voucher de renovação |
| `blocked` | AccessExpiredScreen | Apenas visualização da mensagem |
| `null` | LoginScreen | Autenticar novamente |

---

## Referências Técnicas

| Arquivo | Responsabilidade |
|---------|----------------|
| `screens/LoginScreen.tsx` | UX de autenticação (state machine + formulários) |
| `lib/api.ts` | Facade que abstrai mock vs. Supabase |
| `lib/access.ts` | Regras puras de status de acesso |
| `lib/mockData.ts` | Auth local multiusuário + catálogo em memória |
| `lib/mockVoucherData.ts` | Content grants para o modo mock |
| `types.ts` | Tipos compartilhados |
| `supabase/migrations/` | Migration SQL: tabela `vouchers`, RPCs, `user_content_grants` |

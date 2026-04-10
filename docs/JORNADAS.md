# Mundo de Kaboo — Jornadas e Arquitetura

> Documentação gerada com screenshots reais do app em viewport 390×844 (mobile).

---

## Índice

1. [Visão Geral do Fluxo de Autenticação](#1-visão-geral-do-fluxo-de-autenticação)
2. [Máquina de Estados — LoginScreen](#2-máquina-de-estados--loginscreen)
3. [Jornada 1A — Novo usuário com voucher](#3-jornada-1a--novo-usuário-com-voucher)
4. [Jornada 1B — Usuário existente com voucher](#4-jornada-1b--usuário-existente-com-voucher)
5. [Jornada 2 — Login direto (sem voucher)](#5-jornada-2--login-direto-sem-voucher)
6. [Telas Capturadas](#6-telas-capturadas)
7. [Arquitetura de Componentes — LoginScreen](#7-arquitetura-de-componentes--loginscreen)
8. [Fluxo de Dados — API Calls](#8-fluxo-de-dados--api-calls)
9. [Arquitetura Geral — Módulos do App](#9-arquitetura-geral--módulos-do-app)
10. [Fluxo de Acesso Pós-Login](#10-fluxo-de-acesso-pós-login)

---

## 1. Visão Geral do Fluxo de Autenticação

O app tem dois pontos de entrada principais na tela de login:

- **"Tenho um código de acesso"** → Fluxo de voucher (cadastro ou login + resgate)
- **"Já tenho conta"** → Login direto

| Entry Screen |
|:---:|
| ![Entry](./screenshots/01-entry.png) |

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

Fluxo completo de um usuário que recebeu um código de acesso (voucher) via escola/gráfica e quer criar sua conta pela primeiro vez.

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

| Voucher vazio | Voucher validado | Escolha do perfil | Formulário de cadastro |
|:---:|:---:|:---:|:---:|
| ![Voucher vazio](./screenshots/02-voucher-vazio.png) | ![Voucher validado](./screenshots/03-voucher-validado.png) | ![Escolha](./screenshots/04-account-choice.png) | ![Cadastro](./screenshots/05-register.png) |

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

### Screenshot — Jornada 1B

| Login com voucher |
|:---:|
| ![Login com voucher](./screenshots/06-login-com-voucher.png) |

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

### Screenshot — Jornada 2

| Login direto |
|:---:|
| ![Login direto](./screenshots/07-login-direto.png) |

---

## 6. Telas Capturadas

Todas as telas abaixo foram capturadas em viewport **390 × 844 px** (iPhone 14 Pro).

### Autenticação

| Entry | Voucher (vazio) | Voucher (validado) | Escolha |
|:---:|:---:|:---:|:---:|
| ![01](./screenshots/01-entry.png) | ![02](./screenshots/02-voucher-vazio.png) | ![03](./screenshots/03-voucher-validado.png) | ![04](./screenshots/04-account-choice.png) |

| Cadastro | Login c/ Voucher | Login Direto |
|:---:|:---:|:---:|
| ![05](./screenshots/05-register.png) | ![06](./screenshots/06-login-com-voucher.png) | ![07](./screenshots/07-login-direto.png) |

### App Principal

| Home | Admin | Perfil |
|:---:|:---:|:---:|
| ![08](./screenshots/08-home.png) | ![09](./screenshots/09-admin.png) | ![10](./screenshots/10-perfil.png) |

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

    AccountChoiceView --> VoucherBadge["VoucherBadge\n(shared component)"]
    RegisterView --> VoucherBadge
    LoginWithVoucherView --> VoucherBadge

    Body --> FeedbackArea["FeedbackArea\n(errors + success)"]

    subgraph Shared["Componentes compartilhados"]
        VoucherBadge
        FeedbackArea
        StepDots
    end

    subgraph External["Componentes externos"]
        Button["Button.tsx"]
        Icons["Icons.tsx"]
    end

    RegisterView --> Button
    LoginWithVoucherView --> Button
    LoginView --> Button
    EntryView --> Button
```

### Estado local do componente

| Estado | Tipo | Descrição |
|--------|------|-----------|
| `step` | `LoginStep` | Controla qual view é renderizada |
| `validatedVoucher` | `Voucher \| null` | Resultado de `validateVoucher()` |
| `loading` | `boolean` | Bloqueia double-submit |
| `errorMsg` | `string \| null` | Mensagem de erro da FeedbackArea |
| `successMsg` | `string \| null` | Mensagem de sucesso da FeedbackArea |
| `voucherValidationMsg` | `string \| null` | Label de duração após validação |
| `showContinueToHome` | `boolean` | Link safety net após falha de resgate |
| `email, password, fullName, schoolName, voucherCode, confirmPassword` | `string` | Campos de formulário |
| `acceptedTerms` | `boolean` | Checkbox de política de privacidade |
| `showPassword, showConfirmPassword` | `boolean` | Toggle de visibilidade de senha |

### Persistência localStorage

| Chave | Valor | Propósito |
|-------|-------|-----------|
| `kaboo_pending_signup_voucher` | código do voucher | Preserva o voucher entre cadastro e confirmação de e-mail |

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

    subgraph "Supabase / Mock Backend"
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

A `api.ts` prioriza mensagens em português via `getVoucherErrorMessage()` antes de expor strings brutas do Supabase. A `LoginScreen` normaliza adicionalmente com `normalizeAuthError()`:

| Erro Supabase bruto | Mensagem exibida |
|---------------------|-----------------|
| `Invalid login credentials` | "E-mail ou senha incorretos." |
| `User already registered` | "Este e-mail já está cadastrado." |
| `Email not confirmed` | "Confirme seu e-mail para entrar…" → redireciona para `EmailConfirmationScreen` |
| `security purposes` / `rate limit` | "Muitas tentativas. Por segurança, aguarde…" |

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
        AdminScreen["AdminScreen\n(wraps AdminCollectionsScreen)"]
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
        MockData["mockData.ts\n(estado local multiusuário)"]
        Supabase["supabase.ts\n(cliente Supabase)"]
        Auth["auth.ts\n(helpers de sessão)"]
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

Após qualquer autenticação bem-sucedida, o `App.tsx` verifica o `access_status` do perfil e roteia adequadamente:

```mermaid
flowchart TD
    Auth["signIn() / registerWithVoucher()\nretorna profile"] --> Check{{"profile.access_status?"}}

    Check -- "'active'" --> Home["HomeScreen\n✅ Acesso liberado"]
    Check -- "'pending_voucher'" --> Expired["AccessExpiredScreen\n⚠️ Aguardando voucher"]
    Check -- "'expired'" --> Expired
    Check -- "'blocked'" --> Expired
    Check -- "null / sem perfil" --> Login["LoginScreen\n(volta ao início)"]

    Expired --> Redeem["Digita novo voucher\nredeemVoucher()"]
    Redeem -- "sucesso" --> Home
    Redeem -- "falha" --> Expired

    subgraph "Proteção de Rotas (App.tsx)"
        Home
        Expired
        Login
    end
```

### Status de acesso

| `access_status` | Tela exibida | Ação disponível |
|----------------|-------------|-----------------|
| `active` | HomeScreen | Acesso total ao conteúdo |
| `pending_voucher` | AccessExpiredScreen | Inserir voucher |
| `expired` | AccessExpiredScreen | Inserir voucher de renovação |
| `blocked` | AccessExpiredScreen | Apenas visualização da mensagem |
| `null` / indefinido | LoginScreen | Autenticar novamente |

---

## Referências Técnicas

| Arquivo | Responsabilidade |
|---------|----------------|
| `screens/LoginScreen.tsx` | Toda a UX de autenticação (state machine + formulários) |
| `lib/api.ts` | Facade que abstrai mock vs. Supabase |
| `lib/access.ts` | Regras puras de status de acesso (sem side-effects) |
| `lib/mockData.ts` | Auth local multiusuário + catálogo em memória |
| `lib/mockVoucherData.ts` | Content grants para o modo mock |
| `types.ts` | Tipos compartilhados (`UserProfile`, `Voucher`, `LoginStep`, …) |
| `supabase/migrations/` | Migration SQL: tabela `vouchers`, RPCs, `user_content_grants` |

---

*Documentação gerada em abril/2026 — branch `fix/quality-improvements`.*

---
title: Referência Técnica
sidebar_position: 4
---

# Referência Técnica

---

## Arquitetura de Componentes — LoginScreen

```mermaid
graph TD
    LS["LoginScreen"]

    LS --> Header["Header\n(logo + botão Voltar)"]
    LS --> Body["Área principal\n(scroll)"]
    LS --> Footer["Botão de submit"]

    Body --> VoucherView["VoucherView\n(step=voucher, auxiliar)"]
    Body --> RegisterView["RegisterView\n(step=register)"]
    Body --> LoginView["LoginView\n(step=login)"]

    VoucherView --> StepDots["StepDots\n(progress indicator)"]

    Body --> FeedbackArea["FeedbackArea\n(errors + success)"]

    subgraph Shared["Componentes compartilhados"]
        FeedbackArea
        StepDots
    end

    subgraph External["Componentes externos"]
        Button["Button.tsx"]
        Icons["Icons.tsx"]
    end

    VoucherView --> Button
    RegisterView --> Button
    LoginView --> Button
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
| `email, password, fullName, voucherCode, confirmPassword` | `string` | Campos de formulário |
| `acceptedTerms` | `boolean` | Checkbox de política de privacidade |
| `showPassword, showConfirmPassword` | `boolean` | Toggle de visibilidade de senha |

### Persistência localStorage

| Chave | Valor | Propósito |
|-------|-------|-----------|
| `kaboo_pending_signup_voucher` | código do voucher | Preserva o voucher entre cadastro e confirmação de e-mail |

---

## Fluxo de Dados — API Calls

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

| Erro Supabase bruto | Mensagem exibida |
|---------------------|-----------------|
| `Invalid login credentials` | "E-mail ou senha incorretos." |
| `User already registered` | "Este e-mail já está cadastrado." |
| `Email not confirmed` | "Confirme seu e-mail para entrar…" → redireciona para `EmailConfirmationScreen` |
| `security purposes` / `rate limit` | "Muitas tentativas. Por segurança, aguarde…" |

---

## Arquitetura Geral — Módulos do App

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

## Fluxo de Acesso Pós-Login

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

| `access_status` | Tela exibida | Ação disponível |
|----------------|-------------|-----------------|
| `active` | HomeScreen | Acesso total ao conteúdo |
| `pending_voucher` | AccessExpiredScreen | Inserir voucher |
| `expired` | AccessExpiredScreen | Inserir voucher de renovação |
| `blocked` | AccessExpiredScreen | Apenas visualização da mensagem |
| `null` / indefinido | LoginScreen | Autenticar novamente |

---

## Arquivos-chave

| Arquivo | Responsabilidade |
|---------|----------------|
| `screens/LoginScreen.tsx` | Toda a UX de autenticação (state machine + formulários) |
| `lib/api.ts` | Facade que abstrai mock vs. Supabase |
| `lib/access.ts` | Regras puras de status de acesso (sem side-effects) |
| `lib/mockData.ts` | Auth local multiusuário + catálogo em memória |
| `lib/mockVoucherData.ts` | Content grants para o modo mock |
| `types.ts` | Tipos compartilhados (`UserProfile`, `Voucher`, `LoginStep`, …) |
| `supabase/migrations/` | Migration SQL: tabela `vouchers`, RPCs, `user_content_grants` |

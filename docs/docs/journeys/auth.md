---
title: Autenticação
sidebar_position: 2
---

# Jornadas — Autenticação

> Screenshots capturados em viewport **1440×900 (desktop)**.

---

## 1. Visão Geral do Fluxo de Autenticação

O app abre diretamente na tela de login e organiza a entrada em três saídas objetivas:

- **"Entrar"** → Login direto para quem já tem conta ativa.
- **"Inserir código de acesso"** → Inicia o cadastro e coleta o voucher dentro do próprio formulário.
- **"Entender como funciona e comprar meu acesso"** → CTA secundário para visitantes que ainda não receberam voucher.

### CTA para quem ainda não tem voucher

Esse link deve evoluir para uma rota dedicada do produto, com uma página que explique como o acesso funciona, para quem o voucher é indicado e como comprar.

Enquanto essa rota não existe, a implementação usa `LEAD_CAPTURE_URL` e aponta para a loja externa.

### CTA contextual para quem precisa de ajuda com o código

O suporte não deve competir com o CTA de compra na tela inicial. Ele aparece apenas nas etapas em que o usuário está lidando com o código de acesso, como `voucher` e `register`.

Hoje a implementação usa `SUPPORT_CONTACT_URL` com contato direto por e-mail.

| Entry Screen |
|:---:|
| ![Entry](/screenshots/01-entry.png) |

---

## 2. Máquina de Estados — LoginScreen

A `LoginScreen` hoje opera com dois estados principais visíveis na jornada atual e uma etapa auxiliar de validação de voucher que permanece disponível no código.

```mermaid
stateDiagram-v2
    direction LR

    [*] --> login : app carrega / usuário desloga

    login --> register : clica "Inserir código de acesso"
    login --> voucher : fluxo auxiliar de validacao de codigo
    login --> [*] : signIn() OK → Home / AccessExpired

    voucher --> register : validateVoucher() OK + "Continuar com cadastro"
    voucher --> login : ← Voltar

    register --> [*] : registerWithVoucher() OK → Home
    register          --> email_confirmation : e-mail precisa de confirmação
    register --> login : conta criada, precisa logar
    register --> login : ← Voltar
```

### Estados

| Estado | Descrição | Step Dots |
|--------|-----------|-----------|
| `login` | Tela inicial atual, com login direto e CTA de primeiro acesso | — |
| `register` | Cadastro com nome, e-mail, senha e código de acesso | — |
| `voucher` | Etapa auxiliar de validação prévia do código | 1/2 |

---

## 3. Jornada 1A — Novo usuário com voucher

Fluxo completo de um usuário que recebeu um código de acesso e quer criar sua conta pela primeira vez.

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário
    participant LS as LoginScreen
    participant API as api.ts
    participant SB as Supabase / Mock

    U->>LS: Abre o app (login)
    U->>LS: Clica "Inserir código de acesso"
    LS->>LS: step = register

    U->>LS: Preenche nome, e-mail, senha, código e aceita termos
    U->>LS: Clica "Criar Conta"
    LS->>API: registerWithVoucher({email, password, full_name, voucherCode})
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

| Voucher vazio | Voucher validado | Formulário de cadastro |
|:---:|:---:|:---:|
| ![Voucher vazio](/screenshots/02-voucher-vazio.png) | ![Voucher validado](/screenshots/03-voucher-validado.png) | ![Cadastro](/screenshots/05-register.png) |

---

## 4. Jornada 1B — Usuário existente com voucher

Não existe mais uma etapa dedicada de pré-login para esse caso.

- O usuário entra pela tela padrão de login.
- Se houver voucher pendente salvo do cadastro, o app tenta resgatar automaticamente no primeiro login.
- Se ele precisar informar um novo código com o acesso bloqueado, o resgate acontece na AccessExpiredScreen.

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

    U->>LS: Abre o app (login)

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
| ![Login direto](/screenshots/07-login-direto.png) |

---

## 5A. Jornada 2A — Usuário sem voucher

Fluxo do visitante que não recebeu um código e precisa entender o modelo de acesso antes de comprar.

```mermaid
sequenceDiagram
    autonumber
    actor U as Visitante
    participant LS as LoginScreen
    participant LP as Página explicativa / compra

    U->>LS: Abre o app e não tem voucher
    U->>LS: Clica "Entender como funciona e comprar meu acesso"
    LS-->>LP: Abre rota dedicada de explicação e compra

    note over LS,LP: Enquanto a rota não existe, o link usa LEAD_CAPTURE_URL e aponta para a loja externa

    LP->>U: Explica como o acesso funciona
    LP->>U: Mostra como comprar
    LP->>U: Direciona para a compra do acesso
```

---

## 6. Jornada 7 — Recuperação de senha

Fluxo quando o usuário esquece a senha.

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário
    participant LS as LoginScreen
    participant FP as ForgotPasswordScreen
    participant SB as Supabase

    U->>LS: step = login
    U->>LS: Clica "Esqueci minha senha"
    LS->>FP: navega para ForgotPasswordScreen

    FP->>U: Campo de e-mail + botão "Enviar Link"

    U->>FP: Digita e-mail
    U->>FP: Clica "Enviar Link"
    FP->>SB: auth.resetPasswordForEmail(email, {redirectTo})

    SB-->>FP: {error: null} (genérico por segurança)
    FP->>U: "Se este e-mail estiver cadastrado, você receberá um link..."

    U->>FP: Clica "Voltar"
    FP->>LS: navega de volta para LoginScreen
```

### Screenshot — Jornada 7

| Recuperação de senha |
|:---:|
| ![Forgot Password](/screenshots/11-forgot-password.png) |

---
id: login
title: LoginScreen
sidebar_position: 2
---

# LoginScreen

**Arquivo:** `screens/LoginScreen.tsx`  
**ScreenName:** `login`

## Descrição

Tela de autenticação do usuário. É a tela inicial quando nenhuma sessão está ativa.

## Props

```typescript
interface LoginScreenProps {
  onNavigate: (screen: ScreenName, params?: any) => void;
}
```

## Funcionalidades

- Login com **e-mail e senha** via Supabase Auth
- Link para **recuperação de senha** (`forgot_password`)
- Exibição de **erros de autenticação**
- Ao fazer login com sucesso: recarrega a página para garantir estado limpo

## Fluxo

```
1. Usuário preenche e-mail e senha
2. Chama supabase.auth.signInWithPassword()
3. Sucesso → App.tsx detecta SIGNED_IN → recarrega página
4. Erro → exibe mensagem de erro para o usuário
```

## Navegação de saída

| Destino | Condição |
|---------|----------|
| `forgot_password` | Usuário clica em "Esqueci minha senha" |
| `home` | Login bem-sucedido (via listener de auth) |

## Telas do fluxo de acesso

| Entrada | Voucher (vazio) | Voucher (validado) |
|:---:|:---:|:---:|
| ![Tela de entrada](/screenshots/01-entry.png) | ![Campo de voucher vazio](/screenshots/02-voucher-vazio.png) | ![Voucher validado](/screenshots/03-voucher-validado.png) |

| Escolha de conta | Cadastro | Login com voucher |
|:---:|:---:|:---:|
| ![Escolha de conta (entrar ou cadastrar)](/screenshots/04-account-choice.png) | ![Formulário de cadastro](/screenshots/05-register.png) | ![Login com voucher aplicado](/screenshots/06-login-com-voucher.png) |

| Login direto | Esqueci a senha |
|:---:|:---:|
| ![Login direto com e-mail e senha](/screenshots/07-login-direto.png) | ![Tela de recuperação de senha](/screenshots/11-forgot-password.png) |

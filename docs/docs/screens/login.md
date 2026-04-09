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

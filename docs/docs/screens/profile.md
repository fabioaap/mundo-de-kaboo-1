---
id: profile
title: ProfileScreen & MyDataScreen
sidebar_position: 8
---

# ProfileScreen & MyDataScreen

## ProfileScreen

**Arquivo:** `screens/ProfileScreen.tsx`  
**ScreenName:** `profile`

### Descrição

Tela de perfil do usuário autenticado. Exibe informações pessoais e opções de gerenciamento da conta.

### Props

```typescript
interface ProfileScreenProps {
  onNavigate: (screen: ScreenName, params?: any) => void;
}
```

### Funcionalidades

- Exibe **nome, e-mail e status de acesso** do usuário
- Exibe o **avatar** (personagem) selecionado pelo usuário
- Link para editar dados pessoais (`my_data`)
- Botão de **logout** (chama `api.signOut()`)
- Link para **Suporte**

---

## MyDataScreen

**Arquivo:** `screens/MyDataScreen.tsx`  
**ScreenName:** `my_data`

### Descrição

Tela de edição dos dados pessoais do usuário.

### Props

```typescript
interface MyDataScreenProps {
  onBack: () => void;
}
```

### Funcionalidades

- Editar **nome completo**, **e-mail** e **senha**
- Selecionar **avatar** (personagem do Mundo de Kaboo)
- Salvar via `api.updateProfile()`
- Validação de campos antes de salvar

### Personagens disponíveis como avatar

| Nome | Cor |
|------|-----|
| Baratão | 🟠 laranja |
| Baratinha | 🩷 rosa |
| Batatinha | 🟡 amarelo |
| Blado | 🔵 azul |
| Dr. Ratazana | 🟣 índigo |
| Gaio | 🟢 verde |
| Kaboo | 🟣 roxo |
| Papa | 🔴 vermelho |

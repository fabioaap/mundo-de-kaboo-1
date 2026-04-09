---
id: auth
title: lib/auth.ts
sidebar_position: 2
---

# Auth (`lib/auth.ts`)

Módulo de controle de autorização baseado nos papéis de usuário.

## Tipos

```typescript
export type UserRole = 'admin' | 'editor' | 'viewer';
```

## Funções

### `getUserRole()`

Busca o papel do usuário autenticado a partir do seu perfil no Supabase.

```typescript
const role = await getUserRole();
// 'admin' | 'editor' | 'viewer'
```

**Fallback:** Retorna `'viewer'` em caso de erro ou usuário não autenticado.

**Normalização:** O papel é normalizado para minúsculas e com espaços removidos, garantindo compatibilidade com valores ENUM do PostgreSQL.

---

### `canEditCollections()`

Verifica se o usuário pode criar, editar ou excluir coleções.

```typescript
const canEdit = await canEditCollections();
// true se role === 'admin' || role === 'editor'
```

---

### `isAdmin()`

Verifica se o usuário é administrador.

```typescript
const admin = await isAdmin();
// true se role === 'admin'
```

## Papéis e Permissões

| Papel | Ler coleções | Criar/Editar coleções | Excluir coleções | Gerenciar usuários |
|-------|:----:|:----:|:----:|:----:|
| `viewer` | ✅ | ❌ | ❌ | ❌ |
| `editor` | ✅ | ✅ | ❌ | ❌ |
| `admin` | ✅ | ✅ | ✅ | ✅ |

## Uso típico

```typescript
import { canEditCollections } from '../lib/auth';

// Em AdminCollectionsScreen
useEffect(() => {
  canEditCollections().then(canEdit => {
    if (!canEdit) {
      navigate('home');
    }
  });
}, []);
```

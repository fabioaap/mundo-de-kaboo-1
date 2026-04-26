---
id: api
title: lib/api.ts
sidebar_position: 1
---

# API (`lib/api.ts`)

Módulo central de comunicação com o Supabase. Exporta o objeto `api` com todos os métodos de acesso a dados, além de funções auxiliares de cache.

## Objeto `api`

### `api.getCollections(forceRefresh?)`

Busca todas as coleções ordenadas pela data de criação (mais recentes primeiro).

```typescript
const collections = await api.getCollections();
// ou forçar atualização ignorando o cache:
const fresh = await api.getCollections(true);
```

**Cache:** Armazena resultado em `sessionStorage`. O cache é por sessão do navegador e vinculado ao `sessionId`.

---

### `api.getCollectionById(id)`

Busca uma coleção específica pelo ID.

```typescript
const collection = await api.getCollectionById('uuid-da-colecao');
```

**Retorna:** `Collection | null`

---

### `api.getCollectionResources(collectionId)`

Busca os recursos (arquivos) vinculados a uma coleção.

```typescript
const resources = await api.getCollectionResources('uuid-da-colecao');
// [{ id, title, type: 'pdf' | 'audio' | 'video' | 'zip', url, size }]
```

---

### `api.getUserProgress()`

Busca o progresso do usuário autenticado em todas as coleções.

```typescript
const progress = await api.getUserProgress();
// { 'uuid-colecao-1': 75, 'uuid-colecao-2': 30 }
```

**Retorna:** `Record<string, number>` — mapeamento de `collectionId` para percentual (0-100)

---

### `api.getProfile(forceRefresh?)`

Busca o perfil do usuário autenticado.

```typescript
const profile = await api.getProfile();
```

**Cache:** Armazena em `sessionStorage` vinculado ao `userId` e `sessionId` atual.

---

### `api.updateProfile(updates)`

Atualiza o perfil do usuário autenticado (upsert).

```typescript
await api.updateProfile({
  full_name: 'Maria Silva',
  email: 'maria.silva@exemplo.com.br',
  avatar_id: 'Kaboo',
});
```

---

### `api.createCollection(collection)` *(Admin/Editor)*

Cria uma nova coleção.

```typescript
const newCollection = await api.createCollection({
  title: 'Nova Aventura',
  level: 'Fundamental I',
  color_theme: '#5D1F58',
});
```

---

### `api.updateCollection(id, updates)` *(Admin/Editor)*

Atualiza uma coleção existente.

```typescript
const updated = await api.updateCollection('uuid', {
  title: 'Título Atualizado',
});
```

**Nota:** Verifica se a coleção existe antes de atualizar. Trata erros de RLS Policy.

---

### `api.deleteCollection(id)` *(Admin)*

Remove uma coleção. Retorna `true` em sucesso.

```typescript
const deleted = await api.deleteCollection('uuid');
```

---

### `api.createUser(userData)` *(Admin)*

Cria um novo usuário e envia convite por e-mail para definição de senha.

```typescript
const result = await api.createUser({
  email: 'professor@exemplo.com.br',
  full_name: 'Professor Silva',
  role: 'viewer',
});
// { success: true, userId: 'uuid' }
```

---

### `api.getAllUsers()` *(Admin)*

Lista apenas os usuários criados pelo administrador autenticado.

```typescript
const users = await api.getAllUsers();
```

---

### `api.deleteUser(userId)` *(Admin)*

Exclui um usuário do Auth e remove seus dados relacionados do banco.

```typescript
const result = await api.deleteUser('uuid');
// { success: true }
```

## Funções de Cache

| Função | Descrição |
|--------|-----------|
| `clearCollectionsCache()` | Remove cache de coleções do sessionStorage |
| `clearProfileCache()` | Remove cache de perfil do sessionStorage |
| `clearAllUserCache()` | Remove todos os caches (logout) |
| `getCachedCollectionsSync()` | Lê cache de coleções de forma síncrona |
| `getCachedProfileSync()` | Lê cache de perfil de forma síncrona |

## Estratégia de Cache

```
Requisição → verifica sessionStorage
              │
    ┌─────────┴──────────┐
    │ Cache válido        │ Cache ausente / sessão diferente
    │ (mesmo sessionId)   │ (ou forceRefresh = true)
    └─────────┬───────────┤
              │           │
         Retorna cache  Busca no Supabase
                           │
                        Salva no cache
                           │
                        Retorna dados
```

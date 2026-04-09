---
id: offline
title: lib/offline.ts
sidebar_position: 7
---

# Offline Manager (`lib/offline.ts`)

Módulo para gerenciar o acesso offline a coleções usando a **Cache API** do navegador e `localStorage`.

## Objeto `offlineManager`

### `offlineManager.isOffline(id)`

Verifica se uma coleção está marcada para acesso offline.

```typescript
const available = offlineManager.isOffline('uuid-da-colecao');
// true | false
```

---

### `offlineManager.enableOffline(collection)`

Salva todos os recursos de uma coleção no cache do navegador para acesso offline.

```typescript
await offlineManager.enableOffline(collection);
```

**O que é cacheado:**
- Imagem de capa (`cover_image`)
- Arquivo de áudio (`audio_url`)
- Arquivo de vídeo (`video_url`)
- Arquivo PDF (`pdf_url`)

**Estratégia:** `Promise.allSettled` — se um recurso falhar (ex: problema de CORS), os demais continuam sendo salvos.

---

### `offlineManager.disableOffline(id)`

Remove a coleção da lista de acesso offline.

```typescript
await offlineManager.disableOffline('uuid-da-colecao');
```

**Nota:** A implementação atual remove o ID da lista no `localStorage`, mas não deleta os arquivos do Cache API. Em uma implementação completa, iteraria sobre as chaves do cache para deletar os arquivos específicos.

## Armazenamento

| Dado | Mecanismo | Chave |
|------|-----------|-------|
| Lista de IDs offline | `localStorage` | `offline_collections` |
| Arquivos de mídia | Cache API (`caches`) | `kaboo-offline-v1` |

## Limpeza do cache

O cache offline é limpo via `clearAllUserCache()` em `lib/api.ts` durante o logout:

```typescript
if ('caches' in window) {
  caches.delete('kaboo-offline-v1');
}
```

## Limitações

- Os arquivos precisam suportar **CORS** para serem cacheados
- O tamanho disponível de cache varia por navegador e dispositivo
- Não há controle de versão dos assets cacheados

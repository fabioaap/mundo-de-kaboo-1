---
id: storage
title: lib/storage.ts
sidebar_position: 5
---

# Storage (`lib/storage.ts`)

Módulo de upload e gerenciamento de arquivos no Supabase Storage.

## Tipos

```typescript
export interface UploadResult {
  url: string | null;
  error: string | null;
  originalFileName?: string;
}

export interface UploadProgressCallback {
  (progress: number): void; // 0-100
}
```

## Funções

### `uploadFile(file, folder, collectionId?, onProgress?)`

Faz upload de um arquivo para o bucket `collections` no Supabase Storage.

```typescript
const result = await uploadFile(
  file,             // File object do input
  'covers',         // Pasta de destino
  'uuid-colecao',   // ID da coleção (opcional)
  (progress) => {   // Callback de progresso (opcional)
    console.log(`${progress}%`);
  }
);

if (result.error) {
  console.error(result.error);
} else {
  console.log('URL pública:', result.url);
}
```

**Pastas disponíveis:** `covers` | `pdfs` | `audio` | `video` | `extras`

**Formato do nome de arquivo:** `{timestamp}-{randomStr}-{nome-sanitizado}`

**Path de upload:**
- Com `collectionId`: `{folder}/{collectionId}/{filename}`
- Sem `collectionId`: `{folder}/temp/{filename}`

---

### `deleteFile(fileUrl)`

Remove um arquivo do Storage a partir da sua URL pública.

```typescript
const success = await deleteFile('https://...supabase.co/storage/v1/.../covers/...');
// true se removido com sucesso
```

---

### `extractOriginalFileName(url)`

Extrai o nome original do arquivo a partir de uma URL gerada pelo `uploadFile`.

```typescript
const name = extractOriginalFileName('https://...supabase.co/storage/.../1234567890-abc123-meu-arquivo.pdf');
// → 'meu-arquivo.pdf'
```

---

### `checkBucketExists()`

Verifica se o bucket `collections` existe e está acessível.

```typescript
const { exists, error, buckets } = await checkBucketExists();
if (!exists) {
  console.error('Bucket não encontrado:', error);
}
```

## Tratamento de Erros

O `uploadFile` trata os seguintes erros específicos:
- **RLS Policy:** Mensagem específica sobre políticas de segurança
- **Bucket não encontrado:** Menciona o nome do bucket esperado
- **Arquivo duplicado:** Tenta novamente com um novo nome de arquivo

## Progresso de Upload

O progresso é **simulado** entre 10% e 90% durante o upload, e definido como 100% ao concluir. Isso ocorre porque a API do Supabase Storage não expõe eventos de progresso nativamente.

---
id: file-upload
title: FileUpload
sidebar_position: 5
---

# FileUpload

**Arquivo:** `components/FileUpload.tsx`

## Descrição

Componente de upload de arquivo único com preview e integração com o Supabase Storage.

## Props

```typescript
interface FileUploadProps {
  label: string;
  accept?: string;         // Tipos MIME aceitos (ex: "image/*", "application/pdf")
  currentUrl?: string;     // URL atual do arquivo (para preview)
  bucket: string;          // Nome do bucket Supabase Storage
  folder: string;          // Pasta dentro do bucket
  onUploadComplete: (url: string) => void;
  onUploadError?: (error: Error) => void;
}
```

## Funcionalidades

- **Drag & drop** ou clique para selecionar arquivo
- **Preview** do arquivo selecionado (imagem, PDF, áudio, vídeo)
- **Progresso de upload** com indicador visual
- **Upload direto** para Supabase Storage
- **Validação de tipo** de arquivo baseada em `accept`

## Uso típico

```tsx
<FileUpload
  label="Imagem de Capa"
  accept="image/*"
  currentUrl={collection.cover_image}
  bucket="collections"
  folder="covers"
  onUploadComplete={(url) => setCollection(prev => ({...prev, cover_image: url}))}
/>
```

## Integração com Storage

Usa `lib/storage.ts` para realizar o upload. O arquivo é renomeado com um UUID para evitar colisões de nome.

## Variante: MultipleFileUpload

Para upload de múltiplos arquivos, use `MultipleFileUpload.tsx`, que aceita as mesmas props base mas retorna um array de URLs.

---
id: admin-collections
title: AdminCollectionsScreen
sidebar_position: 10
---

# AdminCollectionsScreen

**Arquivo:** `screens/AdminCollectionsScreen.tsx`  
**ScreenName:** `admin_collections`

## Descrição

Tela de administração de coleções. Disponível apenas para usuários com papel `admin` ou `editor`. Permite criar, editar e excluir coleções de conteúdo educacional.

## Props

```typescript
interface AdminCollectionsScreenProps {
  onNavigate: (screen: ScreenName, params?: any) => void;
  onBack: () => void;
}
```

## Funcionalidades

- **Listagem** de todas as coleções
- **Criar nova coleção** com todos os campos pedagógicos
- **Editar coleção** existente
- **Excluir coleção** com confirmação
- **Upload de arquivos:** capa, PDF, áudio, vídeo, materiais extras via `FileUpload` e `MultipleFileUpload`
- **Seleção de cor de tema** via `ColorPicker`
- **Gerenciamento de tags:** personagens, habilidades BNCC, competências CASEL
- **Preview de arquivos** antes de salvar

## Componentes utilizados

- [`FileUpload`](../components/file-upload) — upload de arquivo único
- `MultipleFileUpload` — upload de múltiplos arquivos
- `ColorPicker` — seletor de cor de tema
- `TagInput` — campo para adicionar tags
- `ConfirmationModal` — modal de confirmação de exclusão
- `FilePreviewModal` — preview de arquivos enviados

## Permissões

A tela verifica se o usuário tem papel `admin` ou `editor` no perfil. Usuários sem permissão são redirecionados para `home`.

## Campos da coleção

| Campo | Componente | Obrigatório |
|-------|-----------|:-----------:|
| Título | Input de texto | ✅ |
| Imagem de capa | FileUpload | ✅ |
| Nível escolar | Select | ✅ |
| Cor de tema | ColorPicker | — |
| PDF | FileUpload | — |
| Áudio | FileUpload | — |
| Vídeo | FileUpload | — |
| Tema | Input de texto | — |
| Objetivos | Textarea | — |
| Personagens | TagInput | — |
| Habilidades BNCC | TagInput | — |
| Competências CASEL | TagInput | — |
| Faixa etária/série | TagInput | — |
| Materiais extras | MultipleFileUpload | — |

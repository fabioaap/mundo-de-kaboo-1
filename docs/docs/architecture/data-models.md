---
id: data-models
title: Modelos de Dados
sidebar_position: 3
---

# Modelos de Dados (TypeScript)

Todos os tipos estão definidos em `types.ts`.

## `Collection`

Representa uma coleção de conteúdo educacional.

```typescript
export interface Collection {
  id: string;
  title: string;
  cover_image: string;
  level: 'Educação Infantil' | 'Fundamental I';
  progress?: number;
  duration?: string;
  current_position?: string;
  total_pages?: number;
  current_page?: number;
  color_theme?: string;

  // Arquivos de mídia
  pdf_url?: string;
  audio_url?: string;
  video_url?: string;

  // Campos pedagógicos
  theme?: string;
  learning_objectives?: string;
  characters?: string[];
  bncc_skills?: string[];
  casel_competencies?: string[];
  age_grade?: string[];
  extra_materials?: string[];
}
```

### Campos pedagógicos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `theme` | `string` | Tema central da coleção |
| `learning_objectives` | `string` | Objetivos de aprendizagem |
| `characters` | `string[]` | Personagens da história |
| `bncc_skills` | `string[]` | Códigos de habilidades BNCC |
| `casel_competencies` | `string[]` | Competências socioemorcionais CASEL |
| `age_grade` | `string[]` | Faixas etárias / séries recomendadas |
| `extra_materials` | `string[]` | URLs de materiais complementares |

---

## `UserProfile`

Perfil do usuário autenticado.

```typescript
export interface UserProfile {
  id: string;
  full_name: string | null;
  school_name: string | null;
  email: string | null;
  avatar_id: string | null; // Nome do personagem avatar (ex: "Kaboo")
}
```

---

## `CollectionResource`

Recurso adicional vinculado a uma coleção.

```typescript
export interface CollectionResource {
  id: string;
  collection_id: string;
  title: string;
  type: 'pdf' | 'audio' | 'video' | 'zip';
  url: string;
  size: string;
}
```

---

## `UserProgress`

Registra o progresso de um usuário em uma coleção.

```typescript
export interface UserProgress {
  collection_id: string;
  progress_percent: number; // 0 a 100
}
```

---

## `NavState`

Estado da navegação da aplicação.

```typescript
export interface NavState {
  currentScreen: ScreenName;
  params?: any;
}
```

---

## `ScreenName`

Union type de todas as telas disponíveis.

```typescript
export type ScreenName =
  | 'login'
  | 'forgot_password'
  | 'home'
  | 'search'
  | 'profile'
  | 'my_data'
  | 'details'
  | 'player_book'
  | 'player_audio'
  | 'player_video'
  | 'tools'
  | 'support'
  | 'email_confirmation'
  | 'admin_collections';
```

---

## `MediaType`

Tipos de mídia suportados pela plataforma.

```typescript
export type MediaType = 'book' | 'audio' | 'video' | 'extra';
```

---

## `Author`

Informações do autor de um conteúdo.

```typescript
export interface Author {
  name: string;
}
```

---

## Constantes Globais

Definidas em `constants.ts`:

```typescript
// Personagens disponíveis como avatar
export const AVATAR_CHARACTERS = [
  'Baratão', 'Baratinha', 'Batatinha', 'Blado',
  'Dr. Ratazana', 'Gaio', 'Kaboo', 'Papa'
];

// Filtros de nível escolar
export const TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'fund1', label: 'Ed. Infantil' },
  { id: 'fund2', label: 'Fund I' },
];
```

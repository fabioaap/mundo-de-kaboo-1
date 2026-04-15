---
id: supabase-setup
title: Configuração do Supabase
sidebar_position: 3
---

# Configuração do Supabase

O Mundo de Kaboo usa o [Supabase](https://supabase.com) como backend, fornecendo autenticação, banco de dados PostgreSQL e armazenamento de arquivos.

## Tabelas Necessárias

### `collections`

Armazena as coleções de conteúdo educacional.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | `uuid` | Identificador único (PK) |
| `title` | `text` | Título da coleção |
| `cover_image` | `text` | URL da imagem de capa |
| `level` | `text` | Nível escolar (`Educação Infantil` / `Fundamental I`) |
| `color_theme` | `text` | Cor hex do tema (ex: `#5D1F58`) |
| `pdf_url` | `text` | URL do arquivo PDF |
| `audio_url` | `text` | URL do arquivo de áudio |
| `video_url` | `text` | URL do arquivo de vídeo |
| `theme` | `text` | Tema pedagógico |
| `learning_objectives` | `text` | Objetivos de aprendizagem |
| `characters` | `text[]` | Lista de personagens |
| `bncc_skills` | `text[]` | Habilidades BNCC relacionadas |
| `casel_competencies` | `text[]` | Competências CASEL |
| `age_grade` | `text[]` | Faixas etárias/série |
| `extra_materials` | `text[]` | URLs de materiais extras |
| `created_at` | `timestamptz` | Data de criação |

### `profiles`

Armazena os perfis dos usuários (estende o Supabase Auth).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | `uuid` | ID do usuário (FK → `auth.users`) |
| `full_name` | `text` | Nome completo |
| `school_name` | `text` | Campo legado de compatibilidade. O frontend atual não lê nem escreve esse valor. |
| `email` | `text` | E-mail do usuário |
| `avatar_id` | `text` | Nome do personagem avatar |
| `role` | `text` | Papel: `admin`, `editor`, `viewer` |
| `updated_at` | `timestamptz` | Data de atualização |

### `user_progress`

Registra o progresso dos usuários nas coleções.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | `uuid` | Identificador único (PK) |
| `user_id` | `uuid` | FK → `auth.users` |
| `collection_id` | `uuid` | FK → `collections` |
| `progress_percent` | `int` | Progresso de 0 a 100 |

### `collection_resources`

Recursos adicionais vinculados a uma coleção.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | `uuid` | Identificador único (PK) |
| `collection_id` | `uuid` | FK → `collections` |
| `title` | `text` | Título do recurso |
| `type` | `text` | Tipo: `pdf`, `audio`, `video`, `zip` |
| `url` | `text` | URL do arquivo |
| `size` | `text` | Tamanho do arquivo |

## Storage Buckets

Configure um bucket chamado `collections` com as seguintes pastas:

```
collections/
├── covers/         # Imagens de capa
├── pdfs/           # Arquivos PDF
├── audio/          # Arquivos de áudio
├── videos/         # Arquivos de vídeo
├── characters/     # Imagens dos personagens
└── extras/         # Materiais extras (ZIP, etc.)
```

### Política de acesso

Configure o bucket como **público** para leitura (as URLs são usadas diretamente no frontend).

## Row Level Security (RLS)

### Tabela `collections` — Leitura pública, escrita restrita

```sql
-- Leitura: todos os usuários autenticados
CREATE POLICY "Authenticated can read collections"
ON collections FOR SELECT
TO authenticated
USING (true);

-- Escrita: apenas admins e editors
CREATE POLICY "Admins and editors can manage collections"
ON collections FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'editor')
  )
);
```

### Tabela `profiles` — Usuários gerenciam seu próprio perfil

```sql
-- Leitura: próprio perfil
CREATE POLICY "Users can read own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Atualização: próprio perfil
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);
```

## Autenticação

O Supabase Auth é configurado com:
- **E-mail + senha** como provedor principal
- **Confirmação de e-mail** habilitada
- **URL de redirecionamento** configurada para o domínio da aplicação

Configure o redirect URL em **Authentication → URL Configuration**:
```
https://seu-dominio.com/?confirmation=success
```

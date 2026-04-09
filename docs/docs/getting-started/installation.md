---
id: installation
title: Instalação
sidebar_position: 1
---

# Instalação e Execução Local

Este guia explica como configurar e executar o Mundo de Kaboo em seu ambiente de desenvolvimento.

## Pré-requisitos

- **Node.js** 18 ou superior ([download](https://nodejs.org))
- **npm** (incluído com Node.js)
- Conta no **Supabase** para backend e autenticação ([criar conta gratuita](https://supabase.com))

## Passo a Passo

### 1. Navegue até o diretório do projeto

```bash
cd mundo-de-kaboo
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```bash
cp .env.example .env.local
```

Edite o arquivo `.env.local` com suas credenciais do Supabase:

```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

> Obtenha essas credenciais em: [Supabase Dashboard → Settings → API](https://supabase.com/dashboard/project/_/settings/api)

### 4. Execute o servidor de desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`.

### 5. Build para produção

```bash
npm run build
```

Os arquivos de produção serão gerados na pasta `dist/`.

## Scripts disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Inicia o servidor de desenvolvimento (Vite) |
| `npm run build` | Gera o build de produção |
| `npm run preview` | Serve localmente o build de produção |
| `npm run prebuild` | Copia o worker do PDF para a pasta `public/` |

## Estrutura de Pastas

```
mundo-de-kaboo/
├── assets/              # Recursos estáticos (imagens, etc.)
│   └── images/          # Imagens do projeto
├── components/          # Componentes React reutilizáveis
│   └── flipbook/        # Componentes do visualizador de PDF
├── hooks/               # Custom React Hooks
├── lib/                 # Utilitários, clientes API e helpers
├── screens/             # Telas principais da aplicação
├── types.ts             # Definições de tipos TypeScript
├── constants.ts         # Constantes e configurações
├── App.tsx              # Componente principal e roteamento
└── index.tsx            # Ponto de entrada da aplicação
```

## Próximos passos

- [Configurar variáveis de ambiente →](./environment-variables)
- [Configurar o Supabase →](./supabase-setup)

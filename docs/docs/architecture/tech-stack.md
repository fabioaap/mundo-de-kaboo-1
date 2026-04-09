---
id: tech-stack
title: Stack Tecnológico
sidebar_position: 2
---

# Stack Tecnológico

## Frontend

| Tecnologia | Versão | Papel |
|------------|--------|-------|
| [React](https://react.dev) | 19 | Biblioteca de UI |
| [TypeScript](https://www.typescriptlang.org) | 5.8 | Tipagem estática |
| [Vite](https://vite.dev) | 6 | Build tool e dev server |
| [Tailwind CSS](https://tailwindcss.com) | 3 | Framework CSS utility-first |

## Bibliotecas de UI

| Biblioteca | Versão | Uso |
|------------|--------|-----|
| [lucide-react](https://lucide.dev) | ^0.561 | Ícones SVG |
| [clsx](https://github.com/lukeed/clsx) | ^2.1 | Merge de classes CSS |
| [tailwind-merge](https://github.com/dcastil/tailwind-merge) | ^2.2 | Resolução de conflitos Tailwind |
| [canvas-confetti](https://www.npmjs.com/package/canvas-confetti) | 1.9.2 | Efeito de confete |

## Visualização de PDF

| Biblioteca | Versão | Uso |
|------------|--------|-----|
| [pdfjs-dist](https://mozilla.github.io/pdf.js/) | 5.4 | Renderização de PDFs no canvas |
| [react-pdf](https://react-pdf.org) | ^10.2 | Wrapper React para PDF.js |
| [react-pageflip](https://nodlik.github.io/react-pageflip/) | ^2.0.3 | Efeito de virada de página |
| [react-zoom-pan-pinch](https://github.com/BetterTyped/react-zoom-pan-pinch) | ^3.4 | Zoom e pan com gestos |

## Backend (Supabase)

| Serviço | Uso |
|---------|-----|
| **Supabase Auth** | Autenticação de usuários (e-mail + senha) |
| **Supabase Database** | PostgreSQL com RLS para dados estruturados |
| **Supabase Storage** | Armazenamento de PDFs, áudios, vídeos e imagens |

## Analytics

| Biblioteca | Uso |
|------------|-----|
| [@vercel/analytics](https://vercel.com/analytics) | Métricas de uso (Vercel) |

## Deploy

| Plataforma | Configuração |
|------------|-------------|
| [Vercel](https://vercel.com) | Deploy automático via `vercel.json` |

### `vercel.json`

```json
{
  "rewrites": [{"source": "/(.*)", "destination": "/"}]
}
```

Todas as rotas são redirecionadas para `index.html` para suportar o roteamento do SPA.

## Ferramentas de Desenvolvimento

| Ferramenta | Versão | Uso |
|------------|--------|-----|
| [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react) | ^5.0 | Plugin React para Vite (Babel) |
| [@types/node](https://www.npmjs.com/package/@types/node) | ^22 | Tipos do Node.js |
| TypeScript | ~5.8 | Compilador TypeScript |

## Requisitos de Ambiente

- **Node.js:** ≥ 18
- **npm:** ≥ 9 (incluído com Node 18+)
- **Navegadores suportados:** Chrome, Firefox, Safari (últimas 2 versões)

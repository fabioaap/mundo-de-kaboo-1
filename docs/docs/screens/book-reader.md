---
id: book-reader
title: BookReaderScreen
sidebar_position: 5
---

# BookReaderScreen

**Arquivo:** `screens/BookReaderScreen.tsx`  
**ScreenName:** `player_book`

## Descrição

Visualizador de livros em PDF com efeito de virada de página (flipbook). Carregado de forma **lazy** para evitar que a importação do `pdfjs-dist` bloqueie o app.

## Props

```typescript
interface BookReaderScreenProps {
  collection: Collection;
  onBack: () => void;
}
```

## Funcionalidades

- **Renderização de PDF** via `pdfjs-dist` e `react-pdf`
- **Efeito flipbook** com animação de virada de página via `react-pageflip`
- **Zoom e pan** com gestos de pinch via `react-zoom-pan-pinch`
- **Navegação por páginas** (anterior/próxima, ir para página específica)
- **Modo paisagem** otimizado para a leitura do flipbook
- **Cor de tema** da coleção aplicada ao fundo da tela
- **Loading spinner** com a cor do tema enquanto o PDF carrega

## Lazy Loading

```typescript
// Em App.tsx
const BookReaderScreen = React.lazy(() =>
  import('./screens/BookReaderScreen').then(module => ({
    default: module.BookReaderScreen
  }))
);
```

O `React.Suspense` exibe um spinner com a cor da coleção enquanto o componente carrega.

## Componentes usados

- [`FlipbookViewer`](../components/flipbook-viewer) — renderiza o PDF como flipbook
- [`PageHeader`](../components/page-header) — cabeçalho com botão de voltar

## Hook utilizado

- [`useThemeBackground`](../hooks/use-theme-background) — aplica a cor de tema ao `document.body`
- [`useOrientation`](../hooks/use-orientation) — detecta orientação do dispositivo

## Requisitos

- A prop `collection` deve ter `pdf_url` definido
- O arquivo `pdf.worker.min.mjs` deve estar em `public/` (copiado no `prebuild`)

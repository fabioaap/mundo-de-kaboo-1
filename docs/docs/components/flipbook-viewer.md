---
id: flipbook-viewer
title: FlipbookViewer
sidebar_position: 6
---

# FlipbookViewer

**Diretório:** `components/flipbook/`

## Descrição

Componente que renderiza um PDF com efeito de virada de página animado (flipbook). Usado exclusivamente pelo `BookReaderScreen`.

## Funcionamento interno

O FlipbookViewer combina três bibliotecas:

1. **`pdfjs-dist`** — Converte cada página do PDF em um canvas renderizado
2. **`react-pageflip`** — Aplica a animação de virada de página
3. **`react-zoom-pan-pinch`** — Adiciona suporte a zoom e pan por pinch gesture

## Props (aproximadas)

```typescript
interface FlipbookViewerProps {
  pdfUrl: string;
  themeColor: string;
  onPageChange?: (page: number, total: number) => void;
}
```

## Worker do PDF.js

O PDF.js requer um arquivo worker separado. Ele é copiado automaticamente pelo script `prebuild`:

```json
"prebuild": "mkdir -p public && cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdf.worker.min.mjs"
```

E configurado em `vite.config.ts`:

```typescript
// O worker é servido diretamente do /public
GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
```

## Estrutura de arquivos

```
components/flipbook/
├── FlipbookViewer.tsx    # Componente principal
├── PDFPage.tsx           # Renderização de uma página individual
└── FlipbookControls.tsx  # Controles de navegação
```

## Considerações de performance

- As páginas são renderizadas progressivamente (não todas de uma vez)
- O zoom é aplicado sobre o canvas já renderizado (sem re-renderização)
- Em modo mobile, o layout muda para uma página por vez

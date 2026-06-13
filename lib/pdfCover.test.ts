import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- Mocks de pdfjs (via react-pdf) e do appPaths ---
const getPage = vi.fn();
const getDocument = vi.fn();
const destroy = vi.fn().mockResolvedValue(undefined);

vi.mock('react-pdf', () => ({
  pdfjs: {
    GlobalWorkerOptions: { workerSrc: '' },
    getDocument: (...args: unknown[]) => getDocument(...args),
  },
}));

vi.mock('./appPaths', () => ({
  resolveAppUrl: (v: string) => v,
}));

import { renderPdfFirstPageToBlob, renderPdfFirstPageToFile } from './pdfCover';

const makeFile = (name = 'livro.pdf') => {
  const f = new File([new Uint8Array([1, 2, 3])], name, { type: 'application/pdf' });
  if (!f.arrayBuffer) {
    (f as any).arrayBuffer = async () => new Uint8Array([1, 2, 3]).buffer;
  }
  return f;
};

// O ambiente de teste é "node" (sem DOM). Stubamos window/document manualmente
// para exercitar o caminho de renderização sem depender de jsdom/happy-dom.
const installDom = (blob: Blob | null) => {
  const ctx = {} as CanvasRenderingContext2D;
  (globalThis as any).window = globalThis;
  (globalThis as any).document = {
    createElement: (tag: string) =>
      tag === 'canvas'
        ? { width: 0, height: 0, getContext: () => ctx, toBlob: (cb: (b: Blob | null) => void) => cb(blob) }
        : {},
  };
};

const okDocument = () => {
  getPage.mockResolvedValue({
    getViewport: ({ scale }: { scale: number }) => ({ width: 500 * scale, height: 700 * scale }),
    render: vi.fn().mockReturnValue({ promise: Promise.resolve() }),
  });
  getDocument.mockReturnValue({ promise: Promise.resolve({ getPage: () => getPage(), destroy }) });
};

beforeEach(() => {
  getDocument.mockReset();
  getPage.mockReset();
  destroy.mockClear();
});

afterEach(() => {
  delete (globalThis as any).window;
  delete (globalThis as any).document;
});

describe('renderPdfFirstPageToBlob', () => {
  it('renderiza a primeira página e retorna um Blob', async () => {
    okDocument();
    const outBlob = new Blob(['img'], { type: 'image/jpeg' });
    installDom(outBlob);

    const result = await renderPdfFirstPageToBlob(makeFile());
    expect(result).toBe(outBlob);
    expect(getPage).toHaveBeenCalled();
    expect(destroy).toHaveBeenCalled();
  });

  it('retorna null sem DOM (ambiente sem window/document)', async () => {
    okDocument();
    const result = await renderPdfFirstPageToBlob(makeFile());
    expect(result).toBeNull();
  });

  it('retorna null se o PDF não puder ser lido', async () => {
    installDom(new Blob(['x']));
    getDocument.mockReturnValue({ promise: Promise.reject(new Error('corrompido')) });
    const result = await renderPdfFirstPageToBlob(makeFile());
    expect(result).toBeNull();
  });

  it('retorna null se toBlob falhar', async () => {
    okDocument();
    installDom(null);
    const result = await renderPdfFirstPageToBlob(makeFile());
    expect(result).toBeNull();
  });
});

describe('renderPdfFirstPageToFile', () => {
  it('embrulha o Blob num File com nome derivado do PDF', async () => {
    okDocument();
    installDom(new Blob(['img'], { type: 'image/jpeg' }));

    const file = await renderPdfFirstPageToFile(makeFile('EFAI1_Livro_Kaboo.pdf'));
    expect(file).not.toBeNull();
    expect(file!.name).toBe('EFAI1_Livro_Kaboo-capa.jpg');
    expect(file!.type).toBe('image/jpeg');
  });

  it('retorna null quando a renderização falha', async () => {
    installDom(new Blob(['x']));
    getDocument.mockReturnValue({ promise: Promise.reject(new Error('x')) });
    const file = await renderPdfFirstPageToFile(makeFile());
    expect(file).toBeNull();
  });
});

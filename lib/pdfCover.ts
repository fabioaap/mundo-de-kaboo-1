import { pdfjs } from 'react-pdf';
import { resolveAppUrl } from './appPaths';

// Garante o worker do PDF.js configurado (mesmo arquivo usado pelo FlipbookViewer).
if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = resolveAppUrl('/pdf.worker.min.mjs');
}

export interface RenderPdfCoverOptions {
  /** Largura-alvo da imagem gerada, em px. Altura segue a proporção da página. */
  maxWidth?: number;
  /** MIME da imagem de saída. */
  type?: 'image/jpeg' | 'image/png';
  /** Qualidade (0–1) para JPEG. */
  quality?: number;
}

/**
 * Renderiza a primeira página de um PDF como imagem (Blob), para usar como capa.
 *
 * 100% client-side (PDF.js do react-pdf). Tolerante a falha: retorna `null` se o
 * PDF não puder ser lido/renderizado (protegido, corrompido, etc.) — quem chama
 * mantém a capa atual.
 */
export const renderPdfFirstPageToBlob = async (
  file: File | Blob,
  options: RenderPdfCoverOptions = {}
): Promise<Blob | null> => {
  const { maxWidth = 1000, type = 'image/jpeg', quality = 0.9 } = options;

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }

  let pdf: Awaited<ReturnType<typeof pdfjs.getDocument>['promise']> | null = null;
  try {
    const data = await file.arrayBuffer();
    pdf = await pdfjs.getDocument({ data }).promise;
    const page = await pdf.getPage(1);

    const baseViewport = page.getViewport({ scale: 1 });
    const scale = baseViewport.width > 0 ? maxWidth / baseViewport.width : 1;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    const context = canvas.getContext('2d');
    if (!context) return null;

    await page.render({ canvas, canvasContext: context, viewport }).promise;

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), type, quality);
    });
    return blob;
  } catch {
    return null;
  } finally {
    // Libera recursos do PDF.js.
    try {
      await pdf?.destroy();
    } catch {
      /* noop */
    }
  }
};

/**
 * Conveniência: renderiza a capa e embrulha num `File` pronto para upload.
 * Deriva o nome do arquivo de capa a partir do nome do PDF de origem.
 */
export const renderPdfFirstPageToFile = async (
  pdfFile: File,
  options?: RenderPdfCoverOptions
): Promise<File | null> => {
  const blob = await renderPdfFirstPageToBlob(pdfFile, options);
  if (!blob) return null;
  const ext = blob.type === 'image/png' ? 'png' : 'jpg';
  const baseName = pdfFile.name.replace(/\.[^.]+$/, '') || 'capa';
  return new File([blob], `${baseName}-capa.${ext}`, { type: blob.type });
};

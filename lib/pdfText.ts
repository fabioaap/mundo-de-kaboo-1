import { pdfjs } from 'react-pdf';
import { resolveAppUrl } from './appPaths';

if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = resolveAppUrl('/pdf.worker.min.mjs');
}

/**
 * Extrai o texto das primeiras páginas de um PDF (client-side).
 * Aceita um File/Blob ou uma URL. Retorna '' em caso de falha.
 */
export const extractPdfText = async (
  source: File | Blob | string,
  maxPages = 6,
): Promise<string> => {
  if (typeof window === 'undefined') return '';
  let pdf: Awaited<ReturnType<typeof pdfjs.getDocument>['promise']> | null = null;
  try {
    const docParams =
      typeof source === 'string' ? { url: source } : { data: await source.arrayBuffer() };
    pdf = await pdfjs.getDocument(docParams).promise;
    const pages = Math.min(maxPages, pdf.numPages);
    const chunks: string[] = [];
    for (let i = 1; i <= pages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ('str' in item ? (item as { str: string }).str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (text) chunks.push(text);
    }
    return chunks.join('\n').trim();
  } catch {
    return '';
  } finally {
    try {
      await pdf?.destroy();
    } catch {
      /* noop */
    }
  }
};

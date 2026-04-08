import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '..');
const source = resolve(projectRoot, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');
const targetDir = resolve(projectRoot, 'public');
const target = resolve(targetDir, 'pdf.worker.min.mjs');

if (!existsSync(source)) {
    throw new Error(`pdf.worker.min.mjs não encontrado em ${source}`);
}

mkdirSync(targetDir, { recursive: true });
copyFileSync(source, target);
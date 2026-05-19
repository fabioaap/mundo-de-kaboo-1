import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '..');
const source = resolve(projectRoot, 'public', 'CNAME');
const targetDir = resolve(projectRoot, 'dist');
const target = resolve(targetDir, 'CNAME');

if (!existsSync(source)) {
    throw new Error(`CNAME não encontrado em ${source}`);
}

mkdirSync(targetDir, { recursive: true });
copyFileSync(source, target);
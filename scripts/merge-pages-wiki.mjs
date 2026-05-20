import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '..');
const wikiBuildDir = resolve(projectRoot, 'docs', 'build');
const wikiTargetDir = resolve(projectRoot, 'dist', 'wiki');

if (!existsSync(wikiBuildDir)) {
    throw new Error(`Build da wiki não encontrado em ${wikiBuildDir}`);
}

rmSync(wikiTargetDir, { recursive: true, force: true });
mkdirSync(wikiTargetDir, { recursive: true });
cpSync(wikiBuildDir, wikiTargetDir, { recursive: true });
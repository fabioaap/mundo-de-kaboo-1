// Camada 2 do doc-sync: pede à função wiki-draft (Supabase) um rascunho de
// changelog a partir do diff do PR. A chave do LLM fica no Supabase — aqui só
// a anon key (pública). Escreve o rascunho em wiki-draft-changelog.md e stdout.
//
// Uso: node scripts/wiki/draft-changelog.mjs [baseRef]   (default: origin/main)
// Env: WIKI_SUPABASE_URL, WIKI_SUPABASE_ANON_KEY

import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const base = process.argv[2] || process.env.BASE_REF || 'origin/main';
const url = (process.env.WIKI_SUPABASE_URL || '').replace(/\/+$/, '');
const anon = process.env.WIKI_SUPABASE_ANON_KEY || '';
if (!url || !anon) {
  console.error('Faltam WIKI_SUPABASE_URL / WIKI_SUPABASE_ANON_KEY.');
  process.exit(0);
}

const CODE =
  /^(screens|components|hooks|lib|supabase\/migrations|supabase\/functions)\/|^App\.tsx$|^types\.ts$/;

let files;
try {
  files = execSync(`git diff --name-only ${base}...HEAD`, { encoding: 'utf8' })
    .split('\n')
    .map((s) => s.trim())
    .filter((f) => CODE.test(f));
} catch (e) {
  console.error(`git diff falhou (${e.message}).`);
  process.exit(0);
}

if (!files.length) {
  console.log('Sem código relevante — nada a rascunhar.');
  process.exit(0);
}

const diff = execSync(
  `git diff ${base}...HEAD -- ${files.map((f) => `"${f}"`).join(' ')}`,
  { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
).slice(0, 13000);

const date = new Date().toISOString().slice(0, 10);

const res = await fetch(`${url}/functions/v1/wiki-draft`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', apikey: anon, Authorization: `Bearer ${anon}` },
  body: JSON.stringify({ diff, files, date }),
});
const data = await res.json().catch(() => ({}));

if (!data.configured) {
  console.error('wiki-draft não configurada (sem chave de LLM no Supabase).');
  process.exit(0);
}
if (!data.draft) {
  console.error('Sem rascunho:', data.error || 'motivo desconhecido');
  process.exit(0);
}

writeFileSync('wiki-draft-changelog.md', data.draft, 'utf8');
console.log(data.draft);

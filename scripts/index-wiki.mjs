// Indexador da wiki para o assistente (RAG lexical).
//
// Lê docs/docs/**/*.md, quebra em trechos por heading e popula a tabela
// public.wiki_chunks (busca full-text pt-BR). Re-rodável: limpa e repopula.
//
// Uso:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/index-wiki.mjs
//
// A service role key é um segredo de servidor (nunca vai ao navegador). Rode
// localmente ou num job de CI com o secret configurado.

import { createClient } from '@supabase/supabase-js';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS_DIR = join(ROOT, 'docs', 'docs');

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!process.env.EMIT_SQL && (!url || !serviceKey)) {
  console.error('Faltam SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no ambiente.');
  process.exit(1);
}

// ─────────────────────────── coleta de arquivos ───────────────────────────
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.md') || name.endsWith('.mdx')) out.push(p);
  }
  return out;
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { data: {}, body: raw };
  const data = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) data[kv[1]] = kv[2].replace(/^['"]|['"]$/g, '').trim();
  }
  return { data, body: raw.slice(m[0].length) };
}

// Rota do doc (relativa à raiz da wiki, sem baseUrl — o widget resolve).
function docRoute(file, data) {
  const rel = relative(DOCS_DIR, file).replace(/\\/g, '/').replace(/\.mdx?$/, '');
  if (data.slug) {
    const s = data.slug.startsWith('/') ? data.slug : `/${data.slug}`;
    return `/docs${s}`;
  }
  const folder = dirname(rel);
  const id = data.id || basename(rel);
  const docId = folder === '.' ? id : `${folder}/${id}`;
  return `/docs/${docId}`;
}

// Limpa ruído MDX/markdown, deixando texto legível para o LLM.
function clean(body) {
  return body
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '') // comentários MDX
    .replace(/^import .*$/gm, '') // imports
    .replace(/^:::[a-z]*\s*/gm, '') // marcadores de admonition
    .replace(/^:::$/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // imagens
    .replace(/```[a-z]*\n?/g, '') // cercas de código
    .replace(/\|/g, ' ') // pipes de tabela viram espaço
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

// Quebra por heading (## / ###). Antes do 1º heading = intro (heading null).
function chunkify(body, title) {
  const lines = clean(body).split('\n');
  const chunks = [];
  let heading = null;
  let buf = [];
  const flush = () => {
    const content = buf.join('\n').trim();
    if (content.length >= 24) chunks.push({ heading, content: content.slice(0, 1800) });
    buf = [];
  };
  for (const line of lines) {
    const h = line.match(/^#{2,3}\s+(.*)$/);
    if (h) {
      flush();
      heading = h[1].replace(/#/g, '').trim();
    } else if (/^#\s+/.test(line)) {
      // H1 é o título da página; não vira heading de trecho.
    } else {
      buf.push(line);
    }
  }
  flush();
  return chunks.map((c) => ({ ...c, title }));
}

// Pastas de arquivo histórico: NÃO indexar (evita a IA citar backlog velho como
// atual). O conteúdo atual de roadmap fica em roadmap-historico/.
const EXCLUDE = [/^roadmap\//];

// ─────────────────────────────── execução ───────────────────────────────
const files = walk(DOCS_DIR);
const rows = [];
let skipped = 0;
for (const file of files) {
  const rel = relative(DOCS_DIR, file).replace(/\\/g, '/');
  if (EXCLUDE.some((re) => re.test(rel))) {
    skipped++;
    continue;
  }
  const raw = readFileSync(file, 'utf8');
  const { data, body } = parseFrontmatter(raw);
  const h1 = body.match(/^#\s+(.*)$/m);
  const title = data.title || (h1 ? h1[1].trim() : basename(file));
  const url = docRoute(file, data);
  for (const c of chunkify(body, title)) {
    rows.push({ doc_id: url.replace('/docs/', ''), title, url, heading: c.heading, content: c.content });
  }
}

console.log(`Arquivos: ${files.length} (${skipped} arquivados, ignorados) — trechos: ${rows.length}`);

// Modo EMIT_SQL: escreve INSERTs num arquivo (para aplicar via outra via, sem
// service role). Não conecta ao Supabase.
if (process.env.EMIT_SQL) {
  const esc = (s) => `$c$${s}$c$`;
  const stmts = ['delete from public.wiki_chunks where id > 0;'];
  for (let i = 0; i < rows.length; i += 100) {
    const vals = rows
      .slice(i, i + 100)
      .map(
        (r) =>
          `(${esc(r.doc_id)},${esc(r.title)},${esc(r.url)},${r.heading ? esc(r.heading) : 'null'},${esc(r.content)})`,
      )
      .join(',\n');
    stmts.push(`insert into public.wiki_chunks (doc_id,title,url,heading,content) values\n${vals};`);
  }
  stmts.forEach((sql, i) => {
    writeFileSync(join(ROOT, 'scripts', `wiki-batch-${i}.sql`), sql, 'utf8');
  });
  console.log(`Escritos ${stmts.length} arquivos wiki-batch-0..${stmts.length - 1}.sql`);
  process.exit(0);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Limpa e repopula.
const { error: delErr } = await supabase.from('wiki_chunks').delete().gt('id', 0);
if (delErr) {
  console.error('Erro ao limpar wiki_chunks:', delErr.message);
  process.exit(1);
}

for (let i = 0; i < rows.length; i += 400) {
  const batch = rows.slice(i, i + 400);
  const { error } = await supabase.from('wiki_chunks').insert(batch);
  if (error) {
    console.error(`Erro no lote ${i}:`, error.message);
    process.exit(1);
  }
  console.log(`Inseridos ${Math.min(i + 400, rows.length)}/${rows.length}`);
}

console.log('✅ Indexação concluída.');

/**
 * audit-catalog.mjs  —  READ-ONLY catalog anomaly scanner
 *
 * Audita a saúde do catálogo (coleções) procurando anomalias para investigação.
 * NÃO escreve nada. Roda contra PROD (Supabase service-role) e/ou o seed local.
 *
 * Checagens:
 *   - duplicate-title        títulos duplicados (normalizados)
 *   - title-hygiene          espaços nas pontas / lixo (URL, #, "Podcast"...)
 *   - missing-published      is_published ausente/false
 *   - missing-cover          cover_image vazio ou placeholder
 *   - stale-url              URL apontando p/ projeto Supabase que NÃO é o atual (ex.: o morto)
 *   - asset-owner-mismatch   asset cujo arquivo pertence a OUTRA coleção (id na URL ≠ id da coleção)
 *   - empty-content          sem livro/pdf/áudio/vídeo/asset/material
 *   - broken-kit-book-ref    kit_book_ids apontando p/ coleção inexistente
 *   - file-reuse             mesmo arquivo (nome) usado por várias coleções (info)
 *   - orphan-media-link      (só PROD) media_collection_links apontando p/ coleção inexistente
 *
 * Uso:
 *   node scripts/audit-catalog.mjs                # prod + seed
 *   node scripts/audit-catalog.mjs --prod         # só prod
 *   node scripts/audit-catalog.mjs --seed         # só seed
 *   node scripts/audit-catalog.mjs --brand kaboo  # prod: kaboo | coruja | all (default all)
 *   node scripts/audit-catalog.mjs --json out.json
 *
 * Lê VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY do .env.local (só p/ --prod).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const BRANDS = {
  kaboo: '296eab71-e45b-47f3-af69-9409d3985c5b',
  coruja: 'bb43daa4-31d7-4517-9acd-423949d09239',
};
const CURRENT_SUPABASE_HOST = 'yevysgqlnhonhkczkyhu'; // projeto de produção atual

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const valOf = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
const doProd = has('--prod') || (!has('--prod') && !has('--seed'));
const doSeed = has('--seed') || (!has('--prod') && !has('--seed'));
const brandArg = (valOf('--brand') || 'all').toLowerCase();
const jsonOut = valOf('--json');

const norm = (s) => (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
const urlTail = (u) => { try { return decodeURIComponent((u || '').split('?')[0].split('#')[0].split('/').pop() || ''); } catch { return ''; } };
const ownerIdFromUrl = (u) => ((u || '').match(/\/collections\/[^/]+\/([0-9a-fA-F-]{36})\//) || [])[1] || '';
const allUrlsOf = (c) => {
  const out = [];
  for (const f of ['pdf_url', 'audio_url', 'video_url', 'cover_image', 'kit_cover_image']) {
    if (c[f]) out.push({ field: f, url: c[f] });
  }
  for (const u of c.extra_materials || []) out.push({ field: 'extra_materials', url: u });
  for (const a of c.collection_assets || []) if (a?.url) out.push({ field: `asset:${a.category || '?'}`, url: a.url });
  return out;
};
const isPlaceholderCover = (u) => !u || /placeholder|-kit\.svg$/i.test(u) || !u.toString().trim();

/** Roda todas as checagens sobre um array de coleções. Retorna lista de anomalias. */
const audit = (collections, { source }) => {
  const anomalies = [];
  const add = (check, severity, c, detail) =>
    anomalies.push({ source, check, severity, id: c?.id, title: c?.title, detail });

  const ids = new Set(collections.map((c) => c.id));

  // duplicate-title
  const byTitle = new Map();
  for (const c of collections) {
    const k = norm(c.title);
    if (!k) continue;
    (byTitle.get(k) || byTitle.set(k, []).get(k)).push(c);
  }
  for (const [k, group] of byTitle) {
    if (group.length > 1) {
      add('duplicate-title', 'warn', group[0],
        `${group.length}× "${group[0].title?.trim()}" → ids: ${group.map((g) => g.id).join(', ')}`);
    }
  }

  // file-reuse (cross-collection)
  const byFile = new Map();
  for (const c of collections) for (const { url } of allUrlsOf(c)) {
    if (/^https?:/.test(url) || url.startsWith('/collections/')) {
      const t = urlTail(url);
      if (!t) continue;
      const set = byFile.get(t) || byFile.set(t, new Set()).get(t);
      set.add(c.id);
    }
  }
  for (const [file, set] of byFile) {
    if (set.size > 1) {
      add('file-reuse', 'info', { id: [...set][0] }, `arquivo "${file}" usado por ${set.size} coleções: ${[...set].join(', ')}`);
    }
  }

  // per-collection checks
  for (const c of collections) {
    const t = (c.title || '').toString();
    if (t !== t.trim()) add('title-hygiene', 'warn', c, `título com espaço nas pontas: "${t}"`);
    if (/https?:\/\/|#\d|podcast|\bltda\b/i.test(t)) add('title-hygiene', 'warn', c, `título suspeito (lixo?): "${t.slice(0, 60)}"`);

    if (c.is_published !== true) add('missing-published', 'warn', c, `is_published = ${JSON.stringify(c.is_published)}`);

    if (isPlaceholderCover(c.cover_image)) add('missing-cover', 'warn', c, `cover_image = ${JSON.stringify(c.cover_image)}`);

    for (const { field, url } of allUrlsOf(c)) {
      if (/supabase\.co/i.test(url) && !url.includes(CURRENT_SUPABASE_HOST)) {
        add('stale-url', 'error', c, `[${field}] aponta p/ projeto Supabase NÃO-atual: ${url.slice(0, 90)}`);
      }
    }

    for (const a of c.collection_assets || []) {
      const owner = ownerIdFromUrl(a.url);
      if (owner && owner !== c.id) {
        add('asset-owner-mismatch', 'error', c,
          `asset [${a.category}] usa arquivo da coleção ${owner} (≠ ${c.id})`);
      }
    }

    const hasBook = (c.kit_book_ids || []).length > 0;
    const hasLegacy = [c.pdf_url, c.audio_url, c.video_url].some((u) => (u || '').toString().trim());
    const hasAsset = (c.collection_assets || []).some((a) => (a?.url || '').toString().trim());
    const hasExtra = (c.extra_materials || []).length > 0;
    if (!hasBook && !hasLegacy && !hasAsset && !hasExtra) add('empty-content', 'warn', c, 'sem livro/pdf/áudio/vídeo/asset/material');

    for (const bid of c.kit_book_ids || []) {
      if (!ids.has(bid)) add('broken-kit-book-ref', 'error', c, `kit_book_id ${bid} não existe no dataset`);
    }
  }

  return anomalies;
};

const printReport = (label, collections, anomalies, extra = []) => {
  const all = [...anomalies, ...extra];
  console.log(`\n${'='.repeat(60)}\n${label}  (${collections.length} coleções, ${all.length} anomalias)\n${'='.repeat(60)}`);
  const byCheck = {};
  for (const a of all) (byCheck[a.check] = byCheck[a.check] || []).push(a);
  const order = ['error', 'warn', 'info'];
  const checks = Object.keys(byCheck).sort((x, y) =>
    order.indexOf(byCheck[x][0].severity) - order.indexOf(byCheck[y][0].severity));
  if (checks.length === 0) { console.log('  ✅ nenhuma anomalia'); return; }
  for (const check of checks) {
    const items = byCheck[check];
    const sev = items[0].severity.toUpperCase();
    console.log(`\n  [${sev}] ${check} — ${items.length}`);
    for (const a of items.slice(0, 25)) {
      console.log(`    • ${a.title ? `"${(a.title || '').toString().trim().slice(0, 40)}" ` : ''}${a.detail}`);
    }
    if (items.length > 25) console.log(`    … +${items.length - 25}`);
  }
};

const fetchProd = async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const raw = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: collections, error } = await supabase.from('collections').select('*');
  if (error) throw new Error('collections: ' + error.message);
  let links = [];
  const { data: ld, error: le } = await supabase.from('media_collection_links').select('id, collection_id');
  if (!le) links = ld || [];
  return { collections: collections || [], links };
};

const main = async () => {
  const report = {};

  if (doProd) {
    const { collections, links } = await fetchProd();
    const brandFilter = brandArg === 'all' ? null : BRANDS[brandArg];
    for (const [name, bid] of Object.entries(BRANDS)) {
      if (brandFilter && bid !== brandFilter) continue;
      const subset = collections.filter((c) => c.brand_id === bid);
      const anomalies = audit(subset, { source: `prod:${name}` });
      printReport(`PROD · ${name}`, subset, anomalies);
      report[`prod:${name}`] = anomalies;
    }
    // orphan media links (global)
    const idSet = new Set(collections.map((c) => c.id));
    const orphans = links.filter((l) => !idSet.has(l.collection_id))
      .map((l) => ({ source: 'prod', check: 'orphan-media-link', severity: 'error', id: l.id, detail: `link ${l.id} → coleção inexistente ${l.collection_id}` }));
    if (orphans.length) { printReport('PROD · media_collection_links órfãos', [], [], orphans); report['prod:orphan-links'] = orphans; }
  }

  if (doSeed) {
    const seedPath = path.join(ROOT, 'data', 'catalog.seed.json');
    const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    const cols = seed.collections || [];
    const anomalies = audit(cols, { source: 'seed' });
    printReport('SEED · data/catalog.seed.json', cols, anomalies);
    report['seed'] = anomalies;
  }

  if (jsonOut) {
    fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2), 'utf8');
    console.log(`\n📝 Relatório JSON salvo em: ${jsonOut}`);
  }

  const total = Object.values(report).flat().length;
  console.log(`\n${'─'.repeat(60)}\nTOTAL de anomalias: ${total}\n`);
};

main().catch((e) => { console.error('ERRO:', e.message); process.exit(1); });

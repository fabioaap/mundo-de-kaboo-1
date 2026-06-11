/**
 * dedupe-collection-assets.mjs
 * ----------------------------
 * Limpa assets duplicados dentro do JSONB `collection_assets` das coleções.
 *
 * Causa do problema: quando uma coleção tem dois assets da MESMA categoria
 * primária com URLs diferentes — uma `/temp/` (upload) e uma permanente
 * `collections/{id}/` (promovida) — a UI mostra dois cards para a mesma mídia.
 *
 * O que o script faz (por coleção):
 *   1. Remove duplicatas de URL EXATA (mesma url 2+ vezes), mesclando flags.
 *   2. Em categorias primárias com 2+ assets, resolve o duplicado:
 *      - temp-vs-permanente  → mantém a permanente, remove a(s) temp (alta confiança)
 *      - 2+ permanentes       → mantém a que casa com o campo legado, senão a 1ª (REPORTA)
 *      - só temp              → mantém a 1ª (REPORTA anomalia)
 *   3. Re-deriva os campos legados (audio_url/pdf_url/video_url/extra_materials)
 *      a partir dos assets limpos, apontando para URLs permanentes.
 *
 * NÃO mexe no Storage (não apaga/move arquivos). Assets temp "solitários"
 * (1 por categoria, sem gêmeo) são apenas reportados, não alterados.
 *
 * Uso:
 *   node scripts/dedupe-collection-assets.mjs            # DRY-RUN (não escreve)
 *   node scripts/dedupe-collection-assets.mjs --apply    # aplica as mudanças
 *
 * Requer no .env.local (para --apply, p/ bypassar RLS):
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...
 */

import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const https = require('https');

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const APPLY = process.argv.includes('--apply');

// ─── Categorias e helpers (espelham lib/collectionAssets.ts) ─────────────────
const PRIMARY_CATEGORIES = ['reading', 'storytelling', 'animation', 'accessible_video', 'story_video'];
const LIBRARY_CATEGORIES = ['how_to_play', 'video_lesson', 'formation', 'teacher_guide', 'extra_material'];
// Prioridade para derivar video_url (igual LEGACY_VIDEO_PRIORITY do app)
const LEGACY_VIDEO_PRIORITY = ['animation', 'story_video', 'accessible_video', 'how_to_play', 'video_lesson', 'formation'];

const normalizeUrl = (v) => (v ?? '').trim();
const isTempUrl = (url) => normalizeUrl(url).includes('/temp/');

// ─── Carregar variáveis de ambiente ──────────────────────────────────────────
function loadEnv() {
  const envPath = join(ROOT, '.env.local');
  if (!existsSync(envPath)) throw new Error('.env.local não encontrado em ' + envPath);
  const raw = readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const ANON_KEY = env.VITE_SUPABASE_ANON_KEY;
const SERVICE_ROLE = env.SUPABASE_SERVICE_ROLE_KEY || ANON_KEY;
const USING_SERVICE = SERVICE_ROLE !== ANON_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('❌ VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontrados no .env.local');
  process.exit(1);
}

const HOST = new URL(SUPABASE_URL).hostname;

// ─── Requisição HTTPS (GET/PATCH) ────────────────────────────────────────────
function httpsRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: HOST,
      path,
      method,
      headers: {
        'apikey': SERVICE_ROLE,
        'Authorization': `Bearer ${SERVICE_ROLE}`,
        'Content-Type': 'application/json',
        ...(method === 'PATCH' ? { 'Prefer': 'return=minimal' } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
      timeout: 30000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(Object.assign(new Error(`HTTP ${res.statusCode}`), { statusCode: res.statusCode, body: data }));
        } else {
          try { resolve(data ? JSON.parse(data) : null); }
          catch { resolve(data); }
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

// ─── Lógica de limpeza ────────────────────────────────────────────────────────

// Mescla flags úteis do `donor` no `keeper` sem sobrescrever valores já definidos.
function mergeFlags(keeper, donor) {
  const merged = { ...keeper };
  for (const key of ['is_published', 'offline_available', 'lyrics_url']) {
    if ((merged[key] === undefined || merged[key] === null) && donor[key] !== undefined && donor[key] !== null) {
      merged[key] = donor[key];
    }
  }
  return merged;
}

/**
 * Limpa os assets de uma coleção. Retorna { assets, legacy, report } onde
 * report descreve as ações tomadas (ou [] se nada mudou).
 */
function cleanCollection(collection) {
  const original = Array.isArray(collection.collection_assets) ? collection.collection_assets : [];
  const report = [];

  // ── Passo A: dedup por URL exata ──
  const byUrl = new Map();
  const orderedUrls = [];
  for (const asset of original) {
    const url = normalizeUrl(asset.url);
    if (!url) continue;
    if (byUrl.has(url)) {
      byUrl.set(url, mergeFlags(byUrl.get(url), asset));
      report.push({ type: 'exact_url_dupe', category: asset.category, url });
    } else {
      byUrl.set(url, { ...asset, url });
      orderedUrls.push(url);
    }
  }
  let assets = orderedUrls.map((u) => byUrl.get(u));

  // ── Passo B: colapsar SOMENTE duplicatas temp↔permanente do MESMO arquivo ──
  // A duplicata real é a mesma mídia presente em path /temp/ E em path permanente
  // (mesmo nome de arquivo). Agrupamos por nome de arquivo dentro da categoria e só
  // removemos a versão temp quando existe a permanente do MESMO arquivo.
  //
  // ATENÇÃO: nunca remover assets com nomes de arquivo DIFERENTES. Um kit tem,
  // legitimamente, vários livros (vários `reading`) — colapsar "por categoria"
  // apagaria conteúdo real. Por isso a dedup é por arquivo, não por categoria.
  const fileNameOf = (url) => normalizeUrl(url).split('?')[0].split('#')[0].split('/').pop() || '';
  const toRemove = new Set();
  for (const category of PRIMARY_CATEGORIES) {
    const inCat = assets.filter((a) => a.category === category);
    if (inCat.length <= 1) continue;

    const groups = new Map(); // nome de arquivo -> assets
    for (const a of inCat) {
      const name = fileNameOf(a.url);
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push(a);
    }

    for (const [, group] of groups) {
      if (group.length <= 1) continue;
      const permanents = group.filter((a) => !isTempUrl(a.url));
      const temps = group.filter((a) => isTempUrl(a.url));
      if (permanents.length >= 1 && temps.length >= 1) {
        // Duplicata real: mantém 1 permanente, remove temp(s) e permanentes extras do mesmo arquivo.
        const keeper = permanents[0];
        for (const a of group) if (a !== keeper) toRemove.add(a);
        report.push({
          type: 'temp_vs_permanent', category,
          kept: keeper.url, removed: group.filter((a) => a !== keeper).map((a) => a.url),
        });
      } else {
        // Mesmo nome mas só-temp ou permanentes repetidos: reportar para revisão, NÃO remover.
        report.push({ type: 'SAME_NAME_REVIEW', category, urls: group.map((a) => a.url) });
      }
    }
  }
  assets = assets.filter((a) => !toRemove.has(a));

  // ── Passo 3: re-derivar campos legados ──
  const firstUrl = (cat) => {
    const found = assets.find((a) => a.category === cat && !isTempUrl(a.url))
      || assets.find((a) => a.category === cat);
    return found ? normalizeUrl(found.url) : '';
  };
  const videoUrl = (() => {
    for (const cat of LEGACY_VIDEO_PRIORITY) {
      const u = firstUrl(cat);
      if (u) return u;
    }
    return '';
  })();
  const extraMaterials = Array.from(new Set(
    assets.filter((a) => a.scope === 'library').map((a) => normalizeUrl(a.url)).filter(Boolean)
  ));

  const legacy = {
    pdf_url: firstUrl('reading'),
    audio_url: firstUrl('storytelling'),
    video_url: videoUrl,
    extra_materials: extraMaterials,
  };

  return { assets, legacy, report };
}

// Detecta se houve mudança real entre o estado original e o limpo.
function hasDiff(collection, cleaned) {
  const origAssets = JSON.stringify(collection.collection_assets ?? []);
  const newAssets = JSON.stringify(cleaned.assets);
  if (origAssets !== newAssets) return true;
  if (normalizeUrl(collection.pdf_url) !== cleaned.legacy.pdf_url) return true;
  if (normalizeUrl(collection.audio_url) !== cleaned.legacy.audio_url) return true;
  if (normalizeUrl(collection.video_url) !== cleaned.legacy.video_url) return true;
  const origExtras = JSON.stringify(collection.extra_materials ?? []);
  const newExtras = JSON.stringify(cleaned.legacy.extra_materials);
  if (origExtras !== newExtras) return true;
  return false;
}

// ─── Buscar coleções (paginado) ──────────────────────────────────────────────
async function fetchAllCollections() {
  const PAGE = 1000;
  let all = [];
  let from = 0;
  const cols = 'id,title,collection_assets,audio_url,video_url,pdf_url,extra_materials';
  while (true) {
    const path = `/rest/v1/collections?select=${cols}&limit=${PAGE}&offset=${from}`;
    const data = await httpsRequest('GET', path);
    if (!Array.isArray(data) || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

// ─── Detecta assets temp "solitários" (sem gêmeo permanente) p/ reportar ──────
function lonelyTempAssets(collection) {
  const assets = Array.isArray(collection.collection_assets) ? collection.collection_assets : [];
  const out = [];
  for (const a of assets) {
    if (!isTempUrl(a.url)) continue;
    const hasTwin = assets.some((p) => p.category === a.category && !isTempUrl(p.url));
    if (!hasTwin) out.push({ category: a.category, url: normalizeUrl(a.url) });
  }
  return out;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🧹 Dedupe de collection_assets');
  console.log(`   Host:  ${HOST}`);
  console.log(`   Modo:  ${APPLY ? '⚠️  APPLY (vai escrever no banco)' : '🔍 DRY-RUN (somente leitura)'}`);
  console.log(`   Chave: ${USING_SERVICE ? '✅ service_role' : '⚠️  anon (RLS ativo)'}`);

  if (APPLY && !USING_SERVICE) {
    console.error('\n❌ --apply requer SUPABASE_SERVICE_ROLE_KEY no .env.local (anon é bloqueado por RLS).');
    process.exit(1);
  }
  console.log('');

  const collections = await fetchAllCollections();
  console.log(`📚 ${collections.length} coleções carregadas.\n`);

  let changed = 0;
  let resolvedDupes = 0;
  const review = [];
  const lonely = [];
  let applied = 0;

  for (const collection of collections) {
    const lonelyTemps = lonelyTempAssets(collection);
    if (lonelyTemps.length > 0) {
      lonely.push({ id: collection.id, title: collection.title, assets: lonelyTemps });
    }

    const cleaned = cleanCollection(collection);
    if (cleaned.report.length === 0 && !hasDiff(collection, cleaned)) continue;
    if (!hasDiff(collection, cleaned)) continue;

    changed += 1;
    const dupActions = cleaned.report.filter((r) => r.type === 'temp_vs_permanent');
    resolvedDupes += dupActions.length;
    cleaned.report.filter((r) => r.type === 'SAME_NAME_REVIEW')
      .forEach((r) => review.push({ id: collection.id, title: collection.title, ...r }));

    console.log(`• ${collection.title} (${collection.id})`);
    for (const r of cleaned.report) {
      if (r.type === 'temp_vs_permanent') {
        console.log(`    ✓ [${r.category}] mantém permanente, remove temp:`);
        r.removed.forEach((u) => console.log(`        − ${u}`));
      } else if (r.type === 'exact_url_dupe') {
        console.log(`    ✓ [${r.category}] remove URL exata duplicada: ${r.url}`);
      } else if (r.type === 'SAME_NAME_REVIEW') {
        console.log(`    ⚠️  [${r.category}] mesmo nome de arquivo repetido — revisar (não alterado):`);
        r.urls.forEach((u) => console.log(`        · ${u}`));
      }
    }

    if (APPLY) {
      try {
        await httpsRequest('PATCH', `/rest/v1/collections?id=eq.${collection.id}`, {
          collection_assets: cleaned.assets,
          pdf_url: cleaned.legacy.pdf_url,
          audio_url: cleaned.legacy.audio_url,
          video_url: cleaned.legacy.video_url,
          extra_materials: cleaned.legacy.extra_materials,
        });
        applied += 1;
        console.log('    💾 aplicado');
      } catch (err) {
        console.log(`    ❌ erro ao aplicar: ${err.message}${err.body ? ' — ' + err.body : ''}`);
      }
    }
  }

  // ─── Relatório ───
  console.log('\n─────────────────────────────────────────');
  console.log('📊 Resultado');
  console.log('─────────────────────────────────────────');
  console.log(`  Coleções escaneadas:        ${collections.length}`);
  console.log(`  Coleções com mudança:       ${changed}`);
  console.log(`  Duplicatas temp/permanente: ${resolvedDupes} resolvidas`);
  console.log(`  Mesmo nome (revisar):       ${review.length}`);
  console.log(`  Assets temp solitários:     ${lonely.reduce((n, c) => n + c.assets.length, 0)} (em ${lonely.length} coleções) — não alterados`);
  console.log(`  ${APPLY ? `Aplicadas: ${applied}` : 'DRY-RUN: nada foi escrito'}`);

  if (review.length > 0) {
    console.log('\n  ⚠️  REVISAR (mesmo nome de arquivo repetido — não alterado):');
    review.forEach((a) => console.log(`     - ${a.title} (${a.id}) [${a.category}]`));
  }
  if (lonely.length > 0) {
    console.log('\n  ℹ️  Temp solitários (sem gêmeo; não alterados — corrigidos pela Parte A daqui pra frente):');
    lonely.forEach((c) => c.assets.forEach((a) => console.log(`     - ${c.title} (${c.id}) [${a.category}] ${a.url}`)));
  }
  console.log('─────────────────────────────────────────\n');

  if (!APPLY && changed > 0) {
    console.log('💡 Para aplicar: node scripts/dedupe-collection-assets.mjs --apply');
    console.log('   (faça backup antes: node scripts/backup-kaboo-data.mjs)\n');
  }
}

main().catch((err) => {
  console.error('\n❌ Falhou:', err.message, err.body ? '\n' + err.body : '');
  process.exit(1);
});

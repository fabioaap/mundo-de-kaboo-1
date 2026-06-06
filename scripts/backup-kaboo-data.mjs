/**
 * backup-kaboo-data.mjs
 * ---------------------
 * Exporta todos os dados reais do Supabase (Kaboo / Central Coruja) para
 * arquivos JSON em supabase/backups/<timestamp>/
 *
 * Usa o módulo `https` nativo do Node (evita bug de fetch no Node v24/Windows).
 *
 * Uso:
 *   node scripts/backup-kaboo-data.mjs
 *
 * Para backup completo (bypassa RLS), adicione ao .env.local:
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...
 * (Encontre em: Supabase Dashboard → Project Settings → API → service_role)
 */

import { createRequire } from 'module';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const https   = require('https');

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

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

const env   = loadEnv();
const SUPABASE_URL    = env.VITE_SUPABASE_URL;
const ANON_KEY        = env.VITE_SUPABASE_ANON_KEY;
const SERVICE_ROLE    = env.SUPABASE_SERVICE_ROLE_KEY || ANON_KEY;
const USING_SERVICE   = SERVICE_ROLE !== ANON_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('❌ VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontrados no .env.local');
  process.exit(1);
}

// Extrai hostname a partir da URL (ex: yevysgqlnhonhkczkyhu.supabase.co)
const HOST = new URL(SUPABASE_URL).hostname;

// ─── Requisição HTTPS via módulo nativo ──────────────────────────────────────
function httpsGet(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      path,
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE,
        'Authorization': `Bearer ${SERVICE_ROLE}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact',
      },
      timeout: 30000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(Object.assign(new Error(`HTTP ${res.statusCode}`), { statusCode: res.statusCode, body: data }));
        } else {
          try { resolve(JSON.parse(data)); }
          catch { resolve(data); }
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.end();
  });
}

// ─── Tabelas a exportar ───────────────────────────────────────────────────────
const TABLES = [
  'profiles',
  'collections',
  'collection_resources',
  'characters',
  'vouchers',
  'voucher_models',
  'voucher_model_items',
  'voucher_batches',
  'user_content_grants',
  'user_progress',
  'user_media_progress',
  'user_media_favorites',
  'media_items',
  'media_shelves',
  'media_shelf_items',
  'media_link_health',
  'brands',
  'brand_settings',
  'feature_flags',
  'brand_feature_overrides',
  'feature_flag_audit',
  'brand_admin_memberships',
  'white_label_super_admins',
  'brand_routes',
  'audit_log',
];

// ─── Exportar uma tabela com paginação ────────────────────────────────────────
async function exportTable(tableName, backupDir) {
  process.stdout.write(`  📦 Exportando ${tableName}...`);

  const PAGE_SIZE = 1000;
  let allRows = [];
  let from = 0;

  while (true) {
    const path = `/rest/v1/${tableName}?select=*&limit=${PAGE_SIZE}&offset=${from}`;
    let data;
    try {
      data = await httpsGet(path);
    } catch (err) {
      if (err.statusCode === 404 || (err.body && err.body.includes('relation') && err.body.includes('does not exist'))) {
        console.log(` ⚠️  não existe`);
        return { table: tableName, rows: 0, status: 'missing' };
      }
      if (err.statusCode === 401 || err.statusCode === 403) {
        console.log(` 🔒 RLS bloqueado`);
        return { table: tableName, rows: 0, status: 'rls_blocked' };
      }
      throw err;
    }

    if (!Array.isArray(data) || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  writeFileSync(join(backupDir, `${tableName}.json`), JSON.stringify(allRows, null, 2), 'utf8');
  console.log(` ✅ ${allRows.length} registros`);
  return { table: tableName, rows: allRows.length, status: 'ok' };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = join(ROOT, 'supabase', 'backups', ts);

  console.log('\n🔐 Backup do Supabase Kaboo');
  console.log(`   Host:    ${HOST}`);
  console.log(`   Destino: supabase/backups/${ts}/`);
  console.log(`   Chave:   ${USING_SERVICE ? '✅ service_role (backup completo)' : '⚠️  anon key — RLS ativo (apenas dados públicos)'}`);
  if (!USING_SERVICE) {
    console.log('\n   💡 Para backup completo, adicione ao .env.local:');
    console.log('      SUPABASE_SERVICE_ROLE_KEY=eyJ...');
    console.log('      (Supabase Dashboard → Project Settings → API → service_role)\n');
  }
  console.log('');

  mkdirSync(backupDir, { recursive: true });

  const results = [];
  let totalRows = 0;

  for (const table of TABLES) {
    try {
      const result = await exportTable(table, backupDir);
      results.push(result);
      totalRows += result.rows;
    } catch (err) {
      console.log(` ❌ ERRO: ${err.message}`);
      results.push({ table, rows: 0, status: 'error', error: err.message });
    }
  }

  // Manifesto
  const manifest = {
    timestamp: new Date().toISOString(),
    supabase_url: SUPABASE_URL,
    project_ref: HOST.split('.')[0],
    key_type: USING_SERVICE ? 'service_role' : 'anon',
    backup_dir: `supabase/backups/${ts}`,
    total_tables_exported: results.filter(r => r.status === 'ok').length,
    total_rows: totalRows,
    tables: results,
  };

  writeFileSync(join(backupDir, '_manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  const ok      = results.filter(r => r.status === 'ok');
  const missing = results.filter(r => r.status === 'missing');
  const blocked = results.filter(r => r.status === 'rls_blocked');
  const errors  = results.filter(r => r.status === 'error');

  console.log('\n─────────────────────────────────────────');
  console.log('📊 Resultado');
  console.log('─────────────────────────────────────────');
  console.log(`  ✅ Exportadas: ${ok.length} tabelas · ${totalRows} registros`);
  if (missing.length > 0) console.log(`  ⚠️  Não existem: ${missing.map(r => r.table).join(', ')}`);
  if (blocked.length > 0) console.log(`  🔒 Bloqueadas:  ${blocked.map(r => r.table).join(', ')}`);
  if (errors.length > 0)  console.log(`  ❌ Erros:       ${errors.map(r => r.table).join(', ')}`);
  console.log(`  📁 Pasta: supabase/backups/${ts}/`);
  console.log('─────────────────────────────────────────\n');
}

main().catch(err => {
  console.error('\n❌ Backup falhou:', err.message);
  process.exit(1);
});

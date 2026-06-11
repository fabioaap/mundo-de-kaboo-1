/**
 * backup-collections.mjs
 *
 * Dump full `collections` rows (service-role, bypasses RLS) to a JSON file.
 * Safety snapshot to run BEFORE any data mutation in production.
 *
 * Usage:
 *   node scripts/backup-collections.mjs <outFile> <id1> [id2 ...]
 *   node scripts/backup-collections.mjs <outFile> --all-kaboo
 *
 * Reads VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const KABOO_BRAND_ID = '296eab71-e45b-47f3-af69-9409d3985c5b';

const parseEnv = () => {
  const raw = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
};

const main = async () => {
  const [outFile, ...rest] = process.argv.slice(2);
  if (!outFile || rest.length === 0) {
    console.error('Uso: node scripts/backup-collections.mjs <outFile> <id...|--all-kaboo>');
    process.exit(1);
  }

  const env = parseEnv();
  const url = env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Faltam VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  let query = supabase.from('collections').select('*');
  query = rest.includes('--all-kaboo')
    ? query.eq('brand_id', KABOO_BRAND_ID)
    : query.in('id', rest);

  const { data, error } = await query;
  if (error) {
    console.error('Erro na consulta:', error.message);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✅ Backup de ${data.length} coleções salvo em:\n   ${outFile}`);
};

main();

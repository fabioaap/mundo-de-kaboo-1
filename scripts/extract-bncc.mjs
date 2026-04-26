#!/usr/bin/env node
/**
 * extract-bncc.mjs
 * Extrai dados da BNCC (EF + EI) de planilha XLSX para JSON de lookup.
 */
import XLSX from 'xlsx';
const { readFile, utils } = XLSX;
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const XLSX_PATH = path.join(ROOT, 'docs', 'BNCC (1).xlsx');
const OUT_DIR = path.join(ROOT, 'data');
const OUT_PATH = path.join(OUT_DIR, 'bncc-lookup.json');

// ── helpers ──────────────────────────────────────────────
function clean(v) {
  if (v == null) return '';
  return String(v).trim();
}

function findCol(headers, ...candidates) {
  for (const c of candidates) {
    const lc = c.toLowerCase();
    const found = headers.find(h => h && h.toLowerCase().includes(lc));
    if (found) return found;
  }
  return null;
}

// ── main ─────────────────────────────────────────────────
const wb = readFile(XLSX_PATH);
console.log('Abas encontradas:', wb.SheetNames.join(', '));

const lookup = {};

// ── BNCC_EF ──────────────────────────────────────────────
function extractEF() {
  const ws = wb.Sheets['BNCC_EF'];
  if (!ws) { console.warn('Aba BNCC_EF não encontrada'); return; }
  const rows = utils.sheet_to_json(ws, { defval: '' });
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const colCode       = findCol(headers, 'Código', 'Codigo', 'Code');
  const colComponent  = findCol(headers, 'Componente curricular', 'Componente');
  const colYear       = findCol(headers, 'Ano');
  const colThematic   = findCol(headers, 'Unidade temática', 'Unidade tematica');
  const colFields     = findCol(headers, 'Campos de Atuação', 'Campos de atuacao');
  const colPractices  = findCol(headers, 'Práticas de Linguagem', 'Praticas');
  const colKnowledge  = findCol(headers, 'Objetos do conhecimento', 'Objetos de conhecimento', 'Objeto');
  const colSkill      = findCol(headers, 'Habilidade');
  console.log(`BNCC_EF: ${rows.length} linhas, colunas: ${headers.join(', ')}`);

  for (const r of rows) {
    const code = clean(colCode ? r[colCode] : '');
    if (!code) continue;

    lookup[code] = {
      code,
      description: clean(colSkill ? r[colSkill] : ''),
      component: clean(colComponent ? r[colComponent] : ''),
      year: clean(colYear ? r[colYear] : ''),
      thematic_unit: clean(colThematic ? r[colThematic] : ''),
      knowledge_object: clean(colKnowledge ? r[colKnowledge] : ''),
      stage: 'EF',
    };
  }
}

// ── BNCC_EI ──────────────────────────────────────────────
function extractEI() {
  const ws = wb.Sheets['BNCC_EI'];
  if (!ws) { console.warn('Aba BNCC_EI não encontrada'); return; }
  const rows = utils.sheet_to_json(ws, { defval: '' });
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  console.log(`BNCC_EI: ${rows.length} linhas, colunas: ${headers.join(', ')}`);

  const colField   = findCol(headers, 'Campo de experiência', 'Campo de experiencias');
  const colAge     = findCol(headers, 'Faixa', 'Idade', 'Grupo', 'Etária');
  const colObj     = findCol(headers, 'Objetivos de aprendizagem', 'Objetivo', 'Habilidade');
  const codeRe     = /\(([A-Z]{2}\d{2}[A-Z]{2}\d{2})\)/;

  for (const r of rows) {
    const rawObj = clean(colObj ? r[colObj] : '');
    const m = rawObj.match(codeRe);
    if (!m) continue;
    const code = m[1];
    // description: texto após o código, sem quebra de linha extra
    const desc = rawObj.replace(codeRe, '').replace(/\s+/g, ' ').trim();

    lookup[code] = {
      code,
      description: desc,
      component: clean(colField ? r[colField] : ''),
      year: clean(colAge ? r[colAge] : ''),
      thematic_unit: '',
      knowledge_object: '',
      stage: 'EI',
    };
  }
}

extractEF();
extractEI();

// ── salvar ───────────────────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true });

// Remove code prefix from descriptions to save space
for (const entry of Object.values(lookup)) {
  entry.description = entry.description
    .replace(/^\([A-Z]{2}\d{2}[A-Z]{2,4}\d{2,4}\)\s*/, '')
    .trim();
  // Truncate very long descriptions (>200 chars)
  if (entry.description.length > 200) {
    entry.description = entry.description.slice(0, 197) + '...';
  }
  // Drop empty optional fields
  if (!entry.thematic_unit) delete entry.thematic_unit;
  if (!entry.knowledge_object) delete entry.knowledge_object;
  // code is already the key; remove from value to save space
  delete entry.code;
}

const json = JSON.stringify(lookup);
writeFileSync(OUT_PATH, json, 'utf-8');

const count = Object.keys(lookup).length;
const sizeKB = (Buffer.byteLength(json) / 1024).toFixed(1);
console.log(`\n✔ ${count} entradas salvas em ${OUT_PATH} (${sizeKB} KB)`);

// amostra
const sample = Object.values(lookup)[0];
if (sample) {
  console.log('\nExemplo de entrada:');
  console.log(JSON.stringify(sample, null, 2));
}

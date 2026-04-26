#!/usr/bin/env node
/**
 * update-feature-status.mjs
 * ──────────────────────────────────────────────────────────────────────────
 * Gerencia o status de features do produto Central Coruja / Mundo de Kaboo.
 *
 * Usos:
 *   node scripts/update-feature-status.mjs                          → lista todas as features
 *   node scripts/update-feature-status.mjs --list                   → lista com filtro
 *   node scripts/update-feature-status.mjs --list --status pending  → filtra por status
 *   node scripts/update-feature-status.mjs --done <id>              → marca como entregue
 *   node scripts/update-feature-status.mjs --partial <id>           → marca como parcial
 *   node scripts/update-feature-status.mjs --note <id> "texto"      → adiciona nota
 *   node scripts/update-feature-status.mjs --generate               → regera o markdown
 *   node scripts/update-feature-status.mjs --help                   → ajuda
 *
 * O arquivo fonte é scripts/feature-status.json.
 * O markdown gerado é docs/STATUS-FEATURES.md.
 * ──────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATA_FILE = resolve(__dirname, 'feature-status.json');
const OUTPUT_MD  = resolve(ROOT, 'docs', 'STATUS-FEATURES.md');

// ── helpers de cor (terminal) ──────────────────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  dim:    '\x1b[2m',
};

function statusEmoji(status) {
  return status === 'done' ? '✅' : status === 'partial' ? '🟡' : '🔴';
}
function statusLabel(status) {
  return status === 'done' ? 'Entregue' : status === 'partial' ? 'Parcial' : 'Pendente';
}
function statusColor(status) {
  return status === 'done' ? c.green : status === 'partial' ? c.yellow : c.red;
}

// ── leitura/escrita do JSON ────────────────────────────────────────────────
function loadData() {
  return JSON.parse(readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
  data._meta.lastUpdated = today();
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// ── busca de feature por id (parcial ok) ──────────────────────────────────
function findFeature(data, id) {
  for (const cat of data.categories) {
    for (const feat of cat.features) {
      if (feat.id === id || feat.id.includes(id)) return { feat, cat };
    }
  }
  return null;
}

function allFeatures(data) {
  return data.categories.flatMap(cat =>
    cat.features.map(feat => ({ feat, cat }))
  );
}

// ── cálculo de score executivo ─────────────────────────────────────────────
function computeScore(data) {
  const all     = allFeatures(data);
  const done    = all.filter(f => f.feat.status === 'done').length;
  const partial = all.filter(f => f.feat.status === 'partial').length;
  const pending = all.filter(f => f.feat.status === 'pending').length;
  const total   = all.length;
  const pct     = Math.round(((done + partial * 0.5) / total) * 100);
  return { done, partial, pending, total, pct };
}

// ── geração do markdown ───────────────────────────────────────────────────
function generateMarkdown(data) {
  const score = computeScore(data);
  const lines = [];

  lines.push('# Status de Features — Central Coruja / Mundo de Kaboo');
  lines.push('');
  lines.push(`> Gerado automaticamente por \`scripts/update-feature-status.mjs\``);
  lines.push(`> Última atualização: **${data._meta.lastUpdated}** · atualizado por: ${data._meta.updatedBy}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Placar geral');
  lines.push('');
  lines.push(`| Status | Qtd | % |`);
  lines.push(`|--------|-----|---|`);
  lines.push(`| ✅ Entregue | ${score.done} | — |`);
  lines.push(`| 🟡 Parcial  | ${score.partial} | — |`);
  lines.push(`| 🔴 Pendente | ${score.pending} | — |`);
  lines.push(`| **Total**   | **${score.total}** | **${score.pct}% entregue** |`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const cat of data.categories) {
    lines.push(`## ${cat.label}`);
    lines.push('');
    lines.push('| Feature | Status | Versão | Entregue em | Notas |');
    lines.push('|---------|--------|--------|-------------|-------|');

    for (const feat of cat.features) {
      const emoji   = statusEmoji(feat.status);
      const label   = statusLabel(feat.status);
      const version = feat.version ?? '—';
      const date    = feat.deliveredAt ?? '—';
      const notes   = feat.notes.length > 0 ? feat.notes.join('; ') : '—';
      lines.push(`| ${feat.name} | ${emoji} ${label} | ${version} | ${date} | ${notes} |`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('## Próximos passos críticos');
  lines.push('');
  lines.push('> Features com `status: pending` em `v1.3` são o caminho de crítico para Go To Market real:');
  lines.push('');

  const nextUp = allFeatures(data)
    .filter(f => f.feat.status !== 'done' && f.feat.version !== 'v2.0')
    .map(f => `- **${f.feat.name}** (\`${f.feat.id}\`) — ${f.feat.version}` +
      (f.feat.notes.length ? `: ${f.feat.notes[0]}` : ''));

  lines.push(...nextUp);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('_Este arquivo é gerado automaticamente. Para atualizar, use `node scripts/update-feature-status.mjs`._');
  lines.push('');

  return lines.join('\n');
}

// ── comandos CLI ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);

function printHelp() {
  console.log(`
${c.bold}update-feature-status.mjs${c.reset} — Gerenciador de status de produto

${c.bold}Comandos:${c.reset}
  ${c.cyan}--list${c.reset}                       Lista todas as features
  ${c.cyan}--list --status <done|partial|pending>${c.reset}  Filtra por status
  ${c.cyan}--done <id>${c.reset}                  Marca feature como entregue
  ${c.cyan}--partial <id>${c.reset}               Marca feature como parcial
  ${c.cyan}--pending <id>${c.reset}               Reverte feature para pendente
  ${c.cyan}--note <id> "texto"${c.reset}          Adiciona nota à feature
  ${c.cyan}--version <id> v1.3${c.reset}          Define a versão alvo da feature
  ${c.cyan}--generate${c.reset}                   Regera docs/STATUS-FEATURES.md
  ${c.cyan}--score${c.reset}                      Mostra placar executivo
  ${c.cyan}--help${c.reset}                       Mostra esta ajuda

${c.bold}Exemplos:${c.reset}
  node scripts/update-feature-status.mjs --done assinatura-digital --note "Integrado via Stripe"
  node scripts/update-feature-status.mjs --list --status pending
  node scripts/update-feature-status.mjs --generate
`);
}

function cmdList(data, filterStatus) {
  console.log('');
  for (const cat of data.categories) {
    const feats = filterStatus
      ? cat.features.filter(f => f.status === filterStatus)
      : cat.features;
    if (feats.length === 0) continue;

    console.log(`${c.bold}${cat.label}${c.reset}`);
    for (const feat of feats) {
      const col   = statusColor(feat.status);
      const emoji = statusEmoji(feat.status);
      console.log(
        `  ${emoji}  ${col}${feat.name}${c.reset}` +
        `  ${c.dim}[${feat.id}]${c.reset}` +
        `  ${c.dim}${feat.version ?? ''}${c.reset}`
      );
      if (feat.notes.length) {
        feat.notes.forEach(n => console.log(`       ${c.dim}→ ${n}${c.reset}`));
      }
    }
    console.log('');
  }
}

function cmdScore(data) {
  const s = computeScore(data);
  console.log(`
${c.bold}Placar executivo — ${data._meta.lastUpdated}${c.reset}
  ${c.green}✅ Entregue:${c.reset}  ${s.done}
  ${c.yellow}🟡 Parcial:${c.reset}   ${s.partial}
  ${c.red}🔴 Pendente:${c.reset}  ${s.pending}
  ────────────────
  Total:       ${s.total} features
  Progresso:   ${c.bold}${s.pct}%${c.reset}
`);
}

function cmdChangeStatus(data, id, newStatus, inlineNote) {
  const result = findFeature(data, id);
  if (!result) {
    console.error(`${c.red}Feature "${id}" não encontrada.${c.reset}`);
    cmdList(data, null);
    process.exit(1);
  }
  const { feat } = result;
  const old = feat.status;
  feat.status = newStatus;
  if (newStatus === 'done' && !feat.deliveredAt) {
    feat.deliveredAt = today();
  }
  if (inlineNote) {
    feat.notes.push(`[${today()}] ${inlineNote}`);
  }
  saveData(data);
  console.log(
    `${c.green}✓${c.reset} ${feat.name}` +
    `  ${statusEmoji(old)} → ${statusEmoji(newStatus)}` +
    (inlineNote ? `\n  nota: ${inlineNote}` : '')
  );
}

function cmdAddNote(data, id, note) {
  const result = findFeature(data, id);
  if (!result) {
    console.error(`${c.red}Feature "${id}" não encontrada.${c.reset}`);
    process.exit(1);
  }
  const { feat } = result;
  feat.notes.push(`[${today()}] ${note}`);
  saveData(data);
  console.log(`${c.green}✓${c.reset} Nota adicionada a "${feat.name}": ${note}`);
}

function cmdSetVersion(data, id, version) {
  const result = findFeature(data, id);
  if (!result) {
    console.error(`${c.red}Feature "${id}" não encontrada.${c.reset}`);
    process.exit(1);
  }
  const { feat } = result;
  feat.version = version;
  saveData(data);
  console.log(`${c.green}✓${c.reset} Versão de "${feat.name}" atualizada para ${version}`);
}

function cmdGenerate(data) {
  const md = generateMarkdown(data);
  writeFileSync(OUTPUT_MD, md, 'utf8');
  const score = computeScore(data);
  console.log(`${c.green}✓${c.reset} docs/STATUS-FEATURES.md gerado (${score.total} features, ${score.pct}% entregue)`);
}

// ── dispatch ──────────────────────────────────────────────────────────────
if (args.includes('--help') || args.length === 0) {
  printHelp();
  const data = loadData();
  cmdScore(data);
  process.exit(0);
}

const data = loadData();

if (args.includes('--score')) {
  cmdScore(data);
  process.exit(0);
}

if (args.includes('--list')) {
  const statusIdx = args.indexOf('--status');
  const filter    = statusIdx !== -1 ? args[statusIdx + 1] : null;
  cmdList(data, filter);
  cmdScore(data);
  process.exit(0);
}

if (args.includes('--generate')) {
  cmdGenerate(data);
  process.exit(0);
}

// --done / --partial / --pending (com --note opcional inline)
for (const flag of ['--done', '--partial', '--pending']) {
  if (args.includes(flag)) {
    const id      = args[args.indexOf(flag) + 1];
    const noteIdx = args.indexOf('--note');
    const note    = noteIdx !== -1 && args[noteIdx + 1] !== id
      ? args[noteIdx + 1]
      : null;
    const newStatus = flag.slice(2); // 'done' | 'partial' | 'pending'
    cmdChangeStatus(data, id, newStatus, note);
    cmdGenerate(data);
    process.exit(0);
  }
}

// --note isolado
if (args.includes('--note')) {
  const id   = args[args.indexOf('--note') + 1];
  const note = args[args.indexOf('--note') + 2];
  if (!id || !note) {
    console.error(`${c.red}Uso: --note <id> "texto da nota"${c.reset}`);
    process.exit(1);
  }
  cmdAddNote(data, id, note);
  cmdGenerate(data);
  process.exit(0);
}

// --version
if (args.includes('--version')) {
  const id      = args[args.indexOf('--version') + 1];
  const version = args[args.indexOf('--version') + 2];
  cmdSetVersion(data, id, version);
  cmdGenerate(data);
  process.exit(0);
}

printHelp();

#!/usr/bin/env node
/**
 * update-sprint-chart.mjs
 *
 * Regenera o gráfico ASCII de progresso da sprint no documento Markdown.
 *
 * Uso:
 *   node scripts/update-sprint-chart.mjs
 *
 * Para marcar uma story como concluída:
 *   1. Edite docs/stories/sprint-progress.json
 *   2. Altere "status": "pending"  →  "status": "done"
 *   3. Preencha "batch" e "commit" correspondentes
 *   4. Execute:  node scripts/update-sprint-chart.mjs
 *
 * Status válidos: "done" | "in-progress" | "pending"
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const PROGRESS_PATH   = join(ROOT, 'docs', 'stories', 'sprint-progress.json');
const SPRINT_DOC_PATH = join(ROOT, 'docs', 'stories', 'sprint-quality-improvements.md');
const CHART_START     = '<!-- PROGRESS-CHART:START -->';
const CHART_END       = '<!-- PROGRESS-CHART:END -->';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Barra de progresso ASCII de largura fixa */
function bar(done, total, width = 38) {
  if (total === 0) return '░'.repeat(width);
  const filled = Math.round((done / total) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

/** Percentual fixo em 4 chars (ex: " 69%", "100%") */
function pct(done, total) {
  if (total === 0) return '  0%';
  return `${Math.round((done / total) * 100)}%`.padStart(4);
}

/** Linha de story alinhada */
function storyRow(s) {
  const icon  = s.status === 'done' ? 'x' : s.status === 'in-progress' ? '~' : ' ';
  const batch = s.batch ? `batch ${s.batch}` : 'pendente';
  let   title = s.title;
  if (title.length > 32) title = title.slice(0, 29) + '...';
  return (
    '  ' +
    s.id.padEnd(15) +
    '  ' +
    title.padEnd(32) +
    '  ' +
    `[${icon}]` +
    '  ' +
    batch
  );
}

// ─── Gerador do gráfico ──────────────────────────────────────────────────────

function generateChart(data) {
  const { stories, sprint, branch, updatedAt } = data;

  const byPriority = (p)  => stories.filter(s => s.priority === p);
  const countDone  = (arr) => arr.filter(s => s.status === 'done').length;

  const must   = byPriority('must');
  const should = byPriority('should');
  const could  = byPriority('could');

  const mustDone   = countDone(must);
  const shouldDone = countDone(should);
  const couldDone  = countDone(could);
  const totalDone  = mustDone + shouldDone + couldDone;
  const total      = stories.length;

  const batches = [
    ...new Set(stories.filter(s => s.batch).map(s => `batch ${s.batch}`))
  ].join(' + ');

  // Largura interna da caixa (entre os ║)
  const W   = 74;
  const TOP    = `╔${'═'.repeat(W)}╗`;
  const DIV    = `╠${'═'.repeat(W)}╣`;
  const BOTTOM = `╚${'═'.repeat(W)}╝`;

  /** Envolve conteúdo na caixa, trunca ou preenche até W */
  const box = (content = '') => {
    const s = content.length > W ? content.slice(0, W) : content.padEnd(W);
    return `║${s}║`;
  };

  /** Linha de progresso com rótulo + barra + contador */
  const progressLine = (label, done, tot) => {
    const b      = bar(done, tot);
    const suffix = `  ${done}/${tot}  ${pct(done, tot)}`;
    return box(`  ${label}  ${b}${suffix}`);
  };

  const lines = [
    TOP,
    box(`  SPRINT : ${sprint}`),
    box(`  Branch : ${branch}   |   Atualizado: ${updatedAt}`),
    DIV,
    box(),
    progressLine('[MUST HAVE]  ', mustDone,   must.length),
    box(),
    ...must.map(s => box(storyRow(s))),
    box(),
    DIV,
    box(),
    progressLine('[SHOULD HAVE]', shouldDone, should.length),
    box(),
    ...should.map(s => box(storyRow(s))),
    box(),
    DIV,
    box(),
    progressLine('[COULD HAVE] ', couldDone,  could.length),
    box(),
    ...could.map(s => box(storyRow(s))),
    box(),
    DIV,
    progressLine('GERAL        ', totalDone,  total),
    BOTTOM,
    '',
    `  Legenda : [x] Concluido  [~] Em andamento  [ ] Pendente`,
    `  Commits : ${batches || 'nenhum ainda'}`,
  ];

  return lines.join('\n');
}

// ─── Main ────────────────────────────────────────────────────────────────────

const data = JSON.parse(readFileSync(PROGRESS_PATH, 'utf8'));

// Atualiza timestamp no JSON antes de salvar
data.updatedAt = new Date().toISOString().slice(0, 10);
writeFileSync(PROGRESS_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');

// Gera o bloco do gráfico
const chart = generateChart(data);
const block = `${CHART_START}\n\`\`\`\n${chart}\n\`\`\`\n${CHART_END}`;

// Lê o documento da sprint
let doc = readFileSync(SPRINT_DOC_PATH, 'utf8');

if (doc.includes(CHART_START) && doc.includes(CHART_END)) {
  // Substitui o bloco existente
  const before = doc.slice(0, doc.indexOf(CHART_START));
  const after  = doc.slice(doc.indexOf(CHART_END) + CHART_END.length);
  doc = before + block + after;
} else {
  // Insere após o primeiro separador '---'
  const sepIdx = doc.indexOf('\n---\n');
  if (sepIdx !== -1) {
    doc = doc.slice(0, sepIdx + 5) + '\n\n' + block + '\n' + doc.slice(sepIdx + 5);
  } else {
    doc = block + '\n\n' + doc;
  }
}

writeFileSync(SPRINT_DOC_PATH, doc, 'utf8');

const done = data.stories.filter(s => s.status === 'done').length;
console.log(`✅  Grafico atualizado em:`);
console.log(`    ${SPRINT_DOC_PATH}`);
console.log(`    ${done}/${data.stories.length} stories concluidas (${Math.round((done / data.stories.length) * 100)}%)`);

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const VIDEO_DIR = process.env.CENTRAL_CORUJA_VIDEO_DIR
  || path.join(process.cwd(), 'tests', 'fixtures', 'central-coruja-videos');

const repoRoot = process.cwd();
const artifactRoot = path.join(repoRoot, '.gstack', 'qa-reports', 'central-coruja-video-jtbd');
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const runDir = path.join(artifactRoot, runId);

const ensureDir = (dirPath) => fs.mkdirSync(dirPath, { recursive: true });

const listVideos = () => {
  const indexPath = path.join(VIDEO_DIR, 'index.json');
  const raw = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  return raw
    .sort((a, b) => a.version - b.version)
    .map((item, index) => ({ ...item, batchTag: index % 2 === 0 ? 'batch-a' : 'batch-b' }));
};

const runPlaywrightBatch = (batchTag) =>
  new Promise((resolve) => {
    const reportDir = path.join(runDir, 'playwright-report', batchTag);
    const outputDir = path.join(runDir, 'test-results', batchTag);
    ensureDir(reportDir);
    ensureDir(outputDir);

    const childEnv = Object.fromEntries(
      Object.entries({ ...process.env, CENTRAL_CORUJA_VIDEO_DIR: VIDEO_DIR, CENTRAL_CORUJA_VIDEO_RUN_DIR: runDir, PLAYWRIGHT_HTML_OUTPUT_DIR: reportDir })
        .filter(([, v]) => v != null),
    );

    const command = [
      'npx', 'playwright', 'test',
      'tests/central-coruja-video-jtbd.spec.ts',
      '--config', 'playwright.config.ts',
      '--grep', `@${batchTag}`,
      '--workers=1',
      '--output', `"${outputDir}"`,
    ].join(' ');

    const child = spawn(command, [], { cwd: repoRoot, stdio: 'inherit', env: childEnv, shell: true });
    child.on('exit', (code) => resolve({ batchTag, code: code ?? 1 }));
  });

const writeSummary = (manifest, batchResults) => {
  const batchJsonFiles = ['batch-a.json', 'batch-b.json']
    .map((f) => path.join(runDir, f))
    .filter((f) => fs.existsSync(f));
  const batchReports = batchJsonFiles.map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
  const findings = [];
  batchReports.forEach((r) => r.findings.forEach((f) => { if (!findings.some((e) => e.id === f.id)) findings.push(f); }));
  const videos = batchReports.flatMap((r) => r.processedVideos);

  const summary = { runId, runDir, sourceDirectory: VIDEO_DIR, totalVideos: manifest.length, batches: batchResults, processedVideos: videos, findings };
  fs.writeFileSync(path.join(runDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(runDir, 'summary.json'), JSON.stringify(summary, null, 2));

  const findingsMd = findings.length > 0
    ? findings.map((f, i) => `${i + 1}. **${f.severity.toUpperCase()}** - ${f.summary}. ${f.evidence}`).join('\n')
    : '1. Nenhum atrito relevante consolidado.';
  const videosMd = videos.map((v) => `| ${v.fileName} | ${v.displayTitle} | ${v.segment} | ${v.createdInAdmin ? 'sim' : 'nao'} | ${v.visibleInPublicVideos ? 'sim' : 'nao'} |`).join('\n');
  const batchMd = batchResults.map((b) => `- ${b.batchTag}: ${b.code === 0 ? 'ok' : `falhou (${b.code})`}`).join('\n');

  fs.writeFileSync(path.join(runDir, 'summary.md'), [
    '# Central Coruja - JTBD de cadastro de v\u00eddeos',
    '',
    `- Run dir: ${runDir}`,
    `- Diret\u00f3rio fonte: ${VIDEO_DIR}`,
    `- V\u00eddeos mapeados: ${manifest.length}`,
    '- Execu\u00e7\u00e3o paralela: 2 lotes Playwright (batch-a e batch-b)',
    '',
    '## Status dos lotes',
    '',
    batchMd,
    '',
    '## V\u00eddeos processados',
    '',
    '| Arquivo | Titulo | Segmento | Criado no admin | Vis\u00edvel em V\u00eddeos |',
    '| --- | --- | --- | --- | --- |',
    videosMd,
    '',
    '## Atritos de UX consolidados',
    '',
    findingsMd,
    '',
  ].join('\n'));
};

async function main() {
  ensureDir(runDir);
  if (!fs.existsSync(VIDEO_DIR)) throw new Error(`Diret\u00f3rio de v\u00eddeos n\u00e3o encontrado: ${VIDEO_DIR}`);
  const manifest = listVideos();
  if (manifest.length === 0) throw new Error(`Nenhum v\u00eddeo encontrado em: ${VIDEO_DIR}`);

  console.log(`[central-coruja-video-jtbd] Fonte: ${VIDEO_DIR}`);
  console.log(`[central-coruja-video-jtbd] Run dir: ${runDir}`);
  console.log(`[central-coruja-video-jtbd] V\u00eddeos: ${manifest.length}`);

  const batchResults = await Promise.all([runPlaywrightBatch('batch-a'), runPlaywrightBatch('batch-b')]);
  writeSummary(manifest, batchResults);

  const failed = batchResults.find((b) => b.code !== 0);
  if (failed) { process.exitCode = failed.code; return; }
  console.log(`[central-coruja-video-jtbd] Resumo: ${path.join(runDir, 'summary.md')}`);
}

main().catch((err) => { console.error('[central-coruja-video-jtbd] Falha fatal:', err); process.exitCode = 1; });

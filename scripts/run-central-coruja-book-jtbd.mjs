import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const BOOK_DIR = process.env.CENTRAL_CORUJA_BOOK_DIR
  || path.join(process.cwd(), 'tests', 'fixtures', 'central-coruja-books');

const repoRoot = process.cwd();
const artifactRoot = path.join(repoRoot, '.gstack', 'qa-reports', 'central-coruja-book-jtbd');
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const runDir = path.join(artifactRoot, runId);

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

const titleCase = (value) =>
  value
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');

const toDisplayTitle = (fileName) =>
  titleCase(
    fileName
      .replace(/\.pdf$/i, '')
      .replace(/^v\d+_/i, '')
      .replace(/_modoleitura$/i, '')
      .replace(/[_-]+/g, ' ')
      .trim(),
  );

const getVersion = (fileName) => {
  const match = fileName.match(/^v(\d+)_/i);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
};

const listBooks = () =>
  fs
    .readdirSync(BOOK_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.pdf$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => getVersion(left) - getVersion(right))
    .map((fileName, index) => ({
      batchTag: index % 2 === 0 ? 'batch-a' : 'batch-b',
      fileName,
      absolutePath: path.join(BOOK_DIR, fileName),
      displayTitle: toDisplayTitle(fileName),
      version: getVersion(fileName),
      segment: index % 2 === 0 ? 'Educação Infantil' : 'Fundamental I',
    }));

const runPlaywrightBatch = (batchTag) =>
  new Promise((resolve) => {
    const reportDir = path.join(runDir, 'playwright-report', batchTag);
    const outputDir = path.join(runDir, 'test-results', batchTag);
    ensureDir(reportDir);
    ensureDir(outputDir);
    const childEnv = Object.fromEntries(
      Object.entries({
        ...process.env,
        CENTRAL_CORUJA_BOOK_DIR: BOOK_DIR,
        CENTRAL_CORUJA_BOOK_RUN_DIR: runDir,
        PLAYWRIGHT_HTML_OUTPUT_DIR: reportDir,
      }).filter(([, value]) => value !== undefined && value !== null),
    );

    const command = [
      'npx',
      'playwright',
      'test',
      'tests/central-coruja-book-jtbd.spec.ts',
      '--config',
      'playwright.config.ts',
      '--grep',
      `@${batchTag}`,
      '--workers=1',
      '--output',
      `"${outputDir}"`,
    ].join(' ');

    const child = spawn(command, [], {
      cwd: repoRoot,
      stdio: 'inherit',
      env: childEnv,
      shell: true,
    });

    child.on('exit', (code) => {
      resolve({ batchTag, code: code ?? 1 });
    });
  });

const writeSummary = (manifest, batchResults) => {
  const batchJsonFiles = ['batch-a.json', 'batch-b.json']
    .map((fileName) => path.join(runDir, fileName))
    .filter((filePath) => fs.existsSync(filePath));
  const batchReports = batchJsonFiles.map((filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8')));
  const combinedFindings = [];

  batchReports.forEach((report) => {
    report.findings.forEach((finding) => {
      if (!combinedFindings.some((current) => current.id === finding.id)) {
        combinedFindings.push(finding);
      }
    });
  });

  const combinedBooks = batchReports.flatMap((report) => report.processedBooks);
  const summary = {
    runId,
    runDir,
    sourceDirectory: BOOK_DIR,
    totalBooks: manifest.length,
    batches: batchResults,
    processedBooks: combinedBooks,
    findings: combinedFindings,
  };

  fs.writeFileSync(path.join(runDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(runDir, 'summary.json'), JSON.stringify(summary, null, 2));

  const findingsMarkdown = combinedFindings.length > 0
    ? combinedFindings.map((finding, index) => `${index + 1}. **${finding.severity.toUpperCase()}** - ${finding.summary}. ${finding.evidence}`).join('\n')
    : '1. Nenhum atrito relevante consolidado.';
  const booksMarkdown = combinedBooks
    .map((book) => `| ${book.fileName} | ${book.displayTitle} | ${book.segment} | ${book.createdInAdmin ? 'sim' : 'nao'} | ${book.visibleInPublicBooks ? 'sim' : 'nao'} |`)
    .join('\n');
  const batchStatusMarkdown = batchResults
    .map((batch) => `- ${batch.batchTag}: ${batch.code === 0 ? 'ok' : `falhou (${batch.code})`}`)
    .join('\n');

  fs.writeFileSync(
    path.join(runDir, 'summary.md'),
    [
      '# Central Coruja - JTBD de cadastro de livros',
      '',
      `- Run dir: ${runDir}`,
      `- Diretório fonte: ${BOOK_DIR}`,
      `- PDFs mapeados: ${manifest.length}`,
      '- Execução paralela: 2 lotes Playwright (batch-a e batch-b)',
      '',
      '## Status dos lotes',
      '',
      batchStatusMarkdown,
      '',
      '## Livros processados',
      '',
      '| Arquivo | Titulo | Segmento | Criado no admin | Visivel em Livros |',
      '| --- | --- | --- | --- | --- |',
      booksMarkdown,
      '',
      '## Atritos de UX consolidados',
      '',
      findingsMarkdown,
      '',
    ].join('\n'),
  );
};

async function main() {
  ensureDir(runDir);

  if (!fs.existsSync(BOOK_DIR)) {
    throw new Error(`Diretório de livros não encontrado: ${BOOK_DIR}`);
  }

  const manifest = listBooks();
  if (manifest.length === 0) {
    throw new Error(`Nenhum PDF encontrado em: ${BOOK_DIR}`);
  }

  console.log(`[central-coruja-book-jtbd] Fonte: ${BOOK_DIR}`);
  console.log(`[central-coruja-book-jtbd] Run dir: ${runDir}`);
  console.log(`[central-coruja-book-jtbd] PDFs: ${manifest.length}`);

  const batchResults = await Promise.all([
    runPlaywrightBatch('batch-a'),
    runPlaywrightBatch('batch-b'),
  ]);

  writeSummary(manifest, batchResults);

  const failedBatch = batchResults.find((batch) => batch.code !== 0);
  if (failedBatch) {
    process.exitCode = failedBatch.code;
    return;
  }

  console.log(`[central-coruja-book-jtbd] Resumo: ${path.join(runDir, 'summary.md')}`);
}

main().catch((error) => {
  console.error('[central-coruja-book-jtbd] Falha fatal:', error);
  process.exitCode = 1;
});

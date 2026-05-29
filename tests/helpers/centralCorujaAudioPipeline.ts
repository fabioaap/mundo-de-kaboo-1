import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Page } from '@playwright/test';

export type SegmentLabel = 'Educação Infantil' | 'Fundamental I';

export type CentralCorujaAudioFixture = {
  batchTag: string;
  fileName: string;
  displayTitle: string;
  segment: SegmentLabel;
  audioUrl: string;
  version: number;
};

export type ThinkAloudEntry = {
  kind: 'context' | 'step' | 'friction' | 'result';
  audioTitle?: string;
  spoken: string;
  expectation?: string;
  observed?: string;
  timestamp: string;
};

export type JourneyFinding = {
  id: string;
  severity: 'high' | 'medium' | 'low';
  summary: string;
  evidence: string;
};

export type BatchJourneyReport = {
  batchTag: string;
  persona: { name: string; role: string; goal: string };
  processedAudios: Array<{
    fileName: string;
    displayTitle: string;
    segment: SegmentLabel;
    createdInAdmin: boolean;
    visibleInPublicAudios: boolean;
  }>;
  findings: JourneyFinding[];
  thinkAloud: ThinkAloudEntry[];
  startedAt: string;
  finishedAt: string;
};

const HELPERS_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_AUDIO_DIR = path.resolve(HELPERS_DIR, '..', 'fixtures', 'central-coruja-audios');
const DEFAULT_ARTIFACT_ROOT = path.join(process.cwd(), '.gstack', 'qa-reports', 'central-coruja-audio-jtbd');

export const CENTRAL_CORUJA_EDITOR_PERSONA = {
  name: 'Lia Editora',
  role: 'Editora de conteúdo',
  goal: 'Cadastrar áudios educativos na Central Coruja sem depender do time técnico.',
};

const ensureDir = (dirPath: string) => fs.mkdirSync(dirPath, { recursive: true });

export const getArtifactRoot = (): string => {
  const envRoot = process.env.CENTRAL_CORUJA_AUDIO_RUN_DIR;
  if (envRoot?.trim()) { ensureDir(envRoot); return envRoot; }
  const fallback = path.join(DEFAULT_ARTIFACT_ROOT, 'manual-run');
  ensureDir(fallback);
  return fallback;
};

export const loadCentralCorujaAudioFixtures = (
  audioDir = process.env.CENTRAL_CORUJA_AUDIO_DIR || DEFAULT_AUDIO_DIR,
): CentralCorujaAudioFixture[] => {
  const indexPath = path.join(audioDir, 'index.json');
  const raw: Array<{ fileName: string; displayTitle: string; segment: SegmentLabel; audioUrl: string; version: number }> =
    JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  return raw
    .sort((a, b) => a.version - b.version)
    .map((item, index) => ({
      ...item,
      batchTag: index % 2 === 0 ? 'batch-a' : 'batch-b',
    }));
};

export const buildBatchFixtures = (
  fixtures: CentralCorujaAudioFixture[],
): Array<{ tag: string; audios: CentralCorujaAudioFixture[] }> => {
  const byTag = new Map<string, CentralCorujaAudioFixture[]>();
  fixtures.forEach((f) => {
    const current = byTag.get(f.batchTag) || [];
    current.push(f);
    byTag.set(f.batchTag, current);
  });
  return Array.from(byTag.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tag, audios]) => ({ tag, audios }));
};

export class ThinkAloudJournal {
  private readonly entries: ThinkAloudEntry[] = [];
  add(kind: ThinkAloudEntry['kind'], spoken: string, options?: { audioTitle?: string; expectation?: string; observed?: string }): void {
    this.entries.push({ kind, spoken, audioTitle: options?.audioTitle, expectation: options?.expectation, observed: options?.observed, timestamp: new Date().toISOString() });
  }
  all(): ThinkAloudEntry[] { return [...this.entries]; }
}

export const writeBatchArtifacts = (report: BatchJourneyReport): { jsonPath: string; mdPath: string } => {
  const artifactRoot = getArtifactRoot();
  const jsonPath = path.join(artifactRoot, `${report.batchTag}.json`);
  const mdPath = path.join(artifactRoot, `${report.batchTag}.md`);
  const findingsMd = report.findings.length > 0
    ? report.findings.map((f, i) => `${i + 1}. **${f.severity.toUpperCase()}** - ${f.summary}. ${f.evidence}`).join('\n')
    : '1. Nenhum atrito relevante registrado.';
  const audiosMd = report.processedAudios
    .map((a) => `| ${a.fileName} | ${a.displayTitle} | ${a.segment} | ${a.createdInAdmin ? 'sim' : 'nao'} | ${a.visibleInPublicAudios ? 'sim' : 'nao'} |`)
    .join('\n');
  const thinkMd = report.thinkAloud
    .map((e) => `- **${e.kind}**${e.audioTitle ? ` [${e.audioTitle}]` : ''}: ${e.spoken}`)
    .join('\n');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(mdPath, [
    `# ${report.batchTag}`,
    '',
    `- Persona: ${report.persona.name}, ${report.persona.role}`,
    `- Objetivo: ${report.persona.goal}`,
    `- Inicio: ${report.startedAt}`,
    `- Fim: ${report.finishedAt}`,
    '',
    '## Áudios processados',
    '',
    '| Arquivo | Titulo | Segmento | Criado no admin | Visível em Áudios |',
    '| --- | --- | --- | --- | --- |',
    audiosMd,
    '',
    '## Atritos',
    '',
    findingsMd,
    '',
    '## Think aloud',
    '',
    thinkMd,
    '',
  ].join('\n'));
  return { jsonPath, mdPath };
};

const mockHeaders = { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PUT,OPTIONS' };

export const wireMockSupabaseStorage = async (page: Page): Promise<void> => {
  await page.route('**/storage/v1/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (req.method() === 'OPTIONS') { await route.fulfill({ status: 200, headers: mockHeaders, body: '{}' }); return; }
    if (url.pathname === '/storage/v1/bucket') { await route.fulfill({ status: 200, headers: mockHeaders, body: JSON.stringify([{ id: 'collections', name: 'collections', public: true }]) }); return; }
    if (url.pathname === '/storage/v1/object/list/collections') { await route.fulfill({ status: 200, headers: mockHeaders, body: '[]' }); return; }
    if (url.pathname.startsWith('/storage/v1/object/collections/')) { const key = decodeURIComponent(url.pathname.replace('/storage/v1/object/collections/', '')); await route.fulfill({ status: 200, headers: mockHeaders, body: JSON.stringify({ Key: key }) }); return; }
    await route.continue();
  });
};

export const wireMockSupabaseRest = async (page: Page): Promise<void> => {
  const createdItems: Record<string, unknown>[] = [];
  await page.route('**/rest/v1/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (req.method() === 'OPTIONS') { await route.fulfill({ status: 200, headers: mockHeaders, body: '{}' }); return; }
    if (url.pathname === '/rest/v1/collections') {
      if (req.method() === 'POST') { let body: Record<string, unknown> = {}; try { body = JSON.parse(req.postData() || '{}'); } catch { /**/ } const item = { id: `mock-${Date.now()}`, ...body, created_at: new Date().toISOString() }; createdItems.push(item); await route.fulfill({ status: 201, headers: mockHeaders, body: JSON.stringify(item) }); return; }
      if (req.method() === 'GET') { await route.fulfill({ status: 200, headers: mockHeaders, body: JSON.stringify(createdItems) }); return; }
    }
    if (url.pathname === '/rest/v1/collection_assets') {
      if (req.method() === 'POST') { await route.fulfill({ status: 201, headers: mockHeaders, body: JSON.stringify({ id: `asset-${Date.now()}` }) }); return; }
      if (req.method() === 'GET') { await route.fulfill({ status: 200, headers: mockHeaders, body: '[]' }); return; }
    }
    await route.continue();
  });
};

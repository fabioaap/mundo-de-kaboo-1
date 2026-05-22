import fs from 'node:fs';
import path from 'node:path';
import { Page } from '@playwright/test';

export type SegmentLabel = 'Educação Infantil' | 'Fundamental I';

export type CentralCorujaBookFixture = {
    batchTag: string;
    fileName: string;
    absolutePath: string;
    displayTitle: string;
    segment: SegmentLabel;
    version: number;
};

export type ThinkAloudEntry = {
    kind: 'context' | 'step' | 'friction' | 'result';
    bookTitle?: string;
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
    persona: {
        name: string;
        role: string;
        goal: string;
    };
    processedBooks: Array<{
        fileName: string;
        displayTitle: string;
        segment: SegmentLabel;
        createdInAdmin: boolean;
        visibleInPublicBooks: boolean;
    }>;
    findings: JourneyFinding[];
    thinkAloud: ThinkAloudEntry[];
    startedAt: string;
    finishedAt: string;
};

const DEFAULT_BOOK_DIR = 'C:\\Users\\Educacross\\Documents\\Projetos Educacross\\mundo-de-kaboo\\Conteúdo - Central Coruja\\Livros';
const DEFAULT_ARTIFACT_ROOT = path.join(process.cwd(), '.gstack', 'qa-reports', 'central-coruja-book-jtbd');
export const CENTRAL_CORUJA_EDITOR_PERSONA = {
    name: 'Lia Editora',
    role: 'Editora de conteúdo',
    goal: 'Transformar PDFs prontos em livros publicados sem pedir ajuda do time técnico.',
};

const ensureDir = (dirPath: string) => {
    fs.mkdirSync(dirPath, { recursive: true });
};

const titleCase = (value: string) =>
    value
        .toLowerCase()
        .split(' ')
        .filter(Boolean)
        .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
        .join(' ');

export const toDisplayTitle = (fileName: string): string => {
    const cleaned = fileName
        .replace(/\.pdf$/i, '')
        .replace(/^v\d+_/i, '')
        .replace(/_modoleitura$/i, '')
        .replace(/[_-]+/g, ' ')
        .trim();

    return titleCase(cleaned);
};

const getVersion = (fileName: string): number => {
    const match = fileName.match(/^v(\d+)_/i);
    return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
};

export const getArtifactRoot = (): string => {
    const envRoot = process.env.CENTRAL_CORUJA_BOOK_RUN_DIR;
    if (envRoot && envRoot.trim()) {
        ensureDir(envRoot);
        return envRoot;
    }

    const fallback = path.join(DEFAULT_ARTIFACT_ROOT, 'manual-run');
    ensureDir(fallback);
    return fallback;
};

export const loadCentralCorujaBookFixtures = (bookDir = process.env.CENTRAL_CORUJA_BOOK_DIR || DEFAULT_BOOK_DIR): CentralCorujaBookFixture[] => {
    const entries = fs
        .readdirSync(bookDir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && /\.pdf$/i.test(entry.name))
        .map((entry) => entry.name)
        .sort((left, right) => getVersion(left) - getVersion(right));

    return entries.map((fileName, index) => ({
        batchTag: index % 2 === 0 ? 'batch-a' : 'batch-b',
        fileName,
        absolutePath: path.join(bookDir, fileName),
        displayTitle: toDisplayTitle(fileName),
        segment: index % 2 === 0 ? 'Educação Infantil' : 'Fundamental I',
        version: getVersion(fileName),
    }));
};

export const buildBatchFixtures = (fixtures: CentralCorujaBookFixture[]): Array<{ tag: string; books: CentralCorujaBookFixture[] }> => {
    const byTag = new Map<string, CentralCorujaBookFixture[]>();

    fixtures.forEach((fixture) => {
        const current = byTag.get(fixture.batchTag) || [];
        current.push(fixture);
        byTag.set(fixture.batchTag, current);
    });

    return Array.from(byTag.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([tag, books]) => ({ tag, books }));
};

export class ThinkAloudJournal {
    private readonly entries: ThinkAloudEntry[] = [];

    add(
        kind: ThinkAloudEntry['kind'],
        spoken: string,
        options?: {
            bookTitle?: string;
            expectation?: string;
            observed?: string;
        },
    ): void {
        this.entries.push({
            kind,
            spoken,
            bookTitle: options?.bookTitle,
            expectation: options?.expectation,
            observed: options?.observed,
            timestamp: new Date().toISOString(),
        });
    }

    all(): ThinkAloudEntry[] {
        return [...this.entries];
    }

    snippets(limit = 6): string[] {
        return this.entries.slice(0, limit).map((entry) => `- [${entry.kind}] ${entry.spoken}`);
    }
}

export const writeBatchArtifacts = (report: BatchJourneyReport): { jsonPath: string; mdPath: string } => {
    const artifactRoot = getArtifactRoot();
    const jsonPath = path.join(artifactRoot, `${report.batchTag}.json`);
    const mdPath = path.join(artifactRoot, `${report.batchTag}.md`);
    const findingsMarkdown = report.findings.length > 0
        ? report.findings.map((finding, index) => `${index + 1}. **${finding.severity.toUpperCase()}** - ${finding.summary}. ${finding.evidence}`).join('\n')
        : '1. Nenhum atrito relevante registrado.';
    const processedBooksMarkdown = report.processedBooks
        .map((book) => `| ${book.fileName} | ${book.displayTitle} | ${book.segment} | ${book.createdInAdmin ? 'sim' : 'nao'} | ${book.visibleInPublicBooks ? 'sim' : 'nao'} |`)
        .join('\n');
    const thinkAloudMarkdown = report.thinkAloud
        .map((entry) => `- **${entry.kind}**${entry.bookTitle ? ` [${entry.bookTitle}]` : ''}: ${entry.spoken}`)
        .join('\n');

    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    fs.writeFileSync(
        mdPath,
        [
            `# ${report.batchTag}`,
            '',
            `- Persona: ${report.persona.name}, ${report.persona.role}`,
            `- Objetivo: ${report.persona.goal}`,
            `- Inicio: ${report.startedAt}`,
            `- Fim: ${report.finishedAt}`,
            '',
            '## Livros processados',
            '',
            '| Arquivo | Titulo | Segmento | Criado no admin | Visivel em Livros |',
            '| --- | --- | --- | --- | --- |',
            processedBooksMarkdown,
            '',
            '## Atritos',
            '',
            findingsMarkdown,
            '',
            '## Think aloud',
            '',
            thinkAloudMarkdown,
            '',
        ].join('\n'),
    );

    return { jsonPath, mdPath };
};

const storageHeaders = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': 'GET,POST,PUT,OPTIONS',
    'content-type': 'application/json',
};

export const wireMockSupabaseStorage = async (page: Page): Promise<void> => {
    await page.route('**/storage/v1/**', async (route) => {
        const request = route.request();
        const url = new URL(request.url());

        if (request.method() === 'OPTIONS') {
            await route.fulfill({ status: 200, headers: storageHeaders, body: '{}' });
            return;
        }

        if (url.pathname === '/storage/v1/bucket') {
            await route.fulfill({
                status: 200,
                headers: storageHeaders,
                body: JSON.stringify([{ id: 'collections', name: 'collections', public: true }]),
            });
            return;
        }

        if (url.pathname === '/storage/v1/object/list/collections') {
            await route.fulfill({
                status: 200,
                headers: storageHeaders,
                body: JSON.stringify([]),
            });
            return;
        }

        if (url.pathname.startsWith('/storage/v1/object/collections/')) {
            const key = decodeURIComponent(url.pathname.replace('/storage/v1/object/collections/', ''));
            await route.fulfill({
                status: 200,
                headers: storageHeaders,
                body: JSON.stringify({ Key: key }),
            });
            return;
        }

        await route.continue();
    });
};

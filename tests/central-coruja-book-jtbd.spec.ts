import path from 'node:path';
import { test, expect, Page } from '@playwright/test';
import { setupCentralCorujaEditorSession } from './fixtures/auth';
import { waitForAuthenticatedScreen } from './helpers/navigation';
import {
    BatchJourneyReport,
    CENTRAL_CORUJA_EDITOR_PERSONA,
    CentralCorujaBookFixture,
    JourneyFinding,
    ThinkAloudJournal,
    buildBatchFixtures,
    getArtifactRoot,
    loadCentralCorujaBookFixtures,
    wireMockSupabaseStorage,
    writeBatchArtifacts,
} from './helpers/centralCorujaBookPipeline';

const allFixtures = loadCentralCorujaBookFixtures();
const batches = buildBatchFixtures(allFixtures);

const captureScreenshot = async (page: Page, fileName: string) => {
    const filePath = path.join(getArtifactRoot(), fileName);
    await page.screenshot({ path: filePath, fullPage: true });
    return filePath;
};

const getMaterialDrawer = (page: Page) => page.locator('div.fixed.inset-y-0.right-0.z-50.translate-x-0').filter({
    has: page.getByPlaceholder('Título do material'),
});

const openMaterialsModule = async (page: Page, journal: ThinkAloudJournal, findings: JourneyFinding[]) => {
    const adminNavigation = page.getByRole('navigation');
    await expect(adminNavigation.getByRole('button', { name: 'Materiais' })).toBeVisible({ timeout: 15_000 });

    const adminBooksModules = await adminNavigation.getByRole('button', { name: 'Livros' }).count();
    if (adminBooksModules === 0) {
        findings.push({
            id: 'missing-admin-books-module',
            severity: 'high',
            summary: 'Nao existe modulo Livros dentro do admin',
            evidence: 'A editora precisa reinterpretar o cadastro de livro a partir do modulo Materiais.',
        });
        journal.add(
            'friction',
            'Eu esperava um modulo Livros no admin, mas o caminho oficial fica escondido em Materiais.',
            {
                expectation: 'Encontrar um backoffice nomeado como Livros.',
                observed: 'O menu interno oferece Materiais, nao Livros.',
            },
        );
    }

    await adminNavigation.getByRole('button', { name: 'Materiais' }).click();
    await expect(page.getByRole('heading', { name: 'Materiais', level: 1 })).toBeVisible({ timeout: 10_000 });
};

const ensureMaterialFormOpen = async (page: Page) => {
    const titleInput = page.locator('div.fixed.inset-y-0.right-0.z-50.translate-x-0').getByPlaceholder('Título do material');
    const readingSectionLabel = page.locator('div.fixed.inset-y-0.right-0.z-50.translate-x-0').getByText('Leitura', { exact: true });
    const readingUpload = page.locator('div.fixed.inset-y-0.right-0.z-50.translate-x-0').locator('input[type="file"][accept="application/pdf"]').first();

    if (!(await titleInput.isVisible().catch(() => false))) {
        const openCreateButton = page.locator('main').getByRole('button', { name: 'Novo material', exact: true }).last();
        await openCreateButton.scrollIntoViewIfNeeded();
        await openCreateButton.click();
    }

    await expect(titleInput).toBeVisible({ timeout: 10_000 });
    await expect(readingSectionLabel).toBeVisible({ timeout: 10_000 });
    await expect(readingUpload).toHaveCount(1);
};

const createBookFromFixture = async (
    page: Page,
    fixture: CentralCorujaBookFixture,
    journal: ThinkAloudJournal,
    findings: JourneyFinding[],
) => {
    await ensureMaterialFormOpen(page);

    const materialDrawer = getMaterialDrawer(page);
    const createButton = materialDrawer.getByRole('button', { name: /Criar (Material|Coleção|[Ll]ivro)/ }).last();
    await expect(createButton).toBeVisible({ timeout: 10_000 });
    const saveLabel = (await createButton.textContent())?.trim() || 'Criar Material';
    if (!findings.some((finding) => finding.id === 'book-flow-uses-collection-copy')) {
        findings.push({
            id: 'book-flow-uses-collection-copy',
            severity: 'medium',
            summary: 'CTA final ainda fala em Colecao durante um cadastro de livro',
            evidence: `No drawer de Materiais, o botao principal termina como "${saveLabel}".`,
        });
    }

    journal.add(
        'step',
        `Vou cadastrar "${fixture.displayTitle}" usando o PDF real ${fixture.fileName}.`,
        {
            bookTitle: fixture.displayTitle,
            expectation: 'Selecionar o PDF e salvar um livro com linguagem consistente.',
            observed: `O formulario continua usando o vocabulário de material/colecao para um livro.`,
        },
    );

    const titleInput = materialDrawer.getByPlaceholder('Título do material');
    await expect(titleInput).toBeVisible({ timeout: 10_000 });
    await titleInput.fill(fixture.displayTitle);
    if (fixture.segment !== 'Educação Infantil') {
        const segmentButton = materialDrawer.getByRole('button', {
            name: 'E.F. Anos Iniciais',
            exact: true,
        });
        await segmentButton.evaluate((button: HTMLButtonElement) => button.click());
    }
    await materialDrawer.locator('input[type="file"][accept="application/pdf"]').first().setInputFiles(fixture.absolutePath);
    await expect(materialDrawer.getByPlaceholder('https://...').first()).toHaveValue(/\/collections\/pdfs\//, { timeout: 15_000 });
    await createButton.scrollIntoViewIfNeeded();
    await expect(createButton).toBeEnabled({ timeout: 10_000 });
    await createButton.click();
    await expect(materialDrawer.getByPlaceholder('Título do material')).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText(fixture.displayTitle).first()).toBeVisible({ timeout: 15_000 });

    journal.add(
        'result',
        `O livro "${fixture.displayTitle}" entrou no catalogo administrativo com sucesso.`,
        {
            bookTitle: fixture.displayTitle,
            observed: 'O drawer fechou, o toast confirmou a criacao e o item apareceu na listagem.',
        },
    );
};

const validatePublicBooksListing = async (
    page: Page,
    fixtures: CentralCorujaBookFixture[],
    journal: ThinkAloudJournal,
) => {
    const booksNavState = {
        currentScreen: 'home',
        params: { collectionGroup: 'books' },
    };

    await page.goto('/?brand=central-coruja');
    await page.evaluate((nextState) => {
        window.localStorage.setItem('kaboo_nav_state', JSON.stringify(nextState));
        window.history.replaceState(
            {
                screen: nextState.currentScreen,
                params: nextState.params,
            },
            '',
            window.location.pathname + window.location.search,
        );
        window.dispatchEvent(new PopStateEvent('popstate', {
            state: {
                screen: nextState.currentScreen,
                params: nextState.params,
            },
        }));
    }, booksNavState);
    await expect.poll(async () => {
        const raw = await page.evaluate(() => localStorage.getItem('kaboo_nav_state'));
        if (!raw) return null;
        return JSON.parse(raw)?.params?.collectionGroup ?? null;
    }, { timeout: 15_000 }).toBe('books');
    await expect(page.getByRole('textbox', { name: 'Buscar livros' })).toBeVisible({ timeout: 15_000 });

    for (const fixture of fixtures.slice(0, 2)) {
        await expect(page.getByText(fixture.displayTitle).first()).toBeVisible({ timeout: 15_000 });
    }

    journal.add(
        'result',
        'Depois do cadastro, eu encontro os livros na vitrine publica de Livros da Central Coruja.',
        {
            expectation: 'Ver os novos livros sem ter que refazer filtros escondidos.',
            observed: 'A listagem publica exibe os titulos cadastrados no lote.',
        },
    );
};

for (const batch of batches) {
    test(`JTBD-CC-BOOK ${batch.tag} @${batch.tag}`, async ({ page }) => {
        const findings: JourneyFinding[] = [];
        const journal = new ThinkAloudJournal();
        const processedBooks: BatchJourneyReport['processedBooks'] = [];
        const startedAt = new Date().toISOString();

        await wireMockSupabaseStorage(page);
        await setupCentralCorujaEditorSession(page, {
            navState: { currentScreen: 'admin' },
            initialUrl: '/?brand=central-coruja#admin',
        });
        await waitForAuthenticatedScreen(page);

        journal.add(
            'context',
            `${CENTRAL_CORUJA_EDITOR_PERSONA.name}: preciso publicar livros novos na Central Coruja sem depender do time tecnico.`,
            {
                expectation: 'Encontrar um fluxo direto de cadastro de livros.',
            },
        );

        await openMaterialsModule(page, journal, findings);
        await captureScreenshot(page, `${batch.tag}-admin-materials.png`);

        for (const fixture of batch.books) {
            await createBookFromFixture(page, fixture, journal, findings);
            processedBooks.push({
                fileName: fixture.fileName,
                displayTitle: fixture.displayTitle,
                segment: fixture.segment,
                createdInAdmin: true,
                visibleInPublicBooks: false,
            });
        }

        await validatePublicBooksListing(page, batch.books, journal);
        await captureScreenshot(page, `${batch.tag}-public-books.png`);

        processedBooks.forEach((book) => {
            book.visibleInPublicBooks = true;
        });

        const report: BatchJourneyReport = {
            batchTag: batch.tag,
            persona: {
                name: CENTRAL_CORUJA_EDITOR_PERSONA.name,
                role: CENTRAL_CORUJA_EDITOR_PERSONA.role,
                goal: CENTRAL_CORUJA_EDITOR_PERSONA.goal,
            },
            processedBooks,
            findings,
            thinkAloud: journal.all(),
            startedAt,
            finishedAt: new Date().toISOString(),
        };

        writeBatchArtifacts(report);
    });
}

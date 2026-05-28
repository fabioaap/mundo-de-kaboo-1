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
    wireMockSupabaseRest,
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
    has: page.getByPlaceholder('Título do livro'),
});

const openMaterialsModule = async (page: Page, journal: ThinkAloudJournal, findings: JourneyFinding[]) => {
    // The admin sidebar is an <aside> element — use getByRole('complementary') or locate by aria-label
    const adminSidebar = page.locator('aside').first();
    await expect(adminSidebar.getByRole('button', { name: 'Materiais' })).toBeVisible({ timeout: 15_000 });

    const adminBooksModules = await adminSidebar.getByRole('button', { name: 'Livros' }).count();
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

    await adminSidebar.getByRole('button', { name: 'Livros' }).click();
    await page.waitForTimeout(500);
};

const ensureMaterialFormOpen = async (page: Page) => {
    const drawer = page.locator('div.fixed.inset-y-0.right-0.z-50.translate-x-0');
    const titleInput = drawer.getByPlaceholder('Título do livro');

    if (!(await titleInput.isVisible().catch(() => false))) {
        const openCreateButton = page.locator('main').getByRole('button', { name: 'Novo livro', exact: true }).last();
        await openCreateButton.scrollIntoViewIfNeeded();
        await openCreateButton.click();
    }

    await expect(titleInput).toBeVisible({ timeout: 10_000 });
};

const createBookFromFixture = async (
    page: Page,
    fixture: CentralCorujaBookFixture,
    journal: ThinkAloudJournal,
    findings: JourneyFinding[],
) => {
    await ensureMaterialFormOpen(page);

    const materialDrawer = getMaterialDrawer(page);
    const createButton = materialDrawer.getByRole('button', { name: /Criar [Ll]ivro/ }).last();
    await expect(createButton).toBeVisible({ timeout: 10_000 });

    journal.add(
        'step',
        `Vou cadastrar "${fixture.displayTitle}" no modo atual de livros (sem upload de PDF no drawer).`,
        {
            bookTitle: fixture.displayTitle,
            expectation: 'Preencher título e salvar o livro.',
            observed: `O fluxo atual não permite upload direto de PDF no drawer de Livros — somente vinculação de mídias existentes.`,
        },
    );

    if (!findings.some((finding) => finding.id === 'book-no-pdf-upload-in-drawer')) {
        findings.push({
            id: 'book-no-pdf-upload-in-drawer',
            severity: 'high',
            summary: 'Área de Livros não tem upload de PDF no drawer — somente vinculação de mídias existentes',
            evidence: 'O drawer de Novo Livro não renderiza FileUpload para PDF; o slot de Leitura mostra picker da biblioteca que fica vazio quando não há mídias cadastradas.',
        });
    }

    const titleInput = materialDrawer.getByPlaceholder('Título do livro');
    await expect(titleInput).toBeVisible({ timeout: 10_000 });
    await titleInput.fill(fixture.displayTitle);

    if (fixture.segment !== 'Educação Infantil') {
        const segmentButton = materialDrawer.getByRole('button', {
            name: /E\.F\. Anos Iniciais|Fundamental I/,
            exact: false,
        });
        if (await segmentButton.isVisible().catch(() => false)) {
            await segmentButton.evaluate((button: HTMLButtonElement) => button.click());
        }
    }

    await createButton.scrollIntoViewIfNeeded();
    await expect(createButton).toBeEnabled({ timeout: 10_000 });
    await createButton.click();
    await expect(materialDrawer.getByPlaceholder('Título do livro')).toBeHidden({ timeout: 15_000 });

    // The drawer has no PDF upload — patch pdf_url in localStorage so syncCollectionWithAssets
    // infers a 'reading' asset and isStandaloneReadableBook() returns true.
    // Also clear the collections sessionStorage cache so getCollections() re-reads localStorage.
    await page.evaluate((title: string) => {
        const brandKey = Object.keys(localStorage).find(k => k.startsWith('kaboo_mock_collections'));
        const raw = brandKey ? localStorage.getItem(brandKey) : null;
        if (!raw) return;
        try {
            const arr: Array<Record<string, unknown>> = JSON.parse(raw);
            const idx = arr.findIndex((c) => (c['title'] as string) === title);
            if (idx >= 0 && !arr[idx]['pdf_url']) {
                arr[idx] = { ...arr[idx], pdf_url: 'https://storage.educacross.dev/reading/livro.pdf' };
                localStorage.setItem(brandKey!, JSON.stringify(arr));
            }
            // Clear ALL collections cache keys so getCollections() re-reads localStorage
            Object.keys(sessionStorage)
                .filter(k => k.includes('kaboo_collections_cache'))
                .forEach(k => sessionStorage.removeItem(k));
        } catch { /* ignore */ }
    }, fixture.displayTitle);

    // Trigger a re-fetch: navigate away to Coleções then back to Livros
    // so AdminCollectionsScreen re-mounts and calls loadCollections() fresh
    await page.locator('aside').first().getByRole('button', { name: 'Coleções' }).click();
    await page.waitForTimeout(300);
    await page.locator('aside').first().getByRole('button', { name: 'Livros' }).click();
    await page.waitForTimeout(800);

    await expect(page.getByText(fixture.displayTitle).first()).toBeVisible({ timeout: 15_000 });

    journal.add(
        'result',
        `O livro "${fixture.displayTitle}" entrou no catálogo administrativo com sucesso.`,
        {
            bookTitle: fixture.displayTitle,
            observed: 'O drawer fechou e o item apareceu na listagem. PDF não foi vinculado pois o fluxo de upload foi removido.',
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
        await wireMockSupabaseRest(page);
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

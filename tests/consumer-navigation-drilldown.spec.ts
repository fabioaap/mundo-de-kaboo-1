import { expect, Page, test } from '@playwright/test';
import { setupAdminSession } from './fixtures/auth';

// Kit fixture from data/catalog.seed.json — has PDF, audio, video (animation), extra_materials
// and a single linked book. Only this fixture is used, per test authoring constraints.
const KIT = {
    id: '784b3238-0916-4922-af3c-8627d74cc16c',
    title: 'Kaboo e a Carta Misteriosa',
};
const LINKED_BOOK = {
    id: '5993fc3f-8e1f-4d32-98f8-447676e31a39',
    title: 'Blado e a Caixa dos Sentimentos',
};
const KIT_AUDIO_TITLE = 'Audiolivro';
const KIT_VIDEO_TITLE = 'Desenho Animado';
const MATERIALS_HEADING = 'Materiais da Coleção';

// Standalone readable book (collection_type absent → defaults to 'book', has pdf_url,
// no kit_book_ids/kit_cover_image) — used for the collectionGroup=books regression guard.
const STANDALONE_BOOK = {
    id: '5993fc3f-8e1f-4d32-98f8-447676e31a39',
    title: 'Blado e a Caixa dos Sentimentos',
};

const COLLECTION_DIALOG_NAME = 'Detalhes da coleção';

async function openKitModal(page: Page): Promise<void> {
    await setupAdminSession(page);

    const kitCard = page.getByText(KIT.title, { exact: true }).first();
    await expect(kitCard).toBeVisible({ timeout: 15_000 });
    await kitCard.click();

    await expect(
        page.getByRole('dialog', { name: COLLECTION_DIALOG_NAME }),
    ).toBeVisible({ timeout: 10_000 });
}

test.describe('JTBD-NAV-001 · Navegação de consumo — clique em coleção abre o modal', () => {
    test('clicar no card de um kit no Home abre o modal de detalhes', async ({ page }) => {
        await test.step('Given uma sessão autenticada na Home (view de kits)', async () => {
            await setupAdminSession(page);
        });

        await test.step('When o usuário clica no card do kit', async () => {
            const kitCard = page.getByText(KIT.title, { exact: true }).first();
            await expect(kitCard).toBeVisible({ timeout: 15_000 });
            await kitCard.click();
        });

        await test.step('Then o modal de detalhes da coleção abre e a URL reflete o collectionId', async () => {
            await expect(
                page.getByRole('dialog', { name: COLLECTION_DIALOG_NAME }),
            ).toBeVisible({ timeout: 10_000 });

            await expect
                .poll(async () => new URL(await page.url()).hash, { timeout: 10_000 })
                .toContain(`collectionId=${KIT.id}`);

            await expect(page.getByRole('dialog', { name: COLLECTION_DIALOG_NAME })
                .getByText(KIT.title, { exact: true }).first()).toBeVisible();
        });
    });
});

test.describe('JTBD-NAV-002 · Drill-down para livro vinculado permanece dentro do modal', () => {
    test('clicar no livro vinculado abre o nível do livro sem navegar nem fechar o modal', async ({ page }) => {
        await test.step('Given o modal do kit aberto', async () => {
            await openKitModal(page);
        });

        await test.step('When o usuário clica no item "Livro" vinculado (kit_book_ids[0])', async () => {
            const dialog = page.getByRole('dialog', { name: COLLECTION_DIALOG_NAME });
            const linkedBookTile = dialog.getByText(LINKED_BOOK.title, { exact: true }).first();
            await expect(linkedBookTile).toBeVisible({ timeout: 10_000 });
            await linkedBookTile.click();
        });

        await test.step('Then o modal permanece aberto mostrando o nível do livro (drill-down), e a rota NÃO virou player_book', async () => {
            const dialog = page.getByRole('dialog', { name: COLLECTION_DIALOG_NAME });
            await expect(dialog).toBeVisible();
            await expect(dialog.getByRole('heading', { name: LINKED_BOOK.title })).toBeVisible({ timeout: 10_000 });
            await expect(dialog.getByRole('button', { name: 'Voltar à coleção' })).toBeVisible();

            const hash = new URL(await page.url()).hash;
            expect(hash).toContain(`collectionId=${KIT.id}`);
            expect(hash).not.toContain('player_book');
        });
    });
});

test.describe('JTBD-NAV-003 · Item de áudio primário fecha o modal e abre o player de áudio', () => {
    test('clicar no item de áudio do kit fecha o modal e navega para player_audio', async ({ page }) => {
        await test.step('Given o modal do kit aberto', async () => {
            await openKitModal(page);
        });

        await test.step('When o usuário clica no item de áudio ("Áudiolivro") do kit', async () => {
            const dialog = page.getByRole('dialog', { name: COLLECTION_DIALOG_NAME });
            const audioTile = dialog.getByText(KIT_AUDIO_TITLE, { exact: true }).first();
            await expect(audioTile).toBeVisible({ timeout: 10_000 });
            await audioTile.click();
        });

        await test.step('Then o modal fecha e o AudioPlayerScreen é exibido', async () => {
            await expect(page.getByRole('dialog', { name: COLLECTION_DIALOG_NAME })).toHaveCount(0);
            await expect(page.getByRole('button', { name: 'Voltar' })).toBeVisible({ timeout: 10_000 });
            await expect(page.getByRole('heading', { name: KIT_AUDIO_TITLE })).toBeVisible();

            const hash = new URL(await page.url()).hash;
            expect(hash).toContain('player_audio');
        });
    });
});

test.describe('JTBD-NAV-004 · Item de vídeo primário fecha o modal e abre o player de vídeo', () => {
    test('clicar no item de vídeo do kit fecha o modal e navega para player_video', async ({ page }) => {
        await test.step('Given o modal do kit aberto', async () => {
            await openKitModal(page);
        });

        await test.step('When o usuário clica no item de vídeo ("Desenho Animado") do kit', async () => {
            const dialog = page.getByRole('dialog', { name: COLLECTION_DIALOG_NAME });
            const videoTile = dialog.getByText(KIT_VIDEO_TITLE, { exact: true }).first();
            await expect(videoTile).toBeVisible({ timeout: 10_000 });
            await videoTile.click();
        });

        await test.step('Then o modal fecha e o VideoPlayerScreen é exibido', async () => {
            await expect(page.getByRole('dialog', { name: COLLECTION_DIALOG_NAME })).toHaveCount(0);
            await expect(page.getByRole('dialog', { name: 'Player de vídeo' })).toBeVisible({ timeout: 10_000 });

            const hash = new URL(await page.url()).hash;
            expect(hash).toContain('player_video');
        });
    });
});

test.describe('JTBD-NAV-005 · Item de leitura/PDF fecha o modal e abre o leitor de livro', () => {
    test('drill-down até o livro e clicar em "Ler livro" fecha o modal e navega para player_book', async ({ page }) => {
        await test.step('Given o modal do kit aberto e drill-down até o livro vinculado', async () => {
            await openKitModal(page);
            const dialog = page.getByRole('dialog', { name: COLLECTION_DIALOG_NAME });
            const linkedBookTile = dialog.getByText(LINKED_BOOK.title, { exact: true }).first();
            await expect(linkedBookTile).toBeVisible({ timeout: 10_000 });
            await linkedBookTile.click();
            await expect(dialog.getByRole('heading', { name: LINKED_BOOK.title })).toBeVisible({ timeout: 10_000 });
        });

        await test.step('When o usuário clica em "Ler livro"', async () => {
            const dialog = page.getByRole('dialog', { name: COLLECTION_DIALOG_NAME });
            const readButton = dialog.getByRole('button', { name: 'Ler livro' });
            await expect(readButton).toBeVisible({ timeout: 10_000 });
            await readButton.click();
        });

        await test.step('Then o modal fecha e o BookReaderScreen é exibido com o título do livro', async () => {
            await expect(page.getByRole('dialog', { name: COLLECTION_DIALOG_NAME })).toHaveCount(0);
            await expect(page.getByText(LINKED_BOOK.title, { exact: true }).first()).toBeVisible({ timeout: 10_000 });
            await expect(page.getByRole('button', { name: 'Voltar' })).toBeVisible();

            const hash = new URL(await page.url()).hash;
            expect(hash).toContain('player_book');
        });
    });
});

test.describe('JTBD-NAV-006 · Tile "Materiais" exibe os extras no lugar, sem navegar', () => {
    test('clicar em "Materiais" mostra os materiais extras sem fechar o modal nem trocar de tela', async ({ page }) => {
        await test.step('Given o modal do kit aberto', async () => {
            await openKitModal(page);
        });

        await test.step('When o usuário clica no tile "Materiais"', async () => {
            const dialog = page.getByRole('dialog', { name: COLLECTION_DIALOG_NAME });
            const materialsTile = dialog.getByText('Materiais', { exact: true }).first();
            await expect(materialsTile).toBeVisible({ timeout: 10_000 });
            await materialsTile.click();
        });

        await test.step('Then os materiais extras aparecem in-place e o modal continua aberto na mesma rota', async () => {
            const dialog = page.getByRole('dialog', { name: COLLECTION_DIALOG_NAME });
            await expect(dialog).toBeVisible();
            await expect(dialog.getByRole('heading', { name: MATERIALS_HEADING })).toBeVisible({ timeout: 10_000 });

            const hash = new URL(await page.url()).hash;
            expect(hash).toContain(`collectionId=${KIT.id}`);
            expect(hash).not.toContain('player_');
        });
    });
});

test.describe('JTBD-NAV-007 · Voltar do player restaura o modal no nível de drill-down correto', () => {
    test('back a partir do player de áudio restaura o modal no nível do kit (raiz da pilha)', async ({ page }) => {
        await test.step('Given o modal do kit aberto e navegação até o player de áudio', async () => {
            await openKitModal(page);
            const dialog = page.getByRole('dialog', { name: COLLECTION_DIALOG_NAME });
            const audioTile = dialog.getByText(KIT_AUDIO_TITLE, { exact: true }).first();
            await expect(audioTile).toBeVisible({ timeout: 10_000 });
            await audioTile.click();
            await expect(page.getByRole('dialog', { name: COLLECTION_DIALOG_NAME })).toHaveCount(0);
            await expect(page.getByRole('heading', { name: KIT_AUDIO_TITLE })).toBeVisible({ timeout: 10_000 });
        });

        await test.step('When o usuário volta a partir do player', async () => {
            const backButton = page.getByRole('button', { name: 'Voltar' });
            await expect(backButton).toBeVisible();
            await backButton.click();
        });

        await test.step('Then o modal reabre no mesmo nível (kit) — cachedPlayerStack restaurado', async () => {
            const dialog = page.getByRole('dialog', { name: COLLECTION_DIALOG_NAME });
            await expect(dialog).toBeVisible({ timeout: 10_000 });
            await expect(dialog.getByText(KIT.title, { exact: true }).first()).toBeVisible();
            await expect(dialog.getByRole('button', { name: 'Voltar à coleção' })).toHaveCount(0);

            const hash = new URL(await page.url()).hash;
            expect(hash).toContain(`collectionId=${KIT.id}`);
        });
    });
});

test.describe('JTBD-NAV-008 · Home com collectionGroup=books abre o modal para livro standalone', () => {
    test('clicar em um livro avulso na view de livros abre o modal, NÃO navega direto pro player', async ({ page }) => {
        await test.step('Given uma sessão autenticada na Home com collectionGroup=books', async () => {
            await setupAdminSession(page);
            await page.goto('/#home?collectionGroup=books');
        });

        await test.step('When o usuário clica no card do livro avulso', async () => {
            const bookCard = page.getByText(STANDALONE_BOOK.title, { exact: true }).first();
            await expect(bookCard).toBeVisible({ timeout: 15_000 });
            await bookCard.click();
        });

        await test.step('Then o modal de detalhes da coleção abre — não navega direto para player_book', async () => {
            await expect(
                page.getByRole('dialog', { name: COLLECTION_DIALOG_NAME }),
            ).toBeVisible({ timeout: 10_000 });

            const hash = new URL(await page.url()).hash;
            expect(hash).toContain(`collectionId=${STANDALONE_BOOK.id}`);
            expect(hash).not.toContain('player_book');
        });
    });
});

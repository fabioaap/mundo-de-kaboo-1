import { expect, test } from '@playwright/test';
import { setupOperationalSession } from './fixtures/auth';

test.describe('REG-ADMIN-BOOKS-ROUTING-001 — Gerenciar > Livros abre catálogo de livros', () => {
  test('módulo Livros mostra affordances de livros e não fallback de coleções', async ({ page }) => {
    await setupOperationalSession(page, {
      role: 'editor',
      brandSlug: 'central-coruja',
      navState: { currentScreen: 'admin' },
      initialUrl: '/?brand=central-coruja#admin',
    });

    await page.getByRole('navigation').getByRole('button', { name: 'Livros' }).click();

    await expect(page.getByRole('heading', { name: 'Livros' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Novo Livro' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByPlaceholder('Buscar por título ou tema...')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Nova Coleção' })).toHaveCount(0);
    await expect(page.getByText('Nenhuma coleção encontrada.')).toHaveCount(0);

    await expect
      .poll(async () => {
        const bodyText = (await page.locator('body').textContent()) || '';
        return bodyText.includes('Nenhum livro cadastrado ainda.') || bodyText.includes('Sem coleção');
      })
      .toBe(true);
  });
});

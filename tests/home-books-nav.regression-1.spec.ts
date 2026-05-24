import { expect, Page, test } from '@playwright/test';

const ADMIN_SESSION_ID = 'session_e2e_home_books_nav_admin';
const ADMIN_USER_ID = 'mock-admin-home-books';

async function seedAdminMockSession(page: Page): Promise<void> {
  const now = new Date().toISOString();
  const futureDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  const profile = {
    id: ADMIN_USER_ID,
    full_name: 'Demo Admin',
    email: 'demo@mundodekaboo.local',
    avatar_id: 'Kaboo',
    role: 'admin',
    voucher_id: null,
    access_starts_at: now,
    access_expires_at: futureDate,
    access_status: 'active',
    created_by: null,
  };
  const users = [{
    id: ADMIN_USER_ID,
    email: 'demo@mundodekaboo.local',
    password: '123456',
    role: 'admin',
    created_at: now,
    invited_at: null,
    confirmed_at: now,
    last_sign_in_at: now,
    profile,
  }];

  await page.addInitScript(
    ({ sessionId, userId, usersJson, profileCacheJson }) => {
      window.sessionStorage.setItem('kaboo_session_id', sessionId);
      window.sessionStorage.setItem('kaboo_dev_mock_session', '1');
      window.sessionStorage.setItem('kaboo_mock_session_user_id', userId);
      window.localStorage.setItem('kaboo_mock_session_user_id', userId);
      window.localStorage.setItem('kaboo_mock_users', usersJson);
      window.sessionStorage.setItem('kaboo_profile_cache', profileCacheJson);
    },
    {
      sessionId: ADMIN_SESSION_ID,
      userId: ADMIN_USER_ID,
      usersJson: JSON.stringify(users),
      profileCacheJson: JSON.stringify({
        profile,
        userId: ADMIN_USER_ID,
        sessionId: ADMIN_SESSION_ID,
        timestamp: Date.now(),
      }),
    },
  );
}

test.describe('REG-HOME-BOOKS-NAV-001 — livros preservam collectionGroup=books no hash e nav state', () => {
  test('deep-link de livros mantém hash, nav state e heading da view de livros', async ({ page }) => {
    await seedAdminMockSession(page);

    await page.goto('/?brand=central-coruja#home?collectionGroup=books');

    await expect
      .poll(async () => new URL(await page.url()).hash)
      .toBe('#home?collectionGroup=books');

    await expect
      .poll(async () => page.evaluate(() => {
        const raw = window.localStorage.getItem('kaboo_nav_state');
        if (!raw) return null;
        try {
          return JSON.parse(raw);
        } catch {
          return 'parse-error';
        }
      }))
      .toEqual({
        currentScreen: 'home',
        params: { collectionGroup: 'books' },
      });

    await expect(page.getByRole('heading', { name: 'Todos os Livros' })).toBeVisible({ timeout: 10_000 });
  });
});

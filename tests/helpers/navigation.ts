// tests/helpers/navigation.ts
import { Page, expect } from '@playwright/test';

/** Aguarda até que a tela autenticada esteja visível */
export async function waitForAuthenticatedScreen(page: Page): Promise<void> {
    await page.locator('text=Bem-vindo de volta!').waitFor({ state: 'hidden', timeout: 15_000 });
    await page.waitForFunction(
        () => {
            const raw = localStorage.getItem('kaboo_nav_state');
            if (!raw) return false;
            try {
                const state = JSON.parse(raw);
                const validScreens = ['home', 'search', 'support', 'profile', 'my_data', 'admin', 'access_expired'];
                return validScreens.includes(state.currentScreen);
            } catch {
                return false;
            }
        },
        { timeout: 10_000 },
    );
}

/** Navega para uma tela clicando no botão da BottomNav/Sidebar */
export async function navigateTo(
    page: Page,
    screen: 'home' | 'search' | 'profile' | 'admin',
): Promise<void> {
    const textMap: Record<string, string | RegExp> = {
        home: /Cole.*es|Coleções/,
        search: 'Buscar',
        profile: 'Perfil',
        admin: 'Gerenciar',
    };
    const text = textMap[screen];
    const btn = page.locator('button:visible').filter({ hasText: text }).first();
    await btn.click();
}

/** Navega até a aba White Label dentro do painel admin */
export async function navigateToWhiteLabel(page: Page): Promise<void> {
    await navigateTo(page, 'admin');
    const wlButton = page.getByRole('button', { name: 'White Label' }).first();
    await wlButton.waitFor({ state: 'visible', timeout: 10_000 });
    await wlButton.click();
    // Aguarda o header "Gestão de Marca" ser visível
    await expect(page.getByRole('heading', { name: 'Gestão de Marca' })).toBeVisible({ timeout: 10_000 });
}

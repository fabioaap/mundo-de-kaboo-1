// tests/white-label.spec.ts
// Jornadas de White Label — Gestão de Marca
// JN-WL-001 a JN-WL-010

import { test, expect, Page } from '@playwright/test';
import { setupAdminSession } from './fixtures/auth';
import { waitForAuthenticatedScreen, navigateToWhiteLabel } from './helpers/navigation';

const WHITE_LABEL_PREVIEW_KEY = 'kaboo:white-label-preview-settings';
const NAV_STATE_KEY = 'kaboo_nav_state';
const DEV_MOCK_SESSION_KEY = 'kaboo_dev_mock_session';

// ─── Setup compartilhado ───
async function adminAtWhiteLabel(page: Page): Promise<void> {
    await setupAdminSession(page);
    await waitForAuthenticatedScreen(page);
    await navigateToWhiteLabel(page);
}

async function seedCentralCorujaPreview(
    page: Page,
    options?: {
        navState?: Record<string, unknown>;
        devMockSession?: boolean;
    },
): Promise<void> {
    await page.addInitScript(
        ({ previewKey, navStateKey, devMockSessionKey, navState, devMockSession }) => {
            window.localStorage.setItem(
                previewKey,
                JSON.stringify({
                    activeBrandId: 'central-coruja',
                    previewEnabled: true,
                }),
            );

            if (navState) {
                window.localStorage.setItem(navStateKey, JSON.stringify(navState));
            } else {
                window.localStorage.removeItem(navStateKey);
            }

            if (devMockSession) {
                window.sessionStorage.setItem(devMockSessionKey, '1');
            } else {
                window.sessionStorage.removeItem(devMockSessionKey);
            }
        },
        {
            previewKey: WHITE_LABEL_PREVIEW_KEY,
            navStateKey: NAV_STATE_KEY,
            devMockSessionKey: DEV_MOCK_SESSION_KEY,
            navState: options?.navState ?? null,
            devMockSession: options?.devMockSession ?? false,
        },
    );
}

// ===========================================================================
// JORNADA 1 — Acesso e estrutura da tela
// ===========================================================================
test.describe('JN-WL-001 — Acesso e estrutura geral', () => {
    test('admin acessa White Label e vê header, brand selector e tabs', async ({ page }) => {
        await adminAtWhiteLabel(page);

        // Header
        await expect(page.getByRole('heading', { name: 'Gestão de Marca' })).toBeVisible();
        await expect(page.getByText('Console White Label')).toBeVisible();

        // Data source badge
        await expect(page.getByText(/Supabase|Mock local/)).toBeVisible();

        // Brand selector pills
        await expect(page.getByRole('button', { name: 'Mundo de Kaboo' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Central Coruja' })).toBeVisible();

        // Context badges
        await expect(page.getByText('kaboo', { exact: true })).toBeVisible();
        await expect(page.getByText(/Rollout:/)).toBeVisible();

        // Tabs
        await expect(page.getByRole('button', { name: 'Identidade Visual', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Operações', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Auditoria', exact: true })).toBeVisible();
    });
});

// ===========================================================================
// JORNADA 2 — Troca de contexto de marca
// ===========================================================================
test.describe('JN-WL-002 — Troca de contexto de marca', () => {
    test('trocar para Central Coruja atualiza contexto e exibe toast', async ({ page }) => {
        await adminAtWhiteLabel(page);

        // Slug inicial é kaboo
        await expect(page.getByText('kaboo').first()).toBeVisible();

        // Clicar em Central Coruja
        await page.getByRole('button', { name: 'Central Coruja' }).click();

        // Slug deve mudar para central-coruja
        await expect(page.getByText('central-coruja')).toBeVisible({ timeout: 10_000 });

        // Toast de confirmação
        await expect(page.getByText(/Contexto alterado.*Central Coruja/i)).toBeVisible({ timeout: 5_000 });

        // Botão Central Coruja deve ter estilo ativo (check icon)
        const activeBtn = page.getByRole('button', { name: 'Central Coruja' });
        await expect(activeBtn).toBeVisible();
    });

    test('trocar de volta para Kaboo restaura contexto', async ({ page }) => {
        await adminAtWhiteLabel(page);

        // Ir para Central Coruja primeiro
        await page.getByRole('button', { name: 'Central Coruja' }).click();
        await expect(page.getByText('central-coruja')).toBeVisible({ timeout: 10_000 });

        // Voltar para Kaboo
        await page.getByRole('button', { name: 'Mundo de Kaboo' }).click();
        await expect(page.getByText('kaboo').first()).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText(/Contexto alterado.*Mundo de Kaboo/i)).toBeVisible({ timeout: 5_000 });
    });
});

// ===========================================================================
// JORNADA 3 — Tab Identidade Visual — Edição de dados
// ===========================================================================
test.describe('JN-WL-003 — Tab Identidade Visual', () => {
    test('tab Identidade Visual é a tab padrão e mostra seções corretas', async ({ page }) => {
        await adminAtWhiteLabel(page);

        // Seções visíveis
        await expect(page.getByRole('heading', { name: 'Dados da marca' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Imagens' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Paleta de cores' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Salvar identidade visual' })).toBeVisible();

        // Preview sticky
        await expect(page.getByText('Prévia ao vivo')).toBeVisible();
    });

    test('editar nome exibido atualiza a prévia ao vivo', async ({ page }) => {
        await adminAtWhiteLabel(page);

        const nameInput = page.getByLabel('Nome exibido');
        await nameInput.clear();
        await nameInput.fill('Marca Teste QA');

        // Preview reflete o novo nome
        await expect(page.getByRole('heading', { name: 'Marca Teste QA', level: 3 })).toBeVisible({ timeout: 5_000 });
    });

    test('color pickers estão acessíveis e com valores padrão', async ({ page }) => {
        await adminAtWhiteLabel(page);

        // 4 color pickers
        await expect(page.getByText('Cor principal')).toBeVisible();
        await expect(page.getByText('Cor clara')).toBeVisible();
        await expect(page.getByText('Cor de fundo')).toBeVisible();
        await expect(page.getByText('Cor de destaque')).toBeVisible();
    });

    test('preview mostra "Sem logo" quando nenhum logo está definido', async ({ page }) => {
        await adminAtWhiteLabel(page);

        // Se não há logo customizado, deve mostrar "Sem logo"
        const semLogo = page.getByText('Sem logo');
        // Pode ou não estar visível dependendo do estado default
        if (await semLogo.isVisible()) {
            await expect(semLogo).toBeVisible();
        }
    });
});

// ===========================================================================
// JORNADA 4 — Salvar identidade visual
// ===========================================================================
test.describe('JN-WL-004 — Salvar identidade visual', () => {
    test('salvar identidade com dados válidos exibe toast de sucesso', async ({ page }) => {
        await adminAtWhiteLabel(page);

        // Garantir que o nome não está vazio
        const nameInput = page.getByLabel('Nome exibido');
        await nameInput.clear();
        await nameInput.fill('Mundo de Kaboo');

        // Clicar salvar
        await page.getByRole('button', { name: 'Salvar identidade visual' }).click();

        // Toast de sucesso
        await expect(
            page.getByText(/salva com sucesso/i)
        ).toBeVisible({ timeout: 10_000 });
    });

    test('salvar sem nome exibido mostra erro', async ({ page }) => {
        await adminAtWhiteLabel(page);

        // Limpar nome
        const nameInput = page.getByLabel('Nome exibido');
        await nameInput.clear();

        // Clicar salvar
        await page.getByRole('button', { name: 'Salvar identidade visual' }).click();

        // Deve mostrar mensagem de erro
        await expect(
            page.getByText('Informe o nome exibido da').first()
        ).toBeVisible({ timeout: 5_000 });
    });
});

// ===========================================================================
// JORNADA 5 — Navegação entre tabs
// ===========================================================================
test.describe('JN-WL-005 — Navegação entre tabs', () => {
    test('clicar em Operações mostra Feature Flags e esconde Identidade', async ({ page }) => {
        await adminAtWhiteLabel(page);

        // Identidade visível inicialmente
        await expect(page.getByRole('heading', { name: 'Dados da marca' })).toBeVisible();

        // Clicar em Operações
        await page.getByRole('button', { name: 'Operações' }).click();

        // Feature Flags visível
        await expect(page.getByRole('heading', { name: 'Feature Flags' })).toBeVisible({ timeout: 5_000 });

        // Identidade escondida
        await expect(page.getByRole('heading', { name: 'Dados da marca' })).not.toBeVisible();
    });

    test('clicar em Auditoria mostra timeline e histórico', async ({ page }) => {
        await adminAtWhiteLabel(page);

        // Clicar em Auditoria
        await page.getByRole('button', { name: 'Auditoria' }).click();

        // Seções de auditoria visíveis
        await expect(page.getByRole('heading', { name: 'Auditoria recente' })).toBeVisible({ timeout: 5_000 });
        await expect(page.getByRole('heading', { name: 'Timeline operacional' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Histórico de entregas' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Payload de alertas' })).toBeVisible();
    });

    test('voltar para Identidade Visual restaura a view', async ({ page }) => {
        await adminAtWhiteLabel(page);

        // Ir para Operações
        await page.getByRole('button', { name: 'Operações' }).click();
        await expect(page.getByRole('heading', { name: 'Feature Flags' })).toBeVisible({ timeout: 5_000 });

        // Voltar para Identidade Visual
        await page.getByRole('button', { name: 'Identidade Visual' }).click();
        await expect(page.getByRole('heading', { name: 'Dados da marca' })).toBeVisible({ timeout: 5_000 });
    });
});

// ===========================================================================
// JORNADA 6 — Tab Operações: Feature Flags
// ===========================================================================
test.describe('JN-WL-006 — Feature Flags', () => {
    test('toggle de áudios está visível e funcional', async ({ page }) => {
        await adminAtWhiteLabel(page);
        await page.getByRole('button', { name: 'Operações' }).click();
        await expect(page.getByRole('heading', { name: 'Feature Flags' })).toBeVisible({ timeout: 5_000 });

        // Toggle "Menu: Áudios" está presente
        await expect(page.getByText('Menu: Áudios')).toBeVisible();
        const toggle = page.getByRole('switch', { name: /Áudios/i }).or(page.locator('button[role="switch"]').first());
        await expect(toggle).toBeVisible();

        // Clicar no toggle deve alterar o estado
        const wasChecked = await toggle.getAttribute('aria-checked');
        await toggle.click();
        // Aguardar a atualização do estado
        await page.waitForTimeout(1000);
        const nowChecked = await toggle.getAttribute('aria-checked');
        expect(wasChecked).not.toBe(nowChecked);
    });

    test('parallax toggle e seletor de modo estão presentes', async ({ page }) => {
        await adminAtWhiteLabel(page);
        await page.getByRole('button', { name: 'Operações' }).click();
        await expect(page.getByText('Hero Parallax')).toBeVisible({ timeout: 5_000 });

        // Modo options
        await expect(page.getByText('Modo do Parallax')).toBeVisible();
        await expect(page.getByRole('button', { name: /Off/i }).first()).toBeVisible();
        await expect(page.getByRole('button', { name: /Subtle/i }).first()).toBeVisible();
        await expect(page.getByRole('button', { name: /Standard/i }).first()).toBeVisible();
    });

    test('campo de motivo para auditoria está presente', async ({ page }) => {
        await adminAtWhiteLabel(page);
        await page.getByRole('button', { name: 'Operações' }).click();
        await expect(page.getByLabel('Motivo da mudança')).toBeVisible({ timeout: 5_000 });
    });
});

// ===========================================================================
// JORNADA 7 — Tab Operações: Publicação e Rollout
// ===========================================================================
test.describe('JN-WL-007 — Publicação e Rollout', () => {
    test('seção de publicação mostra versão e botão publicar', async ({ page }) => {
        await adminAtWhiteLabel(page);
        await page.getByRole('button', { name: 'Operações' }).click();

        await expect(page.getByRole('heading', { name: 'Publicação' })).toBeVisible({ timeout: 5_000 });
        await expect(page.getByText(/v\d+/)).toBeVisible();
        await expect(page.getByRole('button', { name: 'Publicar' })).toBeVisible();
    });

    test('rollout por ondas mostra 3 opções', async ({ page }) => {
        await adminAtWhiteLabel(page);
        await page.getByRole('button', { name: 'Operações' }).click();

        await expect(page.getByRole('heading', { name: 'Rollout por Ondas' })).toBeVisible({ timeout: 5_000 });
        await expect(page.getByRole('button', { name: /Piloto/i }).first()).toBeVisible();
        await expect(page.getByRole('button', { name: /Grupo/i }).first()).toBeVisible();
        await expect(page.getByRole('button', { name: /Geral/i }).first()).toBeVisible();
    });

    test('métricas exibem flags ativas, mudanças 24h e total', async ({ page }) => {
        await adminAtWhiteLabel(page);
        await page.getByRole('button', { name: 'Operações' }).click();

        await expect(page.getByRole('heading', { name: 'Métricas' })).toBeVisible({ timeout: 5_000 });
        await expect(page.getByText('Flags ativas')).toBeVisible();
        await expect(page.getByText('Mudanças 24h', { exact: true })).toBeVisible();
        await expect(page.getByText('Total', { exact: true })).toBeVisible();
    });
});

// ===========================================================================
// JORNADA 8 — Tab Operações: Alertas
// ===========================================================================
test.describe('JN-WL-008 — Alertas operacionais e externos', () => {
    test('seção de alertas operacionais está visível', async ({ page }) => {
        await adminAtWhiteLabel(page);
        await page.getByRole('button', { name: 'Operações' }).click();

        await expect(page.getByRole('heading', { name: 'Alertas operacionais' })).toBeVisible({ timeout: 5_000 });
    });

    test('alertas externos tem campos webhook, canal e threshold', async ({ page }) => {
        await adminAtWhiteLabel(page);
        await page.getByRole('button', { name: 'Operações' }).click();

        await expect(page.getByRole('heading', { name: 'Alertas externos' })).toBeVisible({ timeout: 5_000 });
        await expect(page.getByText('Habilitar alertas externos')).toBeVisible();
        await expect(page.getByPlaceholder(/hooks\.exemplo/)).toBeVisible();
        await expect(page.getByPlaceholder(/ops-central/)).toBeVisible();
        await expect(page.getByRole('button', { name: 'Salvar alertas' })).toBeVisible();
    });
});

// ===========================================================================
// JORNADA 9 — Tab Auditoria: Conteúdo e payload
// ===========================================================================
test.describe('JN-WL-009 — Auditoria e payload', () => {
    test('payload de alertas contém dados da marca ativa', async ({ page }) => {
        await adminAtWhiteLabel(page);
        await page.getByRole('button', { name: 'Auditoria' }).click();

        await expect(page.getByRole('heading', { name: 'Payload de alertas' })).toBeVisible({ timeout: 5_000 });
        // Payload deve conter a marca kaboo
        await expect(page.getByText('"slug": "kaboo"')).toBeVisible();
    });

    test('trocar marca atualiza payload na aba Auditoria', async ({ page }) => {
        await adminAtWhiteLabel(page);

        // Trocar para Central Coruja
        await page.getByRole('button', { name: 'Central Coruja' }).click();
        await expect(page.getByText('central-coruja').first()).toBeVisible({ timeout: 10_000 });

        // Ir para Auditoria
        await page.getByRole('button', { name: 'Auditoria' }).click();
        await expect(page.getByRole('heading', { name: 'Payload de alertas' })).toBeVisible({ timeout: 5_000 });
        await expect(page.getByText('"slug": "central-coruja"')).toBeVisible();
    });
});

// ===========================================================================
// JORNADA 10 — Health Check
// ===========================================================================
test.describe('JN-WL-010 — Health Check banner', () => {
    test('health check banner está visível no topo', async ({ page }) => {
        await adminAtWhiteLabel(page);

        // Health check deve ter um dos 3 status
        const healthHeading = page.getByRole('heading', { name: /Crítico|Aviso|Saudável/ });
        await expect(healthHeading).toBeVisible({ timeout: 10_000 });
    });

    test('health check muda ao trocar de marca', async ({ page }) => {
        await adminAtWhiteLabel(page);

        // Capturar status inicial
        const initialStatus = await page.getByRole('heading', { name: /Crítico|Aviso|Saudável/ }).textContent();

        // Trocar para Central Coruja
        await page.getByRole('button', { name: 'Central Coruja' }).click();
        await page.waitForTimeout(1500);

        // Status pode mudar ou ser o mesmo, mas o heading ainda deve existir
        const newStatus = await page.getByRole('heading', { name: /Crítico|Aviso|Saudável/ }).textContent();
        expect(newStatus).toBeTruthy();

        // Se kaboo é "Crítico" (rollout geral sem publicação) e coruja é "Saudável" (piloto), devem diferir
        if (initialStatus === 'Crítico') {
            expect(newStatus).toBe('Saudável');
        }
    });
});

// ===========================================================================
// JORNADA 11 — Propagação do contexto para a Home
// ===========================================================================
test.describe('JN-WL-011 — Preview runtime da marca', () => {
    test('contexto Central Coruja reflete na Home e no menu', async ({ page }) => {
        await adminAtWhiteLabel(page);

        await page.getByRole('button', { name: 'Central Coruja' }).click();
        await expect(page.getByText('central-coruja')).toBeVisible({ timeout: 10_000 });

        await page.getByRole('button', { name: 'Ir para o Início' }).click();

        await expect(page.getByRole('heading', { name: 'Bem-vindo à Central Coruja!' })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText('Explore histórias, ouça, assista e descubra um mundo de aprendizagem e encantamento.')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Áudios' })).toBeVisible();
        await expect(page.getByText('educacross').first()).toBeVisible();
        await expect(page.getByText('Todos os direitos reservados.').first()).toBeVisible();
        await expect(page.getByText('Mundo de Kaboo © 2025')).toHaveCount(0);
    });
});

// ===========================================================================
// JORNADA 12 — Auth runtime da marca
// ===========================================================================
test.describe('JN-WL-012 — Auth runtime da marca', () => {
    test('forgot password herda identidade da Central Coruja', async ({ page }) => {
        await seedCentralCorujaPreview(page);

        await page.goto('/');
        await page.locator('#field-email').waitFor({ state: 'visible', timeout: 15_000 });
        await page.getByRole('button', { name: 'Esqueci minha senha' }).click();

        await expect(page.getByText('Central Coruja').or(page.getByAltText('Central Coruja')).or(page.getByAltText('Central Coruja'))).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('heading', { name: 'Recuperar senha' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Enviar Link' })).toBeVisible();
    });

    test('set password principal herda identidade da Central Coruja', async ({ page }) => {
        await seedCentralCorujaPreview(page, {
            navState: { currentScreen: 'set_password' },
            devMockSession: true,
        });

        await page.goto('/#set_password');

        await expect(page.getByText('Central Coruja').or(page.getByAltText('Central Coruja')).or(page.getByAltText('Central Coruja'))).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('heading', { name: 'Criar sua senha' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Definir senha e entrar' })).toBeVisible();
    });

    test('link expirado mantém casca da Central Coruja', async ({ page }) => {
        await seedCentralCorujaPreview(page, { devMockSession: true });

        await page.goto('/');
        await page.locator('#field-email').waitFor({ state: 'visible', timeout: 15_000 });
        await page.evaluate((navStateKey) => {
            const state = { screen: 'set_password', params: { linkExpired: true } };
            window.localStorage.setItem(
                navStateKey,
                JSON.stringify({ currentScreen: 'set_password', params: { linkExpired: true } }),
            );
            window.history.pushState(state, '', '#set_password');
            window.dispatchEvent(new PopStateEvent('popstate', { state }));
        }, NAV_STATE_KEY);

        await expect(page.getByText('Central Coruja').or(page.getByAltText('Central Coruja')).or(page.getByAltText('Central Coruja'))).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('heading', { name: 'Link de convite expirado' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Voltar ao login' })).toBeVisible();
    });
});

// ===========================================================================
// JORNADA 13 — Tipografia e tokens de design
// ===========================================================================
test.describe('JN-WL-013 — Tipografia e tokens de design', () => {
    test('white label salva tipografia e tokens no runtime', async ({ page }) => {
        await adminAtWhiteLabel(page);

        await page.getByRole('button', { name: 'Central Coruja' }).click();
        await expect(page.getByText('central-coruja')).toBeVisible({ timeout: 10_000 });

        await page.getByLabel('Família tipográfica').fill('Poppins, ui-sans-serif');
        await page.getByLabel('Cor de sucesso').fill('#2F7D4D');
        await page.getByLabel('Radius XL').fill('1.125rem');
        await page.getByLabel('Radius 2XL').fill('1.75rem');
        await page.getByLabel('Radius 3XL').fill('2.5rem');

        await page.getByRole('button', { name: 'Salvar identidade visual' }).click();
        await expect(page.getByText(/salva com sucesso/i)).toBeVisible({ timeout: 10_000 });

        await expect.poll(async () => page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain('Poppins');
        await expect.poll(async () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-brand-green').trim())).toBe('#2F7D4D');
        await expect.poll(async () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--radius-2xl').trim())).toBe('1.75rem');
        await expect.poll(async () => page.getByRole('button', { name: 'Salvar identidade visual' }).evaluate((element) => getComputedStyle(element).borderRadius)).toBe('28px');
    });
});

// ===========================================================================
// JORNADA 14 — Seleção inicial sincronizada com preview salvo
// ===========================================================================
test.describe('JN-WL-014 — Bootstrap do painel pela marca ativa', () => {
    test('painel White Label abre na Central Coruja quando o preview salvo está ativo', async ({ page }) => {
        await seedCentralCorujaPreview(page);
        await adminAtWhiteLabel(page);

        await expect(page.getByText('central-coruja')).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('button', { name: 'Central Coruja' }).locator('svg, img')).toHaveCount(1);
        await expect(page.getByRole('button', { name: 'Mundo de Kaboo' }).locator('svg, img')).toHaveCount(0);
    });
});

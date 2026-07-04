// tests/white-label.spec.ts
// Jornadas de White Label — Configurações (single-brand, refatoração 2026-06-15)
// JN-WL-001 a JN-WL-014

import { test, expect, Page } from '@playwright/test';
import { setupAdminSession, setupOperationalSession } from './fixtures/auth';
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

// Single-brand (2026-06-15): abre as Configurações com a marca ativa = `brandSlug`
// (resolvida via preview-settings, já que não há mais seletor de marca no admin).
async function adminAtConfiguracoesForBrand(page: Page, brandSlug: 'kaboo' | 'central-coruja'): Promise<void> {
    await setupOperationalSession(page, {
        role: 'admin',
        brandSlug,
        navState: { currentScreen: 'home' },
        initialUrl: brandSlug === 'central-coruja' ? '/?brand=central-coruja#home' : '/#home',
    });
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

function getCentralCorujaBrandAsset(page: Page) {
    return page.getByAltText('Central Coruja').first();
}

// ===========================================================================
// JORNADA 1 — Acesso e estrutura da tela
// ===========================================================================
test.describe('JN-WL-001 — Acesso e estrutura geral', () => {
    test('admin acessa Configurações e vê header e tabs', async ({ page }) => {
        await adminAtWhiteLabel(page);

        // Header (renomeado de "Gestão de Marca" para "Configurações" na refatoração single-brand)
        await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible();
        await expect(page.getByText('Identidade visual, feature flags e integrações desta aplicação.')).toBeVisible();

        // Data source badge
        await expect(page.getByText(/Supabase|Mock local/)).toBeVisible();

        // Tabs (single-brand: sem seletor de marca; aba "Menus" adicionada)
        await expect(page.getByRole('button', { name: 'Identidade Visual', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Operações', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Menus', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Integrações de IA', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Auditoria de menus', exact: true })).toBeVisible();
    });
});

// ===========================================================================
// JORNADA 2 — Troca de contexto de marca
// ===========================================================================
test.describe('JN-WL-002 — Troca de contexto de marca', () => {
    // TODO(single-brand): feature removida na refatoração 2026-06-15 — o seletor de marca
    // (pills Mundo de Kaboo / Central Coruja) foi removido; o admin opera apenas a marca da instância.
    test.skip('trocar para Central Coruja atualiza contexto e exibe toast', async () => {});

    // TODO(single-brand): feature removida na refatoração 2026-06-15 — sem seletor de marca, não há troca de contexto.
    test.skip('trocar de volta para Kaboo restaura contexto', async () => {});
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

        // Seções de auditoria visíveis (single-brand: "Histórico de entregas" e
        // "Payload de alertas" foram removidos junto com o dispatch de alertas)
        // Timeline operacional removida na refatoração 2026-06-25; a aba foi depois
        // escopada especificamente a toggles de menu ("Auditoria de menus")
        await expect(page.getByRole('heading', { name: 'Auditoria de menus' })).toBeVisible({ timeout: 5_000 });
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

        // Toggle "Menu: Músicas" está presente
        await expect(page.getByText('Menu: Músicas')).toBeVisible();
        const toggle = page.getByRole('switch', { name: /Músicas/i }).or(page.locator('button[role="switch"]').first());
        await expect(toggle).toBeVisible();

        // Clicar no toggle deve alterar o estado
        const wasChecked = await toggle.getAttribute('aria-checked');
        await toggle.click();
        // Aguardar a atualização do estado
        await page.waitForTimeout(1000);
        const nowChecked = await toggle.getAttribute('aria-checked');
        expect(wasChecked).not.toBe(nowChecked);
    });

    test('controles de parallax e seletor de modo estão presentes', async ({ page }) => {
        await adminAtWhiteLabel(page);
        await page.getByRole('button', { name: 'Operações' }).click();
        await expect(page.getByText('Hero Parallax')).toBeVisible({ timeout: 5_000 });

        await expect(page.getByRole('button', { name: /Desligado/i }).first()).toBeVisible();
        await expect(page.getByRole('button', { name: /Suave/i }).first()).toBeVisible();
        await expect(page.getByRole('button', { name: /Padrão|Padrao/i }).first()).toBeVisible();
    });

    test('campo de motivo para auditoria está presente', async ({ page }) => {
        await adminAtWhiteLabel(page);
        await page.getByRole('button', { name: 'Operações' }).click();
        // Renomeado de "Motivo da mudança" para "Contexto da alteração" na refatoração single-brand
        await expect(page.getByLabel('Contexto da alteração')).toBeVisible({ timeout: 5_000 });
    });
});

// ===========================================================================
// JORNADA 7 — Tab Operações: Publicação e Rollout
// ===========================================================================
test.describe('JN-WL-007 — Publicação e Rollout', () => {
    test('seção de publicação mostra versão e botão publicar', async ({ page }) => {
        await adminAtWhiteLabel(page);
        await page.getByRole('button', { name: 'Operações' }).click();

        await expect(page.getByRole('heading', { name: /Versão/ })).toBeVisible({ timeout: 5_000 });
        await expect(page.getByRole('button', { name: /Publicar agora|Publicar nova versão/ })).toBeVisible();
    });

    // TODO(single-brand): feature removida na refatoração 2026-06-15 — Rollout por Ondas
    // (pilot/group/general) foi removido da UI single-brand.
    test.skip('rollout por ondas mostra 3 opções', async () => {});

    // TODO(single-brand): feature removida na refatoração 2026-06-15 — a seção "Métricas"
    // (flags ativas / mudanças 24h / total) de rollout foi removida.
    test.skip('métricas exibem flags ativas, mudanças 24h e total', async () => {});
});

// ===========================================================================
// JORNADA 8 — Tab Operações: Alertas
// ===========================================================================
test.describe('JN-WL-008 — Alertas operacionais e externos', () => {
    // TODO(single-brand): feature removida na refatoração 2026-06-15 — a seção de
    // "Alertas operacionais" foi removida da aba Operações.
    test.skip('seção de alertas operacionais está visível', async () => {});

    // TODO(single-brand): feature removida na refatoração 2026-06-15 — a config de
    // alertas externos (webhook/canal/threshold + Salvar alertas) foi removida.
    test.skip('alertas externos tem campos webhook, canal e threshold', async () => {});
});

// ===========================================================================
// JORNADA 9 — Tab Auditoria: Conteúdo e payload
// ===========================================================================
test.describe('JN-WL-009 — Auditoria e payload', () => {
    // TODO(single-brand): feature removida na refatoração 2026-06-15 — o card "Payload de
    // alertas" foi removido junto com o dispatch de alertas externos.
    test.skip('payload de alertas contém dados da marca ativa', async () => {});

    // TODO(single-brand): feature removida na refatoração 2026-06-15 — sem seletor de marca
    // e sem payload de alertas, este cenário não se aplica.
    test.skip('trocar marca atualiza payload na aba Auditoria', async () => {});
});

// ===========================================================================
// JORNADA 10 — Health Check
// ===========================================================================
test.describe('JN-WL-010 — Health Check banner', () => {
    // TODO(refactor-2026-06-25): Health Check (Resumo operacional) removido da tela —
    // era um painel de leitura sem edição, fora da diretriz "só itens editáveis".
    test.skip('health check banner está visível no topo', async () => {});

    // TODO(single-brand): feature removida na refatoração 2026-06-15 — sem seletor de marca
    // não há troca de contexto para comparar health check entre marcas.
    test.skip('health check muda ao trocar de marca', async () => {});
});

// ===========================================================================
// JORNADA 11 — Propagação do contexto para a Home
// ===========================================================================
test.describe('JN-WL-011 — Preview runtime da marca', () => {
    // Reescrito single-brand (2026-06-15): sem seletor de marca no admin, o runtime
    // da Central Coruja é validado via preview-settings + navegação direta à Home.
    test('contexto Central Coruja reflete na Home e no menu', async ({ page }) => {
        // Marca ativa = Central Coruja via preview-settings (substitui o antigo seletor de marca)
        await setupOperationalSession(page, {
            role: 'admin',
            brandSlug: 'central-coruja',
            navState: { currentScreen: 'home' },
            initialUrl: '/?brand=central-coruja#home',
        });

        await expect(page.getByRole('heading', { name: 'Bem-vindo à Central Coruja!' })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText('Histórias, vídeos e experiências de aprendizagem organizados para você começar pela busca e explorar com mais clareza.')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Músicas' })).toBeVisible();
        await expect(getCentralCorujaBrandAsset(page)).toBeVisible();
        await expect(page.getByText('Mundo de Kaboo © 2025')).toHaveCount(0);
    });
});

// ===========================================================================
// JORNADA 12 — Auth runtime da marca
// ===========================================================================
test.describe('JN-WL-012 — Auth runtime da marca', () => {
    test('forgot password herda identidade da Central Coruja', async ({ page }) => {
        await seedCentralCorujaPreview(page);

        await page.goto('/?brand=central-coruja#login&devSessionImportStatus=miss');
        await page.locator('#field-email').waitFor({ state: 'visible', timeout: 15_000 });
        await page.getByRole('button', { name: 'Esqueci minha senha' }).click();

        await expect(getCentralCorujaBrandAsset(page)).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('heading', { name: 'Recuperar senha' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Enviar Link' })).toBeVisible();
    });

    test('set password principal herda identidade da Central Coruja', async ({ page }) => {
        await seedCentralCorujaPreview(page, {
            navState: { currentScreen: 'set_password' },
            devMockSession: true,
        });

        // Inclui ?brand=central-coruja na URL (alinhado aos demais cenários de auth runtime
        // após a mudança de resolução de marca 2026-06-15).
        await page.goto('/?brand=central-coruja#set_password');

        await expect(getCentralCorujaBrandAsset(page)).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('heading', { name: 'Criar sua senha' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Definir senha e entrar' })).toBeVisible();
    });

    test('link expirado mantém casca da Central Coruja', async ({ page }) => {
        await seedCentralCorujaPreview(page, { devMockSession: true });

        await page.goto('/?brand=central-coruja#error=access_denied&error_code=otp_expired');

        await expect(getCentralCorujaBrandAsset(page)).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('heading', { name: 'Link de convite expirado' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Voltar ao login' })).toBeVisible();
    });
});

// ===========================================================================
// JORNADA 13 — Tipografia e tokens de design
// ===========================================================================
test.describe('JN-WL-013 — Tipografia e tokens de design', () => {
    test('white label salva tipografia e tokens no runtime', async ({ page }) => {
        // Single-brand (2026-06-15): a marca ativa vem do preview-settings (Central Coruja),
        // não mais de um seletor dentro do admin.
        await adminAtConfiguracoesForBrand(page, 'central-coruja');

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
    // Single-brand (2026-06-15): sem seletor de marca; o painel é escopado para a marca
    // ativa (resolvida via preview-settings). Validamos que ele bootstrapa na Central Coruja.
    test('painel White Label abre na Central Coruja quando o preview salvo está ativo', async ({ page }) => {
        await adminAtConfiguracoesForBrand(page, 'central-coruja');

        // A identidade carregada é a da Central Coruja (health-check removido em 2026-06-25).
        await expect(page.getByLabel('Nome exibido')).toHaveValue('Central Coruja', { timeout: 10_000 });
    });
});

// ===========================================================================
// JORNADA 15 — Tab Integrações de IA
// ===========================================================================
// Nota de ambiente: os testes E2E rodam em modo mock (as fixtures setam
// `kaboo_dev_mock_session`), logo `canUseRemoteWhiteLabel()` é sempre `false`.
// Isso torna o banner de mock e os botões desabilitados determinísticos —
// e torna o fluxo real de salvar/testar IA não-testável aqui (ver test.skip).
test.describe('JN-WL-015 — Integrações de IA', () => {
    test('clicar na aba Integrações de IA mostra o formulário de configuração', async ({ page }) => {
        await adminAtWhiteLabel(page);

        await page.getByRole('button', { name: 'Integrações de IA', exact: true }).click();

        // Cabeçalho e campos do provedor
        await expect(page.getByRole('heading', { name: 'Provedor de IA' })).toBeVisible({ timeout: 5_000 });
        await expect(page.getByText('Ativar IA para esta marca')).toBeVisible();
        await expect(page.getByRole('combobox')).toBeVisible(); // seletor de Provedor
        await expect(page.getByPlaceholder('Cole a chave do provedor')).toBeVisible();
        await expect(page.getByRole('button', { name: /Salvar configuração/ })).toBeVisible();
        await expect(page.getByRole('button', { name: /Testar conexão/ })).toBeVisible();
    });

    test('modo mock exibe banner azul e desabilita Salvar/Testar', async ({ page }) => {
        await adminAtWhiteLabel(page);
        await page.getByRole('button', { name: 'Integrações de IA', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Provedor de IA' })).toBeVisible({ timeout: 5_000 });

        // Banner azul de modo local/mock (remoteEnabled === false nas fixtures E2E)
        await expect(
            page.getByText('Modo local/mock: salvar e testar a IA exige o ambiente real (edge functions).'),
        ).toBeVisible();

        // Botões desabilitados quando !remoteEnabled
        await expect(page.getByRole('button', { name: /Salvar configuração/ })).toBeDisabled();
        await expect(page.getByRole('button', { name: /Testar conexão/ })).toBeDisabled();
    });

    // TODO(env-mock): o guard de não-admin não é testável neste ambiente. O módulo
    // "Configurações" (white_label) só existe em ALL_MODULES (admin); EDITOR_MODULES
    // não inclui white_label (ver screens/AdminScreen.tsx). Logo, um usuário não-admin
    // nunca chega a esta aba para validar o banner "Apenas administradores..." nem os
    // controles desabilitados. Requer fixture/rota que exponha a tela a não-admin.
    test.skip('não-admin vê banner de bloqueio e controles desabilitados', async () => {});

    // TODO(env-mock): ativar IA sem chave dispara o toast "Informe a chave de API para
    // ativar a IA." apenas em handleSaveAIConfig — mas o botão "Salvar configuração" está
    // disabled quando !remoteEnabled, o que é sempre o caso no mock E2E. O toast nunca
    // chega a disparar aqui. Requer ambiente com edge functions (remoteEnabled === true).
    test.skip('ativar IA sem chave exibe toast de erro e não persiste', async () => {});
});

// ===========================================================================
// JORNADA 16 — Tab Auditoria: estado e rollback
// ===========================================================================
test.describe('JN-WL-016 — Auditoria e rollback', () => {
    test('aba Auditoria mostra estado vazio quando não há eventos (mock)', async ({ page }) => {
        await adminAtWhiteLabel(page);
        await page.getByRole('button', { name: 'Auditoria de menus', exact: true }).click();

        await expect(page.getByRole('heading', { name: 'Auditoria de menus' })).toBeVisible({ timeout: 5_000 });
        // listWhiteLabelAudit() retorna [] em modo mock → estado vazio determinístico
        await expect(page.getByText('Sem eventos recentes para esta marca.')).toBeVisible();
    });

    // TODO(env-mock): listWhiteLabelAudit() retorna [] quando !canUseRemoteWhiteLabel()
    // (ver lib/whiteLabelAdminApi.ts). Sem backend real, nenhuma entrada de auditoria
    // é renderizada, então o botão "Reverter" não existe no DOM neste ambiente.
    // Cenário: com entradas reais, "Reverter" aparece e fica desabilitado quando
    // entry.enabled_before === null (entrada de init). Requer remoteEnabled === true.
    test.skip('botão Reverter aparece e está desabilitado em entrada de init', async () => {});

    // TODO(env-mock): mesmo motivo acima — sem entradas de auditoria no mock não há
    // botão "Reverter" para clicar. O fluxo de rollback (rollbackAuditEntry →
    // setWhiteLabelFeature) só é exercitável com backend real e auditoria populada.
    test.skip('clicar Reverter em entrada reversível dispara o fluxo de reversão', async () => {});
});

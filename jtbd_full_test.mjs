import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function runTests() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const results = [];
  const screenshotDir = 'test-results/qa-jtbd';

  const logResult = async (jtbd, status, message, severity = 'INFO') => {
    const screenshotName = 'jtbd-' + jtbd.replace('.', '-') + '.png';
    const screenshotPath = path.join(screenshotDir, screenshotName);
    try {
        await page.screenshot({ path: screenshotPath });
    } catch (e) {}
    console.log('CHECK|' + jtbd + '|' + status + '|' + message);
    results.push({ jtbd, status, message, severity, screenshot: screenshotPath });
  };

  try {
    await page.goto('http://127.0.0.1:4100', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Injetar mock user
    await page.evaluate(() => {
      localStorage.setItem('user', JSON.stringify({ email: 'demo@mundodekaboo.local', role: 'admin', name: 'Demo User' }));
      localStorage.setItem('auth_token', 'mock-token');
    });
    await page.reload({ waitUntil: 'networkidle' });

    // 5.1 Perfil Edit
    await page.goto('http://127.0.0.1:4100/profile', { waitUntil: 'networkidle' }).catch(() => {});
    const nameInput = page.locator('input[name="name"], input[value="Demo User"]');
    if (await nameInput.isVisible()) {
        await logResult('5.1', 'PASS', 'Campo de perfil encontrado');
    } else {
        await logResult('5.1', 'FAIL', 'Campo de perfil não encontrado', 'CRÍTICO');
    }

    // Voltar para Home
    await page.goto('http://127.0.0.1:4100/home', { waitUntil: 'networkidle' });
    
    // Tentar encontrar um card de conteúdo
    const card = page.locator('.content-card, .card, a[href*="/details/"]').first();
    if (await card.isVisible()) {
        await card.click();
        await page.waitForTimeout(2000);

        // 3.1 Flipbook
        const lerBtn = page.locator('button:has-text("Leitura"), .btn-read');
        if (await lerBtn.isVisible()) {
            await lerBtn.click();
            await page.waitForTimeout(2000);
            const pdf = page.locator('canvas, .pdf-viewer, .flipbook');
            if (await pdf.isVisible()) {
                await logResult('3.1', 'PASS', 'Flipbook aberto e PDF visível');
                
                // 3.2 Modo Texto
                const textToggle = page.locator('button:has-text("Modo Texto"), .toggle-text');
                if (await textToggle.isVisible()) {
                    await textToggle.click();
                    await logResult('3.2', 'PASS', 'Modo texto ativado');
                } else {
                   await logResult('3.2', 'FAIL', 'Toggle modo texto não encontrado', 'MÉDIO');
                }
            } else {
                await logResult('3.1', 'FAIL', 'PDF/Flipbook não renderizado', 'CRÍTICO');
            }
            await page.goBack();
        }

        // 3.3 Audio
        const audioBtn = page.locator('button:has-text("Contação"), button:has-text("Áudio"), .btn-audio');
        if (await audioBtn.isVisible()) {
            await audioBtn.click();
            await page.waitForTimeout(2000);
            if (await page.locator('audio, .audio-player').isVisible()) {
                await logResult('3.3', 'PASS', 'Player de áudio visível');
            } else {
                await logResult('3.3', 'FAIL', 'Player de áudio falhou ao abrir', 'CRÍTICO');
            }
            await page.goBack();
        }

        // 3.4 Video
        const videoBtn = page.locator('button:has-text("Desenho Animado"), .btn-video');
        if (await videoBtn.isVisible()) {
            await videoBtn.click();
            await page.waitForTimeout(2000);
            if (await page.locator('video, .video-player').isVisible()) {
                await logResult('3.4', 'PASS', 'Video player visível');
            } else {
                await logResult('3.4', 'FAIL', 'Video falhou ao abrir', 'CRÍTICO');
            }
            await page.goBack();
        }

        // 3.5 Libras
        const librasBtn = page.locator(':has-text("Libras")');
        if (await librasBtn.isVisible()) {
            await logResult('3.5', 'PASS', 'Botão Libras encontrado');
        } else {
            await logResult('3.5', 'FAIL', 'Botão Libras ausente (esperado v1.3)', 'BAIXO');
        }

        // 3.6 IA/Animado
        const iaBadge = page.locator(':has-text("IA"), :has-text("Animado")');
        if (await iaBadge.isVisible()) {
            await logResult('3.6', 'PASS', 'Badge IA/Animado encontrado');
        } else {
            await logResult('3.6', 'FAIL', 'Badge IA/Animado ausente', 'BAIXO');
        }

        // 3.7 Materiais
        const materiais = page.locator(':has-text("Materiais de Apoio"), :has-text("Materiais por Componente")');
        if (await materiais.isVisible()) {
            await logResult('3.7', 'PASS', 'Seção de materiais encontrada');
        } else {
            await logResult('3.7', 'FAIL', 'Materiais de apoio não encontrados', 'MÉDIO');
        }

    } else {
        console.log('ERROR|GLOBAL|BLOCKER|Nenhum card de conteúdo encontrado na home');
    }

    // 5.2 Recuperar Senha
    await page.goto('http://127.0.0.1:4100/login');
    const forgotLink = page.locator('a:has-text("Esqueci"), a:has-text("password")');
    if (await forgotLink.isVisible()) {
        await forgotLink.click();
        await logResult('5.2', 'PASS', 'Tela de recuperar senha acessível');
    } else {
        await logResult('5.2', 'FAIL', 'Link esqueci a senha não encontrado', 'MÉDIO');
    }

    // 5.3-5.5 Infantil
    await page.goto('http://127.0.0.1:4100/profile');
    const childProfile = page.locator(':has-text("Adicionar Criança"), :has-text("Perfil Infantil")');
    if (await childProfile.isVisible()) {
        await logResult('5.3', 'PASS', 'Perfil infantil implementado (inesperado)');
    } else {
        await logResult('5.3', 'FAIL', 'Perfil infantil ausente (esperado v2.0)', 'INFO');
    }

  } catch (error) {
    console.error('FINAL_ERROR|' + error.message);
  } finally {
    await browser.close();
    console.log('RESULTS_JSON_START');
    console.log(JSON.stringify(results, null, 2));
    console.log('RESULTS_JSON_END');
  }
}
runTests();

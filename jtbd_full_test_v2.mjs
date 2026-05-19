import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function runTests() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const results = [];
  const screenshotDir = 'test-results/qa-jtbd';
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

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
    await page.goto('http://127.0.0.1:4100', { waitUntil: 'networkidle' });
    
    // 5.2 Recuperar Senha (na tela de login)
    const forgotLink = page.locator('text=Esqueci minha senha');
    if (await forgotLink.isVisible()) {
        await forgotLink.click();
        await page.waitForTimeout(1000);
        if (page.url().includes('forgot') || await page.locator('text=Recuperar').isVisible()) {
            await logResult('5.2', 'PASS', 'Tela de recuperar senha acessível');
        } else {
            await logResult('5.2', 'FAIL', 'Clique não levou à tela de recuperação', 'MÉDIO');
        }
        await page.goto('http://127.0.0.1:4100'); // volta
    } else {
        await logResult('5.2', 'FAIL', 'Link "Esqueci minha senha" não encontrado', 'MÉDIO');
    }

    // Login via mock
    await page.evaluate(() => {
      localStorage.setItem('auth_user', JSON.stringify({ email: 'demo@mundodekaboo.local', role: 'admin', name: 'Demo User' }));
      localStorage.setItem('auth_token', 'mock-token');
      window.location.href = '/';
    });
    await page.waitForTimeout(2000);

    // 5.1 Perfil
    const profileTrigger = page.locator('a[href*="profile"], button:has-text("Perfil"), .user-menu');
    if (await profileTrigger.isVisible()) {
        await profileTrigger.click();
        await page.waitForTimeout(1000);
        await logResult('5.1', 'PASS', 'Tela de perfil acessível');
        
        // 5.3-5.5 Infantil
        const childProfile = page.locator('text=Adicionar Criança, text=Perfil Infantil');
        if (await childProfile.count() > 0) {
            await logResult('5.3', 'PASS', 'Perfil infantil implementado');
        } else {
            await logResult('5.3', 'FAIL', 'Perfil infantil ausente (esperado v2.0)', 'INFO');
        }
    } else {
        await logResult('5.1', 'FAIL', 'Botão de perfil não encontrado', 'CRÍTICO');
    }

    // Home e Conteúdo - Tenta achar cards
    await page.goto('http://127.0.0.1:4100', { waitUntil: 'networkidle' });
    const card = page.locator('a[href*="content"], a[href*="details"], .card').first();
    if (await card.isVisible()) {
        await card.click();
        await page.waitForTimeout(2000);

        // JTBD 3.1 - 3.7
        const checkElement = async (jtbd, selector, name, sev = 'MÉDIO') => {
            const loc = page.locator(selector);
            if (await loc.first().isVisible()) {
                await logResult(jtbd, 'PASS', name + ' encontrado');
                return true;
            } else {
                await logResult(jtbd, 'FAIL', name + ' ausente', sev);
                return false;
            }
        };

        await checkElement('3.1', 'text=Leitura, button:has-text("Ler")', 'Flipbook/Leitura');
        await checkElement('3.3', 'text=Contação, text=Áudio', 'Áudio/Contação');
        await checkElement('3.4', 'text=Vídeo, text=Assistir', 'Vídeo');
        await checkElement('3.5', 'text=Libras', 'Libras', 'BAIXO');
        await checkElement('3.6', 'text=IA, text=Animado', 'Badge IA/Animado', 'BAIXO');
        await checkElement('3.7', 'text=Materiais', 'Materiais de Apoio');

    } else {
        console.log('ERROR|GLOBAL|BLOCKER|Nenhum conteúdo interativo encontrado para testar 3.x');
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

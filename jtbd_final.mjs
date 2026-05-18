import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function runTests() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const results = [];
  const screenshotDir = 'test-results/qa-jtbd';
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  const logResult = async (jtbd, status, message, severity = 'MÉDIO') => {
    const sn = jtbd.replace('.', '-') + '.png';
    const sp = path.join(screenshotDir, sn);
    try { await page.screenshot({ path: sp }); } catch (e) {}
    results.push({ jtbd, status, message, severity, screenshot: sp });
    console.log(`CHECK|JTBD-${jtbd}|${status}|${message}`);
  };

  try {
    await page.goto('http://127.0.0.1:4100');
    // Mock robusto
    await page.evaluate(() => {
      const mockU = { 
        id: 'mock-admin', 
        email: 'demo@mundodekaboo.local', 
        role: 'admin', 
        profile: { 
            id: 'mock-admin', 
            full_name: 'Demo Admin', 
            role: 'admin',
            access_status: 'active' 
        } 
      };
      localStorage.setItem('kaboo_mock_users', JSON.stringify([mockU]));
      localStorage.setItem('kaboo_mock_session_user_id', 'mock-admin');
      localStorage.setItem('kaboo_mock_collections', JSON.stringify([{ id: '1', title: 'Coleção Teste', slug: 'teste' }]));
    });
    
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // JTBD 3.0 / 3.x Consumo
    const firstContent = page.locator('a[href*="/contents/"], .content-card').first();
    if (await firstContent.isVisible()) {
        await logResult('3.0', 'PASS', 'Cards de conteúdo disponíveis');
        await firstContent.click();
        await page.waitForTimeout(2000);

        const text = await page.textContent('body');
        const check = async (id, term, label) => {
            if (text.includes(term)) await logResult(id, 'PASS', `${label} disponível`);
            else await logResult(id, 'FAIL', `${label} não encontrado no DetailsScreen`, 'MÉDIO');
        };

        await check('3.1', 'Leitura', 'Leitura/Flipbook');
        await check('3.3', 'Contação', 'Áudio/Contação');
        await check('3.4', 'Desenho', 'Vídeo/Desenho');
        await check('3.7', 'Materiais', 'Materiais de Apoio');
        
        // V1.3 Check
        if (text.includes('Libras')) await logResult('3.5', 'PASS', 'Libras detectado');
        else await logResult('3.5', 'AUSENTE', 'Libras (v1.3) ausente', 'INFO');
    }

    // JTBD 5.1 Perfil
    await page.goto('http://127.0.0.1:4100/profile').catch(() => {});
    await page.waitForTimeout(1000);
    if (await page.locator('input').count() > 0) {
        await logResult('5.1', 'PASS', 'Tela de Perfil acessível');
    }

    // JTBD 5.2 Esqueci Senha (Login Screen)
    await page.evaluate(() => localStorage.clear());
    await page.goto('http://127.0.0.1:4100');
    await page.waitForTimeout(1000);
    const forgot = page.locator('text=Esqueci minha senha');
    if (await forgot.isVisible()) await logResult('5.2', 'PASS', 'Esqueci Senha visível');
    else await logResult('5.2', 'FAIL', 'Esqueci Senha não encontrado no login', 'BAIXO');

  } catch (err) { console.log('ERROR:', err.message); }
  finally {
    await browser.close();
    process.stdout.write('RESULTS_JSON_START' + JSON.stringify(results) + 'RESULTS_JSON_END\n');
  }
}
runTests();

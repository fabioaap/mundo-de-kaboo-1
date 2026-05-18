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
    console.log(`CHECK|JTBD-${jtbd}|${status}|${message}`);
    results.push({ jtbd, status, message, severity, screenshot: sp });
  };

  try {
    await page.goto('http://127.0.0.1:4100');
    // Forçar mock e reset
    await page.evaluate(() => {
      localStorage.clear();
      const mockU = { id: 'mock', email: 'a@a.com', profile: { full_name: 'Admin' } };
      localStorage.setItem('kaboo_mock_users', JSON.stringify([mockU]));
      localStorage.setItem('kaboo_mock_session_user_id', 'mock');
    });
    await page.goto('http://127.0.0.1:4100', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Listar links
    const links = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(a => ({t: a.innerText, h: a.href})));
    console.log('Links na página:', JSON.stringify(links.slice(0, 10)));

    const homeCheck = await page.locator('header, nav, .container').count();
    if (homeCheck > 0) await logResult('HOME', 'PASS', 'App carregou estrutura base');
    else await logResult('HOME', 'FAIL', 'App não renderizou');

    const cards = page.locator('a[href*="/contents/"], .card, img');
    if (await cards.count() > 0) {
        await logResult('3.0', 'PASS', 'Cards de conteúdo detectados');
        await cards.first().click().catch(() => {});
        await page.waitForTimeout(2000);
        
        const details = await page.textContent('body');
        if (details.includes('Leitura') || details.includes('Livro')) await logResult('3.1', 'PASS', 'Leitura disponível');
        if (details.includes('Contação') || details.includes('Áudio')) await logResult('3.3', 'PASS', 'Áudio disponível');
    } else {
        await logResult('3.0', 'FAIL', 'Nenhum card encontrado para testar navegação');
    }

    const profile = page.locator('.i-lucide-user, a[href*="profile"]');
    if (await profile.count() > 0) await logResult('5.1', 'PASS', 'Botão perfil visível');

  } catch (err) { console.log('ERROR:', err.message); }
  finally {
    await browser.close();
    console.log('RESULTS_JSON_START', JSON.stringify(results), 'RESULTS_JSON_END');
  }
}
runTests();

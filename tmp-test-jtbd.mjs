import { chromium } from 'playwright';
import fs from 'fs';

async function runTests() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const findings = [];

  const screenshot = async (name) => {
    if (!fs.existsSync('test-results')) fs.mkdirSync('test-results');
    const path = 'test-results/screenshot-' + name + '.png';
    await page.screenshot({ path });
    return path;
  };

  try {
    await page.goto('http://127.0.0.1:4100', { timeout: 30000 });
    
    // Login
    await page.fill('input[type="email"]', 'demo@mundodekaboo.local');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Entrar em um livro para testar JTBD 3.x
    console.log('Accessing content...');
    const contentCard = page.locator('.content-card, .card, a:has-text("Livros")').first();
    await contentCard.click();
    await page.waitForTimeout(3000);

    const check = async (jtbd, label, selector) => {
        const visible = await page.locator(selector).isVisible();
        findings.push({jtbd, status: visible ? 'pass' : 'fail', evidence: label + (visible ? ' encontrado' : ' não encontrado'), screenshot_path: await screenshot('jtbd'+jtbd)});
    };

    await check('3.1', 'Botão Leitura', 'button:has-text("Leitura")');
    await check('3.3', 'Player de Áudio', 'audio, .audio-player');
    await check('3.7', 'Materiais', 'button:has-text("Materiais"), :has-text("Materiais de Apoio")');
    await check('5.1', 'Perfil', 'button:has-text("Olá"), :has-text("demo@")');

  } catch (error) {
    console.error(error);
  } finally {
    await browser.close();
    console.log('RESULTS_START');
    console.log(JSON.stringify(findings, null, 2));
    console.log('RESULTS_END');
  }
}
runTests();

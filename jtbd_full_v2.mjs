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
    const screenshotName = jtbd.replace('.', '-') + '.png';
    const screenshotPath = path.join(screenshotDir, screenshotName);
    try { await page.screenshot({ path: screenshotPath }); } catch (e) {}
    console.log(`CHECK|JTBD-${jtbd}|${status}|${message}`);
    results.push({ jtbd, status, message, severity, screenshot: screenshotPath });
  };

  try {
    await page.goto('http://127.0.0.1:4100');
    // Inject Mock
    await page.evaluate(() => {
      const mockUser = {
        id: 'mock-admin',
        email: 'demo@mundodekaboo.local',
        role: 'admin',
        profile: { id: 'mock-admin', full_name: 'Demo Admin', email: 'demo@mundodekaboo.local', role: 'admin' }
      };
      localStorage.setItem('kaboo_mock_users', JSON.stringify([mockUser]));
      localStorage.setItem('kaboo_mock_session_user_id', 'mock-admin');
      localStorage.setItem('kaboo_mock_collections', JSON.stringify([{ id: '1', title: 'Coleção Teste', slug: 'teste' }]));
    });
    
    await page.reload({ waitUntil: 'networkidle' });

    // 5.2 - Esqueci Senha
    const forgot = page.locator('text=Esqueci minha senha');
    if (await forgot.isVisible()) {
        await logResult('5.2', 'PASS', 'Link recuperação visível');
    } else {
        await logResult('5.2', 'FAIL', 'Link recuperação não encontrado na Home/Login', 'BAIXO');
    }

    // 5.1 - Perfil
    const profileBtn = page.locator('a[href*="/profile"], .i-lucide-user').first();
    if (await profileBtn.isVisible()) {
        await profileBtn.click();
        await page.waitForTimeout(1000);
        await logResult('5.1', 'PASS', 'Acesso ao Perfil OK');
    }

    // JTBD 3.x - Conteúdo
    await page.goto('http://127.0.0.1:4100', { waitUntil: 'networkidle' });
    const card = page.locator('.content-card, a[href*="/contents/"]').first();
    if (await card.isVisible()) {
        await card.click();
        await page.waitForTimeout(1500);

        const checkEle = async (jtbd, label, selector, sev = 'MÉDIO') => {
           if (await page.locator(selector).first().isVisible()) await logResult(jtbd, 'PASS', label + ' OK');
           else await logResult(jtbd, 'FAIL', label + ' ausente', sev);
        };

        await checkEle('3.1', 'Leitura', 'text=Leitura');
        await checkEle('3.3', 'Áudio', 'text=Contação');
        await checkEle('3.4', 'Vídeo', 'text=Desenho');
        await checkEle('3.7', 'Materiais', 'text=Materiais');
        
        // V1.3/V2.0 checks
        const bodyTxt = await page.textContent('body');
        if (bodyTxt.includes('Libras')) await logResult('3.5', 'PASS', 'Libras OK');
        else await logResult('3.5', 'AUSENTE', 'Libras não implementada', 'INFO');
        
        if (bodyTxt.includes('Criança') || bodyTxt.includes('Infantil')) await logResult('5.3', 'PASS', 'Infantil OK');
        else await logResult('5.3', 'AUSENTE', 'Modo Infantil inexistente', 'INFO');
    } else {
        await logResult('3.0', 'FAIL', 'Nenhum card de conteúdo para testar consumo', 'ALTO');
    }

  } catch (err) { console.error(err); }
  finally {
    await browser.close();
    console.log('RESULTS_JSON_START', JSON.stringify(results), 'RESULTS_JSON_END');
  }
}
runTests();

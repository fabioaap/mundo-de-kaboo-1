import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function runTests() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();
  
  const results = [];
  const screenshotDir = 'test-results/qa-jtbd';
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  const logResult = async (jtbd, status, message, severity = 'MÉDIO') => {
    const screenshotName = jtbd.replace('.', '-') + '.png';
    const screenshotPath = path.join(screenshotDir, screenshotName);
    try { await page.screenshot({ path: screenshotPath }); } catch (e) {}
    console.log(CHECK|JTBD-||);
    results.push({ jtbd, status, message, severity, screenshot: screenshotPath });
  };

  try {
    // 1 & 2 & 3. Inject Mock and Go
    await page.goto('http://127.0.0.1:4100');
    await page.evaluate(() => {
      const mockUser = {
        id: 'mock-admin',
        email: 'demo@mundodekaboo.local',
        password: '123456',
        role: 'admin',
        created_at: new Date().toISOString(),
        profile: {
          id: 'mock-admin',
          full_name: 'Demo Admin',
          email: 'demo@mundodekaboo.local',
          avatar_id: 'Kaboo',
          role: 'admin',
          voucher_id: null,
          access_starts_at: new Date().toISOString(),
          access_expires_at: new Date(Date.now() + 7776000000).toISOString(),
          access_status: 'active'
        }
      };
      localStorage.setItem('kaboo_mock_users', JSON.stringify([mockUser]));
      localStorage.setItem('kaboo_mock_session_user_id', 'mock-admin');
    });
    
    await page.reload({ waitUntil: 'networkidle' });
    
    // 4. HomeScreen Wait
    const homeFound = await page.waitForSelector('text=Explora, text=Suas coleções', { timeout: 10000 }).catch(() => null);
    if (!homeFound) {
       await logResult('0.0', 'FAIL', 'HomeScreen não carregou', 'CRÍTICO');
    }

    // JTBD 5.2 - Esqueci Senha (precisa estar deslogado ou tela inicial)
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    const forgot = page.locator('text=Esqueci minha senha');
    if (await forgot.isVisible()) {
        await forgot.click();
        await page.waitForTimeout(500);
        await logResult('5.2', 'PASS', 'Recuperação de senha acessível');
        await page.goBack();
    } else {
        await logResult('5.2', 'FAIL', 'Botão Esqueci senha não encontrado', 'BAIXO');
    }

    // Re-login for others
    await page.evaluate(() => {
      const mockUser = { id: 'mock-admin', profile: { full_name: 'Demo Admin' } };
      localStorage.setItem('kaboo_mock_users', JSON.stringify([mockUser]));
      localStorage.setItem('kaboo_mock_session_user_id', 'mock-admin');
    });
    await page.goto('http://127.0.0.1:4100', { waitUntil: 'networkidle' });

    // JTBD 5.1 (Perfil)
    const profileBtn = page.locator('a[href*="/profile"], .i-lucide-user').first();
    if (await profileBtn.isVisible()) {
        await profileBtn.click();
        await page.waitForTimeout(1000);
        const nameInput = page.locator('input[value*="Demo"], label:has-text("Nome") + input');
        if (await nameInput.isVisible()) {
            await logResult('5.1', 'PASS', 'Tela de perfil editável');
        } else {
            await logResult('5.1', 'FAIL', 'Campos de perfil não encontrados', 'MÉDIO');
        }
    }

    // JTBD 5.3-5.5 (V2.0 Check)
    const v2Features = page.locator('text=Adicionar Criança, text=Interface Infantil');
    if (await v2Features.count() > 0) {
        await logResult('5.3', 'PASS', 'Recursos v2.0 detectados');
    } else {
        await logResult('5.3', 'AUSENTE', 'Recursos infantis (v2.0) não implementados nesta versão', 'INFO');
    }

    // JTBD 3.x (Consumo)
    await page.goto('http://127.0.0.1:4100');
    const contentCard = page.locator('.content-card, a[href*="/contents/"]').first();
    if (await contentCard.isVisible()) {
        await contentCard.click();
        await page.waitForTimeout(2000);

        // 3.1 Flipbook
        const readBtn = page.locator('text=Leitura, .i-lucide-book-open');
        if (await readBtn.isVisible()) {
            await readBtn.click();
            await page.waitForTimeout(2000);
            const controls = page.locator('button:has-text(">"), canvas, .pdf-viewer');
            if (await controls.count() > 0) await logResult('3.1', 'PASS', 'Flipbook funcional');
            else await logResult('3.1', 'FAIL', 'Visualizador PDF falhou', 'ALTO');
            
            // 3.2 Texto
            const textToggle = page.locator('text=Modo Texto');
            if (await textToggle.isVisible()) {
                await textToggle.click();
                await logResult('3.2', 'PASS', 'Modo Texto funcional');
            } else await logResult('3.2', 'FAIL', 'Modo Texto não disponível', 'BAIXO');
            
            await page.goBack();
        }

        // 3.3 Audio
        const audioBtn = page.locator('text=Contação, text=Áudio');
        if (await audioBtn.isVisible()) {
            await audioBtn.click();
            await page.waitForTimeout(1000);
            const player = page.locator('audio, .audio-player');
            if (await player.isVisible()) await logResult('3.3', 'PASS', 'Player de áudio presente');
            else await logResult('3.3', 'FAIL', 'Player de áudio não carregou', 'MÉDIO');
             await page.goBack();
        }

        // 3.4 Video
        const videoBtn = page.locator('text=Desenho, text=Vídeo');
        if (await videoBtn.isVisible()) {
            await videoBtn.click();
            await page.waitForTimeout(1000);
            const vplayer = page.locator('video, iframe[src*="youtube"], .video-player');
            if (await vplayer.isVisible()) await logResult('3.4', 'PASS', 'Player de vídeo presente');
            else await logResult('3.4', 'FAIL', 'Player de vídeo não carregou', 'MÉDIO');
             await page.goBack();
        }

        // 3.5 & 3.6 Libras/IA
        const extras = await page.textContent('body');
        if (extras.includes('Libras')) await logResult('3.5', 'PASS', 'Libras disponível');
        else await logResult('3.5', 'AUSENTE', 'Libras v1.3 não detectado', 'INFO');
        
        if (extras.includes('IA') || extras.includes('Animado')) await logResult('3.6', 'PASS', 'IA/Badge detectado');
        else await logResult('3.6', 'AUSENTE', 'IA v1.3 não detectado', 'INFO');

        // 3.7 Materiais
        const mat = page.locator('text=Materiais de Apoio, .i-lucide-download');
        if (await mat.count() > 0) await logResult('3.7', 'PASS', 'Materiais disponíveis');
        else await logResult('3.7', 'FAIL', 'Materiais não encontrados', 'MÉDIO');
    }

  } catch (err) {
    console.error('Fatal Test Error:', err);
  } finally {
    await browser.close();
    console.log('RESULTS_JSON_START', JSON.stringify(results), 'RESULTS_JSON_END');
  }
}
runTests();

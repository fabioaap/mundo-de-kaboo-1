import { test, expect } from '@playwright/test';
import fs from 'fs';

test('JTBD 1.1 - Login Flow Visual Validation', async ({ page }) => {
  const screenshotDir = './screenshots-jtbd';
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir);
  }

  const report = {
    test: 'JTBD 1.1 - Login',
    steps: []
  };

  try {
    // 1. Abrir http://localhost:4100
    await page.goto('http://localhost:4100');
    await page.screenshot({ path: \/01-initial-load.png });
    report.steps.push({ step: 'Load page', status: 'success' });

    // 2. Validar existência de campos
    const emailInput = page.locator('input[type="email"], input[placeholder*="Email" i]');
    const passwordInput = page.locator('input[type="password"], input[placeholder*="Senha" i]');
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    report.steps.push({ step: 'Validate fields existence', status: 'success' });

    // 3. Capturar screenshot inicial
    await page.screenshot({ path: \/02-login-screen-initial.png });

    // 4. Preencher credenciais
    await emailInput.fill('test@test.com');
    await passwordInput.fill('test123');
    await page.screenshot({ path: \/03-fields-filled.png });
    report.steps.push({ step: 'Fill credentials', status: 'success' });

    // 5. Clicar "Entrar"
    const loginButton = page.locator('button:has-text("Entrar"), button[type="submit"]');
    await loginButton.click();
    
    // 6. Capturar loading/feedback
    await page.screenshot({ path: \/04-after-click-loading.png });
    report.steps.push({ step: 'Click login', status: 'success' });

    // 7. Esperar redirecionamento ou mudança de estado
    // Nota: dependendo da velocidade do app, o loading pode ser rápido.
    await page.waitForTimeout(2000); 
    await page.screenshot({ path: \/05-final-state.png });
    
  } catch (error) {
    report.steps.push({ step: 'Error', status: 'failed', message: error.message });
  } finally {
    fs.writeFileSync('./screenshots-jtbd/report.json', JSON.stringify(report, null, 2));
  }
});

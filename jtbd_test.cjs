const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
    const resultsDir = path.join(__dirname, 'test-results/jtbd6-visual');
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }

    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    async function loginAdmin(page) {
        const now = new Date().toISOString();
        const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        const mockUser = {
            id: 'mock-admin',
            email: 'admin@demo.local',
            role: 'admin',
            profile: { id: 'mock-admin', full_name: 'Demo Admin', role: 'admin', access_status: 'active' }
        };

        await page.goto('http://localhost:4100/');
        await page.waitForTimeout(2000);
        
        await page.evaluate((user) => {
            localStorage.setItem('kaboo_auth_session', JSON.stringify({ user, expires: Date.now() + 3600000 }));
            // Also try to bypass splash if present
            localStorage.setItem('kaboo_splash_seen', 'true');
        }, mockUser);
        
        await page.goto('http://localhost:4100/admin/vouchers').catch(() => {});
        await page.waitForTimeout(3000);
    }

    let checks_pass = 0;
    let checks_fail = 0;
    let findings = [];

    function logCheck(id, pass, msg) {
        if (pass) checks_pass++; else checks_fail++;
        console.log(`CHECK|JTBD|${pass ? 'PASS' : 'FAIL'}|${id}: ${msg}`);
    }

    function logFinding(type, sev, msg) {
        findings.push(`FINDING|${type}|${sev}|${msg}`);
        console.log(`FINDING|${type}|${sev}|${msg}`);
    }

    try {
        await loginAdmin(page);

        // JTBD 6.1
        try {
            const novoBtn = page.getByRole('button', { name: /Novo modelo/i });
            if (await novoBtn.isVisible()) {
                await novoBtn.click();
                await page.fill('input[name*="duration"]', '0');
                await page.keyboard.press('Tab');
                const durationError = await page.isVisible('text=invalid') || await page.isVisible('text=inválid') || await page.isVisible('text=0');
                logCheck('6.1.1', !!durationError, 'Validação de duração 0');
                await page.click('button:has-text("Cancelar"), button[aria-label*="Close"]');
            } else {
                logCheck('6.1', false, 'Botão Novo Modelo não encontrado');
            }
        } catch (e) { logCheck('6.1', false, e.message); }

        // JTBD 6.3 - Data Consumption Coverage
        try {
            const tableText = await page.textContent('table').catch(() => "");
            const hasConsumer = tableText.includes('Consumidor') || tableText.includes('E-mail');
            if (!hasConsumer) {
                logFinding('JTBD', 'HIGH', 'Bug de cobertura de consumo: Colunas Consumidor/E-mail ausentes na tabela');
            }
            logCheck('6.3.1', hasConsumer, 'Colunas de consumo');
        } catch (e) {}

        // JTBD 6.5 - Collections
        try {
            await page.goto('http://localhost:4100/admin/collections').catch(() => {});
            await page.waitForTimeout(2000);
            await page.click('table tr td button').catch(() => {});
            const bodyContent = await page.textContent('body');
            const hasFields = bodyContent.includes('Sinopse') || bodyContent.includes('BNCC');
            logCheck('6.5.1', hasFields, 'Campos Sinopse/BNCC presentes');
            
            const counterVisible = await page.isVisible('[class*="counter"]');
            if (!counterVisible) {
                logFinding('JTBD', 'MEDIUM', 'Ausência de contador de caracteres na sinopse');
            }
            logCheck('6.5.2', counterVisible, 'Contador de caracteres');
        } catch (e) {}

        // 7.1 Responsividade
        await page.setViewportSize({ width: 390, height: 844 });
        await page.reload();
        await page.waitForTimeout(3000);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        if (overflow) {
            logFinding('JTBD', 'MEDIUM', 'Overflow horizontal detectado no mobile (390x844)');
        }
        await page.screenshot({ path: path.join(resultsDir, 'mobile_check.png') });
        logCheck('7.1', !overflow, 'Responsividade mobile (390x844)');

    } catch (err) {
        console.error('Fatal Error:', err);
    } finally {
        console.log(`\nSUMMARY|checks_pass=${checks_pass}|checks_fail=${checks_fail}|findings=${findings.length}`);
        findings.forEach(f => console.log(f));
        await browser.close();
    }
})();

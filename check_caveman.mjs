import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const url = 'http://127.0.0.1:4101/?brand=central-coruja#login';
    
    console.log('--- Iniciando Check UI Strict ---');
    try {
        await page.goto(url, { waitUntil: 'networkidle' });
        
        // Login
        await page.fill('input[type="email"]', 'admin@mundodekaboo.dev');
        await page.fill('input[type="password"]', 'Kaboo@2026!');
        await page.click('button[type="submit"]');
        
        await page.waitForURL(/#home/, { timeout: 15000 });
        console.log('Chegou em #home');
        
        // Pequena pausa para animações
        await page.waitForTimeout(2000);

        // Seção "Todas as Coleções"
        const section = page.locator('section').filter({ hasText: 'Todas as Coleções' });
        await section.waitFor({ timeout: 10000 });
        
        // Primeiro card
        const firstCard = section.locator('a[href], [role="button"]').first();
        await firstCard.waitFor();
        
        const box = await firstCard.boundingBox();
        const ratio = box.width / box.height;
        
        // Títulos
        const collectionTitles = (await section.locator('h3, .title, .card-name').allInnerTexts()).filter(t => t.trim().length > 0);

        console.log('RESULTADOS:');
        console.log(`- Card: width=${box.width.toFixed(2)}, height=${box.height.toFixed(2)}, ratio=${ratio.toFixed(2)}`);
        console.log(`- Primeiros 2 Títulos: ${collectionTitles.slice(0, 2).join(' | ')}`);
        
        if (ratio > 1.15) {
            console.log('VEREDITO: Layout Kaboo/Coleção (Ratio > 1.15)');
        } else if (ratio < 1.0) {
            console.log('VEREDITO: Layout Retrato Antigo (Ratio < 1.0)');
        } else {
            console.log('VEREDITO: Layout Transicional/Desconhecido');
        }

    } catch (e) {
        console.error('ERRO:', e.message);
        await page.screenshot({ path: 'debug_error.png' });
    } finally {
        await browser.close();
    }
})();

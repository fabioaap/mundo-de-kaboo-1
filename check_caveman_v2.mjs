import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const url = 'http://127.0.0.1:4101/?brand=central-coruja#login';
    
    try {
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.fill('input[type="email"]', 'admin@mundodekaboo.dev');
        await page.fill('input[type="password"]', 'Kaboo@2026!');
        await page.click('button[type="submit"]');
        await page.waitForURL(/#home/, { timeout: 15000 });
        await page.waitForTimeout(3000);
        
        await page.screenshot({ path: 'home_debug_sections.png', fullPage: true });
        
        const sections = await page.locator('section h1, section h2, section h3').allInnerTexts();
        console.log('Seções encontradas:', sections.join(' | '));
        
        // Try finding by a more generic way if "Todas as Coleções" is missing
        const collectionSection = page.locator('section').filter({ hasText: /Coleç/i }).first();
        if (await collectionSection.isVisible()) {
            console.log('Seção de coleções encontrada!');
            const firstCard = collectionSection.locator('a[href], [role="button"]').first();
            const box = await firstCard.boundingBox();
            const collectionTitles = await collectionSection.locator('h3, .title, .card-name').allInnerTexts();
            
            console.log('RESULTADOS:');
            console.log(`- Card: width=${box.width.toFixed(2)}, height=${box.height.toFixed(2)}, ratio=${(box.width/box.height).toFixed(2)}`);
            console.log(`- Primeiros 2 Títulos: ${collectionTitles.filter(t => t.trim()).slice(0, 2).join(' | ')}`);
        } else {
            console.log('Nenhuma seção de "Coleções" visível.');
        }

    } catch (e) {
        console.error('ERRO:', e.message);
    } finally {
        await browser.close();
    }
})();

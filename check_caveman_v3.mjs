import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const url = 'http://127.0.0.1:4101/?brand=central-coruja#login';
    
    try {
        console.log('Navegando...');
        await page.goto(url, { waitUntil: 'load' });
        
        console.log('Login...');
        await page.fill('input[type="email"]', 'admin@mundodekaboo.dev');
        await page.fill('input[type="password"]', 'Kaboo@2026!');
        await page.click('button[type="submit"]');
        
        await page.waitForURL(/#home/, { timeout: 15000 });
        console.log('URL Atual:', page.url());
        
        await page.waitForTimeout(5000); // Espera carregamento pesado
        
        const bodyText = await page.innerText('body');
        console.log('Texto curto do body:', bodyText.substring(0, 500));
        
        const links = await page.locator('a').allInnerTexts();
        console.log('Alguns links:', links.slice(0, 10).join(' | '));

        // Let's look for any card-like structure
        const cards = page.locator('.card, [class*="Card"], [class*="card"]');
        const count = await cards.count();
        console.log(`Encontrados ${count} elementos com classe 'card'`);

        if (count > 0) {
            const first = cards.first();
            const box = await first.boundingBox();
            console.log(`RESULTADOS:`);
            console.log(`- Card: width=${box.width.toFixed(2)}, height=${box.height.toFixed(2)}, ratio=${(box.width/box.height).toFixed(2)}`);
        }

    } catch (e) {
        console.error('ERRO:', e.stack);
    } finally {
        await browser.close();
    }
})();

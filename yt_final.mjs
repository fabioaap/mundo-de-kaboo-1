import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage();
        await page.setViewportSize({ width: 1920, height: 1080 });
        
        console.log("Loading YouTube...");
        await page.goto('https://www.youtube.com/', { waitUntil: 'load' });
        
        // Wait specifically for potential grid items
        await page.waitForSelector('ytd-rich-grid-media, ytd-rich-item-renderer', { timeout: 15000 }).catch(() => {});
        
        const data = await page.evaluate(() => {
            const card = document.querySelector('ytd-rich-grid-media, ytd-rich-item-renderer');
            if (!card) return "No card found";
            
            const thumb = card.querySelector('#thumbnail, ytd-thumbnail');
            const details = card.querySelector('#details');
            
            const cR = card.getBoundingClientRect();
            const tR = thumb ? thumb.getBoundingClientRect() : null;
            const dR = details ? details.getBoundingClientRect() : null;
            
            const radius = thumb ? window.getComputedStyle(thumb).borderRadius : 'n/a';
            const imgRadius = thumb?.querySelector('img') ? window.getComputedStyle(thumb.querySelector('img')).borderRadius : 'n/a';

            return {
                sel: card.tagName,
                card: `${cR.width.toFixed(1)}x${cR.height.toFixed(1)}`,
                thumb: tR ? `${tR.width.toFixed(1)}x${tR.height.toFixed(1)}` : 'n/a',
                ratio: tR ? (tR.width / tR.height).toFixed(2) : 'n/a',
                gap: (tR && dR) ? (dR.top - tR.bottom).toFixed(1) : 'n/a',
                metaH: dR ? dR.height.toFixed(1) : 'n/a',
                radius: radius !== '0px' ? radius : imgRadius
            };
        });
        
        console.log(JSON.stringify(data, null, 2));
    } finally {
        await browser.close();
    }
})();

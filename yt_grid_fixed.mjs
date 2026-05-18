import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage();
        await page.setViewportSize({ width: 1920, height: 1080 });
        
        console.log("Loading user videos page...");
        await page.goto('https://www.youtube.com/@YouTube/videos', { waitUntil: 'load' });
        
        // Wait for an element that confirms videos are listed
        await page.waitForSelector('ytd-rich-grid-media', { timeout: 20000 });
        
        const data = await page.evaluate(() => {
            const card = document.querySelector('ytd-rich-grid-media');
            if (!card) return { error: 'No grid card found after wait' };
            
            const thumb = card.querySelector('ytd-thumbnail, #thumbnail');
            const details = card.querySelector('#details, #meta');
            
            if (!thumb) return { error: 'Found card but no thumbnail' };

            const cr = card.getBoundingClientRect();
            const tr = thumb.getBoundingClientRect();
            const dr = details ? details.getBoundingClientRect() : null;
            
            return {
                sel: card.tagName,
                card: `${cr.width.toFixed(1)}x${cr.height.toFixed(1)}`,
                thumb: `${tr.width.toFixed(1)}x${tr.height.toFixed(1)}`,
                ratio: (tr.width / tr.height).toFixed(2),
                gap: (dr && tr) ? (dr.top - tr.bottom).toFixed(1) : 'n/a',
                metaH: dr ? dr.height.toFixed(1) : 'n/a',
                radius: window.getComputedStyle(thumb).borderRadius || '12px'
            };
        });
        console.log(data);
    } finally {
        await browser.close();
    }
})();

import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage();
        await page.setViewportSize({ width: 1920, height: 1080 });
        
        console.log("Searching for grid items on home page...");
        await page.goto('https://www.youtube.com/?gl=US&hl=en', { waitUntil: 'load' });
        
        // Wait longer for any standard video link
        await page.waitForSelector('a#video-title-link', { timeout: 30000 });
        
        const data = await page.evaluate(() => {
            const titleLink = document.querySelector('a#video-title-link');
            const card = titleLink.closest('ytd-rich-grid-media, ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-video-renderer');
            if (!card) return { error: 'Found title but no card container' };
            
            const thumb = card.querySelector('#thumbnail');
            const details = card.querySelector('#details, #meta');
            
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
                radius: window.getComputedStyle(thumb).borderRadius
            };
        });
        console.log(data);
    } finally {
        await browser.close();
    }
})();

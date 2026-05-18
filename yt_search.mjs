import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage();
        await page.setViewportSize({ width: 1920, height: 1080 });
        
        console.log("Loading search results...");
        await page.goto('https://www.youtube.com/results?search_query=programming', { waitUntil: 'networkidle' });
        
        const data = await page.evaluate(() => {
            const card = document.querySelector('ytd-video-renderer, ytd-grid-video-renderer');
            if (!card) return { error: 'No card' };
            
            const thumb = card.querySelector('#thumbnail');
            const meta = card.querySelector('#meta, #details');
            
            const cr = card.getBoundingClientRect();
            const tr = thumb.getBoundingClientRect();
            const mr = meta ? meta.getBoundingClientRect() : null;
            
            return {
                sel: card.tagName,
                card: `${cr.width.toFixed(1)}x${cr.height.toFixed(1)}`,
                thumb: `${tr.width.toFixed(1)}x${tr.height.toFixed(1)}`,
                ratio: (tr.width / tr.height).toFixed(2),
                gap: mr ? (mr.top - tr.bottom).toFixed(1) : 'n/a',
                radius: window.getComputedStyle(thumb).borderRadius || '12px'
            };
        });
        console.log(data);
    } finally {
        await browser.close();
    }
})();

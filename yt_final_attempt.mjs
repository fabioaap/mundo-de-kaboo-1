import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });
    try {
        await page.goto('https://www.youtube.com/@YouTube/videos', { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForTimeout(5000);

        const results = await page.evaluate(() => {
            const card = document.querySelector('ytd-rich-item-renderer');
            if (!card) return { error: "No card" };

            const thumb = card.querySelector('.ytLockupViewModelContentImage');
            // Try to find ANY element that follows the thumbnail inside the v-stack
            const nextEl = thumb ? thumb.nextElementSibling : null;
            
            // Or look for anything that contains the title
            const allText = Array.from(card.querySelectorAll('span, div, a')).filter(el => el.innerText && el.innerText.length > 5);
            
            const getBox = (el) => {
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return { tag: el.tagName, class: el.className, w: r.width.toFixed(1), h: r.height.toFixed(1), top: r.top, bottom: r.bottom };
            };

            const tBox = getBox(thumb);
            const nBox = getBox(nextEl);

            // Let's specifically look for the "metadata" part by traversing siblings
            let metadataPart = null;
            if (thumb) {
                let sibling = thumb.nextElementSibling;
                while (sibling) {
                   if (sibling.innerText || sibling.querySelector('yt-icon-view-model')) {
                       metadataPart = sibling;
                       break;
                   }
                   sibling = sibling.nextElementSibling;
                }
            }
            const mBox = getBox(metadataPart);

            return {
                card: getBox(card),
                thumbnail: tBox,
                metadata: mBox,
                gap: (tBox && mBox) ? (mBox.top - tBox.bottom).toFixed(1) : 'n/a',
                thumbRadius: thumb ? window.getComputedStyle(thumb).borderRadius : 'n/a',
                cardRadius: window.getComputedStyle(card).borderRadius
            };
        });

        console.log(JSON.stringify(results, null, 2));
    } catch (err) {
        console.log("Error: " + err.message);
    } finally {
        await browser.close();
    }
})();

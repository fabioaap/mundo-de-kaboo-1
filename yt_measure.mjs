import { chromium } from 'playwright';

async function measureYoutubeCard() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('Navegando direto para busca no YouTube...');
    // Aumentando timeout para garantir carregamento em ambientes lentos
    await page.goto('https://www.youtube.com/results?search_query=natureza', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Esperar explicitamente por qualquer card
    const selector = 'ytd-video-renderer';
    await page.waitForSelector(selector, { timeout: 30000 });

    const card = page.locator(selector).first();
    
    if (await card.isVisible()) {
      const measurements = await card.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        const thumbnail = el.querySelector('#thumbnail');
        const thumbRect = thumbnail ? thumbnail.getBoundingClientRect() : null;
        const textSection = el.querySelector('#meta');
        const textRect = textSection ? textSection.getBoundingClientRect() : null;
        const thumbImg = el.querySelector('img');
        const thumbStyle = thumbImg ? window.getComputedStyle(thumbImg) : (thumbnail ? window.getComputedStyle(thumbnail) : null);

        return {
          card: { width: rect.width, height: rect.height },
          thumbnail: thumbRect ? { width: thumbRect.width, height: thumbRect.height } : null,
          text: textRect ? { height: textRect.height } : null,
          gutter: (thumbRect && textRect) ? Math.abs(textRect.left - thumbRect.right) : null,
          borderRadius: thumbStyle ? thumbStyle.borderRadius : 'N/A'
        };
      });

      console.log(`\n--- Resultados (Search Result) ---`);
      console.log(`Seletor: ${selector}`);
      console.log(`Card: ${measurements.card.width.toFixed(1)}x${measurements.card.height.toFixed(1)}px`);
      if (measurements.thumbnail) {
        const ratio = (measurements.thumbnail.width / measurements.thumbnail.height).toFixed(2);
        console.log(`Thumbnail: ${measurements.thumbnail.width.toFixed(1)}x${measurements.thumbnail.height.toFixed(1)}px (Aspect: ${ratio})`);
        console.log(`Raio de Borda (Thumbnail): ${measurements.borderRadius}`);
      }
      if (measurements.text) {
        console.log(`Altura aproximada área texto: ~${measurements.text.height.toFixed(1)}px`);
      }
      console.log(`Gutter (Thumbnail-Texto): ${measurements.gutter ? measurements.gutter.toFixed(1) + 'px' : 'N/A'}`);
    } else {
      console.log('Nenhum card visível após timeout.');
    }
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await browser.close();
  }
}

measureYoutubeCard();

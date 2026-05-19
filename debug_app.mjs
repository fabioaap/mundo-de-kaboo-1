import { chromium } from 'playwright';

async function debugApp() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    console.log('Acessando app...');
    const response = await page.goto('http://127.0.0.1:4100', { waitUntil: 'networkidle', timeout: 5000 });
    console.log('Status:', response.status());
    
    const html = await page.content();
    console.log('HTML Snippet:', html.substring(0, 500));
    
    const bodyText = await page.innerText('body');
    console.log('Body Text:', bodyText.substring(0, 200));

    await page.screenshot({ path: 'debug-home.png' });
  } catch (e) {
    console.log('Erro no debug:', e.message);
  } finally {
    await browser.close();
  }
}
debugApp();

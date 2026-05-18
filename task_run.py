import asyncio
from playwright.async_api import async_playwright
import sys

async def run():
    async with async_playwright() as p:
        try:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context()
            page = await context.new_page()
            
            print("Tentando acessar a página...")
            try:
                await page.goto("http://127.0.0.1:4100", timeout=30000, wait_until="networkidle")
            except Exception as e:
                print(f"Erro ao carregar (timeout): {e}")
            
            await page.screenshot(path="login_initial.png")
            print("Screenshot inicial salvo.")
            
            # Verificar campos
            email_field = page.locator("input[placeholder='seu@email.com']")
            pass_field = page.locator("input[type='password']")
            
            email_count = await email_field.count()
            pass_count = await pass_field.count()
            print(f"Fields - Email: {email_count}, Pass: {pass_count}")
            
            if email_count > 0:
                await email_field.fill("teste@exemplo.com")
            if pass_count > 0:
                await pass_field.fill("senha123")
                
            await page.screenshot(path="login_filled.png")
            
            btn = page.locator("button:has-text('Entrar')")
            if await btn.count() > 0:
                print(f"Botão habilitado: {await btn.is_enabled()}")
                await btn.click()
                await asyncio.sleep(2)
                await page.screenshot(path="login_after_click.png")
                
            await browser.close()
        except Exception as outer_e:
            print(f"Erro fatal: {outer_e}")

if __name__ == "__main__":
    asyncio.run(run())

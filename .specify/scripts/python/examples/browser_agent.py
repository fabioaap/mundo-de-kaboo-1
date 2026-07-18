#!/usr/bin/env python3
"""
Exemplo: Agent de Browser Automation

Este exemplo demonstra como criar um agent que pode:
- Navegar em websites
- Capturar screenshots
- Extrair dados
- Interagir com elementos
"""

import sys
from pathlib import Path


def check_playwright():
    """Verifica se Playwright está instalado."""
    try:
        from playwright.sync_api import sync_playwright
        return True
    except ImportError:
        print("❌ Playwright não está instalado")
        print("\nPara instalar:")
        print("  pip install playwright")
        print("  playwright install")
        return False


def example_basic_navigation():
    """Exemplo básico de navegação."""
    from playwright.sync_api import sync_playwright
    
    print("\n" + "=" * 60)
    print("📍 EXEMPLO: Navegação Básica")
    print("=" * 60 + "\n")
    
    with sync_playwright() as p:
        # Lançar browser (headless=False para ver a janela)
        browser = p.chromium.launch(headless=False, slow_mo=500)
        page = browser.new_page()
        
        # Navegar
        print("🌐 Navegando para GitHub...")
        page.goto("https://github.com")
        
        # Capturar título
        title = page.title()
        print(f"📄 Título: {title}")
        
        # Capturar screenshot
        screenshots_dir = Path("screenshots")
        screenshots_dir.mkdir(exist_ok=True)
        screenshot_path = screenshots_dir / "github-home.png"
        page.screenshot(path=str(screenshot_path))
        print(f"📸 Screenshot salvo: {screenshot_path}")
        
        browser.close()
        print("✅ Navegação concluída\n")


def example_search_repos():
    """Exemplo de busca e extração de dados."""
    from playwright.sync_api import sync_playwright
    
    print("=" * 60)
    print("🔍 EXEMPLO: Buscar Repositórios")
    print("=" * 60 + "\n")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=1000)
        page = browser.new_page()
        
        # Ir para página de trending
        print("🌐 Navegando para trending repos...")
        page.goto("https://github.com/trending")
        page.wait_for_load_state("networkidle")
        
        # Extrair repositórios trending
        print("\n📦 Top 5 Repositórios Trending:\n")
        
        repos = page.query_selector_all("article.Box-row")
        for i, repo in enumerate(repos[:5], 1):
            # Extrair nome do repositório
            title_elem = repo.query_selector("h2 a")
            if title_elem:
                title = title_elem.text_content().strip().replace("\n", "").replace(" ", "")
                print(f"  {i}. {title}")
                
                # Extrair descrição
                desc_elem = repo.query_selector("p")
                if desc_elem:
                    desc = desc_elem.text_content().strip()
                    print(f"     {desc[:80]}...")
                print()
        
        browser.close()
        print("✅ Busca concluída\n")


def example_form_interaction():
    """Exemplo de interação com formulários."""
    from playwright.sync_api import sync_playwright
    
    print("=" * 60)
    print("📝 EXEMPLO: Interação com Formulários")
    print("=" * 60 + "\n")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=1000)
        page = browser.new_page()
        
        # Ir para página de busca
        print("🌐 Navegando para busca do GitHub...")
        page.goto("https://github.com/search")
        
        # Preencher campo de busca
        print("⌨️  Preenchendo campo de busca...")
        search_input = page.locator("input[name='q']").first
        search_input.fill("spec-driven development")
        
        # Pressionar Enter
        print("🔍 Executando busca...")
        search_input.press("Enter")
        page.wait_for_load_state("networkidle")
        
        # Verificar resultados
        results = page.locator("div.search-title").count()
        print(f"✅ Encontrados {results} resultados")
        
        browser.close()
        print("✅ Interação concluída\n")


def main():
    """Função principal."""
    print("\n🤖 AGENT DE BROWSER AUTOMATION - EXEMPLOS\n")
    
    # Verificar se Playwright está instalado
    if not check_playwright():
        sys.exit(1)
    
    # Menu de exemplos
    print("Escolha um exemplo:")
    print("  1. Navegação básica (screenshot)")
    print("  2. Buscar repositórios trending")
    print("  3. Interação com formulários")
    print("  4. Executar todos")
    print("  0. Sair")
    
    choice = input("\nOpção: ").strip()
    
    if choice == "1":
        example_basic_navigation()
    elif choice == "2":
        example_search_repos()
    elif choice == "3":
        example_form_interaction()
    elif choice == "4":
        example_basic_navigation()
        example_search_repos()
        example_form_interaction()
    elif choice == "0":
        print("👋 Até logo!")
        return
    else:
        print("❌ Opção inválida")
        return
    
    print("\n" + "=" * 60)
    print("✅ TODOS OS EXEMPLOS CONCLUÍDOS")
    print("=" * 60)
    print("\n💡 Dica: Veja o código deste script para entender como funciona!")
    print(f"📂 Localização: {Path(__file__).relative_to(Path.cwd())}\n")


if __name__ == "__main__":
    main()

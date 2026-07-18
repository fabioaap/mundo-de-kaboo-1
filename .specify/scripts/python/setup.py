#!/usr/bin/env python3
"""
Setup script para instalar ferramentas de autonomia do agente.

Este script configura todas as dependências necessárias para que
agentes AI tenham acesso completo a:
- Sistema de arquivos
- Terminal/CLI
- Navegadores web
- APIs e integrações
"""

import subprocess
import sys
import os
from pathlib import Path


def print_header(message):
    """Imprime header formatado."""
    print("\n" + "=" * 60)
    print(f"  {message}")
    print("=" * 60 + "\n")


def check_python_version():
    """Verifica se a versão do Python é adequada (>= 3.8)."""
    print_header("Verificando versão do Python")
    
    if sys.version_info < (3, 8):
        print(f"❌ Python {sys.version_info.major}.{sys.version_info.minor} detectado")
        print("   Python 3.8 ou superior é necessário")
        return False
    
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")
    return True


def check_pip():
    """Verifica se pip está instalado."""
    print_header("Verificando pip")
    
    try:
        result = subprocess.run(
            [sys.executable, "-m", "pip", "--version"],
            capture_output=True,
            text=True,
            check=True
        )
        print(f"✅ {result.stdout.strip()}")
        return True
    except subprocess.CalledProcessError:
        print("❌ pip não está instalado")
        return False


def install_requirements(requirements_file):
    """Instala dependências do requirements.txt."""
    print_header(f"Instalando dependências de {requirements_file.name}")
    
    try:
        print("📦 Instalando pacotes Python...")
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "-r", str(requirements_file)],
            check=True
        )
        print("✅ Todas as dependências foram instaladas com sucesso")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Erro ao instalar dependências: {e}")
        return False


def install_playwright_browsers():
    """Instala browsers do Playwright."""
    print_header("Configurando Playwright")
    
    try:
        print("🌐 Instalando browsers do Playwright...")
        subprocess.run(
            [sys.executable, "-m", "playwright", "install"],
            check=True
        )
        print("✅ Browsers do Playwright instalados")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Erro ao instalar browsers: {e}")
        return False


def create_venv_instructions():
    """Mostra instruções para criar venv se não estiver em um."""
    if hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
        # Já está em um venv
        return True
    
    print("\n" + "⚠️  " + "=" * 56)
    print("  RECOMENDAÇÃO: Use um ambiente virtual")
    print("=" * 60)
    print("\nPara criar um ambiente virtual:")
    print("\n  # Criar venv")
    print("  python -m venv venv")
    print("\n  # Ativar venv")
    print("  # Linux/macOS:")
    print("  source venv/bin/activate")
    print("\n  # Windows:")
    print("  venv\\Scripts\\activate")
    print("\n  # Depois execute este script novamente")
    print("  python setup.py")
    print("\n")
    
    response = input("Deseja continuar sem venv? (s/N): ").strip().lower()
    return response == 's'


def main():
    """Função principal."""
    print("\n" + "🤖 " + "=" * 56)
    print("  SETUP DE FERRAMENTAS DE AUTONOMIA DO AGENTE")
    print("=" * 60)
    
    # Verificações
    if not check_python_version():
        sys.exit(1)
    
    if not check_pip():
        sys.exit(1)
    
    if not create_venv_instructions():
        print("\n❌ Setup cancelado pelo usuário")
        sys.exit(0)
    
    # Localizar requirements.txt
    script_dir = Path(__file__).parent
    requirements_file = script_dir / "requirements.txt"
    
    if not requirements_file.exists():
        print(f"\n❌ Arquivo não encontrado: {requirements_file}")
        sys.exit(1)
    
    # Instalar dependências
    if not install_requirements(requirements_file):
        sys.exit(1)
    
    # Configurar Playwright
    print("\n")
    response = input("Deseja instalar browsers do Playwright? (S/n): ").strip().lower()
    if response != 'n':
        install_playwright_browsers()
    
    # Sucesso!
    print_header("✅ SETUP CONCLUÍDO COM SUCESSO!")
    print("Ferramentas disponíveis:")
    print("  • Acesso a sistema de arquivos (pathlib, watchdog, gitpython)")
    print("  • Automação CLI (click, typer, rich)")
    print("  • Automação de browser (playwright, selenium)")
    print("  • Frameworks de agentes (langchain)")
    print("  • Web scraping (beautifulsoup4, requests)")
    print("  • Testes (pytest, pytest-playwright)")
    print("\nPróximos passos:")
    print("  1. Veja exemplos em .specify/scripts/python/examples/")
    print("  2. Execute testes: pytest")
    print("  3. Use Playwright: playwright codegen https://example.com")
    print("\n")


if __name__ == "__main__":
    main()

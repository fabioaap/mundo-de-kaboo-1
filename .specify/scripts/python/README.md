# 🐍 Python Agent Autonomy Tools

Ferramentas Python para dar máxima autonomia aos agentes AI com acesso completo a:
- 📁 Sistema de arquivos e repositórios Git
- 💻 Terminal e CLI
- 🌐 Navegadores web (Playwright, Selenium)
- 🤖 Frameworks de agentes (LangChain)
- 🔍 Web scraping e extração de dados

## 🚀 Quick Start

### 1. Setup (Recomendado: usar venv)

```bash
# Criar ambiente virtual (recomendado)
python -m venv venv

# Ativar venv
# Linux/macOS:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Instalar dependências
cd .specify/scripts/python
python setup.py

# Ou instalar manualmente
pip install -r requirements.txt
playwright install  # Para automação de browser
```

### 2. Verificar Instalação

```bash
# Verificar Python packages
pip list | grep -E "playwright|langchain|selenium"

# Testar Playwright
playwright --version
python -c "from playwright.sync_api import sync_playwright; print('✅ Playwright OK')"

# Testar outros imports
python -c "import langchain, bs4, click, rich; print('✅ Imports OK')"
```

## 📦 Ferramentas Instaladas

### 1. File System & Git (📁)

**Pacotes**: `pathlib2`, `watchdog`, `gitpython`, `python-dotenv`

**Uso**:
```python
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import git

# Navegar no file system
project_root = Path.cwd()
specs_dir = project_root / ".specify" / "specs"

# Monitorar mudanças em arquivos
class SpecHandler(FileSystemEventHandler):
    def on_modified(self, event):
        print(f"Spec modificada: {event.src_path}")

# Interagir com Git
repo = git.Repo(project_root)
print(f"Branch atual: {repo.active_branch}")
print(f"Commits recentes: {list(repo.iter_commits(max_count=5))}")
```

### 2. CLI & Terminal (💻)

**Pacotes**: `click`, `typer`, `rich`, `prompt-toolkit`

**Uso**:
```python
import typer
from rich.console import Console
from rich.table import Table

app = typer.Typer()
console = Console()

@app.command()
def list_specs():
    """Lista todas as specs do projeto."""
    table = Table(title="Specs Disponíveis")
    table.add_column("ID", style="cyan")
    table.add_column("Nome", style="green")
    table.add_column("Status", style="yellow")
    
    # ... preencher tabela ...
    console.print(table)

if __name__ == "__main__":
    app()
```

### 3. Browser Automation (🌐)

**Pacotes**: `playwright`, `selenium`, `webdriver-manager`

**Playwright (Recomendado)**:
```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()
    
    # Navegar para URL
    page.goto("https://github.com")
    
    # Interagir com elementos
    page.click("text=Sign in")
    page.fill("input[name='login']", "username")
    
    # Capturar screenshot
    page.screenshot(path="screenshot.png")
    
    # Executar JavaScript
    result = page.evaluate("() => document.title")
    print(f"Título: {result}")
    
    browser.close()
```

**Selenium (Alternativa)**:
```python
from selenium import webdriver
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service

# Setup automático do driver
service = Service(ChromeDriverManager().install())
driver = webdriver.Chrome(service=service)

driver.get("https://github.com")
element = driver.find_element(By.CSS_SELECTOR, ".some-class")
element.click()

driver.quit()
```

### 4. Agent Frameworks (🤖)

**Pacotes**: `langchain`, `langchain-community`, `openai`, `anthropic`

**LangChain Agents**:
```python
from langchain.agents import AgentType, initialize_agent, load_tools
from langchain.llms import OpenAI

# Inicializar LLM
llm = OpenAI(temperature=0)

# Carregar ferramentas
tools = load_tools(["python_repl", "terminal"], llm=llm)

# Criar agente
agent = initialize_agent(
    tools,
    llm,
    agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
    verbose=True
)

# Executar tarefa
result = agent.run("Liste os arquivos no diretório atual e conte quantos são .md")
print(result)
```

**Integração com OpenAI**:
```python
import openai
from langchain.chat_models import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage

chat = ChatOpenAI(temperature=0)

messages = [
    SystemMessage(content="Você é um assistente especializado em code review."),
    HumanMessage(content="Analise este código: def foo(): pass")
]

response = chat(messages)
print(response.content)
```

### 5. Web Scraping (🔍)

**Pacotes**: `beautifulsoup4`, `lxml`, `requests`, `httpx`

**Exemplo**:
```python
import requests
from bs4 import BeautifulSoup

# Fazer request
response = requests.get("https://github.com/trending")
soup = BeautifulSoup(response.content, "lxml")

# Extrair dados
repos = soup.select("article.Box-row")
for repo in repos[:5]:
    title = repo.select_one("h2 a")
    print(f"📦 {title.text.strip()}")
```

### 6. Testing (🧪)

**Pacotes**: `pytest`, `pytest-playwright`, `pytest-asyncio`

**Testes com Playwright**:
```python
# tests/test_example.py
import pytest
from playwright.sync_api import Page, expect

def test_github_homepage(page: Page):
    """Testa página inicial do GitHub."""
    page.goto("https://github.com")
    
    # Verificar título
    expect(page).to_have_title("GitHub")
    
    # Verificar elemento
    expect(page.locator("text=Sign in")).to_be_visible()
```

**Executar testes**:
```bash
# Todos os testes
pytest

# Testes específicos
pytest tests/test_example.py

# Com coverage
pytest --cov=.

# Testes Playwright com UI
pytest --headed --slowmo=1000
```

## 📚 Exemplos de Uso Completos

### Exemplo 1: Validar Specs

```python
"""
Script para validar todas as specs do projeto.
Verifica se specs têm user stories, constitution compliance, etc.
"""
from pathlib import Path
import yaml
from rich.console import Console
from rich.table import Table

console = Console()

def validate_spec(spec_file: Path):
    """Valida uma spec."""
    content = spec_file.read_text()
    
    checks = {
        "User Stories": "## User Scenarios" in content,
        "Given-When-Then": "**Given**" in content and "**When**" in content,
        "Constitution": "## Constitution Compliance" in content,
        "Requirements": "## Requirements" in content,
    }
    
    return checks

def main():
    specs_dir = Path(".specify/specs")
    
    table = Table(title="Validação de Specs")
    table.add_column("Spec", style="cyan")
    table.add_column("User Stories", style="green")
    table.add_column("GWT", style="yellow")
    table.add_column("Constitution", style="blue")
    
    for spec in specs_dir.glob("*/spec.md"):
        checks = validate_spec(spec)
        table.add_row(
            spec.parent.name,
            "✅" if checks["User Stories"] else "❌",
            "✅" if checks["Given-When-Then"] else "❌",
            "✅" if checks["Constitution"] else "❌",
        )
    
    console.print(table)

if __name__ == "__main__":
    main()
```

### Exemplo 2: Automação de Testes E2E

```python
"""
Automação de testes E2E usando Playwright.
Testa fluxo completo de autenticação.
"""
from playwright.sync_api import sync_playwright, expect

def test_auth_flow():
    """Testa fluxo de login e logout."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        
        # Login
        page.goto("http://localhost:3000/login")
        page.fill("input[name='email']", "user@example.com")
        page.fill("input[name='password']", "senha123")
        page.click("button[type='submit']")
        
        # Verificar redirecionamento
        expect(page).to_have_url("http://localhost:3000/dashboard")
        
        # Verificar elemento do dashboard
        expect(page.locator("text=Bem-vindo")).to_be_visible()
        
        # Logout
        page.click("button:has-text('Sair')")
        expect(page).to_have_url("http://localhost:3000/login")
        
        # Screenshot final
        page.screenshot(path="test-results/auth-flow.png")
        
        browser.close()

if __name__ == "__main__":
    test_auth_flow()
```

### Exemplo 3: Agent com Acesso ao File System

```python
"""
Agent que pode ler e modificar arquivos do projeto.
"""
from langchain.agents import Tool, AgentExecutor, create_react_agent
from langchain.llms import OpenAI
from langchain.prompts import PromptTemplate
from pathlib import Path

def read_file(file_path: str) -> str:
    """Lê conteúdo de um arquivo."""
    try:
        return Path(file_path).read_text()
    except Exception as e:
        return f"Erro ao ler arquivo: {e}"

def list_files(directory: str) -> str:
    """Lista arquivos em um diretório."""
    try:
        path = Path(directory)
        files = [f.name for f in path.iterdir()]
        return "\n".join(files)
    except Exception as e:
        return f"Erro ao listar arquivos: {e}"

# Criar ferramentas
tools = [
    Tool(
        name="ReadFile",
        func=read_file,
        description="Lê o conteúdo de um arquivo. Input: caminho do arquivo"
    ),
    Tool(
        name="ListFiles",
        func=list_files,
        description="Lista arquivos em um diretório. Input: caminho do diretório"
    ),
]

# Criar agent
llm = OpenAI(temperature=0)
agent = create_react_agent(llm, tools, PromptTemplate.from_template("""
Você é um assistente que pode ler arquivos e listar diretórios.

Ferramentas disponíveis: {tools}

Pergunta: {input}
"""))

executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

# Usar agent
result = executor.invoke({
    "input": "Liste todos os arquivos .md no diretório .specify/specs/"
})
print(result)
```

## 🔧 Configuração Avançada

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```bash
# APIs
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Browser
PLAYWRIGHT_BROWSERS_PATH=/path/to/browsers

# Other
LOG_LEVEL=INFO
```

Carregar no código:
```python
from dotenv import load_dotenv
import os

load_dotenv()
openai_key = os.getenv("OPENAI_API_KEY")
```

### Playwright Config

Crie `playwright.config.json`:
```json
{
  "use": {
    "headless": true,
    "viewport": { "width": 1280, "height": 720 },
    "screenshot": "only-on-failure",
    "video": "retain-on-failure"
  }
}
```

## 📖 Recursos e Documentação

- **Playwright**: https://playwright.dev/python/
- **LangChain**: https://python.langchain.com/docs/
- **Selenium**: https://www.selenium.dev/documentation/
- **Rich**: https://rich.readthedocs.io/
- **Click/Typer**: https://typer.tiangolo.com/

## 🐛 Troubleshooting

### Erro: "Playwright browsers not installed"
```bash
playwright install
# Ou instalar browsers específicos
playwright install chromium
```

### Erro: "ImportError: No module named ..."
```bash
pip install -r requirements.txt
# Ou instalar pacote específico
pip install langchain
```

### Erro: Permission denied no setup.py
```bash
chmod +x setup.py
./setup.py
```

### Browser não abre (Playwright)
```python
# Use headless=False para ver o browser
browser = p.chromium.launch(headless=False, slow_mo=1000)
```

## 🤝 Contribuindo

Adicione novos exemplos em `examples/` ou melhore a documentação!

---

**Versão**: 1.0.0  
**Última atualização**: 2026-01-14

🤖 Ferramentas para agentes autônomos prontas! 🚀

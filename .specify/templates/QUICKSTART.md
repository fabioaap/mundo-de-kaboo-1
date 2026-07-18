# 🚀 Quick Start - Iniciando com o Template

Este guia rápido ajudará você a configurar um novo projeto a partir deste template em poucos minutos.

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter:

- [ ] Git instalado
- [ ] Node.js 18+ (ou runtime da sua linguagem)
- [ ] Editor de código (VS Code recomendado para melhor integração com Copilot)
- [ ] GitHub CLI (opcional, mas recomendado)

## 🎯 Passo a Passo

### 1. Criar Novo Repositório

**Opção A: Via GitHub UI (mais fácil)**

1. Vá para https://github.com/fabioaap/Starter_KIT_1.0
2. Clique em "Use this template" → "Create a new repository"
3. Dê um nome ao seu projeto
4. Clone localmente:
   ```bash
   git clone https://github.com/SEU-USUARIO/SEU-PROJETO
   cd SEU-PROJETO
   ```

**Opção B: Via GitHub CLI**

```bash
gh repo create meu-projeto --template fabioaap/Starter_KIT_1.0 --private
cd meu-projeto
```

### 2. Personalizar Configurações Básicas

Execute estas substituições no projeto:

```bash
# Substitua [NOME_DO_PROJETO] pelo nome real
find . -type f -not -path "*/\.*" -exec sed -i 's/\[NOME_DO_PROJETO\]/MeuProjeto/g' {} +

# No macOS, use:
# find . -type f -not -path "*/\.*" -exec sed -i '' 's/\[NOME_DO_PROJETO\]/MeuProjeto/g' {} +
```

### 3. Atualizar Constitution

Edite `.specify/memory/constitution.md`:

```bash
# Abra no seu editor
code .specify/memory/constitution.md

# Revise e adapte:
# - Princípios NON-NEGOTIABLE (mantenha ou ajuste)
# - Adicione restrições específicas do domínio
# - Defina processo de amendment se necessário
```

### 4. Customizar Copilot Instructions

Edite `.github/copilot-instructions.md`:

```bash
code .github/copilot-instructions.md

# Procure por comentários de customização:
# - > 💡 **Customização**: ...
# - > 🔧 **AÇÃO OBRIGATÓRIA**: ...

# Atualize com sua stack real:
# - Frontend framework (React/Vue/Angular)
# - Backend framework (NestJS/Express/Django)
# - Database (PostgreSQL/MySQL/MongoDB)
# - Testing tools (Jest/Vitest/PyTest)
```

### 5. Configurar Variáveis de Ambiente

```bash
# Copie o template
cp .specify/templates/env-example-template .env.example

# Customize o .env.example para seu projeto
code .env.example

# Crie seu .env local (NÃO commitar!)
cp .env.example .env
code .env  # Adicione valores reais
```

### 6. Inicializar Estrutura do Projeto

Crie a estrutura de diretórios conforme sua stack:

```bash
# Exemplo: Frontend React + Backend Node
mkdir -p frontend/src/{components,pages,services,utils}
mkdir -p backend/src/{controllers,services,models,routes}
mkdir -p tests/{e2e,integration,unit}

# Ou simplesmente:
mkdir -p src tests docs
```

### 7. Configurar Dependências

**Node.js/TypeScript:**
```bash
npm init -y
# ou
pnpm init

# Adicione scripts básicos ao package.json
```

**Python:**
```bash
python -m venv venv
source venv/bin/activate  # No Windows: venv\Scripts\activate
pip install -r requirements.txt  # Crie este arquivo com suas deps
```

**Outros:** Configure conforme sua linguagem

### 8. Criar Primeira Feature (Exemplo)

```bash
# 1. Crie diretório da spec
mkdir -p .specify/specs/001-setup-inicial

# 2. Copie e edite a spec
cp .specify/templates/spec-template.md .specify/specs/001-setup-inicial/spec.md
code .specify/specs/001-setup-inicial/spec.md

# 3. Defina user stories (P1, P2, P3)
# US1 (P1): Configurar ambiente de desenvolvimento
# US2 (P2): Criar estrutura básica de autenticação
# etc...

# 4. Gere plan e tasks (manual ou via Copilot)
cp .specify/templates/plan-template.md .specify/specs/001-setup-inicial/plan.md
cp .specify/templates/tasks-template.md .specify/specs/001-setup-inicial/tasks.md
```

### 9. Commit Inicial

```bash
git add .
git commit -m "feat: Inicializa projeto a partir do Starter Kit 1.0

- Configura structure básica
- Personaliza templates e documentação
- Define constitution e princípios do projeto"

git push origin main
```

### 10. Configurar GitHub (Opcional mas Recomendado)

**Issues e PR Templates:**
```bash
mkdir -p .github/ISSUE_TEMPLATE
mkdir -p .github/PULL_REQUEST_TEMPLATE
```

**Branch Protection:**
1. Vá para Settings → Branches
2. Adicione regra para `main`:
   - Require pull request before merging
   - Require status checks to pass
   - Require conversation resolution

**GitHub Actions (CI/CD):**
```bash
mkdir -p .github/workflows
# Crie workflows para lint, test, deploy
```

## ✅ Checklist de Validação

Antes de começar a desenvolver, certifique-se de que:

- [ ] `.gitignore` está configurado (especialmente `.specify/memory/`)
- [ ] `.env` está no `.gitignore` e não será commitado
- [ ] README.md foi personalizado com informações do projeto
- [ ] Constitution foi revisada e adaptada
- [ ] Copilot Instructions foram customizadas para sua stack
- [ ] Estrutura de diretórios foi criada
- [ ] Primeira spec foi criada (mesmo que simples)
- [ ] Git remote está configurado corretamente
- [ ] LICENSE está adequada (MIT por padrão)

## 🎓 Próximos Passos

Agora você está pronto para começar! Sugerimos:

1. **Criar primeira feature real:**
   - Defina spec em `.specify/specs/001-sua-feature/`
   - Siga o workflow Spec → Plan → Tasks → Test-First → Implement

2. **Configurar CI/CD:**
   - GitHub Actions para testes automáticos
   - Deploy automático (Vercel/Railway/Fly.io)

3. **Setup de desenvolvimento:**
   - Prettier, ESLint, ou equivalente da sua linguagem
   - Husky para pre-commit hooks
   - Commitlint para validar mensagens de commit

4. **Documentação:**
   - Adicionar exemplos de uso
   - Documentar APIs (se aplicável)
   - Criar guias de troubleshooting

## 🆘 Problemas Comuns

**Problema: "Copilot não está seguindo as instruções"**
- Solução: Verifique se `.github/copilot-instructions.md` está no encoding UTF-8 e sem erros de sintaxe Markdown

**Problema: "Testes não estão rodando"**
- Solução: Certifique-se de que as dependências de teste foram instaladas e os scripts estão configurados no `package.json` (ou equivalente)

**Problema: ".specify/memory/ está sendo commitado"**
- Solução: Verifique se `.gitignore` inclui `.specify/memory/` e execute `git rm --cached -r .specify/memory/`

## 📚 Recursos Adicionais

- [README Principal](../../../README.md)
- [Constitution](.specify/memory/constitution.md)
- [Copilot Instructions](.github/copilot-instructions.md)
- [Templates](.specify/templates/)
- [Contributing Guide](../../../CONTRIBUTING.md)

---

**Tempo estimado para setup completo**: 15-30 minutos

Precisa de ajuda? Abra uma [issue](https://github.com/fabioaap/Starter_KIT_1.0/issues) ou [discussion](https://github.com/fabioaap/Starter_KIT_1.0/discussions).

# 📚 Sistema Automático de Atualização de Documentação

## Visão Geral

Sistema completo para manter documentação **sempre sincronizada** com o código-fonte do projeto.

### ✨ Funcionalidades

✅ **Análise automática** de componentes, telas, hooks e tipos  
✅ **Geração de documentação** em Markdown  
✅ **Atualização incremental** sem perder conteúdo manual  
✅ **Git hooks** para automação local  
✅ **GitHub Actions** para automação remota  
✅ **Zero configuração** - funciona out-of-the-box  

---

## 🚀 Setup Rápido (5 minutos)

### 1️⃣ Instalar e configurar

```bash
# Clonar/atualizar repositório
cd mundo-de-kaboo-main

# Instalar dependências
npm install

# Configurar Git hooks
npm run setup-git-hooks  # No bash
# OU
.\scripts\setup-git-hooks.ps1  # No PowerShell
```

### 2️⃣ Testar

```bash
# Executar script manualmente
npm run update-docs

# Verificar arquivos criados
ls -la docs/*.md
```

### 3️⃣ Usar

**Opção A: Automático (recomendado)**
```bash
git add .
git commit -m "feat: novo componente"
# ↓ Hook pré-commit roda automaticamente
# ↓ Documentação atualizada
```

**Opção B: Manual (quando necessário)**
```bash
npm run update-docs
git add docs/ INFRAESTRUTURA.md
git commit -m "docs: atualizar documentação"
```

---

## 📋 Arquivos do Sistema

```
projeto/
├── scripts/
│   ├── update-docs.mjs                 # ⭐ Script principal
│   └── setup-git-hooks.ps1             # Setup Windows
│
├── .githooks/
│   └── pre-commit                      # Hook pré-commit
│
├── .github/workflows/
│   └── update-docs.yml                 # CI/CD automático
│
├── docs/
│   ├── README.md                       # Este arquivo
│   ├── UPDATE_DOCS_GUIDE.md            # Guia detalhado
│   ├── COMPONENTES.md                  # ✨ Gerado auto
│   ├── SCREENS.md                      # ✨ Gerado auto
│   ├── HOOKS.md                        # ✨ Gerado auto
│   ├── API.md                          # ✨ Gerado auto
│   ├── CHANGELOG.md                    # ✨ Gerado auto
│   ├── prd-vouchers-por-conteudo.md   # Manual
│   ├── wireframe-cms-admin.md          # Manual
│   └── benchmark-fluxo-vouchers-grafica.md  # Manual
│
└── INFRAESTRUTURA.md                   # ✨ Atualizado auto
```

---

## 🔄 Como Funciona

### Fluxo Local (Pre-commit Hook)

```mermaid
git commit
    ↓
.githooks/pre-commit
    ↓
npm run update-docs
    ├─ Escaneia código
    ├─ Gera docs
    └─ Atualiza INFRAESTRUTURA.md
    ↓
git add docs/ INFRAESTRUTURA.md
    ↓
commit realizado
```

### Fluxo Remoto (GitHub Actions)

```mermaid
push para main/develop
    ↓
.github/workflows/update-docs.yml
    ↓
verifica arquivos alterados
    ↓
(se components/, screens/, hooks/, types.ts foram alterados)
    ↓
npm run update-docs
    ↓
detecta mudanças
    ↓
(se há mudanças)
    ├─ commit automático
    └─ push automático
    ↓
PR comentado com aviso
```

---

## 📊 O que é Gerado

### COMPONENTES.md
- Lista de **22 componentes** React
- Descrição de cada um
- Caminho do arquivo
- Props interfaces

```markdown
## Button
Arquivo: components/Button.tsx
Props: Interface ButtonProps definida
Descrição: Botão estilizado e reutilizável
```

### SCREENS.md
- Lista de **17 telas**
- Telas públicas vs protegidas
- Estrutura de navegação

```markdown
## Telas Protegidas (Requer autenticação)
- HomeScreen (screens/HomeScreen.tsx)
- ProfileScreen (screens/ProfileScreen.tsx)
...
```

### HOOKS.md
- **7 hooks** customizados
- Descrição e uso
- Exemplo de implementação

```markdown
## useDebounce
Arquivo: hooks/useDebounce.ts
Descrição: Debounce hook para otimizar callbacks frequentes
```

### API.md
- **Funções públicas** de API
- Organizado por categoria (Auth, Profile, Collections, Vouchers)

```markdown
### Autenticação
- `signIn()`
- `signUp()`
- `signOut()`
...
```

### CHANGELOG.md
- Estrutura de projeto
- Últimas componentes/telas/hooks adicionadas
- Resumo de mudanças

---

## 💻 Comandos Disponíveis

```bash
# Atualizar documentação manualmente
npm run update-docs

# Setup inicial de Git hooks (bash)
bash setup-git-hooks.sh

# Setup inicial de Git hooks (PowerShell)
.\scripts\setup-git-hooks.ps1

# Verificar se há documentações para atualizar
git status docs/

# Ver histórico de mudanças em docs
git log --oneline docs/
```

---

## 🎯 Casos de Uso

### Caso 1: Novo Componente
```bash
# 1. Criar componente com JSDoc
code components/NewComponent.tsx

# 2. Fazer commit
git add components/NewComponent.tsx
git commit -m "feat: add NewComponent"
# ↓ Hook pré-commit roda
# ↓ COMPONENTES.md atualizado automaticamente
```

### Caso 2: Atualizar Documentação Manual
```bash
# 1. Editar documentação
vim docs/prd-vouchers-por-conteudo.md

# 2. Fazer commit
git add docs/prd-vouchers-por-conteudo.md
git commit -m "docs: atualizar PRD de vouchers"
# ↓ Documentação auto-gerada NÃO é sobrescrita
```

### Caso 3: Sincronizar com CI/CD
```bash
# Fazer push para main/develop
git push origin main

# GitHub Actions roda automaticamente
# ↓ Documentação sincronizada
# ↓ Commit automático criado
# ↓ PR comentado (se em PR)
```

---

## ⚙️ Configuração Avançada

### Customizar diretórios escaneados

Editar em `scripts/update-docs.mjs`:

```javascript
const CONFIG = {
  sourcePatterns: {
    components: 'components/**/*.tsx',
    screens: 'screens/**/*.tsx',
    hooks: 'hooks/**/*.ts',
    lib: 'lib/**/*.ts',
    types: 'types.ts',
  },
}
```

### Adicionar novo tipo de documento

```javascript
// Em generateAPIDocs()
function generateNewDocs(data) {
  let doc = `# Meu Documento\n\n`;
  // gerar conteúdo
  return doc;
}

// Adicionar à escrita
const files = [
  // ... arquivos existentes
  [CONFIG.outputFiles.newDocs, generateNewDocs(data), 'MEU_DOC.md'],
];
```

### Desabilitar auto-commit do hook

Editar `.githooks/pre-commit`:

```bash
# Comentar linhas de commit
# git add docs/COMPONENTES.md
# git commit -m "docs: auto-update"
```

---

## 🐛 Troubleshooting

### Hook não executa

```bash
# Verificar se hooks estão configurados
git config --show-origin core.hooksPath

# Reconfigar
git config core.hooksPath .githooks

# Verificar permissões
ls -la .githooks/pre-commit
chmod +x .githooks/pre-commit
```

### Documentação não atualiza

```bash
# Verificar se há .tsx/.ts novos
ls -la components/*.tsx

# Rodar script manualmente com debug
node scripts/update-docs.mjs
```

### GitHub Actions falhando

- Verificar logs em Actions tab
- Verificar se branch está configurado em `update-docs.yml`
- Verificar permissões do token automático (`GITHUB_TOKEN`)

---

## 📈 Métricas

**Última geração**: 08/04/2026

| Métrica | Valor |
|---------|-------|
| Componentes | 22 |
| Telas | 17 |
| Hooks | 7 |
| Tipos | 29 |
| Arquivos do script | 1 (update-docs.mjs) |
| Tempo de execução | ~2-3 segundos |
| Arquivos gerados | 5 markdown + INFRAESTRUTURA |

---

## 🚀 Próximas Melhorias

- [ ] Watch mode: `npm run update-docs --watch`
- [ ] Gerar PDF da documentação
- [ ] Sincronizar com Notion/Confluence
- [ ] Análise de cobertura de docs
- [ ] Gerar diagrama de dependências
- [ ] Validar links de referência cruzada

---

## 📞 Suporte

### Dúvidas?

1. Verificar `docs/UPDATE_DOCS_GUIDE.md` para guia completo
2. Rodar `npm run update-docs` manualmente
3. Verificar logs em `.github/workflows/update-docs.yml`

### Feedback?

Sugerir melhorias abrindo issue no repositório.

---

**Versão**: 1.0  
**Data**: 08/04/2026  
**Mantido por**: Equipe de Desenvolvimento

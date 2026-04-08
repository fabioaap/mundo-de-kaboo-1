# 🚀 Sistema Automático de Atualização de Documentação - SETUP

## Resumo do que foi criado

✅ **Script de atualização**: `scripts/update-docs.mjs`  
✅ **Git hook**: `.githooks/pre-commit`  
✅ **GitHub Actions**: `.github/workflows/update-docs.yml`  
✅ **Documentações**: 5 guias de uso  
✅ **Comando NPM**: `npm run update-docs`  

---

## ⚡ Início Rápido (escolha uma opção)

### Opção A: Automático (Recomendado - Git Hook)

```powershell
# 1. Configurar git hooks
.\scripts\setup-git-hooks.ps1

# 2. Testar
npm run update-docs

# 3. Fazer commit (docs atualizam automaticamente)
git add .
git commit -m "feat: novo componente"
```

### Opção B: Manual (Quando quiser)

```powershell
# Atualizar documentação quando necessário
npm run update-docs
```

### Opção C: Automático na nuvem (GitHub Actions)

Apenas faça commits normalmente - CI/CD cuida do resto!

---

## 📍 Arquivos Importantes

| Arquivo | Função | Lê | Escreve |
|---------|--------|-----|---------|
| `scripts/update-docs.mjs` | Script principal analyzer | ✓ | ✓ |
| `.githooks/pre-commit` | Hook pré-commit | | ✓ |
| `.github/workflows/update-docs.yml` | CI/CD workflow | | ✓ |
| `DOCUMENTACAO_AUTO.md` | Guia completo | | |
| `docs/UPDATE_DOCS_GUIDE.md` | Como usar | | |
| `package.json` | Script NPM | ✓ | |

---

## 📚 Documentações Geradas

Após rodar `npm run update-docs`, você terá:

```
docs/
├── README.md                    # Instrções gerais
├── UPDATE_DOCS_GUIDE.md        # Guia detalhado
├── COMPONENTES.md              # 📄 Auto-gerado: 22 componentes
├── SCREENS.md                  # 📄 Auto-gerado: 17 telas
├── HOOKS.md                    # 📄 Auto-gerado: 7 hooks
├── API.md                      # 📄 Auto-gerado: funções públicas
└── CHANGELOG.md                # 📄 Auto-gerado: histórico
```

Plus:
- `INFRAESTRUTURA.md` (atualizado com novas estatísticas)

---

## 🔄 Fluxo de Funcionamento

### Local (Você faz commits)

```
1. Editar código
   ↓
2. git add .
   ↓
3. git commit -m "..."
   ↓
4. [PRÉ-COMMIT HOOK DISPARA]
   ↓
5. npm run update-docs
   ↓
6. docs/*.md atualizados
   ↓
7. INFRAESTRUTURA.md atualizado
   ↓
8. Commit finalizado com documentação sincronizada ✅
```

### Remote (Push para GitHub)

```
1. git push origin main
   ↓
2. [GITHUB ACTIONS DISPARA]
   ↓
3. Workflow: update-docs.yml
   ↓
4. npm run update-docs
   ↓
5. Se houver mudanças:
   - Commit automático
   - Push automático
   - Comentário no PR (se aplicável)
```

---

## ✔️ Checklist de Verificação

Verifique se tudo foi instalado corretamente:

```powershell
# 1. Verificar script existe
Test-Path scripts/update-docs.mjs
# Esperado: True

# 2. Tentar rodar
npm run update-docs
# Esperado: ✅ Documentações atualizadas com sucesso!

# 3. Verificar arquivos gerados
ls docs/*.md
# Esperado: 7 arquivos

# 4. Verificar git hooks
git config core.hooksPath
# Esperado: .githooks

# 5. Verificar workflow
Test-Path .github/workflows/update-docs.yml
# Esperado: True
```

---

## 📖 Como Usar Efetivamente

### Para Componentes

```typescript
/**
 * Card com efeito 3D - exibe capa de coleção
 * 
 * @component
 * @example
 * return <Card3D collection={collection} onClick={handleClick} />
 */
export const Card3D: React.FC<Card3DProps> = ({ ...props }) => {
  // ...
}
```

### Para Hooks

```typescript
/**
 * Hook para detectar tamanho da tela
 * @returns { width: number; height: number }
 */
export const useScreenSize = () => {
  // ...
}
```

### Para Telas

Telas são detectadas automaticamente por localização em `screens/`

### Para Tipos

```typescript
/** Status de acesso do usuário */
export type AccessStatus = 'active' | 'expired' | 'pending_voucher';

/** Interface do perfil do usuário */
export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  // ...
}
```

---

## 🎯 Exemplos de Uso

### Exemplo 1: Criar novo componente

```bash
# 1. Criar o arquivo
code components/NewFeature.tsx

# 2. Adicionar ao git
git add components/NewFeature.tsx

# 3. Fazer commit
git commit -m "feat: add NewFeature component"

# ✅ RESULTADO:
# - Hook pré-commit roda automaticamente
# - COMPONENTES.md é atualizado
# - Você não fez nada extra!
```

### Exemplo 2: Atualizar tela existente

```bash
# 1. Editar tela
vim screens/HomeScreen.tsx

# 2. Commit
git add screens/HomeScreen.tsx
git commit -m "refactor: improve HomeScreen"

# ✅ RESULTADO:
# - SCREENS.md é recriado com análise atualizada
# - Tudo sincronizado
```

### Exemplo 3: Atualizar documentação manual

```bash
# 1. Editar documentação (que NÃO é auto-gerada)
vim docs/prd-vouchers-por-conteudo.md

# 2. Commit
git add docs/prd-vouchers-por-conteudo.md
git commit -m "docs: update vouchers PRD"

# ✅ RESULTADO:
# - Seu documento manual é preservado ✓
# - COMPONENTES.md e outras auto-geradas também são atualizadas
```

---

## 🛠️ Troubleshooting

### "npm run update-docs dá erro"

```powershell
# Tentar:
npm install  # Reinstalar deps
npm run update-docs
```

### "Git hook não executa"

```powershell
# Reconfigurar:
git config core.hooksPath .githooks

# Verificar:
git config core.hooksPath
# Deve retornar: .githooks
```

### "GitHub Actions falha"

Verificar em: `Actions` → `update-docs` → ver logs

### "Não quero atualizar docs no commit"

Remova/comentar linhas em `.githooks/pre-commit`:
```bash
# git add docs/
# git commit -m "..."
```

---

## 📊 Estatísticas Atuais

**Última execução**: 08/04/2026

- Componentes: 22
- Telas: 17
- Hooks: 7
- Tipos: 29
- Documentações geradas: 5
- Tempo médio: 2-3 segundos

---

## 🚀 Próximos Passos

1. ✅ Executar `npm run update-docs` para verificar
2. ✅ Configurar git hooks: `.\scripts\setup-git-hooks.ps1`
3. ✅ Fazer um commit de teste
4. ✅ Verificar se docs foram atualizadas
5. ✅ Adicionar ao README.md do projeto

---

## 📚 Documentações do Sistema

Leia para entender melhor:

1. **DOCUMENTACAO_AUTO.md** (este arquivo) - Overview geral
2. **docs/UPDATE_DOCS_GUIDE.md** - Guia detalhado
3. **docs/README.md** - Info sobre arquivos gerados
4. **scripts/update-docs.mjs** - Código do script

---

## 💡 Dicas Pro

- Use `npm run update-docs` antes de push importante
- Sempre faça commits pequenos e focados
- Adicione JSDoc em componentes/funções importantes
- Não edite manualmente docs auto-geradas

---

## 🎓 Uma última coisa...

Depois de configurado, **você basicamente não faz nada**. Os hooks fazem tudo:

```
Seu fluxo:            → Automatizado:
1. Editar código      → 1. npm run update-docs
2. git add .          → 2. Analisar código
3. git commit -m "..."→ 3. Gerar docs
4. git push           → 4. Atualizar INFRAESTRUTURA.md
                      → 5. Adicionar ao commit
                      → 6. Push
```

**Isso vale para Supabase, GitHub Actions e deploy automático também.**

---

**Criado em**: 08/04/2026  
**Script**: `scripts/update-docs.mjs`  
**Versão**: 1.0  
**Status**: ✅ Pronto para uso

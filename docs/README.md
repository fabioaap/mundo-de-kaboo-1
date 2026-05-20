# 📚 Documentação do Projeto

Esta pasta contém a documentação automática e manual do projeto Mundo de Kaboo.

## 📄 Arquivos

### Gerados Automaticamente (atualizar com `npm run update-docs`)

| Arquivo | Conteúdo | Frequência |
|---------|----------|-----------|
| **COMPONENTES.md** | Catálogo de todos os componentes React | A cada mudança em `components/` |
| **SCREENS.md** | Lista de telas e fluxos | A cada mudança em `screens/` |
| **HOOKS.md** | Documentação de React Hooks | A cada mudança em `hooks/` |
| **API.md** | Referência de funções de API | A cada mudança em `lib/api.ts` |
| **CHANGELOG.md** | Histórico de mudanças | A cada execução do script |

### Manuais

| Arquivo | Conteúdo |
|---------|----------|
| **UPDATE_DOCS_GUIDE.md** | Guia de uso do script de auto-update |
| **prd-vouchers-por-conteudo.md** | PRD do módulo de vouchers |
| **wireframe-cms-admin.md** | Wireframes do painel admin |
| **benchmark-fluxo-vouchers-grafica.md** | Análise benchmark do fluxo |
| **qa-validation-plan-v1.2.md** | Plano operacional de QA para validar o escopo entregue |
| **qa-report-2026-04-20-smoke.md** | Relatório da rodada inicial de smoke QA |

### Na Raiz do Projeto

| Arquivo | Conteúdo |
|---------|----------|
| **INFRAESTRUTURA.md** | Documentação completa de arquitetura + infraestrutura |
| **README.md** | Instruções de setup e uso |

---

## 🚀 Como Atualizar

### Opção 1: Manualmente
```bash
npm run update-docs
```

### Opção 2: Automático (Pre-commit hook)
Já configurado em `.githooks/pre-commit`

Para ativar:
```bash
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit
```

### Opção 3: CI/CD (GitHub Actions)
Workflow automático em `.github/workflows/update-docs.yml` que roda em cada push.

## 🌍 Deploy da Wiki

O app principal e a wiki Docusaurus sobem juntos no GitHub Pages. A wiki fica publicada em `/wiki/` dentro do mesmo domínio do portal.

### Premissas

- Build da wiki: `npm run build` dentro de `docs/`
- Saída estática: pasta `docs/build`
- Destino final no artefato do Pages: `dist/wiki`
- URL esperada em produção: `https://mundodekaboo.educacross.dev/wiki/`

### Decisão aplicada

O deploy do Pages agora monta o app na raiz e injeta o build do Docusaurus em `/wiki/`. Isso elimina a dependência de um host externo separado para a documentação.

- O card Wiki no portal passa a abrir a wiki publicada no mesmo domínio.
- Em desenvolvimento local, a wiki continua em `http://localhost:4200`.

---

## 📊 Estrutura de Geração

```
Script: scripts/update-docs.mjs
    ↓
    ├─→ Escaneia components/
    ├─→ Escaneia screens/
    ├─→ Escaneia hooks/
    ├─→ Escaneia lib/ e types.ts
    ↓
    ├─→ Extrai JSDoc + tipos
    ├─→ Conta estatísticas
    ↓
    ├─→ Gera COMPONENTES.md
    ├─→ Gera SCREENS.md
    ├─→ Gera HOOKS.md
    ├─→ Gera API.md
    ├─→ Gera CHANGELOG.md
    ├─→ Atualiza INFRAESTRUTURA.md
    ↓
    ✅ Commit automático (se houver mudanças)
```

---

## 💡 Dicas

### Para melhor documentação automática
- Use **JSDoc** em seus componentes e funções
- Defina **interface Props** explícita
- Adicione **comentários descritivos**

### Exemplo de componente bem documentado

```tsx
/**
 * Card reutilizável para exibir coleção de conteúdo
 * 
 * Funcionalidades:
 * - Preload de imagens
 * - Badge de nível educacional
 * - Indicador de progresso opcional
 * 
 * @component
 * @example
 * return (
 *   <CollectionCard
 *     collection={collection}
 *     onClick={() => navigate(`/details/${collection.id}`)}
 *   />
 * )
 */
export const CollectionCard: React.FC<CollectionCardProps> = ({
  collection,
  onClick,
  showProgress = false,
}) => {
  // implementação
}

interface CollectionCardProps {
  /** Dados da coleção */
  collection: Collection;
  /** Callback ao clicar */
  onClick: () => void;
  /** Mostrar barra de progresso */
  showProgress?: boolean;
}
```

---

## 🔄 Sincronização Manual

Se preferir manter docs em Markdown sem automation:

```bash
# 1. Editar manualmente
vim COMPONENTES.md

# 2. Rodar script para completar seções faltantes
npm run update-docs

# 3. Fazer merge manual das mudanças
```

---

## 📈 Estatísticas Atuais

**Última atualização**: 08 de abril de 2026

- **22** componentes React
- **17** telas
- **7** hooks customizados
- **29** tipos TypeScript (18 interfaces, 11 types)
- **6** funções públicas de API

---

## ⚠️ Importante

- **NÃO edite** seções auto-geradas (elas serão sobrescritas)
- **PREFIRA** adicionar documentação no código (JSDoc)
- **MANTENHA** padrão de nomenclatura de arquivos

---

## Próxima Geração

Melhorias planejadas para o script:

- [ ] Gerar documentação em PDF
- [ ] Sincronizar com Notion
- [ ] Validar links de referência
- [ ] Gerar graphQL/OpenAPI docs
- [ ] Detectar dependências circulares
- [ ] Sugerir refactors baseado em análise

---

**Mantido por**: Equipe de Desenvolvimento  
**Script**: `scripts/update-docs.mjs`  
**Última atualização**: 08/04/2026

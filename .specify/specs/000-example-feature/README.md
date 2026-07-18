# 📚 Exemplo de Feature Completa

Este diretório contém um exemplo didático completo de como estruturar uma feature seguindo o workflow Spec-Driven Development do Starter Kit 1.0.

## 🎯 Propósito

Este exemplo serve como **referência e guia de estudo** para entender:

- Como escrever uma spec completa e bem estruturada
- Como criar um implementation plan detalhado
- Como quebrar uma feature em tasks executáveis
- Como priorizar user stories (P1/P2/P3)
- Como garantir compliance com a Constitution

## ⚠️ IMPORTANTE

**Este é apenas um exemplo didático!** Não implemente esta feature literalmente. Use-a como inspiração para criar suas próprias specs.

## 📁 Arquivos

### `spec.md` - Especificação da Feature

Demonstra:
- ✅ User stories priorizadas e independentemente testáveis
- ✅ Cenários de aceitação em formato Given-When-Then
- ✅ Edge cases identificados
- ✅ Requisitos funcionais claros (FR-001, FR-002, etc)
- ✅ Success criteria mensuráveis (SC-001, SC-002, etc)
- ✅ Constitution compliance completo
- ✅ Considerações de segurança e privacy

**Aprenda com este exemplo:**
- Como priorizar (P1 mais crítico que P2)
- Como fazer user stories independentes
- Como definir critérios de sucesso mensuráveis
- Como documentar requisitos de segurança

### `plan.md` - Plano de Implementação

Demonstra:
- ✅ Contexto técnico (stack, dependências, constraints)
- ✅ Constitution check (validação de compliance)
- ✅ Estrutura de código proposta
- ✅ Abordagem de implementação por phase
- ✅ Estratégia de testes
- ✅ Considerações de segurança
- ✅ Plano de rollout
- ✅ Riscos e mitigações

**Aprenda com este exemplo:**
- Como organizar código por módulos
- Como planejar phases de implementação
- Como documentar decisões técnicas
- Como identificar e mitigar riscos

### `tasks.md` - Breakdown de Tarefas

Demonstra:
- ✅ Tasks organizadas por user story
- ✅ Identificação de tasks paralelas [P]
- ✅ Test-first approach (testes antes de implementação)
- ✅ Checkpoints de validação
- ✅ Dependências entre phases e tasks
- ✅ Estratégias de entrega (MVP first, incremental)

**Aprenda com este exemplo:**
- Como quebrar uma feature em tasks pequenas
- Como organizar por user story para entregas independentes
- Como identificar oportunidades de paralelização
- Como garantir test-first em cada etapa

## 🎓 Como Usar Este Exemplo

### 1. Leia na Ordem

1. **Comece por `spec.md`** - Entenda WHAT e WHY
2. **Continue com `plan.md`** - Entenda HOW (técnico)
3. **Termine com `tasks.md`** - Entenda WHAT (executável)

### 2. Observe os Padrões

- **Priorização**: P1 (crítico) → P2 (importante) → P3 (nice to have)
- **Independência**: Cada user story pode ser entregue sozinha
- **Test-First**: Testes sempre ANTES da implementação
- **Constitution**: Compliance verificado em cada etapa
- **Clareza**: Linguagem objetiva, critérios mensuráveis

### 3. Adapte para Seu Projeto

Quando criar sua própria feature:

```bash
# 1. Crie diretório da spec
mkdir -p .specify/specs/001-sua-feature

# 2. Copie os templates (não este exemplo!)
cp .specify/templates/spec-template.md .specify/specs/001-sua-feature/spec.md
cp .specify/templates/plan-template.md .specify/specs/001-sua-feature/plan.md
cp .specify/templates/tasks-template.md .specify/specs/001-sua-feature/tasks.md

# 3. Use o exemplo 000 como REFERÊNCIA (não cópia)
# - Veja como priorizar user stories
# - Veja como estruturar requisitos
# - Veja como organizar tasks
```

## ✅ Checklist de Validação

Use esta checklist ao criar suas specs baseadas neste exemplo:

### Spec (spec.md)
- [ ] User stories priorizadas (P1/P2/P3)?
- [ ] Cada story é independentemente testável?
- [ ] Cenários de aceitação em Given-When-Then?
- [ ] Edge cases documentados?
- [ ] Requisitos funcionais específicos (FR-XXX)?
- [ ] Success criteria mensuráveis (SC-XXX)?
- [ ] Constitution compliance preenchido?
- [ ] Considerações de segurança?

### Plan (plan.md)
- [ ] Stack técnico especificado?
- [ ] Constitution check realizado?
- [ ] Estrutura de código definida?
- [ ] Phases de implementação claros?
- [ ] Estratégia de testes definida?
- [ ] Riscos identificados e mitigados?

### Tasks (tasks.md)
- [ ] Tasks organizadas por user story?
- [ ] Testes marcados para serem feitos PRIMEIRO?
- [ ] Tasks paralelas identificadas [P]?
- [ ] Checkpoints de validação definidos?
- [ ] Dependências documentadas?
- [ ] Estratégia de entrega (MVP/incremental)?

## 🚫 O Que NÃO Fazer

❌ **Não copie este exemplo literalmente** para seu projeto  
✅ Use-o como inspiração e adapte para seu domínio

❌ **Não implemente um sistema de autenticação** baseado apenas neste exemplo  
✅ Use bibliotecas estabelecidas (Passport, Auth0, NextAuth, etc)

❌ **Não pule etapas** (spec → plan → tasks)  
✅ Siga o workflow completo para garantir qualidade

## 📚 Recursos Adicionais

- [Constitution](.specify/memory/constitution.md) - Princípios NON-NEGOTIABLE
- [Templates](.specify/templates/) - Templates vazios para suas features
- [README Principal](../../../README.md) - Visão geral do Starter Kit
- [Quick Start](.specify/templates/QUICKSTART.md) - Guia de início rápido

## 💡 Dicas

1. **Comece simples**: Sua primeira spec pode ser menor que este exemplo
2. **Itere**: Specs evoluem conforme você aprende mais sobre o problema
3. **Peça feedback**: Revise specs com o time antes de implementar
4. **Documente decisões**: Use o plan.md para registrar o "porquê"
5. **Mantenha atualizado**: Se requirements mudam, atualize a spec

## 🙋 Dúvidas?

- Revise a [Constitution](.specify/memory/constitution.md)
- Leia o [README principal](../../../README.md)
- Abra uma [issue](https://github.com/fabioaap/Starter_KIT_1.0/issues) com dúvidas
- Consulte as [Discussions](https://github.com/fabioaap/Starter_KIT_1.0/discussions)

---

**Última atualização**: 2026-01-14  
**Versão do exemplo**: 1.0.0

Use este exemplo como guia, não como template literal! 🚀

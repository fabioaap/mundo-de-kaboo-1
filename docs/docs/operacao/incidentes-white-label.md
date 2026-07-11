---
id: incidentes-white-label
title: Incidentes White Label
sidebar_position: 2
---

# Incidentes White Label — Runbook + Simulação

{/* Consolidado de docs/RUNBOOK-WHITE-LABEL-INCIDENTES.md e docs/CHECKLIST-SIMULACAO-INCIDENTE-WHITE-LABEL.md (2026-04-27). */}

> Escopo: resposta a incidentes de rollout, feature flags e publicação **por marca** no painel
> Admin → White Label. Vale para as duas marcas (Kaboo e Central Coruja) — cada uma é um tenant
> isolado por `brand_id`.

## Parte A — Runbook de resposta a incidentes

### 1. Objetivo

Resposta padronizada a incidentes de White Label, com foco em:

- rollback em menos de 5 minutos;
- isolamento por marca (não vazar mudança de uma marca para a outra);
- rastreabilidade da decisão.

### 2. Pré-condições

- Acesso ao Admin com permissão de gestão da marca (`can_manage_brand`).
- Acesso aos logs de auditoria (`feature_flag_audit`).
- Painel disponível em **Admin → White Label**.

### 3. Classificação de incidente

| Severidade | Definição |
|---|---|
| **P0 Crítico** | Quebra funcional ampla para marca em rollout `general`. |
| **P1 Alto** | Regressão funcional relevante para grupo piloto ou parcial. |
| **P2 Médio** | Inconsistência visual/operacional sem bloqueio crítico. |

### 4. Procedimento padrão de resposta

1. Confirmar **marca afetada** e onda de rollout atual.
2. Abrir a seção **Auditoria recente** e identificar o último evento suspeito.
3. Executar **Reverter** no evento afetado.
4. Preencher o motivo da mudança com o padrão: `INCIDENTE <severidade> - rollback - <resumo>`.
5. Validar no runtime da marca (home / menu / módulos impactados).
6. Se persistir impacto, **reduzir a onda para `pilot`**.
7. Registrar decisão e horário no canal operacional.

### 5. Estratégia de rollback rápido

- Usar o rollback por item de auditoria como **primeira resposta**.
- Se múltiplas flags estiverem envolvidas: reverter em ordem **decrescente de `changed_at`** e
  publicar a versão após estabilização.
- **Tempo alvo:** detecção + execução `<= 5 minutos`.

### 6. Alertas e sinais de risco

Tratar imediatamente quando houver:

- rollout `general` **sem publicação registrada**;
- volume alto de alterações em 24h;
- ausência de flags ativas esperadas para a marca.

### 7. Checklist pós-incidente

- [ ] Runtime estabilizado para a marca afetada.
- [ ] Onda ajustada para nível seguro, se necessário.
- [ ] Publicação executada e horário registrado.
- [ ] Causa raiz documentada.
- [ ] Ação preventiva adicionada ao plano técnico.

### 8. Responsáveis

- **Operação Admin White Label:** equipe de produto/ops.
- **Aprovação de retorno para `general`:** coordenação técnica + produto.

### 9. Métricas de acompanhamento

- MTTR de rollback por marca.
- Mudanças em 24h por marca.
- Incidentes por onda (`pilot`, `group`, `general`).

---

## Parte B — Checklist de simulação (drill)

> Objetivo do drill: validar preparo operacional para rollback rápido e isolamento por marca
> **antes** de um incidente real. Rodar periodicamente.

### B.1 — Preparação

- [ ] Selecionar a marca-alvo para simulação.
- [ ] Confirmar que existe evento recente em auditoria.
- [ ] Confirmar o motivo padrão para ações operacionais.

### B.2 — Simulação de incidente

- [ ] Aplicar alteração controlada de feature flag.
- [ ] Confirmar o impacto esperado no runtime da marca.
- [ ] Classificar a severidade simulada (P0/P1/P2).

### B.3 — Resposta

- [ ] Executar rollback pelo painel (**Auditoria recente → Reverter**).
- [ ] Registrar o motivo do rollback com o padrão operacional.
- [ ] Reduzir a onda de rollout para `pilot` quando necessário.

### B.4 — Verificação

- [ ] Validar a restauração funcional (menu, home, módulos afetados).
- [ ] Publicar a versão estável após a correção.
- [ ] Confirmar atualização de métricas e alertas no painel.

### B.5 — Pós-mortem rápido

- [ ] Registrar o tempo total de recuperação (MTTR).
- [ ] Registrar causa raiz e ação preventiva.
- [ ] Atualizar este runbook se houver novo aprendizado.

> **Nota (2026-06-14):** a UI de alerting/dispatch da aba Auditoria ("Histórico de entregas" +
> "Payload de alertas") e o `useEffect` de auto-dispatch inerte foram **removidos** do painel. O
> rollback por item de auditoria continua sendo o mecanismo canônico.

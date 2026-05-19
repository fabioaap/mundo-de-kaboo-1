# Checklist - Simulação de Incidente White Label

Data: 2026-04-27
Objetivo: validar preparo operacional para rollback rapido e isolamento por marca.

## 1) Preparação

- [ ] Selecionar marca alvo para simulação.
- [ ] Confirmar que existe evento recente em auditoria.
- [ ] Confirmar motivo padrão para ações operacionais.

## 2) Simulação de incidente

- [ ] Aplicar alteração controlada de feature flag.
- [ ] Confirmar impacto esperado na runtime da marca.
- [ ] Classificar severidade simulada (P0/P1/P2).

## 3) Resposta

- [ ] Executar rollback pelo painel (`Auditoria recente > Reverter`).
- [ ] Registrar motivo do rollback com padrão operacional.
- [ ] Reduzir onda de rollout para `pilot` quando necessário.

## 4) Verificação

- [ ] Validar restauração funcional (menu, home, módulos afetados).
- [ ] Publicar versão estável após correção.
- [ ] Confirmar atualização de métricas e alertas no painel.

## 5) Pós-mortem rápido

- [ ] Registrar tempo total de recuperação (MTTR).
- [ ] Registrar causa raiz e ação preventiva.
- [ ] Atualizar runbook se houver novo aprendizado.

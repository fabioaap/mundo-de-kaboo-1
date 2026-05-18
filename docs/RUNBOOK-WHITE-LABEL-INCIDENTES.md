# Runbook Operacional - White Label

Data: 2026-04-27
Escopo: resposta a incidentes em rollout, flags e publicação por marca no painel Admin.

## 1) Objetivo

Garantir resposta padronizada para incidentes de White Label, com foco em:
- rollback em menos de 5 minutos;
- isolamento por marca;
- rastreabilidade de decisão.

## 2) Pré-condições

- Acesso ao Admin com permissão de gestão da marca.
- Acesso aos logs de auditoria (`feature_flag_audit`).
- Painel White Label disponível em `Admin > White Label`.

## 3) Classificação de incidente

- P0 Crítico: quebra funcional ampla para marca em rollout `general`.
- P1 Alto: regressão funcional relevante para grupo piloto ou parcial.
- P2 Médio: inconsistência visual/operacional sem bloqueio crítico.

## 4) Procedimento padrão de resposta

1. Confirmar marca afetada e onda de rollout atual.
2. Abrir seção de `Auditoria recente` e identificar último evento suspeito.
3. Executar `Reverter` no evento afetado.
4. Preencher motivo da mudança com padrão:
   - `INCIDENTE <severidade> - rollback - <resumo>`.
5. Validar no runtime da marca (home/menu/módulos impactados).
6. Se persistir impacto, reduzir onda para `pilot`.
7. Registrar decisão e horário no canal operacional.

## 5) Estratégia de rollback rápido

- Usar rollback por item de auditoria como primeira resposta.
- Se múltiplas flags estiverem envolvidas:
  - reverter em ordem decrescente de `changed_at`;
  - publicar versão após estabilização.
- Tempo alvo:
  - detecção + execução <= 5 minutos.

## 6) Alertas e sinais de risco

Tratar imediatamente quando houver:
- rollout `general` sem publicação registrada;
- volume alto de alterações em 24h;
- ausência de flags ativas esperadas para a marca.

## 7) Checklist pós-incidente

- [ ] Runtime estabilizado para a marca afetada.
- [ ] Onda ajustada para nível seguro, se necessário.
- [ ] Publicação executada e horário registrado.
- [ ] Causa raiz documentada.
- [ ] Ação preventiva adicionada ao plano técnico.

## 8) Responsáveis

- Operação Admin White Label: equipe de produto/ops.
- Aprovação de retorno para `general`: coordenação técnica + produto.

## 9) Métricas de acompanhamento

- MTTR de rollback por marca.
- Mudanças em 24h por marca.
- Incidentes por onda (`pilot`, `group`, `general`).

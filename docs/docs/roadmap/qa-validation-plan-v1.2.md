# Plano de Validação QA — Mundo de Kaboo v1.2

> Última atualização: 20/04/2026
> Objetivo: validar o conjunto de entregas marcadas como v1.2 e garantir estabilidade para demonstração controlada.

## 1. Objetivos da rodada

1. Verificar fluxos críticos: login, resgate de voucher, navegação Home → Coleção → Recurso.
2. Garantir que tooltips (BNCC, CASEL) exibem dados corretos e não quebram em mobile.
3. Assegurar que leitores (flipbook) e players (áudio/vídeo) abrem sem erros e têm fallback.
4. Validar exportações administrativas (CSV/Excel) e logs de auditoria.

## 2. Ambientes e dados

- `dev` local com seed atualizado (`catalog.seed.json`) — recomendado para testes manuais.
- `staging` (se disponível) com Supabase de homologação.
- Dados de teste disponíveis em `data/` (bncc-lookup.json, casel-lookup.json, catalog.seed.json).

## 3. Casos de teste críticos (smoke)

1. Auth: signUp com e-mail, login, recuperar senha (quando implementado).
2. Resgate voucher: criar lote local, exportar CSV, usar código no fluxo de resgate, validar `user_content_grant` criado.
3. Home: aplicar filtro por segmento e busca textual; validar resultados e persistência de chips.
4. Detalhe: abrir coleção com múltiplos recursos, verificar botões dinâmicos (Ler, Ouvir, Assistir, Assistir Acessível), confirmar que botões sem arquivo não aparecem.
5. Flipbook: abrir PDF, usar zoom e modo texto; alternar entre páginas, testar acessibilidade básica (tab navigation).
6. Player áudio: tocar/pausar/seek, validar que o player não trava em mobile.
7. Export admin: gerar CSV/Excel de lote e abrir no Excel/LibreOffice; validar colunas obrigatórias.
8. Auditoria: checar registros de ativação e consumo no endpoint de auditoria.

## 4. Testes exploratórios

- Navegar em telas com largura 320, 375, 768, 1024; verificar grid adaptativo para botões de recurso.
- Validar tooltips BNCC e CASEL em touch e hover.
- Checar fallback quando `accessible_video_url` ou `animated_video_url` não estão presentes (should hide button gracefully).

## 5. Critérios de aceitação para avanço

- Nenhum bug crítico aberto (quebrem fluxo de resgate, leitura ou login).
- Máximo de 3 bugs médios; caso exceda, postergar release controlado.
- Bugs baixos documentados e agendados para próxima sprint.

## 6. Checklist de release demo

- [ ] Merge `feature/invite-flow` concluído e build aprovado.
- [ ] Seed de demonstração atualizado com 16 coleções e assets.
- [ ] Export de lote de voucher testado e CSV validado.
- [ ] QA smoke completo com pass em dev local.

## 7. Observações operacionais

- Para testes locais, use `npm run start` em `mundo-de-kaboo-main/docs` para validar docs e instruções de QA.
- Usar `npm run dev` no front-end principal para validar comportamentos de runtime.

*** End Patch
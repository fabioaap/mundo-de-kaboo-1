# PRD - Vouchers por Conteúdo

Status: Final draft  
Data: 08/04/2026  
Autores: Fabio (frontend), Maxwell (infra), Mario (produto)  
Contexto: implementar gestão administrativa de vouchers atrelados a conteúdo, com exportação para gráfica e auditoria para fins operacionais.

## Objetivo

Permitir que administradores criem, gerenciem e auditem vouchers por conteúdo, com suporte a lotes, CSV/Excel de exportação, auditoria de consumo e integração mínima para produção de códigos em gráfica.

Usuários finais resgatarão vouchers que liberam acesso a coleções específicas; administradores precisam visibilidade e capacidade de operação (criar lotes, revogar, exportar relatórios).

## Visão Técnica — Modelagem proposta

1) `voucher_model`
- `id` (uuid)
- `code` (string, única, 8-12 chars)
- `batch_id` (uuid, FK)
- `duration_months` (int)
- `issued_by` (user_id)
- `created_at` (timestamp)
- `expires_at` (timestamp)
- `status` (enum: issued, activated, consumed, revoked)
- `target_collection_id` (nullable, FK para collections) — permite voucher por conteúdo

2) `voucher_batch`
- `id` (uuid)
- `name` (string)
- `issued_by` (user_id)
- `quantity` (int)
- `created_at` (timestamp)
- `notes` (text)
- `exported_at` (timestamp nullable)

3) `user_content_grant`
- `id` (uuid)
- `user_id` (uuid)
- `collection_id` (uuid)
- `granted_by` (user_id)
- `granted_at` (timestamp)
- `expires_at` (timestamp)
- `reason` (enum: voucher, promo, admin)

4) `voucher_audit`
- `id` (uuid)
- `voucher_id` (uuid)
- `action` (string: created, exported, activated, consumed, revoked)
- `actor_user_id` (nullable)
- `actor_ip` (nullable)
- `meta` (jsonb) — detalhes extras (e.g., lote, export filename)
- `created_at` (timestamp)

## Endpoints APIs (proposta)

- `POST /admin/voucher/batch` — criar lote e retornar preview CSV
- `GET /admin/voucher/batch/:id/export` — gerar CSV/Excel (stream)
- `POST /admin/voucher/:code/activate` — ativação (consumir)
- `POST /admin/voucher/:code/revoke` — revogar voucher
- `GET /admin/voucher/:id/audit` — obter logs de auditoria

## Admin UI (resumo de telas)

- Lista de lotes (batch list) com colunas: nome, quantidade, emitido por, criado em, exportado em, ações (exportar, detalhe).
- Detalhe do lote: lista de códigos com status, botão de exportar CSV/Excel e botão de imprimir (PDF friendly).
- Formulário criar lote: nome, quantidade, duração (meses), target_collection (opcional), notas.
- Página de auditoria: filtro por voucher, por ação, por data, exportar.

## Fluxo de impressão e gráfica

1. Admin cria lote com `quantity` e `target_collection_id` opcional.
2. Sistema gera códigos pseudorandom (8-12 chars) e persiste em `voucher_model` com `status: issued`.
3. Admin exporta CSV/Excel com códigos e metadados (nome do lote, duração, target_collection_name, created_at).
4. CSV enviado para gráfica; impressão em papel com QR code opcional que contém `https://site/resgatar?code=ABC123`.

## Regras de negócio

- Códigos únicos; generator com verificação de colisão.
- Duração mínima: 1 mês; máxima por política: 12 meses (configurável via `MAX_CUSTOM_DURATION_MONTHS`).
- Ao ativar voucher: criar `user_content_grant` com `granted_by = system` e `granted_at` timestamp atual, calcular `expires_at` com `duration_months`.
- Se `target_collection_id` presente, grant libera apenas essa coleção; se nulo, grant dá acesso global por `duration_months`.

## Auditoria e conformidade

- Todas ações relevantes (create, export, activate, consume, revoke) gravadas em `voucher_audit`.
- Endpoint `GET /admin/reports/vouchers` aceita filtros e gera relatório CSV/Excel com colunas obrigatórias: code, status, batch_name, granted_to_email, granted_at, expires_at, consumed_by, consumed_at, audit_trail_link.

## Segurança e taxa de uso

- Rate-limit endpoint de ativação (`/activate`) para evitar bruteforce (ex.: 60 req/min por IP).
- Verificação geográfica opcional por política (ops).  
- Logs de auditoria rotacionados a cada 90 dias ou conforme política da empresa.

## Backwards compatibility

- Se existir um campo `legacy_voucher` no schema antigo, migrar durante rollout para novo modelo com `batch_id` e manter mapeamento por `legacy_map` para históricos.

## Métricas de sucesso

- Time-to-issue: tempo médio para criar lote e obter CSV (meta < 5s no admin UI).  
- Export throughput: capacidade de exportar 100k códigos sem timeout.  
- Taxa de ativação por voucher enviado: > 60% (meta de conversão).  

## Riscos

- Geração de código insegura ou previsível -> usar generator criptográfico.  
- Export CSV vazando dados sensíveis (ex.: emails) -> exportar apenas campos aprovados e com autorização.  

## Próximos passos técnicos

1. Definir migration SQL para `voucher_model`, `voucher_batch`, `voucher_audit`, `user_content_grant` em Supabase.  
2. Implementar generator de códigos com validação única.  
3. Endpoints admin mínimos para criar lote, exportar e auditar.  
4. UI admin: lista de lotes e detalhe de lote com export.  

*** End Patch
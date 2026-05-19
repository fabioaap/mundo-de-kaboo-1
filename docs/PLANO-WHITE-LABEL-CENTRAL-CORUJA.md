# Plano de Preparacao White Label - Central Coruja

Data: 2026-04-26
Status: Aprovacao tecnica inicial
Escopo: manter o mesmo codebase e a mesma arquitetura de informacao, com variacao de identidade visual, banco e menus por marca.

## 1) Decisao arquitetural

Decisao para Central Coruja: usar projeto Supabase dedicado.

Justificativa:
- Isolamento real de dados, auth, storage e segredos.
- Menor risco juridico e operacional entre marcas.
- Rollback e incidentes com blast radius menor.
- Requisito de negocio ja pede separacao de infra para Central Coruja.

Nota de plataforma:
- O frontend continua unico (same codebase).
- A arquitetura de informacao continua canonica e igual para todas as marcas.
- A variacao por marca acontece por configuracao de branding e feature flags.

## 2) O que ja existe no projeto

Base tecnica ja encontrada:
- `design-system/tokens/themes.ts` com `BrandTheme`, `themes` e `applyTheme(...)`.
- Backlog de Central Coruja com historias de separacao de infra e white label engine.
- Shell Admin existente (`screens/AdminScreen.tsx`) onde a nova secao de flags pode entrar.

Conclusao:
- Ja existe fundacao para theming.
- Falta consolidar o mecanismo de tenant/brand e flags de menu por marca no backend + admin.

## 3) Blueprint tecnico alvo

### 3.1 Camadas

1. Brand Resolver
- Resolve `brandKey` por dominio/subdominio, ou fallback por env.
- Exemplo: `centralcoruja.com.br -> central-coruja`.

2. Tenant Context
- Carrega configuracao da marca atual no bootstrap da app.
- Entrega: `brand`, `settings`, `features`, `menu`.

3. Branding Config
- Aplica tokens visuais (cores, logo, tipografia, textos).
- Usa `applyTheme` para CSS vars de marca.

4. Feature Flag Engine
- Resolve estados de flags por marca.
- Regra: override da marca prevalece sobre valor padrao global.

5. Menu Resolver
- Mantem ordem canonica da IA.
- Apenas mostra/oculta modulos permitidos por marca.
- Nao reorganiza a arquitetura de informacao.

### 3.2 Contrato minimo de bootstrap (frontend)

```json
{
  "brand": { "id": "...", "slug": "central-coruja", "name": "Central Coruja" },
  "settings": {
    "display_name": "Central Coruja",
    "logo_url": "...",
    "primary_color": "#...",
    "menu_config": {}
  },
  "menu": [
    { "key": "collections", "label": "Colecoes", "route": "home", "enabled": true, "order": 10 },
    { "key": "books", "label": "Livros", "route": "home", "enabled": true, "order": 20 }
  ],
  "features": {
    "menu.music": { "enabled": false, "config": {} },
    "module.formations": { "enabled": true, "config": {} }
  },
  "version": 7,
  "updated_at": "2026-04-26T15:30:00Z"
}
```

## 4) Modelagem de dados recomendada (Supabase/Postgres)

Tabelas principais:
- `brands`
- `brand_settings`
- `feature_flags`
- `brand_feature_overrides`
- `feature_flag_audit`
- `brand_admin_memberships` (essencial para RLS por marca)

Objetivo de cada uma:
- `brands`: cadastro da marca/tenant.
- `brand_settings`: identidade visual, assets, menu config, versao.
- `feature_flags`: catalogo global de flags e defaults.
- `brand_feature_overrides`: estado efetivo por marca (enable/disable + config).
- `feature_flag_audit`: trilha append-only de alteracoes.
- `brand_admin_memberships`: permissao de usuario por marca para admin.

Indices criticos:
- Unico por `brands.slug`.
- Leitura rapida por `brand_feature_overrides(brand_id, feature_flag_id)`.
- Auditoria por `feature_flag_audit(brand_id, changed_at desc)`.

## 5) Politica de seguranca (RLS)

Regra macro:
- Usuario autenticado so pode ler/escrever configuracoes da propria marca permitida.

Implementacao:
- Funcao `can_manage_brand(brand_id)` baseada em `brand_admin_memberships`.
- Policies em `brand_settings` e `brand_feature_overrides` usando `using` e `with check` com `can_manage_brand`.
- Mudancas de flags por RPC transacional (nao update direto de tabela pelo client).

## 6) Feature flags no Admin (requisito funcional)

Objetivo:
- Habilitar/desabilitar menus e modulos por marca, sem deploy.

UX minima da tela:
1. Seletor de marca.
2. Lista de modulos/menus com toggle.
3. Rascunho (save draft).
4. Preview da experiencia da marca.
5. Publicar versao.
6. Historico e rollback.
7. Campo de motivo obrigatorio em alteracoes criticas.

Criterios de aceite:
- Toggle por marca nao afeta outra marca.
- Preview bate com resultado publicado.
- Publicacao gera auditoria com usuario, data, diff e motivo.
- Rollback restaura versao anterior com uma acao.
- Consistencia no frontend em ate 60 segundos apos publicar.

## 7) Roadmap em 3 fases

Fase 1 - Fundacao de isolamento
- Criar projeto Supabase dedicado da Central Coruja.
- Pipeline de migration + seed por marca.
- Resolver `brandKey` no bootstrap.
- Pronto quando: login/admin operam no projeto dedicado sem regressao da IA.

Fase 2 - Flags e menu por marca
- Criar tabelas e RPCs de flags.
- Criar tela Admin de toggles por marca.
- Integrar menu resolver no frontend.
- Pronto quando: alteracao de modulo/menu por marca funciona sem deploy.

Fase 3 - Operacao e rollout progressivo
- Publicacao versionada com historico/rollback.
- Rollout por ondas (piloto -> grupo -> geral).
- Alertas e runbook de incidentes.
- Pronto quando: rollback em menos de 5 min e sem vazamento cross-brand.

Status atual da Fase 3 (parcial):
- [x] Alertas operacionais no painel White Label (derivados de onda e métricas).
- [x] Runbook de incidentes documentado em `docs/RUNBOOK-WHITE-LABEL-INCIDENTES.md`.
- [x] Hardening de governança no painel (motivo obrigatório para mudança de onda/publicação crítica).
- [x] Checklist de simulação operacional em `docs/CHECKLIST-SIMULACAO-INCIDENTE-WHITE-LABEL.md`.
- [x] Automação básica de alertas externos configurável no painel + contrato documentado em `docs/WEBHOOK-ALERTAS-WHITE-LABEL.md`.
- [x] Disparo externo automatizado de teste com persistência de status no painel.
- [x] Retry/backoff básico no dispatch de teste e histórico de entregas visível no painel.
- [x] Dispatch real de alertas ativos com distinção entre envios `test` e `live`.
- [x] Auto-dispatch deduplicado de alertas ativos, respeitando `notify_on_general_without_publish`.
- [x] Timeline consolidada de eventos operacionais (dispatch, flags, rollout, publicações) com visualização unificada no painel.
- [x] Health check automático validando integridade de flags, rollout/publicação, alertas e métricas.
- **FASE 3 OPERACIONAL COMPLETA**
## 8) Plano de sprint inicial (2 sprints)

Sprint 1:
- Estrutura de dados de marca e flags.
- Bootstrap por marca no frontend.
- Tela Admin basica para toggles (sem preview completo).
- RLS minima e auditoria inicial.

Sprint 2:
- Preview por marca.
- Publicacao versionada + rollback.
- Dependencias entre modulos (validacao).
- Rollout por ondas com metricas.

## 9) Primeiros entregaveis tecnicos

Checklist de inicio imediato:
- [x] Migration SQL inicial das tabelas de white label e flags — `supabase/migrations/20260426000100_white_label_brands.sql`.
- [x] RPC `get_brand_bootstrap(brand_slug)` — na mesma migration.
- [x] RPC `set_brand_feature_flag(...)` com versionamento e auditoria — na mesma migration.
- [x] Hook frontend `useBrandConfig()` para bootstrap unico — `hooks/useBrandConfig.ts`.
- [x] Resolver de menu canonico com filtros por flags — `BottomNav.tsx` aceita `enabledMenuKeys`; `App.tsx` calcula e passa.
- [x] Nova secao `Admin > White Label` para toggles por marca — `screens/AdminWhiteLabelScreen.tsx` (preview local).

Proximo passo (Sprint 2):
- [x] Preview por marca — Home conectada ao bootstrap real via `useBrandConfig()` e flag `hero.parallax`.
- [x] Rollback de flags no painel via auditoria recente (ação Reverter por item).
- [x] Publicacao versionada basica por marca (versao atual + acao publicar agora no painel).
- [x] Tela Admin expandida (parcial): seletor de marca + toggles persistidos no backend + histórico recente de auditoria no painel.
- [x] Rollout por ondas com metricas (piloto/grupo/geral + cards de métricas no painel).

## 10) Decisoes fechadas para este ciclo

- Central Coruja inicia em infraestrutura dedicada.
- Codebase continua unico.
- IA continua unica e canonica.
- Variacao entre marcas sera por branding + feature flags.
- Controle de menu por marca sera operado no Admin com historico e rollback.

## 11) Experiencia visual parallax (Central Coruja)

- A experiencia visual do hero da Home para Central Coruja sera entregue via parallax em camadas, sem alterar a arquitetura de informacao.
- O comportamento sera parametrizado por marca no bootstrap, com fallback para modo estatico em reduced-motion e dispositivos de baixa performance.
- A especificacao tecnica detalhada esta em `docs/PARALLAX-CENTRAL-CORUJA-SPEC.md`.

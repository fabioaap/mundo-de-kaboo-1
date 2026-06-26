# Hooks Determinísticos — Implementação 2026-06-25

Complemento da [Auditoria Full-Stack](./AUDITORIA-FULLSTACK-2026-06-25.md), seção "Gaps de processo".
Objetivo: automatizar processos **repetíveis** e **determinísticos** (gates que ou passam ou bloqueiam, sem julgamento humano por commit).

## O que existia antes

| Automação | Dispara em | Bloqueia? | Problema |
|-----------|------------|-----------|----------|
| `enforce-git-push-authority.cjs` | Claude PreToolUse/Bash | sim | só governa *quem* faz push, não *o quê* |
| `synapse-engine.cjs` | Claude UserPromptSubmit | não | injeta contexto, não é gate |
| `.githooks/pre-commit` | git pre-commit | **nunca** (`exit 0` fixo) | só roda update-docs + `git add` de 6 docs |
| `deploy-pages.yml` | CI push main | build/smoke | **não roda testes nem typecheck** |
| `update-docs.yml` | CI | não | bot commita docs |
| README de hooks | — | — | documenta 6 hooks **inexistentes** (incl. `sql-governance.py`) |

Faltavam (confirmado): script `typecheck`, script `test`, lint, CI de validação, guarda de SQL destrutivo, secret-scan. O CLAUDE.md mandava rodar `npm run lint/typecheck/test` — **nenhum existia**.

## O que foi implementado

### 1. Scripts faltantes (`package.json`)
- `typecheck` → `tsc --noEmit`
- `test` → vitest (alias de `test:unit`)
- `qa:check` → roda o gate determinístico

> Fecha a "mentira" do CLAUDE.md: agora os comandos que os agentes são instruídos a rodar existem.

### 2. Gate determinístico reutilizável — `scripts/qa/check-staged.mjs`
Dependency-free, cross-platform. Modos:
- (sem args) → arquivos **staged** (pre-commit)
- `--base=<ref>` → arquivos alterados vs `<ref>` (CI em PR)
- `--all` → árvore inteira; secret-scan bloqueia, SQL destrutivo só avisa (histórico)

Verifica:
- **Secret-scan:** private key, AWS/GitHub/OpenAI token (bloqueia em qualquer lugar), JWT/Supabase e atribuições `*_API_KEY/_TOKEN/_SECRET` com valor real (bloqueia em código/config; **avisa** em `.md`/templates do framework). Bloqueia `.env`/`.env.local` staged.
- **SQL destrutivo** (só em `supabase/migrations/*.sql` novas/alteradas): `DROP TABLE/SCHEMA/DATABASE`, `TRUNCATE`, `DELETE/UPDATE` sem `WHERE`, `CREATE INDEX CONCURRENTLY`. Avisa em `DROP POLICY/FUNCTION/TRIGGER`, `REVOKE`, `ALTER … DROP COLUMN`.

Detecção de `DELETE/UPDATE sem WHERE` é **por statement** (split em `;`) — evita backtracking catastrófico em arquivos grandes. Filtra binários/reports e arquivos > 256KB.

### 3. Guarda de SQL no agente — `.claude/hooks/sql-governance.cjs`
PreToolUse que bloqueia SQL destrutivo seja via **Bash** (`psql`/`supabase db reset`) ou via **MCP Supabase** (`execute_sql`/`apply_migration`). Implementa o que o README prometia e não existia. Registrado em `settings.json` para `Bash` e `mcp__.*__(execute_sql|apply_migration)`.

### 4. Git hooks (`.githooks/`)
- `pre-commit` — agora roda `check-staged.mjs` **antes** do update-docs e **bloqueia** em violação (era `exit 0` sempre).
- `pre-push` (novo) — `typecheck` + `test:unit`, bloqueia em falha. (push remoto continua exclusivo do `@devops`.)
- `setup-git-hooks.sh` atualizado para tornar ambos executáveis.

### 5. CI de validação (`.github/workflows/ci.yml`) — novo
- Job `validate`: `qa:check` (PR: `--base`; push: `--all`) → `typecheck` → `test:unit`.
- Job `e2e-brand-isolation`: roda specs `white-label*` + `auth-guard` em mock mode (sem segredos) — gate da garantia central de isolamento de marca.

## Matriz: qual camada, por quê

| Gate | Camada | Por quê |
|------|--------|---------|
| typecheck | pre-push + CI | tsc é lento demais p/ pre-commit |
| unit tests | pre-push + CI | vitest rápido; CI garante p/ quem pula hook |
| secret-scan | pre-commit + CI | precisa parar **antes** do objeto de commit existir |
| SQL destrutivo (humano) | pre-commit | autor edita migration no editor |
| SQL destrutivo (agente) | Claude PreToolUse | agente emite SQL via Bash/MCP em runtime |
| brand-isolation e2e | CI (pré-deploy) | pesado; não confiar na máquina de cada dev |

## Ativação (uma vez por clone)
```bash
bash setup-git-hooks.sh   # configura core.hooksPath=.githooks (pre-commit + pre-push)
```
Os hooks do Claude (`settings.json`) e o CI já ativam automaticamente.

## Pendências (decisão do Fábio)
- **Lint:** não há config eslint da app. Adicionar config → `npm run lint` → só então gatear no CI (bloquear day-one falharia).
- **Gatear `deploy-pages.yml`** com `needs: [validate, e2e-brand-isolation]` para impedir deploy sem testes (mudança no workflow de prod — requer aprovação).
- **Reconciliar `.claude/hooks/README.md`** (documenta hooks fantasmas).

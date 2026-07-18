# Spec — Sincronização AIOX ↔ Starter_KIT_1.0

- **Owner:** Morgan (@pm) · Spec Pipeline (Gather + Assess consolidados — escopo SIMPLE)
- **Data:** 2026-07-17
- **Fonte:** `github.com/fabioaap/Starter_KIT_1.0` (privado) — AIOX-core **5.2.9**, 1406 arquivos
- **Alvo:** worktree `pensive-darwin-8189b0` (projeto `mundo-de-kaboo`), AIOX-core **5.2.9**
- **Decisões do dono (2026-07-17):** paridade total · revisar caso-a-caso · aplicar no worktree → branch + PR via @devops

---

## 1. Requisitos (Gather)

- **FR-1 (P0):** Levar o ferramental AIOX do projeto à **paridade** com o Starter_KIT canônico
  (pastas geridas: `.aiox-core/`, `.claude/`, `.antigravity/`, `.codex/`, `AGENTS.md`).
- **FR-2 (P0):** **Nenhuma customização do projeto** pode ser perdida — cada arquivo divergente é
  revisado antes de aplicar (decisão do dono).
- **FR-3 (P0):** As **salvaguardas do projeto** (hook `enforce-git-push-authority.cjs` = gate @devops;
  `sql-governance.cjs`; `synapse-engine.cjs`) DEVEM permanecer ativas após o sync.
- **CON-1:** `git push`/PR é exclusivo do @devops. Aplicação no worktree; nada vai direto pra `main`.
- **CON-2:** Paridade é do **ferramental AIOX**, não do app — `screens/`, `lib/`, `components/`,
  `supabase/`, `docs/` do mundo-de-kaboo **não** entram em paridade.
- **ASM-1:** `frameworkProtection: false` no projeto (deny rules L1/L2 inativas) → edição de
  `.aiox-core/` é permitida.

## 2. Impacto medido (Assess) — diff normalizado (ignora CRLF)

Dos **1307** arquivos geridos pelo AIOX no kit: **1293 já idênticos**. Ação necessária em **14**.

### 2.1 ADD — 7 arquivos, só no kit (capacidade nova, zero sobrescrita)
Subsistema novo de **task-intake-routing** + skill **spec** + hook de update-check:

| Arquivo | O que é |
|---|---|
| `.aiox-core/core/orchestration/task-intake-router.js` | Roteador de entrada de tarefas |
| `.aiox-core/core/orchestration/__tests__/task-intake-router.test.js` | Testes do roteador |
| `.aiox-core/development/tasks/route-task-intake.md` | Task do roteador |
| `.aiox-core/scripts/route-task-intake.js` | Script CLI do roteador |
| `.claude/rules/task-intake-routing.md` | Regra de roteamento |
| `.claude/skills/spec/SKILL.md` | **Skill `spec`** (o projeto não tinha) |
| `.claude/hooks/aiox-update-check.sh` | Hook de verificação de update (usado pelo SessionStart do kit) |

**Recomendação:** adicionar todos (7). São arquivos novos, não sobrescrevem nada.

### 2.2 DIFF — 7 arquivos divergentes (revisão caso-a-caso)

| # | Arquivo | Diff | Natureza | Recomendação |
|---|---|---|---|---|
| 1 | `.aiox-core/.installed-manifest.yaml` | 1 linha (timestamp) | Metadado de instalação | **Manter projeto** (regenerar no fim) |
| 2 | `.aiox-core/version.json` | 1 linha (`installedAt`) | Timestamp cosmético | **Manter projeto** |
| 3 | `.aiox-core/core-config.yaml` | 1 linha: `github-copilot: false`→`true` | Toggle de IDE sync | **Manter projeto** (preferência local) |
| 4 | `.aiox-core/data/entity-registry.yaml` | 1378 linhas | **Dados IDS do projeto** | **Manter projeto** (kit apagaria as entidades registradas) |
| 5 | `.aiox-core/package-lock.json` | 18 linhas | Lockfile de deps | **Manter projeto** (casa com node_modules) |
| 6 | `.claude/settings.json` | +13/−30 | **Hooks de segurança + plugins** | **MERGE** (ver §2.3) |
| 7 | `AGENTS.md` | +82/−342 | Projeto customizou (maior) | **Manter projeto**; avaliar enxertar as 82 linhas novas do kit |

### 2.3 O merge do `.claude/settings.json` (o único sensível)
- **Projeto tem (MANTER — são salvaguardas):**
  - `PreToolUse[Bash]` → `enforce-git-push-authority.cjs` (**gate @devops**) + `sql-governance.cjs`
  - `PreToolUse[mcp __execute_sql|apply_migration]` → `sql-governance.cjs`
  - `UserPromptSubmit` → `synapse-engine.cjs`
- **Kit adiciona (avaliar enxertar):**
  - `SessionStart` → `aiox-update-check.sh` (casa com o ADD do §2.1) — **enxertar** (recomendado)
  - `extraKnownMarketplaces`/`enabledPlugins` → plugin **ponytail** — é preferência **global do usuário**
    (já vive no `~/.claude`), **não** pertence ao settings do projeto → **não enxertar**

## 3. EXTRA — 37 arquivos só no projeto (todos MANTIDOS)
`.claude/hooks/sql-governance.cjs`, `launch.json`, `settings.local.json`, e todo o `.codex/` estendido
(squads `.toml`, hooks). O kit não os tem; paridade não os remove. `.codex/` do kit (`.md` core +
`.codex/skills/`) **já está presente e idêntico** no projeto — projeto é superset.

## 4. Plano de execução (aplicação no worktree)
1. Copiar os **7 ADD** do kit para o worktree.
2. Aplicar as resoluções DIFF: manter projeto em 1–5 e 7; **merge** no `settings.json` (enxertar só o
   `SessionStart` update-check).
3. `npm run typecheck`/testes do AIOX afetados (roteador tem teste próprio).
4. Regenerar `.installed-manifest.yaml`/`version.json` se necessário.
5. Commit em branch dedicada `chore/aiox-kit-sync-5.2.9` → **@devops** abre PR pra revisão humana.
   **Sem push automático em `main`.**

## 5. Critique / Riscos
- **R-1:** Remover por engano os hooks de segurança do `settings.json` quebraria o gate @devops e a
  governança de SQL. Mitigado por §2.3 (merge, não substituição).
- **R-2:** Sobrescrever `entity-registry.yaml` apagaria o registro IDS do projeto. Mitigado (manter projeto).
- **R-3:** Escopo real é pequeno (14 arquivos) — baixo risco geral; o valor está em ganhar o subsistema
  de task-intake-routing e a skill `spec`.

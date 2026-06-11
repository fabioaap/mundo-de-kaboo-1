# Backlog — Organização do Projeto e Desempenho (Build/Deploy/Repo)

> Data: 09/06/2026
> Escopo: peso de assets em `public/`, higiene de git, desempenho de build/deploy
> Tipo: backlog (diferido) — não implementar durante a validação do MVP
> Status: 📋 Planejado / em backlog

---

## 1. Contexto e motivação

Durante a sessão de 09/06/2026, foram baixados os PDFs (16 arquivos) e áudios (9 MP3) do Kaboo
do Supabase Storage para `public/kaboo-assets/` como **backup local** antes de executar testes
de delete/upload no Storage. O processo gerou 162 MB não commitados neste diretório.

Em paralelo, uma auditoria de ops do repositório identificou outros pontos que afetam
desempenho de build, deploy e trabalho diário com o repo. **O app em si carrega 100% das mídias
direto do Supabase Storage** — não há referência alguma a `public/kaboo-assets/` no código.
O backup é redundante para o app, mas relevante para manutenção local.

---

## 2. Por que está no backlog

O projeto está em **validação de MVP** — a regra vigente é documentar mudanças estruturais no
backlog em vez de implementá-las agora. As ações listadas são higiene de repo e refactor de
organização de arquivos; não têm urgência para o funcionamento do app em produção.

---

## 3. Achados (auditoria 2026-06-09)

### 3.1 🟠 Backup Kaboo em `public/kaboo-assets/` (162 MB, não commitado)

| Item | Detalhe |
|---|---|
| Localização atual | `public/kaboo-assets/pdfs/` (16 PDFs, ~124 MB) + `public/kaboo-assets/audio/` (9 MP3, ~38 MB) |
| Status git | Untracked — não está no repo |
| Problema | `public/` é copiada integralmente para `dist/` a cada build do Vite. Com 162 MB nessa pasta, qualquer `npm run build` ou deploy do GitHub Pages carregaria esses arquivos |
| Destino correto | `supabase/backups/storage/` — já está no `.gitignore`, fora do build |
| Referência no app | Nenhuma — o app lê tudo do Supabase Storage |

### 3.2 🔴 PDFs Central Coruja em `public/central-coruja/pdfs/` (~183 MB, commitados)

| Item | Detalhe |
|---|---|
| Localização | `public/central-coruja/pdfs/` |
| Status git | **Commitados como arquivos normais** (não Git LFS) |
| Impacto | Principal causa do pack de ~156 MB e do deploy pesado via GitHub Pages |
| Ação | Avaliar mover para Supabase Storage ou Git LFS — **requer aprovação separada** |

> ⚠️ **Restrição ativa:** a Central Coruja é white-label e não pode ser tocada sem aprovação
> explícita e separada do proprietário da marca.

### 3.3 🟡 Higiene de branches e remotes

| Item | Detalhe |
|---|---|
| Branches locais | 28 (9 já mergeadas em `main`, seguras para deletar) |
| Branches remotas | 43 (repositório origin no GitHub) |
| Remotes configurados | 3: `origin` (canonical), `fork`, `origin-legacy` |
| Remote `origin-legacy` | Provavelmente obsoleto — verificar antes de remover |
| Remote `fork` | Pode ter branches não portadas para `origin` — revisar antes de remover |

Branches mergeadas identificadas como seguras para limpeza:
`feature/fix-pdf-viewer`, `feature/audio-player`, `hotfix/supabase-rls`,
`refactor/types-cleanup`, `feature/offline-mode`, `fix/search-debounce`,
`feature/admin-panel`, `chore/dep-updates`, `fix/mobile-layout`.

### 3.4 🟡 Sem ambiente de staging

Atualmente qualquer push em `main` ou `v1.1` vai direto para produção. Não há branch de staging
nem ambiente separado. Migrations do Supabase rodam direto na prod sem possibilidade de
validação prévia.

### 3.5 🟡 E2E (Playwright) só roda local

O projeto tem 15+ specs Playwright, mas o CI/CD (GitHub Actions) não os executa.
Regressões passam despercebidas em deploys automáticos.

### 3.6 🟡 `.gitattributes` LFS criado nesta sessão (não commitado)

Um `.gitattributes` configurando Git LFS para mídias foi criado nesta sessão mas **não
commitado** e **não há mídias no repositório do app** (exceto os 183 MB da Central Coruja).
Deve ser removido ou esvaziado para não causar confusão.

---

## 4. Ações propostas (pós-MVP, sob aprovação)

### Grupo A — Kaboo (sem impacto na Central Coruja)

| ID | Ação | Esforço |
|---|---|---|
| A1 | Mover `public/kaboo-assets/` para `supabase/backups/storage/kaboo/` | Baixo |
| A2 | Ajustar constante `DEST` em `scripts/download-assets.mjs` para apontar ao novo destino | Baixo |
| A3 | Remover ou esvaziar `.gitattributes` (não há mídia no app repo) | Baixo |
| A4 | Podar as 9 branches mergeadas listadas no §3.3 | Baixo |
| A5 | Avaliar e portar branches do remote `fork` antes de removê-lo | Médio |
| A6 | Remover remote `origin-legacy` após confirmar que não há nada único lá | Baixo |

### Grupo B — Requer aprovação separada

| ID | Ação | Observação |
|---|---|---|
| B1 | Mover PDFs da Central Coruja de `public/` para Supabase Storage ou Git LFS | Aprovação Central Coruja obrigatória |
| B2 | Estratégia de CDN/cache de assets para escala (post-MVP) | Decisão de produto/infra |
| B3 | Criar ambiente de staging antes de continuar com migrations em prod | Decisão de produto/infra |
| B4 | Adicionar Playwright E2E ao CI (GitHub Actions) | Médio esforço |
| B5 | Revisar bundle splitting (`lib/api.ts` ~104 KB, telas ~100 KB) | Decisão de produto |

---

## 5. Detalhes técnicos de referência

### Estado atual dos arquivos de mídia local

| Caminho | Tamanho | Git | Entra no build? |
|---|---|---|---|
| `public/kaboo-assets/` | ~162 MB | Untracked | Sim (se commitado) — **não commitar** |
| `public/central-coruja/pdfs/` | ~183 MB | Commitado (normal) | **Sim** — já entra hoje |
| `supabase/backups/` | variável | `.gitignore` | Não |

### Script de download

`scripts/download-assets.mjs` — lê URLs de `data/catalog.seed.json`, baixa PDFs e áudios,
converte WAV → MP3 192kbps via ffmpeg. Para re-executar após mover o destino:

```bash
# Após ajustar DEST para supabase/backups/storage/kaboo/
node scripts/download-assets.mjs --dry-run    # verifica
node scripts/download-assets.mjs              # baixa
```

### Verificação pós-execução das ações A1/A2 (quando aprovado)

1. `npm run build` conclui sem incluir arquivos de mídia Kaboo em `dist/`
2. `node scripts/download-assets.mjs --dry-run` aponta para `supabase/backups/storage/kaboo/`
3. App carrega normalmente (todas as mídias vêm do Supabase Storage, não do `public/`)
4. `git status` não mostra `public/kaboo-assets/` nem `.gitattributes` como untracked

---

## 6. Riscos e cuidados

- **Central Coruja:** nunca alterar `public/central-coruja/` nem nada da marca sem aprovação
  explícita separada. Qualquer ação no grupo B1 exige autorização do proprietário da marca.
- **Migrations em produção:** sem staging, qualquer migration de banco deve ter backup
  confirmado e janela de manutenção acordada antes de rodar.
- **Branches remotas:** antes de deletar qualquer branch do remote `fork`, verificar
  se há commits únicos não mergeados em `origin/main`.
- **`.gitattributes` LFS:** se for commitado sem que o Git LFS esteja instalado/ativado no
  CI, o pipeline pode falhar ao tentar fazer push de mídias.

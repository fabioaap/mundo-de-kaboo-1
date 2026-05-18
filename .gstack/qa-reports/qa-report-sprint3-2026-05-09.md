# QA Report — Sprint 3 — 2026-05-09

**Status:** approved-with-caveats  
**Target:** `http://localhost:4100/#home`  
**Brand focus:** Central Coruja  
**Dataset de regressão:** `Kaboo e a Carta Misteriosa`

## Scope covered in this pass

- `public-collection-consumption-regression`
- `central-coruja-priority-smoke-and-qa-signoff`

## Result

The public collection journey is stable on the trusted dataset.

- Home carregou o grid principal sem erros de console.
- Details abriu corretamente para `Kaboo e a Carta Misteriosa` com 5 atalhos de conteúdo.
- `BookReader`, `AudioPlayer` e `VideoPlayer` abriram e responderam aos controles principais.
- Nenhum dos bugs corrigidos na Sprint 2 (`BUG-005`, `BUG-006`) reabriu durante a regressão pública.

The final CMS sign-off is no longer blocked.

- `BUG-007`: os atalhos admin de mídia agora alimentam o Library Hub público pelo bridge de `collection_assets`.

## Findings

| ID | Severity | Finding | Status | Commits |
| --- | --- | --- | --- | --- |
| BUG-007 | high | O fluxo público principal passa, e o contrato de publicação via `videos/music/formations/materials` agora é coberto pelo bridge de `collection_assets` com regressão automatizada e prova no hub público. | fixed, verified | working tree |

## Verification notes

### Home → Details

- Abriu o card `Kaboo e a Carta Misteriosa` a partir do grid da home.
- Details mostrou metadados pedagógicos, personagens, BNCC e 5 atalhos de ação.
- Evidence:
  - `.gstack/qa-reports/screenshots/sprint3-details-kaboo-carta.png`

### BookReader

- O atalho `Livro` abriu `#player_book`.
- O reader carregou o título correto e expôs os controles `Página anterior` e `Próxima página`.
- Console permaneceu sem erros.

### AudioPlayer

- O atalho `Contação da História` abriu `#player_audio`.
- O botão de play iniciou a reprodução e o progresso avançou para `00:04`.
- A seção de sugestões relacionadas carregou normalmente.
- Evidence:
  - `.gstack/qa-reports/screenshots/sprint3-audio-player-kaboo-carta.png`

### VideoPlayer

- O atalho `Desenho Animado` abriu `#player_video`.
- O play iniciou a reprodução e o progresso avançou para `00:04`.
- O rail de vídeos relacionados carregou normalmente.
- Evidence:
  - `.gstack/qa-reports/screenshots/sprint3-video-player-kaboo-carta.png`

### Final sign-off rerun after BUG-007

- Added `lib/api.regression-2.test.ts` to lock the admin-to-public media bridge across `videos`, `music`, `formations` and `materials`
- The full unit suite and production build passed again after the bridge landed
- In a clean Vite session on `http://127.0.0.1:4173/#materials`, saving `QA UI Proof Material 4173` through the same `api.updateCollection()` path used by the admin flow made the item appear in the public Materials hub immediately
- Evidence:
  - `.gstack/qa-reports/screenshots/qa-ui-proof-material-4173.png`

## Final QA status

**approved-with-caveats**

### Why

- A regressão pública do dataset confiável passou.
- O smoke prioritário de Central Coruja ficou estável nas superfícies públicas principais.
- O blocker compartilhado de publicação via hubs de mídia foi removido nesta branch.
- O sign-off final sobe com caveat apenas porque a revalidação manual pós-fix foi amostral no hub público, enquanto a cobertura cruzada dos quatro hubs ficou garantida pela nova regressão automatizada.

### Recommendation

- O release pode seguir quando depender de publicação via `Vídeos`, `Músicas`, `Formações` e `Materiais` no admin atual.
- Na próxima passada de QA manual, vale só repetir um smoke curto de clique final em `Vídeos` e `Formações` para complementar a prova visual já coberta por regressão e Materials.

# QA Report — Sprint 2 — 2026-05-09

**Status:** done  
**Target:** `http://localhost:4100/#admin`  
**Brand focus:** Central Coruja, shared CMS flows first  
**Auth mode:** mock session (`admin`, `editor`) because Supabase credentials are absent

## Scope covered in this pass

- `collection-crud-and-delete-permission`
- `character-lifecycle-and-public-visibility`
- `library-media-hub-pipeline-mismatch`

## Result

The shared content lifecycle gates are now closed, and the media pipeline bridge is fixed in this branch.

- `editor` can create a collection and see it in the admin grid right after save.
- `editor` can edit and persist collection changes.
- `admin` can open the destructive action and delete the collection end to end.
- `editor` does not get a visible delete action in the collection card menu.
- Character create/edit/deactivate/reactivate now respects public projection boundaries.
- The admin shortcuts `Vídeos`, `Músicas`, `Formações` e `Materiais` now feed the public Library Hub surfaces through the shared `collection_assets` bridge.

## Findings

| ID | Severity | Finding | Status | Commits |
| --- | --- | --- | --- | --- |
| BUG-005 | high | Mock collection create, update, and delete persisted data but left the admin grid on stale `kaboo_collections_cache`, so the UI did not refresh after CRUD. | fixed, verified | `7126b20`, `bfa1f33` |
| BUG-006 | high | Inactive linked characters kept their names materialized in `collection.characters`, so public search and details could continue surfacing unpublished characters. | fixed, verified | `105d4e5`, `929e6b2` |
| BUG-007 | high | The admin media shortcuts saved `collection_assets`, but the public Library Hub read a different pipeline (`media_items`/`media_shelves` or static hub mocks). The current branch now bridges live `collection_assets` into the public hubs and playback resolution. | fixed, verified | working tree |

## Verification notes

### Editor create flow

- Created `QA Sprint 2 Cache Fix Visible`
- After save, the item appeared in the collections grid without manually clearing session cache
- Evidence:
  - `.gstack/qa-reports/screenshots/sprint2-editor-new-collection-form-cache-fix.png`
  - `.gstack/qa-reports/screenshots/sprint2-editor-created-collection-visible-after-cache-fix.png`

### Editor edit flow

- Edited an existing collection and confirmed persistence
- Reverted the content change after validation to avoid polluting the seed dataset
- Evidence:
  - `.gstack/qa-reports/screenshots/sprint2-editor-before-save-edit.png`
  - `.gstack/qa-reports/screenshots/sprint2-editor-after-save-edit.png`

### Admin delete flow

- Opened the QA collection action menu as `admin`
- Confirmed `Excluir Coleção` modal
- Deleted the item and confirmed removal from the grid and from `localStorage['kaboo_mock_collections']`
- Evidence:
  - `.gstack/qa-reports/screenshots/sprint2-admin-qa-delete-action-open.png`
  - `.gstack/qa-reports/screenshots/sprint2-admin-delete-confirm-modal.png`
  - `.gstack/qa-reports/screenshots/sprint2-admin-delete-confirmed.png`

### Editor negative delete check

- Opened the same card action affordance as `editor`
- No visible `Excluir` action was rendered
- Evidence:
  - `.gstack/qa-reports/screenshots/sprint2-editor-actions-no-delete.png`

### Character public visibility regression

- Recreated the bug by linking `QA Personagem Sprint 2` to `Kaboo e a Carta Misteriosa` in mock storage with `status: inactive`
- Public search for `QA Personagem Sprint 2` returned `0 resultados encontrados`
- Runtime verification through the app module confirmed the same public collection kept `character_ids: ['qa-personagem-sprint-2']` but projected `characters: []` while inactive
- Switched the same QA character to `status: active` and confirmed `api.getCollections(true)` projected `characters: ['QA Personagem Sprint 2']` again
- Cleared the injected mock storage and session cache after the validation loop
- Evidence:
  - `.gstack/qa-reports/screenshots/sprint2-public-search-inactive-character-fixed.png`

### Library Hub pipeline mismatch

- Saved two unique markers through the same admin persistence path used by the collection media editor:
  - `QA Pipeline Video Marker 2026-05-09`
  - `QA Pipeline Material Marker 2026-05-09`
- The collection save succeeded and the markers appeared in `collection_assets`
- `api.getMediaHub('videos')` did **not** include the video marker
- `api.getMediaHub('materials')` did **not** include the material marker
- The public `#materials` screen still rendered the default 7 static guides and showed no QA marker
- Restored the collection assets after the experiment and removed all QA marker URLs from the mock data
- Classification:
  - `videos/music`: separate public pipeline
  - `formations/materials`: static mock pipeline
  - overall status: shared defect / product-contract mismatch
- Evidence:
  - `.gstack/qa-reports/screenshots/sprint2-materials-hub-pipeline-mismatch.png`

### BUG-007 fix validation

- Added a live `collection_assets` bridge inside `api.getMediaHub()`, with fallback item lookup in `getMediaItem()` and `resolveMediaPlayback()`
- `LibraryHubScreen` now reads the live hub contract for `videos`, `music`, `formations` and `materials`
- New regression `lib/api.regression-2.test.ts` covers:
  - all four public hubs
  - `audio`, `video` and `document` playback resolution
  - collection-backed IDs used by the public library cards
- Manual proof on a clean Vite instance (`http://127.0.0.1:4173/#materials`) showed `QA UI Proof Material 4173` rendered in the public Materials hub immediately after saving through the same collection update path used by the admin flow
- Evidence:
  - `.gstack/qa-reports/screenshots/qa-ui-proof-material-4173.png`

## Regression coverage

- Added `lib/api.regression-1.test.ts`
- Added `lib/api.regression-2.test.ts`
- Added `lib/characters.regression-1.test.ts`
- Command:
  - `npm run test:unit -- lib/api.regression-1.test.ts`
  - `npx vitest run --project unit lib/api.regression-2.test.ts`
  - `npm run test:unit -- lib/characters.regression-1.test.ts`

## Next after Sprint 2

- `public-collection-consumption-regression`
- `central-coruja-priority-smoke-and-qa-signoff`

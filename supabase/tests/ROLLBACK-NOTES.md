# RLS Test Lane — Rollback Notes

Added as part of DB-01 security audit (2026-06-26).

## Files added / changed

### 1. `supabase/tests/rls_profiles_guard.sql` — NEW

pgTAP-style SQL test file for the DB-01 privilege guard.  
Runs entirely inside `BEGIN … ROLLBACK` — no data is persisted.

**To revert:** `git rm supabase/tests/rls_profiles_guard.sql`

### 2. `package.json` — MODIFIED

Added one script:

```json
"test:rls": "supabase test db"
```

**To revert:** remove the `"test:rls"` line from the `scripts` block.

### 3. `.github/workflows/ci.yml` — MODIFIED

Added job `rls-tests` after the existing `e2e-brand-isolation` job.  
Does not touch existing jobs.

**To revert:** remove the `rls-tests:` block (the 17 lines starting with
`  rls-tests:` through the final `run: supabase test db` line).

## What the tests prove

| Test | Assertion |
|------|-----------|
| 1.1 | `UPDATE profiles SET role='admin'` by the profile owner leaves role unchanged |
| 1.2 | Trigger `trg_guard_profile_privilege` exists in `pg_trigger` |
| 1.3 | UPDATE policy on `profiles` has `WITH CHECK` set |
| 2.1 | `UPDATE profiles SET brand_id=<coruja>` by viewer_kaboo leaves brand_id unchanged |
| 2.2 | `UPDATE profiles SET brand_id=NULL` by viewer_kaboo leaves brand_id unchanged |
| 3.1 | First-assignment (`NULL → kaboo`) is permitted (guard is not over-restrictive) |
| 4.1 | viewer_kaboo SELECTs 0 collections of coruja |
| 4.2 | viewer_kaboo SELECTs 0 formations of coruja |
| 4.3 | viewer_kaboo SELECTs 0 materials of coruja |
| 4.4-4.5 | viewer_kaboo can still read own-brand formations and materials (WARN if 0) |

## Dependency

Tests assume migration `20260626000000_t50_profiles_privilege_guard.sql` has been
applied. If run before the migration, tests 1.1, 2.1, 2.2, 1.2, 1.3 will FAIL —
which is the intended signal that the guard is not active.

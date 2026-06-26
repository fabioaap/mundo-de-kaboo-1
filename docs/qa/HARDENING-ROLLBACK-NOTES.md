# Hardening Rollback Notes — 2026-06-26

Three defense-in-depth fixes applied to the worktree `claude/beautiful-hoover-76e83a`.
None touch supabase/ or migrations.

---

## BE-01 — `hooks/useBrandConfig.ts`: env slug takes priority over `?brand=`

**File:** `hooks/useBrandConfig.ts`
**Function:** `resolveBrandSlug()` (~line 147)

**Problem:** `resolveBrandSlugFromSearch(window.location.search)` ran before the
`VITE_BRAND_SLUG` env check, letting `?brand=other-brand` re-scope the data
layer on a single-brand deploy.

**Fix:** Moved the `VITE_BRAND_SLUG` env check to the top of `resolveBrandSlug()`.
The `?brand=` search-param branch now only runs when no env slug is set (multi-brand
portal/preview deploys).

**Revert:** Restore the original order — move the `fromSearch` block back above the
`fromEnv` block inside `resolveBrandSlug()`:

```ts
// ORIGINAL (vulnerable):
function resolveBrandSlug(): string {
    if (typeof window !== 'undefined') {
        const fromSearch = resolveBrandSlugFromSearch(window.location.search);
        if (fromSearch) { return fromSearch; }
    }
    const fromEnv = import.meta.env.VITE_BRAND_SLUG as string | undefined;
    if (fromEnv) return fromEnv;
    // …
```

**Callers verified not broken:**
- `resolveBrandSlugFromSearch` is imported only in `hooks/useBrandConfig.ts` and
  `hooks/useBrandConfig.test.ts` (tests). The `whiteLabelPreview` / portal path
  is guarded by `getWhiteLabelPreviewSettings()` which runs after the env check
  — unchanged. Multi-brand portal deploys (no env slug) continue to honour `?brand=`.

---

## FE-01 — `App.tsx`: admin screen gated on role ∈ {admin, editor}

**File:** `App.tsx`
**Location:** `renderScreen()` `case 'admin':` (~line 1435)

**Problem:** `case 'admin':` rendered `<AdminScreen>` unconditionally for any
authenticated user, including `viewer` role.

**Fix:** Added two guards before rendering `<AdminScreen>`:
1. If `accessProfile` is null (session checked but no profile) → `navigate('login')`.
2. If role is not `admin` or `editor` → `navigate('home')`.

Both navigations are synchronous redirects that return `null`; `renderScreen()` is
only called after `sessionChecked` is true (the existing guard at line 1167 already
shows a spinner until then), so no extra loading state is needed.

**Revert:** Remove the two guard blocks, restoring:

```tsx
case 'admin':
  return (
    <AdminScreen
      onNavigate={navigate}
      onBack={goBack}
      initialModule={resolvedNavState.adminModule ?? getAdminModuleFromParams(currentParams)}
      onModuleChange={setActiveAdminModule}
    />
  );
```

---

## FE-02 — `components/BottomNav.tsx`: `canEdit` requires real authenticated profile

**File:** `components/BottomNav.tsx`
**Location:** `canEdit` derivation (~line 85)

**Problem:** `effectiveRole` fell back to `getMockCurrentUserRole()` when `profile`
was null AND the app was in dev/mock mode. This meant `canEdit` could be `true` and
the "Gerenciar" nav item could appear for an unauthenticated visitor in mock sessions
(or if `isSupabaseConfigured` was false).

**Fix:** Added `Boolean(profile) &&` as the first condition of `canEdit`, so edit
rights are never derived from the mock fallback when there is no real authenticated
profile.

**Revert:** Remove the `Boolean(profile) &&` prefix, restoring:

```ts
const canEdit = effectiveRole === 'admin' || effectiveRole === 'editor';
```

**Note:** `effectiveProfile`, `effectiveRole`, and `fallbackProfile`/`fallbackRole`
are unchanged — this only affects the `canEdit` gate. Mock sessions with a real
`profile` (i.e. mock that returns an actual profile object) are unaffected.

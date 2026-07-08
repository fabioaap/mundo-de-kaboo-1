// Standalone holder for the active brand slug. Kept dependency-free (no supabase/api
// imports) so light modules like offline.ts can scope their storage keys per brand
// without pulling in the whole api/supabase chain (which has module-init side effects).
// api.ts is the writer (via setActiveBrandForApi); everyone else reads.

let activeBrandSlug = 'kaboo';

export const setActiveBrandSlug = (slug: string): void => {
  activeBrandSlug = slug;
};

export const getActiveBrandSlug = (): string => activeBrandSlug;

/**
 * An asset is only *effectively* published (visible to the end user) when BOTH
 * its owning collection AND the asset itself are published. An unpublished
 * collection hides everything inside it, no matter what the asset's own
 * `is_published` flag says. `undefined`/`null` counts as published for
 * backward-compat (assets predating the flag are treated as live).
 */
export const isEffectivelyPublished = (
  collectionPublished: boolean | null | undefined,
  assetPublished: boolean | null | undefined,
): boolean => collectionPublished !== false && assetPublished !== false;

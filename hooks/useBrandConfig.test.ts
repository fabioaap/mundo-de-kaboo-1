import { describe, expect, it } from 'vitest';
import { resolveBrandSlugFromPathname } from './brandSlug';

describe('resolveBrandSlugFromPathname', () => {
    it('returns central-coruja for coruja preview paths', () => {
        expect(resolveBrandSlugFromPathname('/coruja-lab/')).toBe('central-coruja');
        expect(resolveBrandSlugFromPathname('/coruja-qa-20260429/')).toBe('central-coruja');
        expect(resolveBrandSlugFromPathname('/preview/central-coruja/')).toBe('central-coruja');
        expect(resolveBrandSlugFromPathname('/coruja/home')).toBe('central-coruja');
    });

    it('returns null for unrelated paths', () => {
        expect(resolveBrandSlugFromPathname('/')).toBeNull();
        expect(resolveBrandSlugFromPathname('/kaboo/')).toBeNull();
        expect(resolveBrandSlugFromPathname('/admin/white-label')).toBeNull();
    });
});

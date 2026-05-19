const normalizeBrandSlug = (value: string | null | undefined): string | null => {
    const normalizedValue = value?.trim().toLowerCase();

    if (normalizedValue === 'kaboo' || normalizedValue === 'central-coruja') {
        return normalizedValue;
    }

    return null;
};

export function resolveBrandSlugFromSearch(search: string | null | undefined): string | null {
    const normalizedSearch = search?.trim();
    if (!normalizedSearch) {
        return null;
    }

    const params = new URLSearchParams(normalizedSearch.startsWith('?') ? normalizedSearch : `?${normalizedSearch}`);
    return normalizeBrandSlug(params.get('brand'));
}

export function resolveBrandSlugFromPathname(pathname: string | null | undefined): string | null {
    const normalizedPath = pathname?.trim().toLowerCase();
    if (!normalizedPath) {
        return null;
    }

    const pathSegments = normalizedPath.split('/').filter(Boolean);
    const matchesCentralCoruja = pathSegments.some((segment) =>
        segment === 'central-coruja'
        || segment === 'coruja'
        || segment.startsWith('coruja-')
        || segment.includes('central-coruja'),
    );

    return matchesCentralCoruja ? 'central-coruja' : null;
}

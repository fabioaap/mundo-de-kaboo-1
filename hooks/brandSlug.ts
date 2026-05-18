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

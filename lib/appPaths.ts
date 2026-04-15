import placeholderImage from '../assets/images/image-placeholder.png';

const APP_PLACEHOLDER_ORIGIN = 'https://app.local';

const normalizeBasePath = (basePath: string): string => {
    const withLeadingSlash = basePath.startsWith('/') ? basePath : `/${basePath}`;
    return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
};

const appBasePath = normalizeBasePath(import.meta.env.BASE_URL || '/');
const appBaseUrl = new URL(appBasePath, APP_PLACEHOLDER_ORIGIN);

const isExternalUrl = (value: string): boolean => {
    return /^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith('//');
};

export const resolveAppUrl = (value: string): string => {
    if (!value) {
        return appBasePath;
    }

    if (isExternalUrl(value)) {
        return value;
    }

    const resolved = new URL(value, appBaseUrl);
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
};

export const buildAppUrl = (value = ''): string => {
    const resolvedPath = resolveAppUrl(value);

    if (typeof window === 'undefined') {
        return resolvedPath;
    }

    return new URL(resolvedPath, window.location.origin).toString();
};

export const placeholderImageUrl = placeholderImage;

export const isPlaceholderImageUrl = (value?: string | null): boolean => {
    if (!value) {
        return false;
    }

    return value === placeholderImageUrl
        || value.endsWith('/assets/images/image-placeholder.png')
        || /(?:^|\/)image-placeholder(?:-[^/.]+)?\.png(?:$|\?)/i.test(value);
};
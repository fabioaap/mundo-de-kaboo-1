import placeholderImage from '../assets/images/image-placeholder.png';

const APP_PLACEHOLDER_ORIGIN = 'https://app.local';
const RAW_BASE_PATH = import.meta.env.BASE_URL || '/';
const USE_RELATIVE_BASE = RAW_BASE_PATH === '' || RAW_BASE_PATH === '.' || RAW_BASE_PATH === './';

const normalizeBasePath = (basePath: string): string => {
    const withLeadingSlash = basePath.startsWith('/') ? basePath : `/${basePath}`;
    return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
};

const toRelativeAppPath = (value: string): string => {
    if (!value || value === '/') {
        return './';
    }

    if (value.startsWith('./')) {
        return value;
    }

    if (value.startsWith('?') || value.startsWith('#')) {
        return `./${value}`;
    }

    return value.startsWith('/') ? `.${value}` : `./${value}`;
};

const appBasePath = USE_RELATIVE_BASE ? './' : normalizeBasePath(RAW_BASE_PATH);
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

    if (USE_RELATIVE_BASE) {
        return toRelativeAppPath(value);
    }

    const resolved = new URL(value, appBaseUrl);
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
};

export const buildAppUrl = (value = ''): string => {
    const resolvedPath = resolveAppUrl(value);

    if (typeof window === 'undefined') {
        return resolvedPath;
    }

    const baseUrl = USE_RELATIVE_BASE ? window.location.href : window.location.origin;
    return new URL(resolvedPath, baseUrl).toString();
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
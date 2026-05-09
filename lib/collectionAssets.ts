import {
    Collection,
    CollectionAsset,
    CollectionAssetCategory,
    CollectionAssetMediaType,
} from '../types';

type CollectionAssetScope = NonNullable<CollectionAsset['scope']>;

type CollectionAssetMeta = {
    label: string;
    mediaType: CollectionAssetMediaType;
    scope: CollectionAssetScope;
};

export const COLLECTION_ASSET_META: Record<CollectionAssetCategory, CollectionAssetMeta> = {
    reading: { label: 'Leitura', mediaType: 'document', scope: 'primary' },
    storytelling: { label: 'Contação da História', mediaType: 'audio', scope: 'primary' },
    animation: { label: 'Desenho Animado', mediaType: 'video', scope: 'primary' },
    accessible_video: { label: 'Com Libras', mediaType: 'video', scope: 'primary' },
    how_to_play: { label: 'Como Jogar', mediaType: 'video', scope: 'library' },
    video_lesson: { label: 'Videoaula', mediaType: 'video', scope: 'library' },
    teacher_guide: { label: 'Guia do Professor', mediaType: 'document', scope: 'library' },
    extra_material: { label: 'Material Extra', mediaType: 'document', scope: 'library' },
};

const COLLECTION_ASSET_ORDER: CollectionAssetCategory[] = [
    'reading',
    'storytelling',
    'animation',
    'accessible_video',
    'how_to_play',
    'video_lesson',
    'teacher_guide',
    'extra_material',
];

const LEGACY_VIDEO_PRIORITY: CollectionAssetCategory[] = [
    'animation',
    'accessible_video',
    'how_to_play',
    'video_lesson',
];

const normalizeText = (value?: string | null): string => (value ?? '').trim();

const normalizeUrl = (value?: string | null): string => (value ?? '').trim();

const normalizeSearchText = (...values: Array<string | null | undefined>): string => {
    return values
        .map((value) => normalizeText(value))
        .filter(Boolean)
        .join(' ')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
};

const createStableHash = (value: string): string => {
    let hash = 0;

    for (let index = 0; index < value.length; index += 1) {
        hash = (hash << 5) - hash + value.charCodeAt(index);
        hash |= 0;
    }

    return Math.abs(hash).toString(36);
};

const getUrlFileName = (url: string): string => {
    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl) {
        return '';
    }

    const withoutQuery = normalizedUrl.split('#')[0]?.split('?')[0] ?? normalizedUrl;
    const fileName = withoutQuery.split('/').pop() ?? '';

    return fileName.replace(/^\d+-[a-z0-9]+-/i, '');
};

const humanizeFileName = (url: string): string => {
    const fileName = getUrlFileName(url);
    if (!fileName) {
        return '';
    }

    return fileName
        .replace(/\.[a-z0-9]{1,6}$/i, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const inferMediaTypeFromUrl = (
    url?: string | null,
    fallback: CollectionAssetMediaType = 'document'
): CollectionAssetMediaType => {
    const fileName = getUrlFileName(url ?? '').toLowerCase();

    if (/(\.mp3|\.wav|\.ogg|\.m4a|\.aac)$/i.test(fileName)) {
        return 'audio';
    }

    if (/(\.mp4|\.webm|\.mov|\.avi|\.m4v)$/i.test(fileName)) {
        return 'video';
    }

    return fallback;
};

const inferCategoryFromContext = (params: {
    url?: string | null;
    title?: string | null;
    scope?: CollectionAssetScope;
    mediaType?: CollectionAssetMediaType;
    fallbackCategory?: CollectionAssetCategory;
}): CollectionAssetCategory => {
    const { url, title, scope, mediaType, fallbackCategory } = params;
    const normalizedSource = normalizeSearchText(url, title);

    if (scope === 'library' || fallbackCategory === 'how_to_play' || fallbackCategory === 'video_lesson' || fallbackCategory === 'teacher_guide' || fallbackCategory === 'extra_material') {
        if (normalizedSource.includes('guia')) {
            return 'teacher_guide';
        }

        if (normalizedSource.includes('como jogar') || normalizedSource.includes('como_jogar')) {
            return 'how_to_play';
        }

        if (normalizedSource.includes('videoaula') || normalizedSource.includes('video aula') || normalizedSource.includes('video_aula')) {
            return 'video_lesson';
        }

        return fallbackCategory ?? 'extra_material';
    }

    if (normalizedSource.includes('libras')) {
        return 'accessible_video';
    }

    if (fallbackCategory) {
        return fallbackCategory;
    }

    if (mediaType === 'audio') {
        return 'storytelling';
    }

    if (mediaType === 'video') {
        return 'animation';
    }

    return 'reading';
};

const buildFallbackTitle = (category: CollectionAssetCategory, url: string): string => {
    const fileTitle = humanizeFileName(url);

    if (fileTitle && category === 'extra_material') {
        return fileTitle;
    }

    if (fileTitle && category === 'teacher_guide') {
        return COLLECTION_ASSET_META.teacher_guide.label;
    }

    return fileTitle || COLLECTION_ASSET_META[category].label;
};

const sortAssets = (assets: CollectionAsset[]): CollectionAsset[] => {
    return [...assets].sort((left, right) => {
        const orderDiff = COLLECTION_ASSET_ORDER.indexOf(left.category) - COLLECTION_ASSET_ORDER.indexOf(right.category);

        if (orderDiff !== 0) {
            return orderDiff;
        }

        const titleDiff = left.title.localeCompare(right.title, 'pt-BR');
        if (titleDiff !== 0) {
            return titleDiff;
        }

        return left.url.localeCompare(right.url, 'pt-BR');
    });
};

const normalizeAsset = (
    asset: Partial<CollectionAsset>,
    fallbackCategory?: CollectionAssetCategory
): CollectionAsset | null => {
    const url = normalizeUrl(asset.url);
    if (!url) {
        return null;
    }

    const mediaType = asset.media_type ?? inferMediaTypeFromUrl(url);
    const category = asset.category ?? inferCategoryFromContext({
        url,
        title: asset.title,
        scope: asset.scope,
        mediaType,
        fallbackCategory,
    });
    const meta = COLLECTION_ASSET_META[category];

    return {
        id: normalizeText(asset.id) || `${category}-${createStableHash(`${url}:${normalizeText(asset.title)}`)}`,
        category,
        media_type: asset.media_type ?? inferMediaTypeFromUrl(url, meta.mediaType),
        title: normalizeText(asset.title) || buildFallbackTitle(category, url),
        url,
        description: normalizeText(asset.description) || null,
        scope: asset.scope ?? meta.scope,
        lyrics_url: normalizeText(asset.lyrics_url) || null,
    };
};

const mergeAssetCandidate = (
    current: CollectionAsset | undefined,
    candidate: Partial<CollectionAsset>,
    fallbackCategory?: CollectionAssetCategory
): CollectionAsset | null => {
    return normalizeAsset(
        {
            id: current?.id ?? candidate.id,
            category: current?.category ?? candidate.category,
            media_type: current?.media_type ?? candidate.media_type,
            title: normalizeText(current?.title) || candidate.title,
            url: candidate.url ?? current?.url,
            description: normalizeText(current?.description) || candidate.description,
            scope: current?.scope ?? candidate.scope,
            lyrics_url: current?.lyrics_url ?? candidate.lyrics_url,
        },
        fallbackCategory ?? current?.category ?? candidate.category
    );
};

const addAssetCandidate = (
    assetsByUrl: Map<string, CollectionAsset>,
    candidate: Partial<CollectionAsset>,
    fallbackCategory?: CollectionAssetCategory
): void => {
    const url = normalizeUrl(candidate.url);
    if (!url) {
        return;
    }

    const mergedAsset = mergeAssetCandidate(assetsByUrl.get(url), { ...candidate, url }, fallbackCategory);
    if (mergedAsset) {
        assetsByUrl.set(url, mergedAsset);
    }
};

export const inferCollectionAssets = (collection: Partial<Collection>): CollectionAsset[] => {
    const assetsByUrl = new Map<string, CollectionAsset>();

    (collection.collection_assets ?? []).forEach((asset) => {
        addAssetCandidate(assetsByUrl, asset);
    });

    addAssetCandidate(assetsByUrl, {
        category: 'reading',
        media_type: 'document',
        title: COLLECTION_ASSET_META.reading.label,
        url: collection.pdf_url,
        scope: 'primary',
    }, 'reading');

    addAssetCandidate(assetsByUrl, {
        category: 'storytelling',
        media_type: 'audio',
        title: COLLECTION_ASSET_META.storytelling.label,
        url: collection.audio_url,
        scope: 'primary',
    }, 'storytelling');

    addAssetCandidate(assetsByUrl, {
        category: 'animation',
        media_type: 'video',
        title: COLLECTION_ASSET_META.animation.label,
        url: collection.video_url,
        scope: 'primary',
    }, 'animation');

    (collection.extra_materials ?? []).forEach((url) => {
        const inferredCategory = inferCategoryFromContext({
            url,
            scope: 'library',
            mediaType: inferMediaTypeFromUrl(url, 'document'),
        });

        addAssetCandidate(assetsByUrl, {
            category: inferredCategory,
            media_type: inferMediaTypeFromUrl(url, COLLECTION_ASSET_META[inferredCategory].mediaType),
            title: buildFallbackTitle(inferredCategory, url),
            url,
            scope: 'library',
        }, inferredCategory);
    });

    return sortAssets(Array.from(assetsByUrl.values()));
};

export const syncCollectionWithAssets = <T extends Partial<Collection>>(collectionLike: T) => {
    const collectionAssets = inferCollectionAssets(collectionLike);
    const firstReading = collectionAssets.find((asset) => asset.category === 'reading');
    const firstStorytelling = collectionAssets.find((asset) => asset.category === 'storytelling');
    const firstVideo = LEGACY_VIDEO_PRIORITY
        .map((category) => collectionAssets.find((asset) => asset.category === category))
        .find(Boolean);
    const libraryUrls = Array.from(
        new Set(
            collectionAssets
                .filter((asset) => asset.scope === 'library')
                .map((asset) => asset.url)
        )
    );

    return {
        ...collectionLike,
        collection_assets: collectionAssets,
        pdf_url: firstReading?.url ?? '',
        audio_url: firstStorytelling?.url ?? '',
        video_url: firstVideo?.url ?? '',
        extra_materials: libraryUrls,
    };
};

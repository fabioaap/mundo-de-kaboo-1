import { NavState, ScreenName } from '../types';

const HASH_ADDRESSABLE_SCREENS = new Set<ScreenName>([
  'portal',
  'login',
  'forgot_password',
  'set_password',
  'access_expired',
  'home',
  'search',
  'videos',
  'music',
  'formations',
  'materials',
  'profile',
  'my_data',
  'support',
  'email_confirmation',
  'admin',
  'design_system',
  'characters',
]);

const getHashPayload = (hash: string): string => hash.replace(/^#/, '').trim();

const getHashParams = (hash: string): URLSearchParams => {
  const rawHash = getHashPayload(hash);
  const separatorIndex = rawHash.search(/[?&]/);

  if (separatorIndex === -1) {
    return new URLSearchParams();
  }

  return new URLSearchParams(rawHash.slice(separatorIndex + 1));
};

export const getHashScreen = (hash: string): ScreenName | null => {
  const rawHash = getHashPayload(hash);
  if (!rawHash) {
    return null;
  }

  const candidate = rawHash.split(/[?&/]/)[0]?.trim();
  if (!candidate || candidate.includes('=')) {
    return null;
  }

  return HASH_ADDRESSABLE_SCREENS.has(candidate as ScreenName)
    ? (candidate as ScreenName)
    : null;
};

const getLegacyHomeCollectionGroup = (hash: string): 'books' | undefined => {
  const rawHash = getHashPayload(hash);
  const pathSegment = rawHash.match(/^home\/([^?&/]+)/i)?.[1];
  const normalized = decodeURIComponent(pathSegment ?? '').trim().toLowerCase();

  if (normalized === 'books' || normalized === 'livros') {
    return 'books';
  }

  return undefined;
};

export const getNavStateFromHashString = (hash: string): NavState | null => {
  const hashScreen = getHashScreen(hash);
  if (!hashScreen) {
    return null;
  }

  const hashParams = getHashParams(hash);

  if (hashScreen === 'home') {
    const collectionGroup = hashParams.get('collectionGroup') === 'books' || getLegacyHomeCollectionGroup(hash) === 'books'
      ? ('books' as const)
      : undefined;
    const collectionId = hashParams.get('collectionId')?.trim() || undefined;
    // Drill-down stack (kit → book → …) so returning from a player restores the
    // active level instead of collapsing to the collection root.
    const modalStackIds = hashParams.get('modalStack')?.split(',').map((id) => id.trim()).filter(Boolean);

    if (collectionGroup || collectionId) {
      return {
        currentScreen: hashScreen,
        params: {
          ...(collectionGroup ? { collectionGroup } : {}),
          ...(collectionId ? { collectionId } : {}),
          ...(modalStackIds && modalStackIds.length > 1 ? { modalStackIds } : {}),
        },
      };
    }
  }

  return { currentScreen: hashScreen };
};

export const getHashUrlForScreen = (screen: ScreenName, params?: NavState['params']): string => {
  const hashParams = new URLSearchParams();

  if (screen === 'home') {
    if (params?.collectionGroup === 'books') {
      hashParams.set('collectionGroup', 'books');
    }

    if (typeof params?.collectionId === 'string' && params.collectionId.trim()) {
      hashParams.set('collectionId', params.collectionId.trim());
    }

    if (Array.isArray(params?.modalStackIds) && params.modalStackIds.length > 1) {
      hashParams.set('modalStack', params.modalStackIds.join(','));
    }
  }

  const serializedParams = hashParams.toString();
  return serializedParams ? `#${screen}?${serializedParams}` : `#${screen}`;
};

export const areNavStatesEqual = (left: NavState, right: NavState): boolean => (
  left.currentScreen === right.currentScreen
  && JSON.stringify(left.params ?? null) === JSON.stringify(right.params ?? null)
);

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

  const candidate = rawHash.split(/[?&]/)[0]?.trim();
  if (!candidate || candidate.includes('=')) {
    return null;
  }

  return HASH_ADDRESSABLE_SCREENS.has(candidate as ScreenName)
    ? (candidate as ScreenName)
    : null;
};

export const getNavStateFromHashString = (hash: string): NavState | null => {
  const hashScreen = getHashScreen(hash);
  if (!hashScreen) {
    return null;
  }

  const hashParams = getHashParams(hash);

  if (hashScreen === 'home' && hashParams.get('collectionGroup') === 'books') {
    return {
      currentScreen: hashScreen,
      params: { collectionGroup: 'books' as const },
    };
  }

  return { currentScreen: hashScreen };
};

export const getHashUrlForScreen = (screen: ScreenName, params?: NavState['params']): string => {
  const hashParams = new URLSearchParams();

  if (screen === 'home' && params?.collectionGroup === 'books') {
    hashParams.set('collectionGroup', 'books');
  }

  const serializedParams = hashParams.toString();
  return serializedParams ? `#${screen}?${serializedParams}` : `#${screen}`;
};

export const areNavStatesEqual = (left: NavState, right: NavState): boolean => (
  left.currentScreen === right.currentScreen
  && JSON.stringify(left.params ?? null) === JSON.stringify(right.params ?? null)
);

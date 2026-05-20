import { NavState, ScreenName } from '../types';

export const PROTECTED_SCREENS: ScreenName[] = [
  'home',
  'search',
  'videos',
  'music',
  'formations',
  'materials',
  'profile',
  'my_data',
  'player_book',
  'player_audio',
  'player_video',
  'tools',
  'support',
  'admin',
];

const protectedScreenSet = new Set<ScreenName>(PROTECTED_SCREENS);

export const isProtectedScreen = (screen: ScreenName): boolean =>
  protectedScreenSet.has(screen);

export const getAccessibleNavState = (
  state: NavState,
  hasAuthenticatedProfile: boolean,
  defaultPublicScreen: ScreenName,
): NavState => {
  if (hasAuthenticatedProfile || !isProtectedScreen(state.currentScreen)) {
    return state;
  }

  return { currentScreen: defaultPublicScreen };
};
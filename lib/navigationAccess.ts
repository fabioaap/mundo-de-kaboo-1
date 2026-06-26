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

/**
 * Item de menu mínimo necessário para o gating. Espelha BrandMenuItem
 * (key, route, order) sem acoplar este módulo ao hook de marca.
 */
export interface MenuGateItem {
  key: string;
  route: string;
  order: number;
}

const collectionGroupForMenuKey = (key: string): 'books' | 'kits' | undefined =>
  key === 'books' ? 'books' : key === 'collections' ? 'kits' : undefined;

const normalizeCollectionGroup = (params: any): 'books' | 'kits' =>
  params?.collectionGroup === 'books' ? 'books' : 'kits';

/**
 * Telas alcançáveis por um item de menu. Para 'home', Coleções e Livros
 * compartilham a tela e se distinguem por collectionGroup — por isso o
 * gating de 'home' precisa considerar o grupo, não só o nome da tela.
 */
const menuItemMatchesNavState = (item: MenuGateItem, state: NavState): boolean => {
  if (item.route !== state.currentScreen) return false;
  const group = collectionGroupForMenuKey(item.key);
  if (group) {
    return normalizeCollectionGroup(state.params) === group;
  }
  return true;
};

/** Conjunto de todas as rotas que algum menu pode controlar (canônico). */
const menuRoutesAll = new Set<ScreenName>([
  'home',
  'videos',
  'music',
  'formations',
  'materials',
]);

/** NavState do primeiro item de menu habilitado (já ordenado por order). */
const navStateForMenuItem = (item: MenuGateItem): NavState => {
  const group = collectionGroupForMenuKey(item.key);
  return group === 'books'
    ? { currentScreen: item.route as ScreenName, params: { collectionGroup: 'books' } }
    : { currentScreen: item.route as ScreenName };
};

/**
 * Gating por menu: se a tela atual corresponde a um item de menu que NÃO está
 * em enabledMenuItems, redireciona para o 1º item habilitado (D2). Telas que não
 * são mapeadas por nenhum menu (perfil, players, admin, busca…) passam direto —
 * elas seguem protegidas apenas por auth via getAccessibleNavState.
 *
 * `enabledMenuItems` deve vir já filtrado e ordenado (useBrandConfig).
 */
export const getMenuAccessibleNavState = (
  state: NavState,
  enabledMenuItems: MenuGateItem[],
): NavState => {
  const enabledRoutes = new Set(enabledMenuItems.map(item => item.route));

  // Telas que nenhum menu controla não são afetadas pelo gating de menu.
  if (!enabledRoutes.has(state.currentScreen) && !menuRoutesAll.has(state.currentScreen)) {
    return state;
  }

  const isReachable = enabledMenuItems.some(item => menuItemMatchesNavState(item, state));
  if (isReachable) return state;

  const target = enabledMenuItems[0];
  return target ? navStateForMenuItem(target) : state;
};
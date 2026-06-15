import React, { useState, useEffect, useMemo } from 'react';
import { NavState, ScreenName, Collection, UserProfile, AdminModule, UserContentGrant } from './types';
import { api, clearAllUserCache, getCachedProfileSync, isDevMockSession, setActiveBrandForApi } from './lib/api';
import {
  awaitDevSessionBridgeImport,
  maybeHandleDevSessionBridgeExport,
  maybeRequestDevSessionFromSibling,
  supabase,
  isSupabaseConfigured,
} from './lib/supabase';
import { useThemeBackground } from './hooks/useThemeBackground';
import { useBrandConfig } from './hooks/useBrandConfig';
import { resolveBrandSlugFromPathname } from './hooks/brandSlug';
import { getProfileAccessStatus, isAccessBlocked, canAccessCollection } from './lib/access';
import { VoucherUpsellModal } from './components/VoucherUpsellModal';
import { getVoucherUpsellStoreUrl } from './constants';
import { setActiveBrandForCharacters } from './lib/characters';
import { getAccessibleNavState, PROTECTED_SCREENS } from './lib/navigationAccess';
import { logger } from './lib/logger';
import { clearPendingPasswordSetup, hasPendingPasswordSetup, isInvitedAuthUser, markPendingPasswordSetup } from './lib/passwordSetupFlow';
import { setMockActiveBrand } from './lib/mockData';
import { areNavStatesEqual, getHashUrlForScreen, getNavStateFromHashString } from './lib/navHistory';

// Screens
import { LoginScreen } from './screens/LoginScreen';
import { PortalScreen } from './screens/PortalScreen';
import { AccessExpiredScreen } from './screens/AccessExpiredScreen';
import { ForgotPasswordScreen } from './screens/ForgotPasswordScreen';
import { HomeScreen } from './screens/HomeScreen';
import { AudioPlayerScreen } from './screens/AudioPlayerScreen';
import { VideoPlayerScreen } from './screens/VideoPlayerScreen';
// Lazy load BookReaderScreen to avoid import errors blocking the app
const BookReaderScreen = React.lazy(() => import('./screens/BookReaderScreen').then(module => ({ default: module.BookReaderScreen })));
import { ExtraToolsScreen } from './screens/ExtraToolsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { MyDataScreen } from './screens/MyDataScreen';
import { EmailConfirmationScreen } from './screens/EmailConfirmationScreen';
import { SetPasswordScreen } from './screens/SetPasswordScreen';
import { AdminScreen } from './screens/AdminScreen';
import { CharactersScreen } from './screens/CharactersScreen';
import { DesignSystemScreen } from './screens/DesignSystemScreen';
import { LibraryHubScreen } from './screens/LibraryHubScreen';

// Components
import { BottomNav } from './components/BottomNav';
import { PageHeader } from './components/PageHeader';
import { CollectionModal } from './components/CollectionModal';
import { LOGO_URL } from './constants';

// Storage keys
const STORAGE_NAV_STATE = 'kaboo_nav_state';
const STORAGE_PREVIOUS_STATE = 'kaboo_previous_state';

const PLAYER_SCREENS: ScreenName[] = ['player_audio', 'player_book', 'player_video', 'tools'];
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
const PUBLIC_ENTRY_SCREENS = new Set<ScreenName>([
  'portal',
  'login',
  'forgot_password',
  'set_password',
  'email_confirmation',
]);
const ADMIN_MODULES: AdminModule[] = ['collections', 'books', 'videos', 'music', 'formations', 'materials', 'users', 'vouchers', 'characters', 'white_label'];
const ADMIN_MODULE_SET = new Set<AdminModule>(ADMIN_MODULES);

const shouldPreservePublicEntryScreen = (screen: ScreenName): boolean => PUBLIC_ENTRY_SCREENS.has(screen);

const normalizeAdminModule = (value: unknown): AdminModule | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  return ADMIN_MODULE_SET.has(value as AdminModule)
    ? value as AdminModule
    : undefined;
};

const getAdminModuleFromParams = (params?: Record<string, unknown> | null): AdminModule | undefined => {
  if (!params) {
    return undefined;
  }

  return normalizeAdminModule(
    params.adminModule
    ?? params.module
    ?? params.initialModule
    ?? params.submodule
  );
};

const normalizeNavState = (state: NavState): NavState => {
  if (state.currentScreen !== 'admin') {
    if (state.adminModule === undefined) {
      return state;
    }

    return {
      currentScreen: state.currentScreen,
      params: state.params,
    };
  }

  const adminModule = normalizeAdminModule(state.adminModule) ?? getAdminModuleFromParams(state.params);

  if (adminModule === undefined && state.adminModule === undefined) {
    return state;
  }

  return {
    currentScreen: state.currentScreen,
    adminModule,
    params: state.params,
  };
};

const getHashScreen = (hash: string): ScreenName | null => {
  const rawHash = hash.replace(/^#/, '').trim();
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

const getAdminModuleFromHash = (hash: string): AdminModule | undefined => {
  const rawHash = hash.replace(/^#/, '').trim();
  if (!rawHash.startsWith('admin')) {
    return undefined;
  }

  const pathMatch = rawHash.match(/^admin\/([^?&/]+)/i);
  if (pathMatch?.[1]) {
    return normalizeAdminModule(pathMatch[1]);
  }

  const queryStartIndex = rawHash.indexOf('?');
  const ampersandStartIndex = rawHash.indexOf('&');
  const paramsStartIndex = queryStartIndex >= 0
    ? queryStartIndex
    : ampersandStartIndex;

  if (paramsStartIndex < 0) {
    return undefined;
  }

  const rawParams = rawHash.slice(paramsStartIndex + 1);
  const hashParams = new URLSearchParams(rawParams);
  return normalizeAdminModule(hashParams.get('adminModule') ?? hashParams.get('module'));
};

const getNavStateFromHistoryState = (historyState: unknown): NavState | null => {
  if (!historyState || typeof historyState !== 'object') {
    return null;
  }

  const candidate = historyState as { screen?: unknown; adminModule?: unknown; params?: Record<string, unknown> };
  if (!candidate.screen || !HASH_ADDRESSABLE_SCREENS.has(candidate.screen as ScreenName)) {
    return null;
  }

  return normalizeNavState({
    currentScreen: candidate.screen as ScreenName,
    adminModule: normalizeAdminModule(candidate.adminModule),
    params: candidate.params,
  });
};

const getNavStateFromHash = (): NavState | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const hashScreen = getHashScreen(window.location.hash);
  if (!hashScreen || PLAYER_SCREENS.includes(hashScreen)) {
    return null;
  }

  if (hashScreen === 'home') {
    const homeState = getNavStateFromHashString(window.location.hash);
    return homeState ? normalizeNavState(homeState) : normalizeNavState({ currentScreen: 'home' });
  }

  return normalizeNavState({
    currentScreen: hashScreen,
    adminModule: hashScreen === 'admin'
      ? getAdminModuleFromHash(window.location.hash)
        ?? (() => {
          const searchParams = new URLSearchParams(window.location.search);
          return normalizeAdminModule(searchParams.get('adminModule') ?? searchParams.get('module'));
        })()
      : undefined,
  });
};

const isPortalEntryPath = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const normalizedPath = window.location.pathname
    .replace(/\/index\.html$/i, '/')
    .replace(/\/+$/, '') || '/';

  if (normalizedPath === '/') {
    return true;
  }

  const pathSegments = normalizedPath.split('/').filter(Boolean);

  return pathSegments.length === 1 && !resolveBrandSlugFromPathname(normalizedPath);
};

const getDefaultPublicScreen = (): ScreenName => (isPortalEntryPath() ? 'portal' : 'login');

const getPortalEntrySearch = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }

  const params = new URLSearchParams(window.location.search);
  params.delete('brand');

  const nextSearch = params.toString();
  return nextSearch ? `?${nextSearch}` : '';
};

type HistoryNavState = {
  currentScreen: ScreenName;
  adminModule?: AdminModule;
  params?: NavState['params'];
};

const getHistoryUrlForNavState = (state: ScreenName | HistoryNavState): string => {
  const normalizedState = normalizeNavState(
    typeof state === 'string'
      ? { currentScreen: state } as NavState
      : state as NavState
  );
  const { currentScreen, adminModule } = normalizedState as NavState & { adminModule?: AdminModule };

  if (typeof window === 'undefined') {
    if (currentScreen === 'portal') {
      return '/';
    }

    if (currentScreen === 'admin' && adminModule) {
      return `#admin?module=${adminModule}`;
    }

    if (currentScreen === 'home') {
      return getHashUrlForScreen('home', normalizedState.params);
    }

    return `#${currentScreen}`;
  }

  if (currentScreen === 'portal') {
    return `${window.location.pathname}${getPortalEntrySearch()}`;
  }

  if (currentScreen === 'admin' && adminModule) {
    return `#admin?module=${adminModule}`;
  }

  if (currentScreen === 'home') {
    return getHashUrlForScreen('home', normalizedState.params);
  }

  return `#${currentScreen}`;
};

const isHistoryUrlSynced = (state: ScreenName | HistoryNavState): boolean => {
  const normalizedState = normalizeNavState(
    typeof state === 'string'
      ? { currentScreen: state }
      : state as NavState
  );

  if (typeof window === 'undefined') {
    return true;
  }

  if (normalizedState.currentScreen === 'portal') {
    return window.location.hash === ''
      && `${window.location.pathname}${window.location.search}` === getHistoryUrlForNavState(normalizedState);
  }

  return window.location.hash === getHistoryUrlForNavState(normalizedState);
};

const buildHistoryState = (state: NavState) => {
  const normalizedState = normalizeNavState(state);

  return {
    screen: normalizedState.currentScreen,
    adminModule: normalizedState.adminModule,
    params: normalizedState.params,
  };
};

const areNavStatesEquivalent = (left: NavState, right: NavState): boolean => {
  const normalizedLeft = normalizeNavState(left);
  const normalizedRight = normalizeNavState(right);

  return normalizedLeft.adminModule === normalizedRight.adminModule
    && areNavStatesEqual(normalizedLeft, normalizedRight);
};

const getPostAuthNavState = (state: NavState, fallbackScreen: ScreenName): NavState => {
  const hashState = getNavStateFromHash();
  if (hashState && hashState.currentScreen !== 'login' && hashState.currentScreen !== 'forgot_password') {
    return hashState;
  }

  if (state.currentScreen === 'admin' && state.adminModule) {
    return state;
  }

  return { currentScreen: fallbackScreen };
};

// Helper functions for localStorage persistence
const saveNavState = (state: NavState) => {
  try {
    localStorage.setItem(STORAGE_NAV_STATE, JSON.stringify(normalizeNavState(state)));
  } catch (error) {
    logger.warn('Failed to save nav state to localStorage:', error);
  }
};

const loadNavState = (): NavState | null => {
  try {
    const saved = localStorage.getItem(STORAGE_NAV_STATE);
    if (saved) {
      return normalizeNavState(JSON.parse(saved) as NavState);
    }
  } catch (error) {
    logger.warn('Failed to load nav state from localStorage:', error);
  }
  return null;
};

const savePreviousState = (state: { screen: ScreenName; params?: any } | null) => {
  try {
    if (state) {
      localStorage.setItem(STORAGE_PREVIOUS_STATE, JSON.stringify(state));
    } else {
      localStorage.removeItem(STORAGE_PREVIOUS_STATE);
    }
  } catch (error) {
    logger.warn('Failed to save previous state to localStorage:', error);
  }
};

const loadPreviousState = (): { screen: ScreenName; params?: any } | null => {
  try {
    const saved = localStorage.getItem(STORAGE_PREVIOUS_STATE);
    if (saved) {
      return JSON.parse(saved) as { screen: ScreenName; params?: any };
    }
  } catch (error) {
    logger.warn('Failed to load previous state from localStorage:', error);
  }
  return null;
};

const DEFAULT_BRAND_PRIMARY_COLOR = '#5D1F58';
const DEFAULT_FAVICON_URL = '/favicon.ico';
const DEFAULT_APPLE_TOUCH_ICON_URL = '/apple-touch-icon.png';

const upsertHeadMeta = (name: string, content: string) => {
  const existingMeta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;

  if (existingMeta) {
    existingMeta.content = content;
    return;
  }

  const meta = document.createElement('meta');
  meta.name = name;
  meta.content = content;
  document.head.appendChild(meta);
};

const replaceHeadLinks = (rel: string, href: string) => {
  const existingLinks = Array.from(document.querySelectorAll(`link[rel="${rel}"]`)) as HTMLLinkElement[];

  existingLinks.forEach(link => {
    link.remove();
  });

  const link = document.createElement('link');
  link.rel = rel;
  link.href = href;
  document.head.appendChild(link);
};

const App: React.FC = () => {
  // Initialize state from localStorage if available
  const [navState, setNavState] = useState<NavState>(() => {
    const hashState = getNavStateFromHash();
    if (hashState) {
      return hashState;
    }

    const historyState = getNavStateFromHistoryState(window.history.state);
    if (historyState) {
      return historyState;
    }

    if (isPortalEntryPath()) {
      return { currentScreen: 'portal' };
    }

    const saved = loadNavState();
    if (saved) {
      // Don't restore player screens without collectionId - they'll be handled after session check
      if (PLAYER_SCREENS.includes(saved.currentScreen)) {
        if (!saved.params?.collectionId) {
          return { currentScreen: getDefaultPublicScreen() };
        }
      }
      // Don't restore login/forgot_password/set_password screens - let auth check handle it
      if (saved.currentScreen === 'login' || saved.currentScreen === 'forgot_password' || saved.currentScreen === 'set_password') {
        return { currentScreen: getDefaultPublicScreen() };
      }
      return saved;
    }
    return { currentScreen: getDefaultPublicScreen() };
  });
  const [sessionChecked, setSessionChecked] = useState(false);
  const [accessProfile, setAccessProfile] = useState<UserProfile | null>(() => getCachedProfileSync());
  // Grants de conteúdo do usuário (coleções liberadas pelo voucher). Usado no gate
  // central de navegação: material fora do voucher abre o modal de upsell.
  const [contentGrants, setContentGrants] = useState<UserContentGrant[]>([]);
  const [upsellCollectionId, setUpsellCollectionId] = useState<string | null>(null);

  const [currentCollection, setCurrentCollection] = useState<Collection | undefined>(undefined);
  // Store previous screen and collectionId before navigating to player screens
  const [previousScreenState, setPreviousScreenState] = useState<{ screen: ScreenName; params?: any } | null>(() => {
    return loadPreviousState();
  });
  // Store collection theme color for loading screen
  const [loadingCollectionTheme, setLoadingCollectionTheme] = useState<string | null>(null);

  // Brand config — bootstrapada uma vez por sessão; aplica tema e resolve menu flags.
  const { bootstrap: brandBootstrap, enabledMenuItems } = useBrandConfig();
  const brandEnabledMenuKeys = new Set(enabledMenuItems.map(item => item.key));
  const brandSlug = brandBootstrap.brand.slug;

  // Sync brand slug into mock data and API modules so collection storage is isolated per brand.
  // useMemo runs synchronously during render — before any child useEffect — ensuring the
  // brand slug is set before the first getCollections() call that children may make.
  useMemo(() => {
    setMockActiveBrand(brandSlug);
    setActiveBrandForApi(brandSlug, brandBootstrap.brand.id);
    setActiveBrandForCharacters(brandSlug);
  }, [brandBootstrap.brand.id, brandSlug]);

  const brandDisplayName = brandBootstrap.settings.display_name || brandBootstrap.brand.name;
  const brandLogoUrl = brandBootstrap.settings.logo_url || (brandBootstrap.brand.slug === 'kaboo' ? LOGO_URL : undefined);
  const brandLoginBackgroundUrl = brandBootstrap.settings.login_background_url || undefined;
  const brandPrimaryColor = brandBootstrap.settings.primary_color || DEFAULT_BRAND_PRIMARY_COLOR;
  const brandIconUrl = brandLogoUrl || DEFAULT_FAVICON_URL;
  const brandAppleTouchIconUrl = brandLogoUrl || DEFAULT_APPLE_TOUCH_ICON_URL;
  const getAccessibleStateForSession = (state: NavState): NavState =>
    sessionChecked
      ? getAccessibleNavState(state, Boolean(accessProfile), getDefaultPublicScreen())
      : state;
  const resolvedNavState = sessionChecked
    ? getAccessibleStateForSession(navState)
    : navState;

  // Save navState to localStorage whenever it changes
  useEffect(() => {
    saveNavState(navState);
  }, [navState]);

  // Save previousScreenState to localStorage whenever it changes
  useEffect(() => {
    savePreviousState(previousScreenState);
  }, [previousScreenState]);

  // Reset background to default for non-player screens
  // Player screens will set their own background via useThemeBackground hook
  const isPlayerScreen = PLAYER_SCREENS.includes(navState.currentScreen);

  useEffect(() => {
    document.title = brandDisplayName;
    upsertHeadMeta('apple-mobile-web-app-title', brandDisplayName);
    replaceHeadLinks('icon', brandIconUrl);
    replaceHeadLinks('apple-touch-icon', brandAppleTouchIconUrl);
  }, [brandAppleTouchIconUrl, brandDisplayName, brandIconUrl]);

  useEffect(() => {
    if (!isPlayerScreen) {
      // Reset to default white background for regular screens
      document.documentElement.style.backgroundColor = '#ffffff';
      document.body.style.backgroundColor = '#ffffff';
      upsertHeadMeta('theme-color', brandPrimaryColor);
      upsertHeadMeta('msapplication-TileColor', brandPrimaryColor);
    }
  }, [brandPrimaryColor, isPlayerScreen]);

  // Auth Listener
  useEffect(() => {
    // Check for confirmation URL parameter
    const params = new URLSearchParams(window.location.search);
    if (params.get('confirmation') === 'success') {
      setNavState({ currentScreen: 'email_confirmation', params: { status: 'confirmed' } });
      setSessionChecked(true);
      return;
    }

    // Lê o hash ANTES do Supabase processar o token (o SDK limpa o hash após a troca)
    // Isso garante que isInviteLink seja correto no closure do onAuthStateChange
    const hash = window.location.hash;
    const isInviteLink = hash.includes('type=invite');
    if (isInviteLink) {
      markPendingPasswordSetup();
    }

    if (hash.includes('error=')) {
      const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
      const errorCode = hashParams.get('error_code') ?? hashParams.get('error');
      if (errorCode) {
        clearPendingPasswordSetup();
        // Limpa o hash da URL sem recarregar
        window.history.replaceState(null, '', window.location.pathname);
        setNavState({ currentScreen: 'set_password', params: { linkExpired: true } });
        setSessionChecked(true);
        return;
      }
    }

    void (async () => {
      try {
        const devSessionBridgeImportResult = await awaitDevSessionBridgeImport();
        const bridgeExportHandled = await maybeHandleDevSessionBridgeExport();

        if (bridgeExportHandled) {
          setSessionChecked(true);
          return;
        }

        // Only check session if Supabase is configured
        if (!isSupabaseConfigured) {
          const profile = await api.getProfile(true);
          setAccessProfile(profile);

          setNavState((prev) => {
            if (!profile) {
              if (shouldPreservePublicEntryScreen(prev.currentScreen)) {
                return prev;
              }
              return { currentScreen: getDefaultPublicScreen() };
            }

            if (isAccessBlocked(profile)) {
              return { currentScreen: 'access_expired' };
            }

            if (prev.currentScreen === 'login' || prev.currentScreen === 'forgot_password' || prev.currentScreen === 'access_expired') {
              return getPostAuthNavState(prev, 'home');
            }

            if (PLAYER_SCREENS.includes(prev.currentScreen) && !prev.params?.collectionId) {
              return { currentScreen: 'home' };
            }

            return prev;
          });

          setSessionChecked(true);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          const shouldCompletePasswordSetup = hasPendingPasswordSetup() && isInvitedAuthUser(session.user);
          const profile = await api.getProfile(true);
          setAccessProfile(profile);

          if (shouldCompletePasswordSetup) {
            setNavState({ currentScreen: 'set_password' });
            setSessionChecked(true);
            return;
          }

          setNavState(prev => {
            if (profile && isAccessBlocked(profile)) {
              return { currentScreen: 'access_expired' };
            }

            if (prev.currentScreen === 'login' || prev.currentScreen === 'forgot_password') {
              return getPostAuthNavState(prev, 'home');
            }

            if (PLAYER_SCREENS.includes(prev.currentScreen) && !prev.params?.collectionId) {
              return { currentScreen: 'home' };
            }

            return prev;
          });
        } else if (isDevMockSession()) {
          setSessionChecked(true);
          return;
        } else {
          setAccessProfile(null);

          const startedDevSessionBridge = devSessionBridgeImportResult !== 'miss'
            && maybeRequestDevSessionFromSibling(window.location.href);

          if (startedDevSessionBridge) {
            setSessionChecked(true);
            return;
          }

          setNavState(prev => {
            if (shouldPreservePublicEntryScreen(prev.currentScreen)) {
              return prev;
            }
            return { currentScreen: getDefaultPublicScreen() };
          });
        }

        setSessionChecked(true);
      } catch (error) {
        logger.error('Error checking session:', error);
        setSessionChecked(true);
      }
    })();

    // 2. Realtime Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Link de recuperação de senha → tela de definir senha
        setNavState({ currentScreen: 'set_password' });
        return;
      }

      // Link de convite (inviteUserByEmail) dispara SIGNED_IN com type=invite no hash
      // isInviteLink é capturado do hash original (antes do Supabase limpar)
      if (event === 'SIGNED_IN' && session && (isInviteLink || hasPendingPasswordSetup()) && isInvitedAuthUser(session.user)) {
        markPendingPasswordSetup();
        // Colaborador clicou no link de convite — redireciona para definir senha
        setNavState({ currentScreen: 'set_password' });
        return;
      }

      if (event === 'SIGNED_IN' && session) {

        // Clear all caches on login to ensure fresh data for the new user
        clearAllUserCache();

        api.getProfile(true)
          .then((profile) => {
            setAccessProfile(profile);
          })
          .catch((error) => {
            logger.error('Error refreshing profile after sign in:', error);
          });

        setNavState(prev => {
          // Cada fluxo de autenticacao decide sua navegacao final.
          // Evita recarregar a pagina no meio do cadastro com voucher.
          return prev;
        });
      } else if (event === 'SIGNED_OUT' || !session) {
        // In DEV mock session, ignore Supabase auth state changes
        if (isDevMockSession()) return;

        clearPendingPasswordSetup();

        // Clear all user-related caches to prevent showing previous user's data
        clearAllUserCache();
        setAccessProfile(null);

        setNavState(prev => {
          // Preserve public entry screens when the auth layer emits SIGNED_OUT on root.
          if (shouldPreservePublicEntryScreen(prev.currentScreen)) {
            return prev;
          }
          // Clear saved state on logout before falling back to the public entry screen.
          localStorage.removeItem(STORAGE_NAV_STATE);
          localStorage.removeItem(STORAGE_PREVIOUS_STATE);
          return { currentScreen: getDefaultPublicScreen() };
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isSupabaseConfigured) {
      return;
    }

    api.getProfile(true)
      .then((profile) => {
        setAccessProfile(profile);
      })
      .catch((error) => {
        logger.error('Error refreshing mock session state:', error);
      });
  }, [navState.currentScreen]);

  useEffect(() => {
    if (!sessionChecked || !accessProfile) {
      return;
    }

    if (navState.currentScreen === 'access_expired' && getProfileAccessStatus(accessProfile) === 'active') {
      navigate('home', { accessRenewed: true });
      return;
    }

    if (getProfileAccessStatus(accessProfile) !== 'active') {
      return;
    }

    let cancelled = false;
    let expiryTimeoutId: number | null = null;

    const refreshAccessProfile = async () => {
      try {
        const profile = await api.getProfile(true);
        if (!cancelled) {
          setAccessProfile(profile);
        }
      } catch (error) {
        logger.error('Error rechecking access status:', error);
      }
    };

    const intervalId = window.setInterval(refreshAccessProfile, 60 * 1000);

    if (accessProfile.access_expires_at) {
      const msUntilExpiry = new Date(accessProfile.access_expires_at).getTime() - Date.now();
      if (Number.isFinite(msUntilExpiry) && msUntilExpiry > 0) {
        expiryTimeoutId = window.setTimeout(refreshAccessProfile, Math.min(msUntilExpiry + 1000, 2147483647));
      }
    }

    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
    if (isSupabaseConfigured && accessProfile.id) {
      realtimeChannel = supabase
        .channel('access-watch')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${accessProfile.id}`,
        }, () => {
          void refreshAccessProfile();
        })
        .subscribe();
    }

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      if (expiryTimeoutId !== null) {
        window.clearTimeout(expiryTimeoutId);
      }
      if (realtimeChannel) {
        void supabase.removeChannel(realtimeChannel);
      }
    };
  }, [sessionChecked, accessProfile?.id, accessProfile?.access_status, accessProfile?.access_expires_at, navState.currentScreen]);

  // Fetch collection details when an ID is passed in params
  useEffect(() => {
    if (navState.params?.collectionId) {
      // Fetch collection for modal (home/search) or player screens
      if (['home', 'search', ...PLAYER_SCREENS].includes(navState.currentScreen)) {
        // First, fetch just the theme color for loading screen
        api.getCollectionById(navState.params.collectionId).then(data => {
          if (data) {
            logger.log('📦 App: Fetched collection for', navState.currentScreen, data);
            setCurrentCollection(data);
            setLoadingCollectionTheme(data.color_theme || '#5D1F58');
          } else {
            logger.warn('⚠️ App: Collection not found for ID:', navState.params.collectionId);
            setLoadingCollectionTheme('#5D1F58');
          }
        }).catch(error => {
          logger.error('❌ App: Error fetching collection:', error);
          setLoadingCollectionTheme('#5D1F58');
        });
      }
    } else {
      // Only clear collection when explicitly navigating away from player screens
      if (!PLAYER_SCREENS.includes(navState.currentScreen)) {
        setCurrentCollection(undefined);
        setLoadingCollectionTheme(null);
      }
    }
  }, [navState.params?.collectionId, navState.currentScreen]);

  // Carrega os grants de conteúdo do usuário (coleções liberadas pelo voucher).
  useEffect(() => {
    const userId = accessProfile?.id;
    if (!userId) {
      setContentGrants([]);
      return;
    }
    let cancelled = false;
    api.getUserContentGrants()
      .then((grants) => { if (!cancelled) setContentGrants(grants); })
      .catch(() => { if (!cancelled) setContentGrants([]); });
    return () => { cancelled = true; };
  }, [accessProfile?.id]);

  const navigate = (screen: ScreenName, params?: any) => {
    // Gate de acesso por material: se a navegação abre uma coleção/material (detalhes
    // ou player) que NÃO está no voucher do usuário, exibimos o modal de upsell
    // (degustação) em vez de abrir o conteúdo. Admin/editor não têm grants → liberados.
    const targetCollectionId = params?.collectionId;
    const isCollectionContext = !!targetCollectionId
      && ([...PLAYER_SCREENS, 'home', 'search'] as ScreenName[]).includes(screen);
    if (isCollectionContext && !canAccessCollection(contentGrants, targetCollectionId)) {
      setUpsellCollectionId(targetCollectionId);
      return;
    }

    const normalizedScreen = screen === 'search' ? 'home' : screen;
    const normalizedParams = screen === 'search'
      ? {
        ...params,
        inlineSearch: true,
        focusSearch: params?.focusSearch ?? true,
      }
      : params;

    // Store previous state only when entering a player from a non-player screen.
    // If already inside a player (for example opening a related video), preserve
    // the original origin screen so Back exits the modal instead of looping players.
    if (PLAYER_SCREENS.includes(normalizedScreen) && !PLAYER_SCREENS.includes(navState.currentScreen)) {
      const newPreviousState = {
        screen: navState.currentScreen,
        params: navState.params,
      };
      setPreviousScreenState(newPreviousState);
      savePreviousState(newPreviousState);
    }

    const newNavState = normalizeNavState({
      currentScreen: normalizedScreen,
      adminModule: normalizedScreen === 'admin' ? getAdminModuleFromParams(normalizedParams) : undefined,
      params: normalizedParams,
    });
    setNavState(newNavState);
    saveNavState(newNavState);
    // Push history entry so browser Back button works
    history.pushState(buildHistoryState(newNavState), '', getHistoryUrlForNavState(newNavState));
    window.scrollTo(0, 0);
  };

  const setActiveAdminModule = (adminModule: AdminModule) => {
    setNavState((prev) => {
      if (prev.currentScreen !== 'admin') {
        return prev;
      }

      const nextState = normalizeNavState({
        currentScreen: 'admin',
        adminModule,
        params: prev.params,
      });

      if (prev.adminModule === nextState.adminModule && isHistoryUrlSynced(nextState)) {
        return prev;
      }

      saveNavState(nextState);
      history.replaceState(buildHistoryState(nextState), '', getHistoryUrlForNavState(nextState));
      return nextState;
    });
  };

  // Handle browser Back/Forward buttons via popstate
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const restoredNav = getNavStateFromHistoryState(event.state);

      if (restoredNav) {
        setNavState(restoredNav);
        saveNavState(restoredNav);
      } else {
        // No state — fallback to login/home
        const fallback: NavState = accessProfile
          ? { currentScreen: 'home' }
          : { currentScreen: getDefaultPublicScreen() };
        setNavState(fallback);
        saveNavState(fallback);
      }
    };

    window.addEventListener('popstate', handlePopState);

    const hashState = getNavStateFromHash();

    // Seed the current history entry on first load, respecting the explicit hash when present.
    if (!window.history.state || hashState) {
      const seededState = hashState ?? navState;
      history.replaceState(
        buildHistoryState(seededState),
        '',
        getHistoryUrlForNavState(seededState)
      );
    }

    return () => window.removeEventListener('popstate', handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessProfile]);

  useEffect(() => {
    const handleHashChange = () => {
      const hashState = getNavStateFromHash();
      if (!hashState) {
        return;
      }

      const nextState = getAccessibleStateForSession(hashState);

      setNavState((prev) => {
        if (areNavStatesEquivalent(prev, nextState) && isHistoryUrlSynced(nextState)) {
          return prev;
        }

        saveNavState(nextState);
        history.replaceState(
          buildHistoryState(nextState),
          '',
          getHistoryUrlForNavState(nextState)
        );
        if (areNavStatesEquivalent(prev, nextState)) {
          return prev;
        }

        return nextState;
      });
      window.scrollTo(0, 0);
    };

    window.addEventListener('hashchange', handleHashChange);

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [accessProfile, sessionChecked]);

  useEffect(() => {
    const hashState = getNavStateFromHash();
    if (!hashState) {
      return;
    }

    const nextState = getAccessibleStateForSession(hashState);

    if (
      areNavStatesEquivalent(navState, nextState)
      && isHistoryUrlSynced(nextState)
    ) {
      return;
    }

    setNavState((prev) => {
      if (areNavStatesEquivalent(prev, nextState) && isHistoryUrlSynced(nextState)) {
        return prev;
      }

      saveNavState(nextState);
      history.replaceState(
        buildHistoryState(nextState),
        '',
        getHistoryUrlForNavState(nextState)
      );

      return nextState;
    });
  }, [accessProfile, navState.currentScreen, navState.params, sessionChecked]);

  useEffect(() => {
    if (!sessionChecked) {
      return;
    }

    const explicitHashState = getNavStateFromHash();
    if (explicitHashState && !areNavStatesEquivalent(explicitHashState, resolvedNavState)) {
      return;
    }

    if (
      areNavStatesEquivalent(resolvedNavState, navState)
      && isHistoryUrlSynced(resolvedNavState)
    ) {
      return;
    }

    saveNavState(resolvedNavState);
    history.replaceState(
      buildHistoryState(resolvedNavState),
      '',
      getHistoryUrlForNavState(resolvedNavState)
    );

    if (!areNavStatesEquivalent(resolvedNavState, navState)) {
      setNavState(resolvedNavState);
    }
  }, [sessionChecked, resolvedNavState, navState]);

  const goBack = () => {
    if (PLAYER_SCREENS.includes(navState.currentScreen)) {
      const modalStackIds = Array.isArray(navState.params?.returnToModal?.stackIds)
        ? navState.params.returnToModal.stackIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
        : [];
      const canRestorePreviousScreen =
        !!previousScreenState
        && !PLAYER_SCREENS.includes(previousScreenState.screen);
      const canRestoreModal =
        modalStackIds.length > 0
        && previousScreenState
        && ['home', 'search'].includes(previousScreenState.screen);

      // Clear previousScreenState then use browser history so no duplicate entry is pushed
      setPreviousScreenState(null);
      savePreviousState(null);

      if (canRestoreModal) {
        const restoredNavState = {
          currentScreen: previousScreenState.screen,
          params: {
            ...(previousScreenState.params ?? {}),
            collectionId: modalStackIds[0],
            modalStackIds,
          },
        };

        setNavState(restoredNavState);
        saveNavState(restoredNavState);
        history.replaceState(
          buildHistoryState(restoredNavState),
          '',
          getHistoryUrlForNavState(restoredNavState)
        );
        window.scrollTo(0, 0);
        return;
      }

      if (canRestorePreviousScreen && previousScreenState) {
        const restoredNavState = {
          currentScreen: previousScreenState.screen,
          params: previousScreenState.params,
        };

        setNavState(restoredNavState);
        saveNavState(restoredNavState);
        history.replaceState(
          buildHistoryState(restoredNavState),
          '',
          getHistoryUrlForNavState(restoredNavState)
        );
        window.scrollTo(0, 0);
        return;
      }

      if (window.history.length > 1) {
        window.history.back();
      } else {
        navigate('home');
      }
    } else if (navState.currentScreen === 'my_data') {
      navigate('profile');
    } else if (['search', 'support', 'videos', 'music', 'formations', 'materials', 'profile'].includes(navState.currentScreen)) {
      navigate('home');
    } else {
      navigate('home');
    }
  };

  const closeModal = () => {
    setCurrentCollection(undefined);
    setPreviousScreenState(null);
    savePreviousState(null);
    // Clear the collectionId from params
    if (navState.params?.collectionId) {
      const {
        collectionId: _collectionId,
        modalStackIds: _modalStackIds,
        ...remainingParams
      } = navState.params;
      const newNavState = {
        ...navState,
        params: Object.keys(remainingParams).length > 0 ? remainingParams : undefined
      };
      setNavState(newNavState);
      saveNavState(newNavState);
      history.replaceState(
        buildHistoryState(newNavState),
        '',
        getHistoryUrlForNavState(newNavState)
      );
    }
  };

  if (!sessionChecked) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6">
        {brandLogoUrl ? (
          <img src={brandLogoUrl} alt={brandDisplayName} className="w-32 h-32 object-contain animate-pulse" />
        ) : (
          <div className="rounded-[28px] border border-gray-200 bg-white px-6 py-4 text-center text-lg font-black text-gray-800 shadow-sm animate-pulse">
            {brandDisplayName}
          </div>
        )}
        <div className="w-8 h-8 border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
      </div>
    );
  }

  const currentScreen = resolvedNavState.currentScreen;
  const currentParams = resolvedNavState.params;

  const renderScreen = () => {
    if (PROTECTED_SCREENS.includes(currentScreen) && accessProfile && isAccessBlocked(accessProfile)) {
      return (
        <AccessExpiredScreen
          profile={accessProfile}
          onNavigate={navigate}
          onAccessRecovered={(profile) => setAccessProfile(profile)}
        />
      );
    }

    switch (currentScreen) {
      case 'portal':
        return <PortalScreen />;

      case 'login':
        return (
          <LoginScreen
            onNavigate={navigate}
            onAuthSuccess={(profile) => setAccessProfile(profile)}
            brandSlug={brandSlug}
            brandLogoUrl={brandLogoUrl}
            brandName={brandDisplayName}
            backgroundImageUrl={brandLoginBackgroundUrl}
          />
        );

      case 'access_expired':
        return (
          <AccessExpiredScreen
            profile={accessProfile}
            onNavigate={navigate}
            onAccessRecovered={(profile) => setAccessProfile(profile)}
          />
        );

      case 'forgot_password':
        return (
          <ForgotPasswordScreen
            onNavigate={navigate}
            brandSlug={brandSlug}
            brandLogoUrl={brandLogoUrl}
            brandName={brandDisplayName}
            backgroundImageUrl={brandLoginBackgroundUrl}
          />
        );

      case 'set_password':
        return (
          <SetPasswordScreen
            onNavigate={navigate}
            onPasswordSet={() => navigate('login')}
            linkExpired={currentParams?.linkExpired === true}
            brandSlug={brandSlug}
            brandLogoUrl={brandLogoUrl}
            brandName={brandDisplayName}
            backgroundImageUrl={brandLoginBackgroundUrl}
          />
        );

      case 'email_confirmation':
        return (
          <EmailConfirmationScreen
            onNavigate={navigate}
            params={currentParams}
            brandSlug={brandSlug}
            brandLogoUrl={brandLogoUrl}
            brandName={brandDisplayName}
            backgroundImageUrl={brandLoginBackgroundUrl}
          />
        );

      case 'home':
        return <HomeScreen key="home-screen" onNavigate={navigate} params={currentParams} accessProfile={accessProfile} screenName="home" searchMode={Boolean(currentParams?.inlineSearch)} />;

      case 'search':
        return <HomeScreen key="search-home-screen" onNavigate={navigate} params={currentParams} accessProfile={accessProfile} screenName="home" searchMode />;

      case 'videos':
        return <LibraryHubScreen screen="videos" onNavigate={navigate} />;

      case 'music':
        return <LibraryHubScreen screen="music" onNavigate={navigate} />;

      case 'formations':
        return <LibraryHubScreen screen="formations" onNavigate={navigate} />;

      case 'materials':
        return <LibraryHubScreen screen="materials" onNavigate={navigate} />;

      case 'profile':
        return <ProfileScreen onNavigate={navigate} />;

      case 'my_data':
        return <MyDataScreen onBack={() => navigate('profile')} />;

      case 'player_audio': {
        // Mesmo padrão do player_video: fallback mínimo para itens do hub de biblioteca.
        const audioPlayerCollection = currentCollection ?? ({
          id: currentParams?.collectionId ?? '',
          title: currentParams?.assetTitle ?? '',
          cover_image: '',
          level: 'Educação Infantil',
        } as Collection);
        return (
          <AudioPlayerScreen
            collection={audioPlayerCollection}
            mediaItemId={currentParams?.mediaItemId}
            assetUrl={currentParams?.assetUrl}
            assetTitle={currentParams?.assetTitle}
            lyricsUrl={currentParams?.lyricsUrl}
            assetOfflineAvailable={currentParams?.assetOfflineAvailable}
            coverImage={currentParams?.coverImage as string | undefined}
            onNavigate={navigate}
            onBack={goBack}
          />
        );
      }

      case 'player_book':
        if (!currentCollection) {
          // Show loading while fetching collection - use collection theme color if available
          const themeColor = loadingCollectionTheme || '#5D1F58';
          const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result
              ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16),
              }
              : { r: 93, g: 31, b: 88 };
          };
          const rgb = hexToRgb(themeColor);
          const bgColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;

          return (
            <div className="flex items-center justify-center h-screen relative" style={{ backgroundColor: bgColor }}>
              {/* Dark overlay to darken background */}
              <div className="absolute inset-0 bg-black/10 z-0" />
              <div className="relative z-10 w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            </div>
          );
        }
        const themeColor = currentCollection?.color_theme || loadingCollectionTheme || '#5D1F58';
        const hexToRgbForSuspense = (hex: string) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result
            ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
            }
            : { r: 93, g: 31, b: 88 };
        };
        const rgbForSuspense = hexToRgbForSuspense(themeColor);
        const bgColorForSuspense = `rgb(${rgbForSuspense.r}, ${rgbForSuspense.g}, ${rgbForSuspense.b})`;

        return (
          <React.Suspense fallback={
            <div className="flex items-center justify-center h-screen relative" style={{ backgroundColor: bgColorForSuspense }}>
              {/* Dark overlay to darken background */}
              <div className="absolute inset-0 bg-black/10 z-0" />
              <div className="relative z-10 w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            </div>
          }>
            <BookReaderScreen
              collection={currentCollection}
              onBack={goBack}
              collectionTitle={currentParams?.collectionTitle as string | undefined}
              bookTitle={currentParams?.bookTitle as string | undefined}
            />
          </React.Suspense>
        );

      case 'player_video': {
        // Para itens standalone do hub de biblioteca, currentCollection pode ser null
        // porque FALLBACK_LIBRARY_COLLECTION_ID não aponta para uma collection real no BD.
        // Usamos um fallback mínimo — todos os dados reais vêm de assetUrl/mediaItemId.
        const videoPlayerCollection = currentCollection ?? ({
          id: currentParams?.collectionId ?? '',
          title: currentParams?.assetTitle ?? '',
          cover_image: '',
          level: 'Educação Infantil',
        } as Collection);
        return (
          <VideoPlayerScreen
            collection={videoPlayerCollection}
            mediaItemId={currentParams?.mediaItemId}
            assetUrl={currentParams?.assetUrl}
            assetTitle={currentParams?.assetTitle}
            assetOfflineAvailable={currentParams?.assetOfflineAvailable}
            onNavigate={navigate}
            onBack={goBack}
          />
        );
      }

      case 'tools':
        if (!currentCollection) {
          return (
            <div className="flex flex-col items-center justify-center h-screen bg-white">
              <div className="w-12 h-12 border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin mb-8" />
              <button onClick={goBack} className="text-gray-400 text-sm hover:text-gray-600 transition-colors">Voltar</button>
            </div>
          );
        }
        return <ExtraToolsScreen collection={currentCollection} onBack={goBack} />;

      case 'support':
        return (
          <div className="flex flex-col h-full bg-white pb-24 md:pb-0">
            <PageHeader title="Suporte" onBack={() => navigate('home')} />
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-2xl mx-auto">
              <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-brand-primary mb-6">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Precisa de ajuda?</h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Estamos aqui para ajudar você a ter a melhor experiência com o Mundo de Kaboo.
              </p>
              <a
                href="mailto:suporte@mundodekaboo.com"
                className="bg-brand-primary text-white px-8 py-4 rounded-2xl font-bold w-full md:w-auto shadow-lg hover:shadow-xl hover:bg-opacity-90 transition-all active:scale-95"
              >
                Fale Conosco
              </a>
            </div>
          </div>
        );

      case 'admin':
        return (
          <AdminScreen
            onNavigate={navigate}
            onBack={goBack}
            initialModule={resolvedNavState.adminModule ?? getAdminModuleFromParams(currentParams)}
            onModuleChange={setActiveAdminModule}
          />
        );

      case 'characters':
        return <CharactersScreen onNavigate={navigate} />;

      case 'design_system':
        return <DesignSystemScreen />;

      default:
        return <HomeScreen key="home-screen-default" onNavigate={navigate} screenName="home" />;
    }
  };

  const showNav = ['home', 'search', 'videos', 'music', 'formations', 'materials', 'support', 'profile', 'my_data', 'admin', 'characters'].includes(currentScreen);
  // Modal opens immediately when collectionId is present, even if collection is still loading
  const isModalOpen = !!currentParams?.collectionId && ['home', 'search'].includes(currentScreen);
  // Deep-link/restore para uma coleção fora do voucher: o detalhe não deve abrir;
  // mostramos o upsell. (Cliques in-app já são barrados no gate do navigate.)
  const lockedModalCollectionId = isModalOpen && currentParams?.collectionId
    && !canAccessCollection(contentGrants, currentParams.collectionId)
    ? (currentParams.collectionId as string)
    : null;
  const showUpsellModal = Boolean(upsellCollectionId || lockedModalCollectionId);
  const mainShellClassName = `relative w-full flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-white overscroll-none md:h-screen`;


  const appShellBg = showNav && brandSlug === 'central-coruja' ? 'bg-brand-primary' : 'bg-white';

  return (
    <div className={`flex h-[100dvh] min-h-[100dvh] w-full flex-col overflow-x-hidden md:h-auto md:min-h-screen md:flex-row ${appShellBg}`}>

      {showNav && (
        <BottomNav
          currentScreen={currentScreen}
          currentParams={currentParams}
          onNavigate={navigate}
          profile={accessProfile}
          brandSlug={brandSlug}
          brandLogoUrl={brandLogoUrl}
          brandName={brandDisplayName}
          enabledMenuKeys={brandEnabledMenuKeys}
        />
      )}

      <main className={mainShellClassName}>
        {renderScreen()}
      </main>

      {/* Collection Details Modal */}
      <CollectionModal
        collection={currentCollection || null}
        isOpen={isModalOpen && !lockedModalCollectionId}
        initialStackIds={Array.isArray(currentParams?.modalStackIds) ? currentParams.modalStackIds : undefined}
        onClose={closeModal}
        onNavigate={navigate}
      />

      {/* Upsell: material fora do voucher (degustação) → comprar na loja */}
      {showUpsellModal && (
        <VoucherUpsellModal
          storeUrl={brandBootstrap.settings.store_url || getVoucherUpsellStoreUrl(brandSlug)}
          onClose={() => {
            setUpsellCollectionId(null);
            if (lockedModalCollectionId) {
              closeModal();
            }
          }}
        />
      )}
    </div>
  );
};

export default App;

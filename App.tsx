import React, { useState, useEffect } from 'react';
import { NavState, ScreenName, Collection, UserProfile } from './types';
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
import { getProfileAccessStatus, isAccessBlocked } from './lib/access';
import { setActiveBrandForCharacters } from './lib/characters';
import { getAccessibleNavState, PROTECTED_SCREENS } from './lib/navigationAccess';
import { logger } from './lib/logger';
import { clearPendingPasswordSetup, hasPendingPasswordSetup, isInvitedAuthUser, markPendingPasswordSetup } from './lib/passwordSetupFlow';
import { setMockActiveBrand } from './lib/mockData';

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

const shouldPreservePublicEntryScreen = (screen: ScreenName): boolean => PUBLIC_ENTRY_SCREENS.has(screen);

const getHashScreen = (hash: string): ScreenName | null => {
  const rawHash = hash.replace(/^#/, '').trim();
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

const getNavStateFromHash = (): NavState | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const hashScreen = getHashScreen(window.location.hash);
  if (!hashScreen || PLAYER_SCREENS.includes(hashScreen)) {
    return null;
  }

  return { currentScreen: hashScreen };
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

const getHistoryUrlForScreen = (screen: ScreenName): string => {
  if (typeof window === 'undefined') {
    return screen === 'portal' ? '/' : `#${screen}`;
  }

  return screen === 'portal'
    ? `${window.location.pathname}${getPortalEntrySearch()}`
    : `#${screen}`;
};

const isHistoryUrlSynced = (screen: ScreenName): boolean => {
  if (typeof window === 'undefined') {
    return true;
  }

  if (screen === 'portal') {
    return window.location.hash === ''
      && `${window.location.pathname}${window.location.search}` === getHistoryUrlForScreen(screen);
  }

  return window.location.hash === getHistoryUrlForScreen(screen);
};

// Helper functions for localStorage persistence
const saveNavState = (state: NavState) => {
  try {
    localStorage.setItem(STORAGE_NAV_STATE, JSON.stringify(state));
  } catch (error) {
    logger.warn('Failed to save nav state to localStorage:', error);
  }
};

const loadNavState = (): NavState | null => {
  try {
    const saved = localStorage.getItem(STORAGE_NAV_STATE);
    if (saved) {
      return JSON.parse(saved) as NavState;
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
  useEffect(() => {
    setMockActiveBrand(brandSlug);
    setActiveBrandForApi(brandSlug);
    setActiveBrandForCharacters(brandSlug);
  }, [brandSlug]);

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
              return { currentScreen: 'home' };
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
              return { currentScreen: 'home' };
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

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      if (expiryTimeoutId !== null) {
        window.clearTimeout(expiryTimeoutId);
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

  const navigate = (screen: ScreenName, params?: any) => {
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
    const newNavState = { currentScreen: normalizedScreen, params: normalizedParams };
    setNavState(newNavState);
    saveNavState(newNavState);
    // Push history entry so browser Back button works
    history.pushState({ screen: normalizedScreen, params: normalizedParams }, '', getHistoryUrlForScreen(normalizedScreen));
    window.scrollTo(0, 0);
  };

  // Handle browser Back/Forward buttons via popstate
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.screen) {
        const { screen, params } = event.state as { screen: ScreenName; params?: any };
        const restoredNav = { currentScreen: screen, params };
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
        { screen: seededState.currentScreen, params: seededState.params },
        '',
        getHistoryUrlForScreen(seededState.currentScreen)
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
        if (
          prev.currentScreen === nextState.currentScreen
          && prev.params === undefined
          && isHistoryUrlSynced(nextState.currentScreen)
        ) {
          return prev;
        }

        saveNavState(nextState);
        history.replaceState(
          { screen: nextState.currentScreen, params: nextState.params },
          '',
          getHistoryUrlForScreen(nextState.currentScreen)
        );
        if (prev.currentScreen === nextState.currentScreen && prev.params === undefined) {
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
      navState.currentScreen === nextState.currentScreen
      && navState.params === undefined
      && isHistoryUrlSynced(nextState.currentScreen)
    ) {
      return;
    }

    setNavState((prev) => {
      if (
        prev.currentScreen === nextState.currentScreen
        && prev.params === undefined
        && isHistoryUrlSynced(nextState.currentScreen)
      ) {
        return prev;
      }

      saveNavState(nextState);
      history.replaceState(
        { screen: nextState.currentScreen, params: nextState.params },
        '',
        getHistoryUrlForScreen(nextState.currentScreen)
      );
      if (prev.currentScreen === nextState.currentScreen && prev.params === undefined) {
        return prev;
      }

      return nextState;
    });
  }, [accessProfile, navState.currentScreen, navState.params, sessionChecked]);

  useEffect(() => {
    if (!sessionChecked) {
      return;
    }

    if (resolvedNavState.currentScreen === navState.currentScreen && isHistoryUrlSynced(resolvedNavState.currentScreen)) {
      return;
    }

    saveNavState(resolvedNavState);
    history.replaceState(
      { screen: resolvedNavState.currentScreen, params: resolvedNavState.params },
      '',
      getHistoryUrlForScreen(resolvedNavState.currentScreen)
    );

    if (resolvedNavState.currentScreen !== navState.currentScreen) {
      setNavState(resolvedNavState);
    }
  }, [sessionChecked, resolvedNavState.currentScreen, resolvedNavState.params, navState.currentScreen]);

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
          { screen: restoredNavState.currentScreen, params: restoredNavState.params },
          '',
          getHistoryUrlForScreen(restoredNavState.currentScreen)
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
          { screen: restoredNavState.currentScreen, params: restoredNavState.params },
          '',
          getHistoryUrlForScreen(restoredNavState.currentScreen)
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
        { screen: newNavState.currentScreen, params: newNavState.params },
        '',
        getHistoryUrlForScreen(newNavState.currentScreen)
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
        <div className="w-8 h-8 border-4 border-kaboo-primary/30 border-t-kaboo-primary rounded-full animate-spin" />
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

      case 'player_audio':
        if (!currentCollection) {
          return (
            <div className="flex flex-col items-center justify-center h-screen bg-kaboo-primary/90">
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-8" />
              <button onClick={goBack} className="text-white/70 text-sm hover:text-white transition-colors">Voltar</button>
            </div>
          );
        }
        return (
          <AudioPlayerScreen
            collection={currentCollection}
            mediaItemId={currentParams?.mediaItemId}
            assetUrl={currentParams?.assetUrl}
            assetTitle={currentParams?.assetTitle}
            lyricsUrl={currentParams?.lyricsUrl}
            assetOfflineAvailable={currentParams?.assetOfflineAvailable}
            onNavigate={navigate}
            onBack={goBack}
          />
        );

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
            <BookReaderScreen collection={currentCollection} onBack={goBack} />
          </React.Suspense>
        );

      case 'player_video':
        if (!currentCollection) {
          return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-900">
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-8" />
              <button onClick={goBack} className="text-white/70 text-sm hover:text-white transition-colors">Voltar</button>
            </div>
          );
        }
        return (
          <VideoPlayerScreen
            collection={currentCollection}
            mediaItemId={currentParams?.mediaItemId}
            assetUrl={currentParams?.assetUrl}
            assetTitle={currentParams?.assetTitle}
            assetOfflineAvailable={currentParams?.assetOfflineAvailable}
            onNavigate={navigate}
            onBack={goBack}
          />
        );

      case 'tools':
        if (!currentCollection) {
          return (
            <div className="flex flex-col items-center justify-center h-screen bg-white">
              <div className="w-12 h-12 border-4 border-kaboo-primary/30 border-t-kaboo-primary rounded-full animate-spin mb-8" />
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
              <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-kaboo-primary mb-6">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Precisa de ajuda?</h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Estamos aqui para ajudar você a ter a melhor experiência com o Mundo de Kaboo.
              </p>
              <a
                href="mailto:suporte@mundodekaboo.com"
                className="bg-kaboo-primary text-white px-8 py-4 rounded-2xl font-bold w-full md:w-auto shadow-lg hover:shadow-xl hover:bg-opacity-90 transition-all active:scale-95"
              >
                Fale Conosco
              </a>
            </div>
          </div>
        );

      case 'admin':
        return <AdminScreen onNavigate={navigate} onBack={goBack} />;

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
  const mainShellClassName = `relative w-full flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-white overscroll-none md:h-screen`;


  const appShellBg = showNav && brandSlug === 'central-coruja' ? 'bg-[#0C1A34]' : 'bg-white';

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
        isOpen={isModalOpen}
        initialStackIds={Array.isArray(currentParams?.modalStackIds) ? currentParams.modalStackIds : undefined}
        onClose={closeModal}
        onNavigate={navigate}
      />
    </div>
  );
};

export default App;

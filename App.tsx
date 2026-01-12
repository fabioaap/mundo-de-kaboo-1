import React, { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { NavState, ScreenName, Collection } from './types';
import { api } from './lib/api';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { useThemeBackground } from './hooks/useThemeBackground';

// Screens
import { LoginScreen } from './screens/LoginScreen';
import { ForgotPasswordScreen } from './screens/ForgotPasswordScreen';
import { HomeScreen } from './screens/HomeScreen';
import { DetailsScreen } from './screens/DetailsScreen';
import { AudioPlayerScreen } from './screens/AudioPlayerScreen';
import { VideoPlayerScreen } from './screens/VideoPlayerScreen';
// Lazy load BookReaderScreen to avoid import errors blocking the app
const BookReaderScreen = React.lazy(() => import('./screens/BookReaderScreen').then(module => ({ default: module.BookReaderScreen })));
import { ExtraToolsScreen } from './screens/ExtraToolsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { MyDataScreen } from './screens/MyDataScreen';
import { SearchScreen } from './screens/SearchScreen';
import { EmailConfirmationScreen } from './screens/EmailConfirmationScreen';
import { AdminCollectionsScreen } from './screens/AdminCollectionsScreen';

// Components
import { BottomNav } from './components/BottomNav';
import { PageHeader } from './components/PageHeader';
import { CollectionModal } from './components/CollectionModal';

// Storage keys
const STORAGE_NAV_STATE = 'kaboo_nav_state';
const STORAGE_PREVIOUS_STATE = 'kaboo_previous_state';

// Helper functions for localStorage persistence
const saveNavState = (state: NavState) => {
  try {
    localStorage.setItem(STORAGE_NAV_STATE, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save nav state to localStorage:', error);
  }
};

const loadNavState = (): NavState | null => {
  try {
    const saved = localStorage.getItem(STORAGE_NAV_STATE);
    if (saved) {
      return JSON.parse(saved) as NavState;
    }
  } catch (error) {
    console.warn('Failed to load nav state from localStorage:', error);
  }
  return null;
};

const savePreviousState = (state: { screen: ScreenName; collectionId?: string } | null) => {
  try {
    if (state) {
      localStorage.setItem(STORAGE_PREVIOUS_STATE, JSON.stringify(state));
    } else {
      localStorage.removeItem(STORAGE_PREVIOUS_STATE);
    }
  } catch (error) {
    console.warn('Failed to save previous state to localStorage:', error);
  }
};

const loadPreviousState = (): { screen: ScreenName; collectionId?: string } | null => {
  try {
    const saved = localStorage.getItem(STORAGE_PREVIOUS_STATE);
    if (saved) {
      return JSON.parse(saved) as { screen: ScreenName; collectionId?: string };
    }
  } catch (error) {
    console.warn('Failed to load previous state from localStorage:', error);
  }
  return null;
};

const App: React.FC = () => {
  // Initialize state from localStorage if available
  const [navState, setNavState] = useState<NavState>(() => {
    const saved = loadNavState();
    if (saved) {
      // Don't restore player screens without collectionId - they'll be handled after session check
      if (['player_audio', 'player_book', 'player_video', 'tools'].includes(saved.currentScreen)) {
        if (!saved.params?.collectionId) {
          return { currentScreen: 'login' };
        }
      }
      // Don't restore login/forgot_password screens - let auth check handle it
      if (saved.currentScreen === 'login' || saved.currentScreen === 'forgot_password') {
        return { currentScreen: 'login' };
      }
      return saved;
    }
    return { currentScreen: 'login' };
  });
  const [sessionChecked, setSessionChecked] = useState(false);
  
  const [currentCollection, setCurrentCollection] = useState<Collection | undefined>(undefined);
  // Store previous screen and collectionId before navigating to player screens
  const [previousScreenState, setPreviousScreenState] = useState<{ screen: ScreenName; collectionId?: string } | null>(() => {
    return loadPreviousState();
  });
  // Store collection theme color for loading screen
  const [loadingCollectionTheme, setLoadingCollectionTheme] = useState<string | null>(null);
  
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
  const isPlayerScreen = ['player_audio', 'player_book', 'player_video', 'tools'].includes(navState.currentScreen);
  useEffect(() => {
    if (!isPlayerScreen) {
      // Reset to default white background for regular screens
      document.documentElement.style.backgroundColor = '#ffffff';
      document.body.style.backgroundColor = '#ffffff';
      const existingMeta = document.querySelector('meta[name="theme-color"]');
      if (existingMeta) {
        existingMeta.remove();
      }
    }
  }, [isPlayerScreen]);

  // Auth Listener
  useEffect(() => {
    // Check for confirmation URL parameter
    const params = new URLSearchParams(window.location.search);
    if (params.get('confirmation') === 'success') {
       setNavState({ currentScreen: 'email_confirmation' });
       setSessionChecked(true);
       return;
    }

    // Only check session if Supabase is configured
    if (!isSupabaseConfigured) {
      setSessionChecked(true);
      return;
    }

    // 1. Initial Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setNavState(prev => {
          // Preserve current screen if user is on any valid authenticated screen
          // Only redirect to home if on login/forgot_password screens
          if (prev.currentScreen === 'login' || prev.currentScreen === 'forgot_password') {
            return { currentScreen: 'home' };
          }
          // Preserve all other screens (home, search, profile, my_data, player screens, support, admin_collections, etc.)
          // If restoring a player screen, ensure collectionId is present
          if (['player_audio', 'player_book', 'player_video', 'tools'].includes(prev.currentScreen)) {
            if (!prev.params?.collectionId) {
              // If player screen but no collectionId, go to home
              return { currentScreen: 'home' };
            }
          }
          return prev;
        });
      } else {
        // No session - only preserve email_confirmation, otherwise go to login
        setNavState(prev => {
          if (prev.currentScreen === 'email_confirmation') {
            return prev;
          }
          return { currentScreen: 'login' };
        });
      }
      setSessionChecked(true);
    }).catch((error) => {
      console.error('Error checking session:', error);
      setSessionChecked(true);
    });

    // 2. Realtime Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setNavState(prev => {
           // Preserve current screen if user is on any valid authenticated screen
           // Only redirect to home if on login/forgot_password screens
           if (prev.currentScreen === 'login' || prev.currentScreen === 'forgot_password') {
             return { currentScreen: 'home' };
           }
           // Preserve all other screens (home, search, profile, my_data, player screens, support, admin_collections, email_confirmation, etc.)
           return prev;
        });
      } else if (event === 'SIGNED_OUT' || !session) {
        setNavState(prev => {
          // Preserve email_confirmation screen even when signed out
          if (prev.currentScreen === 'email_confirmation') {
            return prev;
          }
          // Clear saved state on logout (except email_confirmation)
          localStorage.removeItem(STORAGE_NAV_STATE);
          localStorage.removeItem(STORAGE_PREVIOUS_STATE);
          // Redirect to login for all other screens when signed out
          return { currentScreen: 'login' };
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch collection details when an ID is passed in params
  useEffect(() => {
    if (navState.params?.collectionId) {
      // Fetch collection for modal (home/search) or player screens
      if (['home', 'search', 'player_audio', 'player_book', 'player_video', 'tools'].includes(navState.currentScreen)) {
        // First, fetch just the theme color for loading screen
        api.getCollectionById(navState.params.collectionId).then(data => {
          if (data) {
            console.log('📦 App: Fetched collection for', navState.currentScreen, data);
            setCurrentCollection(data);
            setLoadingCollectionTheme(data.color_theme || '#5D1F58');
          } else {
            console.warn('⚠️ App: Collection not found for ID:', navState.params.collectionId);
            setLoadingCollectionTheme('#5D1F58'); // Default color
          }
        }).catch(error => {
          console.error('❌ App: Error fetching collection:', error);
          setLoadingCollectionTheme('#5D1F58'); // Default color on error
        });
      }
    } else {
      // Only clear collection when explicitly navigating away from player screens
      if (!['player_audio', 'player_book', 'player_video', 'tools'].includes(navState.currentScreen)) {
        setCurrentCollection(undefined);
        setLoadingCollectionTheme(null);
      }
    }
  }, [navState.params?.collectionId, navState.currentScreen]);

  const navigate = (screen: ScreenName, params?: any) => {
    // Store previous state before navigating to player screens
    if (['player_audio', 'player_book', 'player_video', 'tools'].includes(screen)) {
      const newPreviousState = {
        screen: navState.currentScreen,
        collectionId: navState.params?.collectionId
      };
      setPreviousScreenState(newPreviousState);
      savePreviousState(newPreviousState);
    }
    const newNavState = { currentScreen: screen, params };
    setNavState(newNavState);
    saveNavState(newNavState);
    window.scrollTo(0, 0);
  };

  const goBack = () => {
    if (['player_audio', 'player_book', 'player_video', 'tools'].includes(navState.currentScreen)) {
        // Return to previous screen and restore the collection modal
        if (previousScreenState) {
          navigate(previousScreenState.screen, {
            collectionId: previousScreenState.collectionId
          });
          setPreviousScreenState(null);
        } else {
          // Fallback: return to home
          navigate('home');
        }
    } else if (navState.currentScreen === 'my_data') {
        navigate('profile');
    } else if (navState.currentScreen === 'search' || navState.currentScreen === 'support' || navState.currentScreen === 'profile') {
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
      const newNavState = {
        ...navState,
        params: { ...navState.params, collectionId: undefined }
      };
      setNavState(newNavState);
      saveNavState(newNavState);
    }
  };

  if (!sessionChecked) {
    return <div className="min-h-screen bg-white flex items-center justify-center text-kaboo-primary font-bold">Carregando...</div>;
  }

  const renderScreen = () => {
    switch (navState.currentScreen) {
      case 'login':
        return <LoginScreen onNavigate={navigate} />;
      
      case 'forgot_password':
        return <ForgotPasswordScreen onNavigate={navigate} />;

      case 'email_confirmation':
        return <EmailConfirmationScreen onNavigate={navigate} />;

      case 'home':
        return <HomeScreen onNavigate={navigate} params={navState.params} />;
      
      case 'search':
        return <SearchScreen onNavigate={navigate} params={navState.params} />;
      
      case 'profile':
        return <ProfileScreen onNavigate={navigate} />;
        
      case 'my_data':
        return <MyDataScreen onBack={() => navigate('profile')} />;
      
      // Details screen removed - now using modal
      
      case 'player_audio':
        if (!currentCollection) return null;
        return <AudioPlayerScreen collection={currentCollection} onBack={goBack} />;

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
         if (!currentCollection) return null;
         return <VideoPlayerScreen collection={currentCollection} onBack={goBack} />;

      case 'tools':
        if (!currentCollection) return null;
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

      case 'admin_collections':
        return <AdminCollectionsScreen onNavigate={navigate} onBack={goBack} />;

      default:
        return <HomeScreen onNavigate={navigate} />;
    }
  };

  const showNav = ['home', 'search', 'support', 'profile', 'my_data', 'admin_collections'].includes(navState.currentScreen);
  // Modal opens immediately when collectionId is present, even if collection is still loading
  const isModalOpen = !!navState.params?.collectionId && ['home', 'search'].includes(navState.currentScreen);

  return (
    <div className="bg-white min-h-screen w-full flex flex-col md:flex-row overflow-hidden">
      
      {showNav && (
        <BottomNav currentScreen={navState.currentScreen} onNavigate={navigate} />
      )}

      <main className={`flex-1 overflow-hidden relative h-screen w-full bg-white`}>
          {renderScreen()}
      </main>

      {/* Collection Details Modal */}
      <CollectionModal
        collection={currentCollection || null}
        isOpen={isModalOpen}
        onClose={closeModal}
        onNavigate={navigate}
      />

      <Analytics />
    </div>
  );
};

export default App;
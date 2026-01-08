import React, { useState, useEffect } from 'react';
import { NavState, ScreenName, Collection } from './types';
import { api } from './lib/api';
import { supabase, isSupabaseConfigured } from './lib/supabase';

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

const App: React.FC = () => {
  const [navState, setNavState] = useState<NavState>({
    currentScreen: 'login'
  });
  const [sessionChecked, setSessionChecked] = useState(false);
  
  const [currentCollection, setCurrentCollection] = useState<Collection | undefined>(undefined);
  // Store previous screen and collectionId before navigating to player screens
  const [previousScreenState, setPreviousScreenState] = useState<{ screen: ScreenName; collectionId?: string } | null>(null);

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
        setNavState({ currentScreen: 'home' });
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
           if (prev.currentScreen === 'home') return prev;
           if (prev.currentScreen === 'email_confirmation') return prev;
           return { currentScreen: 'home' };
        });
      } else if (event === 'SIGNED_OUT' || !session) {
        setNavState(prev => prev.currentScreen === 'email_confirmation' ? prev : { currentScreen: 'login' });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch collection details when an ID is passed in params
  useEffect(() => {
    if (navState.params?.collectionId) {
      // Fetch collection for modal (home/search) or player screens
      if (['home', 'search', 'player_audio', 'player_book', 'player_video', 'tools'].includes(navState.currentScreen)) {
        api.getCollectionById(navState.params.collectionId).then(data => {
          if (data) {
            console.log('📦 App: Fetched collection for', navState.currentScreen, data);
            setCurrentCollection(data);
          } else {
            console.warn('⚠️ App: Collection not found for ID:', navState.params.collectionId);
          }
        }).catch(error => {
          console.error('❌ App: Error fetching collection:', error);
        });
      }
    } else {
      // Only clear collection when explicitly navigating away from player screens
      if (!['player_audio', 'player_book', 'player_video', 'tools'].includes(navState.currentScreen)) {
        setCurrentCollection(undefined);
      }
    }
  }, [navState.params?.collectionId, navState.currentScreen]);

  const navigate = (screen: ScreenName, params?: any) => {
    // Store previous state before navigating to player screens
    if (['player_audio', 'player_book', 'player_video', 'tools'].includes(screen)) {
      setPreviousScreenState({
        screen: navState.currentScreen,
        collectionId: navState.params?.collectionId
      });
    }
    setNavState({ currentScreen: screen, params });
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
    // Clear the collectionId from params
    if (navState.params?.collectionId) {
      setNavState(prev => ({
        ...prev,
        params: { ...prev.params, collectionId: undefined }
      }));
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
          // Show loading while fetching collection
          return (
            <div className="flex items-center justify-center h-screen bg-white">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-kaboo-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-kaboo-primary font-bold">Carregando livro...</p>
                <p className="text-xs text-gray-500 mt-2">collectionId: {navState.params?.collectionId || 'não fornecido'}</p>
              </div>
            </div>
          );
        }
        return (
          <React.Suspense fallback={<div className="flex items-center justify-center h-screen bg-white"><div className="w-12 h-12 border-4 border-kaboo-primary border-t-transparent rounded-full animate-spin"></div></div>}>
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
  const isModalOpen = !!currentCollection && navState.params?.collectionId && ['home', 'search'].includes(navState.currentScreen);

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
    </div>
  );
};

export default App;
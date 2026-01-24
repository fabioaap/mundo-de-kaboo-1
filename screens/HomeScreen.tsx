import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Icons } from '../components/Icons';
import { Collection, ScreenName, UserProfile } from '../types';
import { api, clearCollectionsCache, getCachedCollectionsSync } from '../lib/api';
import { supabase } from '../lib/supabase';
import { getUserRole } from '../lib/auth';
import { TABS, LOGO_URL, getCharacterImageUrl, getCharacterColor, getCharacterBgColor } from '../constants';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { Card3D } from '../components/Card3D';
import useIsMobile from '../hooks/useIsMobile';
// @ts-ignore
import confetti from 'canvas-confetti';

interface HomeScreenProps {
  onNavigate: (screen: ScreenName, params?: any) => void;
  params?: any;
}

// Define filter types
interface FilterState {
  characters: string[];
  bncc: string[];
  casel: string[];
  age: string[];
}

const INITIAL_FILTERS: FilterState = {
  characters: [],
  bncc: [],
  casel: [],
  age: []
};

// Grid View Component - Responsive grid with multiple breakpoints
interface GridViewProps {
  collections: (Collection & { progress?: number })[];
  onCollectionClick: (collection: Collection) => void;
}

const GridView: React.FC<GridViewProps> = ({ collections, onCollectionClick }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6 auto-rows-fr">
      {collections.map((collection) => (
        <div key={collection.id} className="w-full">
          <Card3D
            collection={collection}
            onCollectionClick={onCollectionClick}
          />
        </div>
      ))}
    </div>
  );
};

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate, params }) => {
  // Initialize collections from cache if available
  const cachedCollections = getCachedCollectionsSync();
  
  // Data State
  const [collections, setCollections] = useState<Collection[]>(cachedCollections || []);
  const [userProgress, setUserProgress] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<string>('all');
  // Only show loading if we don't have cached data
  const [loading, setLoading] = useState(!cachedCollections);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter State
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterState>(INITIAL_FILTERS);

  // User Profile State for Header
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>('viewer');

  // Welcome Modal State
  const [showWelcome, setShowWelcome] = useState(false);
  const [isClosingWelcome, setIsClosingWelcome] = useState(false);
  
  // Confetti Refs
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);
  const confettiInstance = useRef<any>(null);
  const [canvasReady, setCanvasReady] = useState(false);

  useEffect(() => {
    // Only load data if we don't have cached collections
    // If we have cache, load in background to check for updates, but don't show loading
    if (!cachedCollections) {
      loadData(false, true); // Show loading if no cache
    } else {
      // Load data in background to check for updates silently
      // This ensures we have the latest data but doesn't show loading state
      loadData(false, false); // Don't show loading if we have cache
    }
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for params changes (specifically for new user registration)
  useEffect(() => {
    if (params?.isNewUser) {
        setShowWelcome(true);
        setCanvasReady(false); // Reset canvas ready state
    }
  }, [params]);

  // Reset canvas ready when modal closes
  useEffect(() => {
    if (!showWelcome) {
      setCanvasReady(false);
    }
  }, [showWelcome]);

  // Update canvas dimensions when window resizes
  useEffect(() => {
    const updateCanvasSize = () => {
      if (confettiCanvasRef.current && showWelcome) {
        confettiCanvasRef.current.width = window.innerWidth;
        confettiCanvasRef.current.height = window.innerHeight;
      }
    };

    if (showWelcome) {
      updateCanvasSize();
      window.addEventListener('resize', updateCanvasSize);
    }

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [showWelcome]);

  // Effect to handle confetti when modal opens
  useEffect(() => {
    let interval: any;

    if (showWelcome && !isClosingWelcome && canvasReady && confettiCanvasRef.current) {
      try {
        // Create confetti instance with the canvas
        if (!confettiInstance.current) {
          confettiInstance.current = confetti.create(confettiCanvasRef.current, {
            resize: true,
            useWorker: false
          });
        }

        const colors = [
          '#5D1F58', '#883E82', '#4EA8DE', '#70E000', '#FFD166', 
          '#FF595E', '#FFCA3A', '#8AC926', '#1982C4', '#6A4C93', '#F72585', '#4CC9F0' 
        ];

        const fireConfetti = () => {
          if (isClosingWelcome || !showWelcome || !confettiInstance.current) {
            if (interval) clearInterval(interval);
            return;
          }

          try {
            confettiInstance.current({
                particleCount: 3,
                angle: 60,
                spread: 55,
                origin: { x: 0, y: 0.35 },
                colors: colors,
                gravity: 0.8, 
                scalar: 1.1,
                drift: 0,
                ticks: 300,
                startVelocity: 45,
                disableForReducedMotion: true,
            });

            confettiInstance.current({
                particleCount: 3,
                angle: 120,
                spread: 55,
                origin: { x: 1, y: 0.35 },
                colors: colors,
                gravity: 0.8,
                scalar: 1.1,
                drift: 0,
                ticks: 300,
                startVelocity: 45,
                disableForReducedMotion: true,
            });

            if (Math.random() > 0.6) {
                confettiInstance.current({
                    particleCount: 8,
                    angle: 90,
                    spread: 120,
                    origin: { x: 0.5, y: 0.4 },
                    colors: colors,
                    gravity: 1,
                    scalar: 0.8,
                    drift: 0,
                    ticks: 200,
                    startVelocity: 30,
                    disableForReducedMotion: true,
                });
            }
          } catch (err) {
             console.error('Confetti error:', err);
          }
        };

        // Start firing confetti
        fireConfetti();
        interval = setInterval(fireConfetti, 50);
      } catch (err) {
        console.error('Failed to create confetti:', err);
      }
    }

    // Stop confetti when closing
    if (isClosingWelcome) {
      if (interval) clearInterval(interval);
      if (confettiInstance.current) {
        try {
          confettiInstance.current.reset();
        } catch (e) {
          console.error('Error resetting confetti:', e);
        }
      }
    }

    return () => {
        if (interval) clearInterval(interval);
        if (!showWelcome && confettiInstance.current) {
            try {
                confettiInstance.current.reset();
            } catch (e) {
              console.error('Error resetting confetti on cleanup:', e);
            }
            confettiInstance.current = null;
        }
    };
  }, [showWelcome, isClosingWelcome, canvasReady]);

  const handleCloseWelcome = () => {
    setIsClosingWelcome(true);
    setTimeout(() => {
        setShowWelcome(false);
        setIsClosingWelcome(false);
    }, 300);
  };

  const loadData = async (forceRefresh: boolean = false, showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const [cols, prog] = await Promise.all([
        api.getCollections(forceRefresh),
        api.getUserProgress()
      ]);
      setCollections(cols);
      setUserProgress(prog);
    } catch (e) {
      console.error(e);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    clearCollectionsCache();
    await loadData(true, true); // Force refresh and show loading
  };

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const role = await getUserRole();
        setUserRole(role);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        
        if (data) {
          setProfile(data);
        } else {
          // Profile doesn't exist, create it from auth metadata
          const profileData = {
            id: user.id,
            full_name: user.user_metadata?.full_name || 'Professor(a)',
            school_name: user.user_metadata?.school_name || null,
            email: user.email || null,
            avatar_id: null,
            role: 'viewer' as const,
            updated_at: new Date().toISOString()
          };
          
          // Try to create profile (non-blocking)
          const { error: createError } = await supabase
            .from('profiles')
            .insert(profileData);
          
          if (createError) {
            console.error('Error creating profile on load:', createError);
            // Still set profile locally even if DB insert fails
          }
          
          setProfile(profileData);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const getInitials = (name: string) => {
    if (!name) return 'P';
    return name.trim().split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const getFirstName = (name: string) => {
    if (!name) return 'Professor(a)';
    return name.trim().split(' ')[0];
  };

  const availableOptions = useMemo(() => {
    const opts = {
      characters: new Set<string>(),
      bncc: new Set<string>(),
      casel: new Set<string>(),
      age: new Set<string>()
    };

    collections.forEach(c => {
      c.characters?.forEach(x => opts.characters.add(x));
      c.bncc_skills?.forEach(x => opts.bncc.add(x));
      c.casel_competencies?.forEach(x => opts.casel.add(x));
      c.age_grade?.forEach(x => opts.age.add(x));
    });

    const AGE_ORDER = ['3 anos', '4 anos', '5 anos', '1º ano', '2º ano', '3º ano', '4º ano', '5º ano'];

    return {
      characters: Array.from(opts.characters).sort(),
      bncc: Array.from(opts.bncc).sort(),
      casel: Array.from(opts.casel).sort(),
      age: Array.from(opts.age).sort((a, b) => {
        const indexA = AGE_ORDER.indexOf(a);
        const indexB = AGE_ORDER.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b, undefined, { numeric: true });
      }),
    };
  }, [collections]);

  const filteredCollections = useMemo(() => {
    // Explicitly casting the mapped result to ensure correct type inference for filteredCollections
    return (collections.map(c => ({
        ...c,
        progress: userProgress[c.id] || undefined
      })) as (Collection & { progress?: number })[]).filter(c => {
        if (activeTab === 'fund1' && c.level !== 'Educação Infantil') return false;
        if (activeTab === 'fund2' && c.level !== 'Fundamental I') return false;

        if (activeFilters.characters.length > 0) {
          const hasChar = c.characters?.some(char => activeFilters.characters.includes(char));
          if (!hasChar) return false;
        }

        if (activeFilters.bncc.length > 0) {
          const hasBncc = c.bncc_skills?.some(skill => activeFilters.bncc.includes(skill));
          if (!hasBncc) return false;
        }

        if (activeFilters.casel.length > 0) {
          const hasCasel = c.casel_competencies?.some(comp => activeFilters.casel.includes(comp));
          if (!hasCasel) return false;
        }

        if (activeFilters.age.length > 0) {
          const hasAge = c.age_grade?.some(age => activeFilters.age.includes(age));
          if (!hasAge) return false;
        }

        return true;
      });
  }, [collections, userProgress, activeTab, activeFilters]);

  const inProgressCollections = collections.filter(c => (userProgress[c.id] || 0) > 0);

  const handleCollectionClick = (collection: Collection) => {
    // Open modal instead of navigating to details screen - stay on current screen
    onNavigate('home', { collectionId: collection.id });
  };

  const toggleFilter = (category: keyof FilterState, value: string) => {
    setActiveFilters(prev => {
      const current = prev[category];
      const exists = current.includes(value);
      return {
        ...prev,
        [category]: exists 
          ? current.filter(item => item !== value)
          : [...current, value]
      };
    });
  };

  // Fixed type inference by casting Object.values results to string[][]
  const activeFilterCount = (Object.values(activeFilters) as string[][]).reduce((acc, curr) => acc + curr.length, 0);

  const animationKey = `${activeTab}-${JSON.stringify(activeFilters)}`;

  const ProfileHeaderSection = () => {
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsDropdownOpen(false);
        }
      };

      if (isDropdownOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isDropdownOpen]);

    if (!profile) return null;

    const hasAvatar = !!profile.avatar_id;
    const charColor = getCharacterColor(profile.avatar_id);

    return (
      <div className="relative" ref={dropdownRef}>
        <button 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-4 focus:outline-none group"
        >
          <div className="text-right hidden lg:block">
            <p className="text-sm font-bold text-gray-800">
              Olá, {getFirstName(profile.full_name || '')}
            </p>
            <p className="text-xs text-gray-400 font-medium truncate max-w-[150px]">
              {profile.school_name || 'Escola não definida'}
            </p>
            {(userRole === 'admin' || userRole === 'editor') && (
              <div className="mt-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  userRole === 'admin' 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {userRole === 'admin' ? 'Admin' : 'Editor'}
                </span>
              </div>
            )}
          </div>
          
          <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shadow-md ring-4 ring-transparent group-hover:ring-kaboo-primary/10 transition-all overflow-hidden relative border border-gray-100 ${hasAvatar ? charColor : 'bg-kaboo-primary text-white'}`}>
            {hasAvatar ? (
               <>
                 <div className={`absolute inset-0 opacity-50 ${getCharacterBgColor(profile.avatar_id)} pointer-events-none`} />
                 <img 
                   src={getCharacterImageUrl(profile.avatar_id!)} 
                   alt="Avatar"
                   className="w-full h-full object-cover relative z-10"
                   onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement?.classList.remove('bg-red-100', 'text-red-600'); 
                      e.currentTarget.parentElement?.classList.add('bg-kaboo-primary', 'text-white');
                      const span = document.createElement('span');
                      span.innerText = getInitials(profile.full_name || '');
                      e.currentTarget.parentElement?.appendChild(span);
                   }}
                 />
               </>
            ) : (
                getInitials(profile.full_name || '')
            )}
          </div>
        </button>

        {isDropdownOpen && (
          <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50 animate-fade-in-up origin-top-right">
            <div className="lg:hidden px-4 py-3 border-b border-gray-100 mb-2">
               <p className="text-sm font-bold text-gray-800">{profile.full_name}</p>
               <p className="text-xs text-gray-400">{profile.school_name}</p>
            </div>
            <button onClick={() => { setIsDropdownOpen(false); onNavigate('my_data'); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 text-gray-700 transition-colors text-sm font-bold text-left"><Icons.User size={18} className="text-gray-400" /> Meus Dados</button>
            <button onClick={() => { setIsDropdownOpen(false); onNavigate('support'); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 text-gray-700 transition-colors text-sm font-bold text-left"><Icons.HelpCircle size={18} className="text-gray-400" /> Suporte</button>
            <div className="h-px bg-gray-100 my-1" />
            <button onClick={() => { setIsDropdownOpen(false); handleLogout(); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 text-red-500 transition-colors text-sm font-bold text-left"><Icons.LogOut size={18} /> Sair</button>
          </div>
        )}
      </div>
    );
  };

  const FilterModal = () => (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFilters(false)} />
      
      <div className="relative w-full md:w-[600px] h-[85vh] md:h-[80vh] bg-white rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
        
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-kaboo-primary/10 flex items-center justify-center text-kaboo-primary">
                <Icons.Filter size={20} />
             </div>
             <div>
                <h2 className="text-lg font-black text-gray-800">Filtros</h2>
                <p className="text-xs text-gray-400 font-medium">Refine sua busca</p>
             </div>
          </div>
          <button 
            onClick={() => setShowFilters(false)}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
          >
            <Icons.X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
          
          {availableOptions.characters.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Icons.User size={14} /> Personagens
              </h3>
              <div className="flex flex-wrap gap-2">
                {availableOptions.characters.map(char => {
                  const isActive = activeFilters.characters.includes(char);
                  return (
                    <button
                      key={char}
                      onClick={() => toggleFilter('characters', char)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all active:scale-95 ${
                        isActive 
                          ? 'bg-kaboo-primary text-white border-kaboo-primary shadow-md shadow-kaboo-primary/20' 
                          : 'bg-white text-gray-600 border-gray-200 hover:border-kaboo-primary/30'
                      }`}
                    >
                      {char}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

           {availableOptions.age.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Icons.Grid size={14} /> Idade-Série
              </h3>
              <div className="flex flex-wrap gap-2">
                {availableOptions.age.map(age => {
                  const isActive = activeFilters.age.includes(age);
                  return (
                    <button
                      key={age}
                      onClick={() => toggleFilter('age', age)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all active:scale-95 ${
                        isActive 
                          ? 'bg-teal-500 text-white border-teal-500 shadow-md shadow-teal-500/20' 
                          : 'bg-white text-gray-600 border-gray-200 hover:border-teal-500/30'
                      }`}
                    >
                      {age}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {availableOptions.bncc.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Icons.BookOpen size={14} /> Habilidades BNCC
              </h3>
              <div className="flex flex-wrap gap-2">
                {availableOptions.bncc.map(item => {
                  const isActive = activeFilters.bncc.includes(item);
                  return (
                    <button
                      key={item}
                      onClick={() => toggleFilter('bncc', item)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all active:scale-95 text-left leading-tight ${
                        isActive 
                          ? 'bg-green-500 text-white border-green-500 shadow-md shadow-green-500/20' 
                          : 'bg-white text-gray-600 border-gray-200 hover:border-green-500/30'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {availableOptions.casel.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Icons.Book size={14} /> Competências CASEL
              </h3>
              <div className="flex flex-wrap gap-2">
                {availableOptions.casel.map(item => {
                  const isActive = activeFilters.casel.includes(item);
                  return (
                    <button
                      key={item}
                      onClick={() => toggleFilter('casel', item)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all active:scale-95 text-left ${
                        isActive 
                          ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20' 
                          : 'bg-white text-gray-600 border-gray-200 hover:border-orange-500/30'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <div className="h-10" /> 
        </div>

        <div className="p-4 border-t border-gray-100 bg-white shrink-0 flex gap-4">
           <button 
             onClick={() => setActiveFilters(INITIAL_FILTERS)}
             className="px-6 py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
           >
             Limpar
           </button>
           <Button 
             fullWidth 
             onClick={() => setShowFilters(false)}
           >
             <Icons.Check size={20} />
             Ver {filteredCollections.length} resultados
           </Button>
        </div>

      </div>
    </div>
  );

  // Skeleton loader component
  const HomeScreenSkeleton = () => (
    <div className="flex flex-col h-full bg-white md:pb-0 relative" style={{ height: '100vh', minHeight: '100vh' }}>
      <div className="flex flex-col flex-1 min-h-0" style={{ height: '100%', minHeight: 0, flex: '1 1 0%' }}>
        
        {/* MOBILE HEADER SKELETON */}
        <div className="md:hidden px-6 py-4 flex justify-between items-center shrink-0 bg-white z-30 border-b border-gray-50">
          <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
          <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
        </div>

        {/* DESKTOP HEADER SKELETON */}
        <div className="hidden md:block shrink-0 px-8 pt-6 pb-4">
          <div className="flex justify-between items-center">
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="flex items-center gap-4">
              <div className="h-8 w-40 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-11 h-11 rounded-full bg-gray-200 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* TABS AND FILTERS SKELETON */}
        <div className="px-6 md:px-8 mb-4 mt-2 flex items-center justify-between gap-4 shrink-0">
          <div className="flex gap-3 flex-1">
            <div className="h-10 w-24 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="h-10 w-32 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="h-10 w-32 bg-gray-200 rounded-full animate-pulse"></div>
          </div>
          <div className="h-11 w-20 bg-gray-200 rounded-2xl animate-pulse"></div>
        </div>

        {/* CONTENT AREA SKELETON */}
        <div className="px-6 md:px-8 pt-2 md:pt-6 pb-6 flex-1 flex flex-col min-h-0">
          {/* TITLE AND COUNT SKELETON */}
          <div className="flex justify-between items-end mb-0 md:mb-4 shrink-0 pb-4 border-b border-gray-100">
            <div className="h-7 w-48 bg-gray-200 rounded animate-pulse"></div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-8 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="w-7 h-7 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>
          
          {/* GRID SKELETON */}
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="w-full animate-pulse">
                  <div className="mb-3 rounded-lg overflow-hidden relative bg-gray-200 aspect-square"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
     return <HomeScreenSkeleton />;
  }

  return (
    <div className="flex flex-col h-full bg-white md:pb-0 relative" style={{ height: '100vh', minHeight: '100vh' }}>
      <div className="flex flex-col flex-1 min-h-0" style={{ height: '100%', minHeight: 0, flex: '1 1 0%' }}>
        
        {/* MOBILE HEADER: Fixed background color, reduced padding, no top margin */}
        <div className="md:hidden px-6 py-4 flex justify-between items-center shrink-0 bg-white z-30 transition-all border-b border-gray-50">
          <div className="flex items-center gap-2">
             <button onClick={() => onNavigate('home')}>
               <img src={LOGO_URL} alt="KABOO" className="h-10 w-auto object-contain" />
             </button>
          </div>
          <button 
            onClick={() => onNavigate('profile')} 
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors overflow-hidden border border-gray-100 relative ${!!profile?.avatar_id ? getCharacterColor(profile?.avatar_id) : 'bg-gray-100 text-kaboo-primary hover:bg-kaboo-primary/10'}`}
          >
             {profile?.avatar_id ? (
                <>
                 <div className={`absolute inset-0 rounded-full opacity-50 ${getCharacterBgColor(profile.avatar_id)} pointer-events-none z-0`} />
                 <img 
                   src={getCharacterImageUrl(profile.avatar_id)} 
                   alt="Avatar" 
                   className="w-full h-full object-cover relative z-10"
                   onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} 
                 />
                </>
             ) : (
                <Icons.User size={20} strokeWidth={2.5} />
             )}
          </button>
        </div>

        <div className="hidden md:block shrink-0">
           <PageHeader title="Coleções" className="!pb-4" rightContent={<ProfileHeaderSection />} />
        </div>

        <div className="px-6 md:px-8 mb-4 mt-2 flex items-center justify-between gap-4 relative z-0 shrink-0">
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 flex-1">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all active:scale-95 flex items-center gap-2 border ${
                    isActive 
                      ? 'bg-kaboo-primary text-white border-kaboo-primary shadow-md shadow-kaboo-primary/20' 
                      : 'bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100'
                  }`}
                >
                  {tab.id === 'all' && <Icons.Grid size={14} />}
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="relative pb-2">
            <button
                onClick={() => setShowFilters(true)}
                className={`h-11 px-4 rounded-2xl flex items-center gap-2 border transition-all active:scale-95 shadow-sm ${
                    activeFilterCount > 0 
                    ? 'bg-kaboo-primary text-white border-kaboo-primary shadow-kaboo-primary/20' 
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
                title="Filtros Avançados"
            >
                <Icons.Filter size={20} strokeWidth={activeFilterCount > 0 ? 2.5 : 2} />
                <span className="font-bold text-sm hidden md:inline-block">Filtros</span>
                {activeFilterCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                        {activeFilterCount}
                    </div>
                )}
            </button>
          </div>
        </div>

        {activeFilterCount > 0 && (
            <div className="px-6 md:px-8 mb-4 flex gap-2 flex-wrap animate-fade-in-up shrink-0">
                 {activeFilters.characters.map(f => (
                    <span key={f} onClick={() => toggleFilter('characters', f)} className="cursor-pointer px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center gap-2 hover:bg-red-50 hover:text-red-500 transition-colors group">
                        {f} <Icons.X size={12} className="group-hover:scale-110"/>
                    </span>
                 ))}
                 {activeFilters.bncc.map(f => (
                    <span key={f} onClick={() => toggleFilter('bncc', f)} className="cursor-pointer px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold flex items-center gap-2 hover:bg-red-50 hover:text-red-500 transition-colors group">
                        {f} <Icons.X size={12} className="group-hover:scale-110"/>
                    </span>
                 ))}
                 {activeFilters.casel.map(f => (
                    <span key={f} onClick={() => toggleFilter('casel', f)} className="cursor-pointer px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-bold flex items-center gap-2 hover:bg-red-50 hover:text-red-500 transition-colors group">
                        {f} <Icons.X size={12} className="group-hover:scale-110"/>
                    </span>
                 ))}
                  {activeFilters.age.map(f => (
                    <span key={f} onClick={() => toggleFilter('age', f)} className="cursor-pointer px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-bold flex items-center gap-2 hover:bg-red-50 hover:text-red-500 transition-colors group">
                        {f} <Icons.X size={12} className="group-hover:scale-110"/>
                    </span>
                 ))}
                 <button onClick={() => setActiveFilters(INITIAL_FILTERS)} className="text-xs font-bold text-kaboo-primary hover:underline ml-1">
                    Limpar tudo
                 </button>
            </div>
        )}

        {inProgressCollections.length > 0 && activeFilterCount === 0 && (
          <div className="mb-4 shrink-0">
            <h2 className="px-6 md:px-8 text-xl font-bold text-gray-800 mb-4">Continue onde parou</h2>
            <div className="flex gap-4 overflow-x-auto px-6 md:px-8 pb-6 no-scrollbar snap-x snap-mandatory">
              {inProgressCollections.map((c) => {
                const progress = userProgress[c.id] || 0;
                return (
                <div 
                  key={c.id} 
                  onClick={() => handleCollectionClick(c)}
                  className="flex-shrink-0 w-64 bg-white rounded-2xl shadow-lg shadow-gray-100/50 p-3 border border-gray-50 snap-center cursor-pointer active:scale-95 transition-transform hover:border-kaboo-primary/30"
                >
                  <div className="flex gap-4">
                    <img src={c.cover_image} alt={c.title} className="w-20 h-20 rounded-xl object-cover shadow-sm bg-gray-200" />
                    <div className="flex-1 py-1">
                      <h3 className="font-bold text-gray-800 text-sm leading-tight line-clamp-2 mb-2">{c.title}</h3>
                    </div>
                  </div>
                  <div className="mt-3 px-1">
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-kaboo-primary rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </div>
              )})}
            </div>
          </div>
        )}

        <div className="px-6 md:px-8 pt-2 md:pt-6 pb-6 flex-1 flex flex-col min-h-0" style={{ minHeight: 0 }}>
          <div className="flex justify-between items-end mb-0 md:mb-4 shrink-0 pb-4 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-800">
                {activeTab === 'all' && activeFilterCount === 0 ? 'Todas as Coleções' : 
                 activeFilterCount > 0 ? 'Resultados filtrados' :
                 activeTab === 'fund1' ? 'Educação Infantil' : 'Fundamental I'}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                  {filteredCollections.length}
              </span>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing || loading}
                className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-gray-100 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                title="Atualizar coleções"
              >
                <Icons.RotateCw 
                  size={14} 
                  className={`text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} 
                />
              </button>
            </div>
          </div>
          
          {filteredCollections.length > 0 ? (
            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar" style={{ minHeight: 0 }}>
              <GridView
                key={animationKey}
                collections={filteredCollections}
                onCollectionClick={handleCollectionClick}
              />
            </div>
          ) : (
            <div className="py-20 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                    <Icons.Search size={32} />
                </div>
                <h3 className="text-gray-800 font-bold mb-2">Nenhum item encontrado</h3>
                <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">
                    Não encontramos resultados para a combinação de filtros selecionada.
                </p>
                <button 
                    onClick={() => setActiveFilters(INITIAL_FILTERS)}
                    className="px-6 py-3 bg-kaboo-primary/10 text-kaboo-primary rounded-xl font-bold hover:bg-kaboo-primary/20 transition-colors"
                >
                    Limpar filtros
                </button>
            </div>
          )}
        </div>
      </div>

      {showFilters && <FilterModal />}
      
      {showWelcome && (
        <div 
           className={`fixed inset-0 z-[70] flex items-center justify-center p-4 transition-all duration-300 ease-in-out ${isClosingWelcome ? 'opacity-0' : 'opacity-100'}`}
        >
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out" onClick={handleCloseWelcome}></div>
           
           <canvas 
             ref={(node) => {
               confettiCanvasRef.current = node;
               if (node && showWelcome) {
                 // Set dimensions
                 node.width = window.innerWidth;
                 node.height = window.innerHeight;
                 // Mark canvas as ready
                 setTimeout(() => setCanvasReady(true), 50);
               } else if (!showWelcome) {
                 setCanvasReady(false);
               }
             }}
             className={`absolute inset-0 w-full h-full pointer-events-none z-[75] transition-opacity duration-300 ease-in-out ${isClosingWelcome ? 'opacity-0' : 'opacity-100'}`}
             style={{ display: 'block' }}
           />
   
           <div className={`bg-white rounded-3xl p-8 w-full max-w-sm text-center relative z-[80] shadow-2xl transform transition-all duration-300 ease-in-out ${isClosingWelcome ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>
               <div className="mb-6 flex justify-center">
                    <img src={LOGO_URL} alt="Mundo de Kaboo" className="w-40 h-auto" />
               </div>
               <h2 className="text-2xl font-black text-kaboo-primary mb-2">
                   Olá, {getFirstName(profile?.full_name || '')}!
               </h2>
               <p className="text-gray-600 mb-8 leading-relaxed">
                   Estamos muito felizes em ter você aqui. Explore nossas coleções e divirta-se ensinando!
               </p>
               <Button fullWidth onClick={handleCloseWelcome}>
                   Começar a Explorar
               </Button>
           </div>
        </div>
      )}
    </div>
  );
};
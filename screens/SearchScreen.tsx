import React, { useState, useEffect } from 'react';
import { Icons } from '../components/Icons';
import { api } from '../lib/api';
import { ScreenName, Collection } from '../types';
import { PageHeader } from '../components/PageHeader';
import { CharacterAvatar } from '../components/CharacterAvatar';
import { layoutSpacing } from '../design-system/layout/spacing';

interface SearchScreenProps {
  onNavigate: (screen: ScreenName, params?: any) => void;
  params?: any;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({ onNavigate, params }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Derived state for Browse sections
  const [allCharacters, setAllCharacters] = useState<string[]>([]);
  const [allCaselCompetencies, setAllCaselCompetencies] = useState<string[]>([]);

  useEffect(() => {
    if (params?.query) {
      setSearchTerm(params.query);
    }
  }, [params]);
  
  useEffect(() => {
    // Fetch all collections on mount to allow instant filtering and tag extraction
    api.getCollections()
      .then(data => {
        setCollections(data);
        extractTags(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Não foi possível carregar o acervo. Verifique sua conexão e tente novamente.');
        setLoading(false);
      });
  }, []);

  const extractTags = (data: Collection[]) => {
    const characters = new Set<string>();
    const casel = new Set<string>();

    data.forEach(c => {
      c.characters?.forEach(char => {
        if (char) characters.add(char.trim());
      });
      c.casel_competencies?.forEach(comp => {
        if (comp) casel.add(comp.trim());
      });
    });

    setAllCharacters(Array.from(characters).sort());
    setAllCaselCompetencies(Array.from(casel).sort());
  };

  // Helper to normalize strings (remove accents, lowercase) for SEARCH logic
  const normalizeSearch = (str: string) => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  };

  // Derived filtered list with robust matching
  const filteredCollections = searchTerm 
    ? collections.filter(c => {
        const term = normalizeSearch(searchTerm);
        
        // Basic fields
        const title = normalizeSearch(c.title);
        
        // Pedagogical fields
        const theme = normalizeSearch(c.theme || '');
        const objectives = normalizeSearch(c.learning_objectives || '');
        const characters = c.characters ? c.characters.map(t => normalizeSearch(t)).join(' ') : '';
        const bncc = c.bncc_skills ? c.bncc_skills.map(t => normalizeSearch(t)).join(' ') : '';
        const casel = c.casel_competencies ? c.casel_competencies.map(t => normalizeSearch(t)).join(' ') : '';
        const ageGrade = c.age_grade ? c.age_grade.map(t => normalizeSearch(t)).join(' ') : '';

        return title.includes(term) || 
               theme.includes(term) ||
               objectives.includes(term) ||
               characters.includes(term) ||
               bncc.includes(term) ||
               casel.includes(term) ||
               ageGrade.includes(term);
      })
    : [];

  return (
    <div className="flex flex-col h-full bg-white pb-24 md:pb-0">
      
      {/* Standard Header with Back to Home */}
      <PageHeader title="Buscar" onBack={() => onNavigate('home')} />

      {/* Search Input Area */}
      <div className={`${layoutSpacing.pageSection} bg-white z-10 shadow-sm shadow-gray-50`}>
        <div className="relative max-w-3xl">
          <input 
            type="text" 
            placeholder="Título, BNCC, personagem, competência..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-100 border-none rounded-2xl py-4 pl-12 pr-10 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all font-medium"
            autoFocus
          />
          <Icons.Search className="absolute left-4 top-4 text-gray-400" size={20} />
          {searchTerm && (
            <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
                <Icons.X size={20} /> 
            </button>
          )}
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto ${layoutSpacing.pageContent} no-scrollbar`}>
        {loading ? (
           <div className="text-center py-10 text-gray-400">Carregando acervo...</div>
        ) : error ? (
          <div className="text-center py-10 text-red-500">{error}</div>
        ) : searchTerm ? (
          /* Results List -> Grid on Desktop */
          <div className="space-y-4 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                {filteredCollections.length} {filteredCollections.length === 1 ? 'Resultado encontrado' : 'Resultados encontrados'}
            </h2>
            
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${layoutSpacing.cardGridGap}`}>
                {filteredCollections.map((collection) => (
                <div 
                    key={collection.id}
                    onClick={() => onNavigate('search', { collectionId: collection.id })}
                    className="flex gap-4 p-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-kaboo-primary/20 transition-all active:scale-98 cursor-pointer h-full"
                >
                    <img 
                    src={collection.cover_image} 
                    alt={collection.title}
                    className="w-16 h-16 rounded-xl object-cover bg-gray-200 shrink-0"
                    />
                    <div className="flex-1 flex flex-col justify-center">
                        <h3 className="font-bold text-gray-800 text-sm mb-1 leading-tight">{collection.title}</h3>
                        <div className="flex mt-1 gap-1 flex-wrap">
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md font-bold uppercase">
                            {collection.level}
                        </span>
                        {/* Show a matched BNCC skill as a badge if found in search */}
                        {searchTerm && collection.bncc_skills?.some(s => normalizeSearch(s).includes(normalizeSearch(searchTerm))) && (
                            <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-md font-bold uppercase">
                                BNCC
                            </span>
                        )}
                        </div>
                    </div>
                    <div className="flex items-center text-gray-300">
                    <Icons.ChevronLeft className="rotate-180" size={20} />
                    </div>
                </div>
                ))}
            </div>
            
            {filteredCollections.length === 0 && (
                <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                        <Icons.Search size={32} />
                    </div>
                    <p className="text-gray-600 font-bold">Nenhum resultado encontrado</p>
                    <p className="text-sm text-gray-400 mt-1">Tente buscar por outras palavras-chave.</p>
                </div>
            )}
          </div>
        ) : (
          /* Default View: Characters & CASEL Suggestions */
          <div className="pt-6 animate-in fade-in duration-500">
            
            {/* Navegar por Personagens */}
            <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
               <Icons.User size={20} className="text-kaboo-primary" />
               Personagens
            </h2>
            
            {allCharacters.length > 0 ? (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                    {allCharacters.map((char) => (
                        <button 
                            key={char}
                            className="flex flex-col items-center gap-2 group"
                            onClick={() => setSearchTerm(char)}
                        >
                            <CharacterAvatar
                              name={char}
                              className="w-20 h-20 md:w-24 md:h-24 rounded-full shadow-md group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 border-2 border-white"
                              imageClassName="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 relative z-10"
                              initialClassName="absolute inset-0 flex items-center justify-center font-black text-2xl text-white/80"
                            />
                            <span className="text-xs md:text-sm font-bold text-gray-600 text-center leading-tight group-hover:text-kaboo-primary transition-colors">
                                {char}
                            </span>
                        </button>
                    ))}
                </div>
            ) : (
                <p className="text-gray-400 text-sm italic mb-4">Nenhum personagem encontrado.</p>
            )}

            {/* Sugestões (Competências CASEL) */}
            <h2 className="text-lg font-bold text-gray-800 mt-8 mb-4 flex items-center gap-2">
                <Icons.BookOpen size={20} className="text-orange-500" />
                Competências CASEL
            </h2>
            
            {allCaselCompetencies.length > 0 ? (
                <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 lg:grid-cols-3">
                    {allCaselCompetencies.map(term => (
                        <button 
                            key={term}
                            className="flex items-center gap-3 w-full p-3 rounded-xl bg-orange-50 text-orange-700 font-medium hover:bg-orange-100 transition-colors border border-orange-100"
                            onClick={() => setSearchTerm(term)}
                        >
                            <Icons.Search size={16} className="text-orange-400" />
                            {term}
                        </button>
                    ))}
                </div>
            ) : (
                <p className="text-gray-400 text-sm italic">Nenhuma competência cadastrada.</p>
            )}
            
          </div>
        )}
      </div>
    </div>
  );
};

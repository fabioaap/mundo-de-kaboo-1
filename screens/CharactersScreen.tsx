import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Character, ScreenName } from '../types';
import { getCharacterColor } from '../constants';
import { CharacterAvatar } from '../components/CharacterAvatar';
import { PageHeader } from '../components/PageHeader';

interface CharactersScreenProps {
  onNavigate: (screen: ScreenName, params?: any) => void;
}

export const CharactersScreen: React.FC<CharactersScreenProps> = ({ onNavigate }) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    api.getCharacters()
      .then((data) => {
        if (!isMounted) {
          return;
        }

        setCharacters(data.filter((character) => (character.status || 'active') === 'active'));
      })
      .catch((error) => {
        console.error('Error loading characters page:', error);
        if (isMounted) {
          setCharacters([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-white pb-24 md:pb-0">
      <PageHeader title="Personagens" onBack={() => onNavigate('home')} />

      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        <p className="text-gray-500 text-sm mb-6 text-center max-w-lg mx-auto">
          Conheça os personagens do Mundo de Kaboo e descubra suas coleções.
        </p>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : characters.length === 0 ? (
          <div className="max-w-xl mx-auto rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
            <p className="text-gray-600 font-bold">Nenhum personagem ativo disponível.</p>
            <p className="text-sm text-gray-500 mt-2">Cadastre personagens no módulo administrativo para alimentá-los aqui.</p>
          </div>
        ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {characters.map((char) => {
            const colorClasses = getCharacterColor(char.name);
            const bgClass = colorClasses.split(' ').find(c => c.startsWith('bg-')) || 'bg-gray-100';
            const textClass = colorClasses.split(' ').find(c => c.startsWith('text-')) || 'text-gray-600';
            return (
              <button
                key={char.name}
                onClick={() => onNavigate('home', { filterCharacter: char.name })}
                className="group flex flex-col items-center text-center rounded-2xl p-4 transition-all duration-200 hover:scale-[1.03] active:scale-95 bg-white border border-gray-100 shadow-sm hover:shadow-md"
              >
                {/* Avatar */}
                <CharacterAvatar
                  name={char.name}
                  className={`w-20 h-20 md:w-24 md:h-24 rounded-xl mb-3 ring-2 ring-white shadow-sm ${bgClass}`}
                  imageClassName="relative z-10 w-full h-full object-cover"
                  initialClassName="absolute inset-0 flex items-center justify-center text-2xl font-black text-white/80"
                />

                {/* Name */}
                <h3 className={`font-bold text-sm md:text-base ${textClass} mb-1`}>
                  {char.name}
                </h3>

                {/* Description */}
                <p className="text-gray-500 text-xs leading-snug mb-3 line-clamp-2">
                  {char.description}
                </p>

                {/* Traits */}
                <div className="flex flex-wrap justify-center gap-1">
                  {char.traits.map((trait) => (
                    <span
                      key={trait}
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${bgClass} ${textClass} opacity-80`}
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
};

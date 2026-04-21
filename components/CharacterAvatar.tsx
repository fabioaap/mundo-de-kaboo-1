import React, { useEffect, useState } from 'react';
import { getCharacterBgColor, getCharacterColor, getCharacterImageUrl } from '../constants';

interface CharacterAvatarProps {
  name: string;
  className?: string;
  imageClassName?: string;
  initialClassName?: string;
  alt?: string;
  loading?: 'eager' | 'lazy';
}

export const CharacterAvatar: React.FC<CharacterAvatarProps> = ({
  name,
  className = '',
  imageClassName = 'relative z-10 h-full w-full object-cover',
  initialClassName = 'absolute inset-0 flex items-center justify-center text-sm font-black uppercase text-current',
  alt,
  loading = 'lazy',
}) => {
  const normalizedName = name?.trim() || '?';
  const imageUrl = getCharacterImageUrl(normalizedName);
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [imageUrl, normalizedName]);

  const showInitial = !imageUrl || hasImageError;

  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${getCharacterColor(normalizedName)} ${className}`.trim()}>
      <span className={`absolute inset-0 ${getCharacterBgColor(normalizedName)} opacity-70`} />
      {showInitial && (
        <span className={initialClassName}>
          {normalizedName.charAt(0).toUpperCase()}
        </span>
      )}
      {!!imageUrl && !hasImageError && (
        <img
          src={imageUrl}
          alt={alt ?? normalizedName}
          className={imageClassName}
          loading={loading}
          onError={() => setHasImageError(true)}
        />
      )}
    </div>
  );
};
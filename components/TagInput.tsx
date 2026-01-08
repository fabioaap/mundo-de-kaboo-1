import React, { useState, KeyboardEvent } from 'react';
import { Icons } from './Icons';

interface TagInputProps {
  label: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export const TagInput: React.FC<TagInputProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Digite e pressione Enter para adicionar'
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      const trimmedValue = inputValue.trim();
      if (!value.includes(trimmedValue)) {
        onChange([...value, trimmedValue]);
        setInputValue('');
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  const handleAddClick = () => {
    if (inputValue.trim() && !value.includes(inputValue.trim())) {
      onChange([...value, inputValue.trim()]);
      setInputValue('');
    }
  };

  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">
        {label}
      </label>
      
      {/* Tags Display */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-3 py-1 bg-kaboo-primary/10 text-kaboo-primary rounded-full text-sm font-bold"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="hover:bg-kaboo-primary/20 rounded-full p-0.5 transition-colors"
                aria-label={`Remover ${tag}`}
              >
                <Icons.X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input Field */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-gray-50 border-none rounded-2xl p-4 text-gray-800 focus:ring-2 focus:ring-kaboo-primary outline-none"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={handleAddClick}
          disabled={!inputValue.trim() || value.includes(inputValue.trim())}
          className="px-4 py-2 bg-kaboo-primary text-white rounded-2xl font-bold hover:bg-opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Adicionar tag"
        >
          <Icons.Plus size={20} />
        </button>
      </div>
    </div>
  );
};

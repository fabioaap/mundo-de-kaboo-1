import React, { useState, KeyboardEvent } from 'react'
import { X, Plus } from '../primitives/Icons'

export interface TagInputProps {
  label: string
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

export const TagInput: React.FC<TagInputProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Digite e pressione Enter para adicionar',
}) => {
  const [inputValue, setInputValue] = useState('')

  const addTag = (tag: string) => {
    const trimmed = tag.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
      setInputValue('')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); addTag(inputValue) }
  }

  const removeTag = (tag: string) => onChange(value.filter(t => t !== tag))

  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">{label}</label>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((tag, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-kaboo-primary/10 text-kaboo-primary rounded-full text-sm font-bold">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:bg-kaboo-primary/20 rounded-full p-0.5 transition-colors"
                aria-label={`Remover ${tag}`}
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-gray-50 border-none rounded-2xl p-4 text-gray-800 focus:ring-2 focus:ring-kaboo-primary outline-none"
        />
        <button
          type="button"
          onClick={() => addTag(inputValue)}
          disabled={!inputValue.trim() || value.includes(inputValue.trim())}
          className="px-4 py-2 bg-kaboo-primary text-white rounded-2xl font-bold hover:bg-opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Adicionar tag"
        >
          <Plus size={20} />
        </button>
      </div>
    </div>
  )
}

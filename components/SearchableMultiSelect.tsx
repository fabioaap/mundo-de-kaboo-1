import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './Icons';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  group?: string;
}

interface SearchableMultiSelectProps {
  label: string;
  options: SelectOption[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

export const SearchableMultiSelect: React.FC<SearchableMultiSelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  searchPlaceholder = 'Pesquisar...',
  emptyMessage = 'Nenhuma opção encontrada.',
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
    } else {
      setSearch('');
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter((opt) => {
    const q = search.toLowerCase();
    return (
      opt.value.toLowerCase().includes(q) ||
      opt.label.toLowerCase().includes(q) ||
      (opt.description?.toLowerCase().includes(q) ?? false)
    );
  });

  // Group items if they have a group property
  const hasGroups = options.some((o) => o.group);
  const groups: { name: string; items: SelectOption[] }[] = [];
  if (hasGroups) {
    const groupMap = new Map<string, SelectOption[]>();
    filtered.forEach((opt) => {
      const g = opt.group || 'Outros';
      if (!groupMap.has(g)) groupMap.set(g, []);
      groupMap.get(g)!.push(opt);
    });
    groupMap.forEach((items, name) => groups.push({ name, items }));
  }

  const toggle = (val: string) => {
    if (value.includes(val)) {
      onChange(value.filter((v) => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  const removeTag = (val: string) => onChange(value.filter((v) => v !== val));

  const getLabel = (val: string) => options.find((o) => o.value === val)?.label ?? val;

  const renderOptions = (items: SelectOption[]) =>
    items.map((opt) => {
      const selected = value.includes(opt.value);
      return (
        <button
          key={opt.value}
          type="button"
          onClick={() => toggle(opt.value)}
          className={`w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${
            selected ? 'bg-brand-primary/8 text-brand-primary' : 'hover:bg-gray-50 text-gray-800'
          }`}
        >
          <span
            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
              selected
                ? 'border-brand-primary bg-brand-primary text-white'
                : 'border-gray-300 bg-white'
            }`}
          >
            {selected && <Icons.Check size={11} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold leading-snug">{opt.label}</span>
            {opt.description && (
              <span className="block text-xs text-gray-500 leading-snug mt-0.5">{opt.description}</span>
            )}
          </span>
        </button>
      );
    });

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-bold text-gray-700 mb-2">{label}</label>

      {/* Selected tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((val) => (
            <span
              key={val}
              className="inline-flex items-center gap-1 rounded-full bg-brand-primary/10 px-2.5 py-1 text-xs font-bold text-brand-primary"
            >
              {getLabel(val)}
              <button
                type="button"
                onClick={() => removeTag(val)}
                className="rounded-full p-0.5 hover:bg-brand-primary/20 transition-colors"
                aria-label={`Remover ${getLabel(val)}`}
              >
                <Icons.X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-2xl bg-gray-50 px-4 py-3.5 text-sm text-gray-500 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary"
      >
        <span>{value.length > 0 ? `${value.length} selecionado${value.length > 1 ? 's' : ''}` : placeholder}</span>
        <Icons.ChevronDown size={16} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
          {/* Search input */}
          <div className="border-b border-gray-100 px-3 py-2.5">
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
              <Icons.Search size={14} className="shrink-0 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
                  <Icons.X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-56 overflow-y-auto px-2 py-2">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">{emptyMessage}</p>
            ) : hasGroups ? (
              groups.map(({ name, items }) => (
                <div key={name}>
                  <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">{name}</p>
                  {renderOptions(items)}
                </div>
              ))
            ) : (
              renderOptions(filtered)
            )}
          </div>

          {/* Footer: clear selection */}
          {value.length > 0 && (
            <div className="border-t border-gray-100 px-3 py-2">
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Limpar seleção ({value.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

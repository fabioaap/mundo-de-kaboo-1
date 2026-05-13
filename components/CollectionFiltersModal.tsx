import React from 'react';
import { Button } from '../design-system';
import { CharacterAvatar } from './CharacterAvatar';
import { Icons } from './Icons';
import { layoutSpacing } from '../design-system/layout/spacing';

export interface CollectionFilterState {
    characters: string[];
    bncc: string[];
    casel: string[];
    age: string[];
}

export interface CollectionFilterOptions {
    characters: string[];
    bncc: string[];
    casel: string[];
    age: string[];
}

type FilterCategory = keyof CollectionFilterState;
type CollectionFiltersTone = 'default' | 'central-coruja';

interface CollectionFiltersModalProps {
    availableOptions: CollectionFilterOptions;
    activeFilters: CollectionFilterState;
    onToggleFilter: (category: FilterCategory, value: string) => void;
    onClear: () => void;
    onClose: () => void;
    resultsCount: number;
    tone?: CollectionFiltersTone;
    onOpenBncc?: () => void;
    onPrepareCharacter?: (character: string) => void;
    sectionRefHandlers?: Partial<Record<FilterCategory, (node: HTMLDivElement | null) => void>>;
}

interface CharacterFilterButtonProps {
    character: string;
    isActive: boolean;
    tone?: CollectionFiltersTone;
    onClick: () => void;
    onPrepare?: () => void;
}

interface BnccSummaryEntryProps {
    selectedCodes: string[];
    onOpen?: () => void;
    tone?: CollectionFiltersTone;
}

const formatBnccSelectionLabel = (count: number) => {
    if (count === 0) {
        return 'Nenhuma selecionada';
    }

    return `${count} ${count === 1 ? 'habilidade selecionada' : 'habilidades selecionadas'}`;
};

const CharacterFilterButton: React.FC<CharacterFilterButtonProps> = ({
    character,
    isActive,
    tone = 'default',
    onClick,
    onPrepare,
}) => {
    const isCorujaTone = tone === 'central-coruja';

    return (
        <button
            type="button"
            onClick={onClick}
            onMouseEnter={onPrepare}
            onFocus={onPrepare}
            className={`inline-flex min-h-12 items-center gap-2 rounded-full border px-2.5 py-2 pr-3 text-sm font-bold leading-none transition-all duration-200 ease-out active:scale-[0.98] ${isActive
                ? (isCorujaTone
                    ? 'border-[#d7c1f3] bg-[#f6efff] text-[#5D1E76] shadow-[0_10px_24px_rgba(93,30,118,0.14)]'
                    : 'border-kaboo-primary/30 bg-kaboo-primary/[0.08] text-kaboo-primary shadow-[0_10px_24px_rgba(111,37,108,0.12)]')
                : (isCorujaTone
                    ? 'border-[#dde4f1] bg-white text-[#0C1A34] hover:border-[#5D1E76]/25 hover:bg-[#faf6ff]'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-kaboo-primary/25 hover:bg-kaboo-primary/[0.03]')
                }`}
        >
            <CharacterAvatar
                name={character}
                className="h-8 w-8 shrink-0 rounded-full border border-white/80 shadow-sm"
                imageClassName="relative z-10 h-full w-full object-cover"
                initialClassName="absolute inset-0 flex items-center justify-center text-[11px] font-black uppercase text-current"
            />
            <span className="whitespace-nowrap">{character}</span>
        </button>
    );
};

const BnccSummaryEntry: React.FC<BnccSummaryEntryProps> = ({ selectedCodes, onOpen, tone = 'default' }) => {
    const isCorujaTone = tone === 'central-coruja';
    const previewCodes = selectedCodes.slice(0, 2);
    const extraCount = selectedCodes.length - previewCodes.length;

    return (
        <button
            type="button"
            onClick={onOpen}
            aria-haspopup="dialog"
            className={`w-full rounded-[24px] border p-4 text-left transition-all duration-200 active:scale-[0.99] ${isCorujaTone
                ? 'border-[#eadff8] bg-[#fffdfd] hover:border-[#EA9A3B]/35 hover:bg-[#fff8ef]'
                : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/40'
                }`}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className={`flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] ${isCorujaTone ? 'text-[#5D1E76]' : 'text-gray-400'}`}>
                        <Icons.BookOpen size={14} />
                        Habilidades BNCC
                    </div>
                    <p className={`mt-2 text-sm leading-relaxed ${isCorujaTone ? 'text-[#4D5974]' : 'text-gray-500'}`}>
                        Procure por código, descrição ou componente.
                    </p>
                    <p className={`mt-3 text-sm font-bold ${selectedCodes.length > 0
                        ? (isCorujaTone ? 'text-[#5D1E76]' : 'text-green-700')
                        : (isCorujaTone ? 'text-[#243A60]' : 'text-gray-600')
                        }`}>
                        {formatBnccSelectionLabel(selectedCodes.length)}
                    </p>
                    {selectedCodes.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {previewCodes.map((code) => (
                                <span
                                    key={code}
                                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${isCorujaTone
                                        ? 'bg-[#f6efff] text-[#5D1E76]'
                                        : 'bg-green-100 text-green-700'
                                        }`}
                                >
                                    {code}
                                </span>
                            ))}
                            {extraCount > 0 && (
                                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-gray-500">
                                    +{extraCount}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] ${isCorujaTone
                    ? 'border-[#f1d0a4] bg-[#fff5e7] text-[#EA9A3B]'
                    : 'border-green-200 bg-green-50 text-green-700'
                    }`}>
                    Abrir
                    <Icons.ChevronLeft className="rotate-180" size={14} />
                </span>
            </div>
        </button>
    );
};

export const CollectionFiltersModal: React.FC<CollectionFiltersModalProps> = ({
    availableOptions,
    activeFilters,
    onToggleFilter,
    onClear,
    onClose,
    resultsCount,
    tone = 'default',
    onOpenBncc,
    onPrepareCharacter,
    sectionRefHandlers,
}) => {
    const isCorujaTone = tone === 'central-coruja';

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className={`relative w-full md:w-[600px] h-[85vh] md:h-[80vh] rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up ${isCorujaTone ? 'border border-[#eadff8] bg-[#fcf9ff]' : 'bg-white'}`}>
                <div className={`${layoutSpacing.modalHeader} border-b flex items-center justify-between shrink-0 ${isCorujaTone ? 'border-[#eee5fa] bg-[linear-gradient(180deg,#fffdfd_0%,#fcf9ff_100%)]' : 'border-gray-100 bg-white'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCorujaTone ? 'bg-[#f6efff] text-[#5D1E76]' : 'bg-kaboo-primary/10 text-kaboo-primary'}`}>
                            <Icons.Filter size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-gray-800">Filtros</h2>
                            <p className={`text-xs font-medium ${isCorujaTone ? 'text-[#67728A]' : 'text-gray-400'}`}>Refine sua busca</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isCorujaTone ? 'bg-white text-[#5D1E76] hover:bg-[#f6efff]' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        aria-label="Fechar filtros"
                    >
                        <Icons.X size={16} />
                    </button>
                </div>

                <div className={`flex-1 overflow-y-auto ${layoutSpacing.modalBody} space-y-8 no-scrollbar`}>
                    <section className="space-y-1">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Filtros rápidos</p>
                        <p className="text-sm text-gray-500">Use os atalhos abaixo para refinar o acervo sem sair da home.</p>
                    </section>

                    {availableOptions.characters.length > 0 && (
                        <section ref={sectionRefHandlers?.characters}>
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                                <Icons.User size={14} /> Personagens
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {availableOptions.characters.map((character) => {
                                    const isActive = activeFilters.characters.includes(character);

                                    return (
                                        <CharacterFilterButton
                                            key={character}
                                            character={character}
                                            isActive={isActive}
                                            tone={tone}
                                            onClick={() => onToggleFilter('characters', character)}
                                            onPrepare={() => onPrepareCharacter?.(character)}
                                        />
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {availableOptions.age.length > 0 && (
                        <section ref={sectionRefHandlers?.age}>
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                                <Icons.Grid size={14} /> Idade-Série
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {availableOptions.age.map((age) => {
                                    const isActive = activeFilters.age.includes(age);

                                    return (
                                        <button
                                            key={age}
                                            type="button"
                                            onClick={() => onToggleFilter('age', age)}
                                            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all active:scale-95 ${isActive
                                                ? (isCorujaTone
                                                    ? 'bg-[#5D1E76] text-white border-[#5D1E76] shadow-md shadow-[#5D1E76]/20'
                                                    : 'bg-teal-500 text-white border-teal-500 shadow-md shadow-teal-500/20')
                                                : (isCorujaTone
                                                    ? 'bg-white text-[#0C1A34] border-[#dde4f1] hover:border-[#5D1E76]/30 hover:bg-[#faf6ff]'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-teal-500/30')
                                                }`}
                                        >
                                            {age}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    <section className="space-y-1 pt-2">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Filtros pedagógicos</p>
                        <p className="text-sm text-gray-500">Refine por repertório curricular e socioemocional quando quiser chegar em coleções mais específicas.</p>
                    </section>

                    {availableOptions.bncc.length > 0 && (
                        <section ref={sectionRefHandlers?.bncc}>
                            <BnccSummaryEntry selectedCodes={activeFilters.bncc} onOpen={onOpenBncc} tone={tone} />
                        </section>
                    )}

                    {availableOptions.casel.length > 0 && (
                        <section ref={sectionRefHandlers?.casel}>
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                                <Icons.Book size={14} /> Competências CASEL
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {availableOptions.casel.map((item) => {
                                    const isActive = activeFilters.casel.includes(item);

                                    return (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() => onToggleFilter('casel', item)}
                                            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all active:scale-95 text-left ${isActive
                                                ? (isCorujaTone
                                                    ? 'bg-[#EA9A3B] text-white border-[#EA9A3B] shadow-md shadow-[#EA9A3B]/20'
                                                    : 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20')
                                                : (isCorujaTone
                                                    ? 'bg-white text-[#0C1A34] border-[#dde4f1] hover:border-[#EA9A3B]/30 hover:bg-[#fff8ef]'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-orange-500/30')
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

                <div className={`${layoutSpacing.modalFooter} border-t shrink-0 flex gap-4 ${isCorujaTone ? 'border-[#eee5fa] bg-[#fcf9ff]' : 'border-gray-100 bg-white'}`}>
                    <button
                        type="button"
                        onClick={onClear}
                        className={`px-[var(--space-modal-footer-x)] py-[var(--space-modal-header-y)] rounded-2xl font-bold transition-colors ${isCorujaTone ? 'text-[#5D1E76] hover:bg-[#f6efff]' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        Limpar
                    </button>
                    <Button fullWidth onClick={onClose}>
                        <Icons.Check size={20} />
                        Ver {resultsCount} resultados
                    </Button>
                </div>
            </div>
        </div>
    );
};

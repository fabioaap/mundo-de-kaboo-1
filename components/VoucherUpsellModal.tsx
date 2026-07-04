import React from 'react';
import { Icons } from './Icons';
import { Button } from '../design-system';
import { useModalA11y } from '../hooks/useModalA11y';

interface VoucherUpsellModalProps {
    /** URL da loja para onde o CTA de compra direciona. */
    storeUrl: string;
    onClose: () => void;
}

/**
 * Exibido quando o usuário tenta acessar um material que NÃO está incluído no seu
 * voucher (modelo de degustação). Em vez de abrir o conteúdo, convida ao upsell —
 * comprar o pacote completo na loja.
 */
export const VoucherUpsellModal: React.FC<VoucherUpsellModalProps> = ({ storeUrl, onClose }) => {
    const containerRef = useModalA11y<HTMLDivElement>({ onClose });

    const handleBuy = () => {
        if (typeof window !== 'undefined') {
            window.open(storeUrl, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <div
            ref={containerRef}
            tabIndex={-1}
            className="fixed inset-0 z-[60] flex items-end justify-center md:items-center outline-none"
            role="dialog"
            aria-modal="true"
            aria-label="Material não incluído no seu acesso"
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full md:w-[440px] overflow-hidden rounded-t-3xl bg-white shadow-2xl animate-fade-in-up md:rounded-3xl">
                <div className="flex items-start justify-between px-6 pt-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                            <Icons.Lock size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-gray-800">Material não incluído</h2>
                            <p className="text-xs font-medium text-gray-400">Conteúdo de degustação</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fechar"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
                    >
                        <Icons.X size={16} />
                    </button>
                </div>

                <div className="px-6 py-5">
                    <p className="text-sm leading-relaxed text-gray-600">
                        Este material não faz parte do seu acesso atual. O seu acesso é uma{' '}
                        <strong>degustação</strong> — para liberar todo o conteúdo da plataforma,
                        adquira o pacote completo na nossa loja.
                    </p>
                </div>

                <div className="flex flex-col gap-2 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                    <Button fullWidth onClick={handleBuy}>
                        <Icons.ExternalLink size={18} />
                        Comprar na loja
                    </Button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full rounded-2xl py-2.5 text-sm font-bold text-gray-500 transition-colors hover:bg-gray-100"
                    >
                        Agora não
                    </button>
                </div>
            </div>
        </div>
    );
};

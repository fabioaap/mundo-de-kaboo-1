import React from 'react';
import { Button } from './Button';
import { Icons } from './Icons';

interface VouchersOnboardingBannerProps {
    description: 'Gere códigos únicos para campanha, parceiros ou operação interna.',
    onCreateFirstModel?: () => void;
}

const WORKFLOW_STEPS = [
    {
        title: '1. Monte o modelo',
        description: 'Defina regras de acesso, duração e validade do código.',
    },
    {
        title: '2. Emita os lotes',
        description: 'Gere códigos únicos para campanha, escola ou operação interna.',
    },
    {
        title: '3. Acompanhe o uso',
        description: 'Consulte resgates, bloqueie códigos e mantenha rastreabilidade.',
    },
];

export const VouchersOnboardingBanner: React.FC<VouchersOnboardingBannerProps> = ({
    onDismiss,
    onCreateFirstModel,
}) => {
    return (
        <section className="relative overflow-hidden rounded-3xl border border-kaboo-primary/15 bg-gradient-to-br from-amber-50 via-white to-kaboo-primary/5 p-5 md:p-6 mb-5">
            <div className="absolute inset-y-0 right-0 w-32 bg-[radial-gradient(circle_at_top,_rgba(242,167,53,0.14),_transparent_70%)] pointer-events-none" />

            <button
                type="button"
                onClick={onDismiss}
                aria-label="Fechar introdução dos vouchers"
                className="absolute top-4 right-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-gray-400 transition-colors hover:text-gray-600"
            >
                <Icons.X className="w-4 h-4" />
            </button>

            <div className="relative flex flex-col gap-4 md:flex-row md:items-start">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-kaboo-primary text-white shadow-sm">
                    <Icons.Ticket className="w-6 h-6" />
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-kaboo-primary">Nova área administrativa</p>
                    <h2 className="mt-1 text-lg md:text-xl font-bold text-gray-800">Como funciona a gestão de vouchers</h2>
                    <p className="mt-2 text-sm leading-6 text-gray-600 max-w-3xl">
                        Crie um modelo com as regras de acesso, emita lotes de códigos únicos e acompanhe toda a jornada de distribuição e resgate sem perder o histórico.
                    </p>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                        {WORKFLOW_STEPS.map((step) => (
                            <div key={step.title} className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
                                <h3 className="text-sm font-semibold text-gray-800">{step.title}</h3>
                                <p className="mt-1 text-xs leading-5 text-gray-500">{step.description}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                        Duração do acesso é o tempo liberado depois do resgate. Validade do código é até quando o voucher pode ser usado.
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        {onCreateFirstModel && (
                            <Button onClick={onCreateFirstModel}>
                                <Icons.Plus className="w-4 h-4" /> Criar primeiro modelo
                            </Button>
                        )}
                        <Button variant="ghost" onClick={onDismiss}>Entendi</Button>
                    </div>
                </div>
            </div>
        </section>
    );
};

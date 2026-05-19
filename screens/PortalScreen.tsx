import React from 'react';
import { Icons } from '../components/Icons';
import { LOGO_URL } from '../constants';
import { buildAppUrl } from '../lib/appPaths';

type PortalDestination = 'kaboo' | 'central-coruja' | 'wiki';

const isLocalHostname = (hostname: string) => ['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname);
const WIKI_PRODUCTION_URL = 'https://docs.mundodekaboo.com';

const getWikiUrl = (): string => {
    if (typeof window === 'undefined') {
        return WIKI_PRODUCTION_URL;
    }

    return isLocalHostname(window.location.hostname.toLowerCase())
        ? 'http://localhost:4200'
        : WIKI_PRODUCTION_URL;
};

const routeToBrandLogin = (brandId: 'kaboo' | 'central-coruja') => {
    const brandSearch = new URLSearchParams({ brand: brandId }).toString();
    window.location.assign(buildAppUrl(`?${brandSearch}#login`));
};

const routeToWiki = () => {
    window.location.assign(getWikiUrl());
};

const WikiLogo = () => (
    <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-[#8A5A2B]/15 bg-[linear-gradient(145deg,rgba(255,255,255,0.88),rgba(255,244,214,0.96))] shadow-[0_18px_36px_rgba(138,90,43,0.14)]">
        <svg viewBox="0 0 32 32" className="h-8 w-8 text-[#362A1F]" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M5.5 9.5L10.5 22.5L16 12L21.5 22.5L26.5 9.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 25.5H24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
    </div>
);

const cards: Array<{
    id: PortalDestination;
    title: string;
    eyebrow: string;
    description: string;
    cta: string;
    logo?: string;
    leftLogo?: React.ReactNode;
    shellClassName: string;
    accentClassName: string;
}> = [
        {
            id: 'kaboo',
            title: 'Kaboo',
            eyebrow: 'Leitura, audio e video para aprender brincando',
            description: 'Acesso principal da plataforma para professores e escolas que usam a experiencia original do Mundo de Kaboo.',
            cta: 'Entrar',
            logo: LOGO_URL,
            shellClassName: 'border-[#d7c1d8] bg-[radial-gradient(circle_at_top,_rgba(131,64,137,0.26),_rgba(255,255,255,0.98)_58%)] text-[#4A1948] shadow-[0_28px_80px_rgba(93,31,88,0.18)]',
            accentClassName: 'from-[#5D1F58] via-[#883E82] to-[#4EA8DE]',
        },
        {
            id: 'central-coruja',
            title: 'Central Coruja',
            eyebrow: 'White label para operacao, catalogo e parceiros',
            description: 'Entrada dedicada para a marca Central Coruja, com identidade, conteudo e configuracoes isoladas da experiencia Kaboo.',
            cta: 'Entrar',
            logo: '/central-coruja-logo.png',
            shellClassName: 'border-[#d7dcec] bg-[radial-gradient(circle_at_top,_rgba(12,26,52,0.18),_rgba(255,252,246,0.98)_58%)] text-[#0C1A34] shadow-[0_28px_80px_rgba(12,26,52,0.18)]',
            accentClassName: 'from-[#0C1A34] via-[#5D1E76] to-[#EA9A3B]',
        },
        {
            id: 'wiki',
            title: 'Wiki',
            eyebrow: 'Documentacao, guias e criterios de go-live',
            description: 'Base viva de referencia para diretoria, operacao e produto consultarem processos, backlog e releases com linguagem executiva.',
            cta: 'Entrar',
            leftLogo: <WikiLogo />,
            shellClassName: 'border-[#d8d2c7] bg-[radial-gradient(circle_at_top,_rgba(255,244,214,0.92),_rgba(255,255,255,0.98)_58%)] text-[#362A1F] shadow-[0_28px_80px_rgba(54,42,31,0.14)]',
            accentClassName: 'from-[#362A1F] via-[#8A5A2B] to-[#E3B23C]',
        },
    ];

export const PortalScreen: React.FC = () => {
    const handleCardClick = (destination: PortalDestination) => {
        if (destination === 'wiki') {
            routeToWiki();
            return;
        }

        routeToBrandLogin(destination);
    };

    return (
        <div className="relative min-h-[100dvh] overflow-hidden bg-[#f6efe8] text-[#1F2937]">
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-[#883E82]/20 blur-3xl" />
                <div className="absolute right-[-4rem] top-24 h-80 w-80 rounded-full bg-[#EA9A3B]/20 blur-3xl" />
                <div className="absolute bottom-[-5rem] left-1/3 h-96 w-96 rounded-full bg-[#4EA8DE]/18 blur-3xl" />
            </div>

            <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col px-6 py-8 sm:px-8 lg:px-12">
                <header className="flex flex-col gap-5 rounded-[32px] border border-white/70 bg-white/70 px-6 py-6 shadow-[0_16px_50px_rgba(102,71,45,0.1)] backdrop-blur xl:px-8">
                    <div className="max-w-3xl">
                        <p className="text-xs font-black uppercase tracking-[0.34em] text-[#8A5A2B]">Portal de entrada</p>
                        <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight text-[#1B1B1B] sm:text-5xl">
                            Escolha qual ambiente do ecossistema voce quer abrir.
                        </h1>
                    </div>
                </header>

                <section className="mt-8 grid flex-1 gap-6 lg:grid-cols-3">
                    {cards.map((card, index) => {
                        return (
                            <button
                                key={card.id}
                                type="button"
                                onClick={() => handleCardClick(card.id)}
                                className={`group relative flex h-full min-h-[320px] flex-col overflow-hidden rounded-[32px] border p-6 text-left transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_32px_90px_rgba(0,0,0,0.16)] focus:outline-none focus:ring-4 focus:ring-[#EA9A3B]/25 ${card.shellClassName}`}
                                style={{ animationDelay: `${index * 120}ms` }}
                            >
                                <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${card.accentClassName}`} />

                                {(card.leftLogo || card.logo) ? (
                                    <div className="flex items-start justify-start gap-4">
                                        {card.leftLogo ? card.leftLogo : null}
                                        {card.logo ? (
                                            <div className="flex h-16 items-center justify-start">
                                                <img src={card.logo} alt={card.title} className="max-h-14 w-auto object-contain drop-shadow-sm" />
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}

                                <div className="mt-10 flex-1">
                                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-current/55">{card.eyebrow}</p>
                                    <h2 className="mt-4 text-3xl font-black tracking-[-0.02em]">{card.title}</h2>
                                    <p className="mt-4 max-w-[32ch] text-sm leading-7 text-current/80 sm:text-base">{card.description}</p>
                                </div>

                                <div className="mt-8 flex items-center justify-between rounded-[24px] border border-current/10 bg-white/55 px-5 py-4 backdrop-blur-sm transition group-hover:bg-white/72">
                                    <span className="text-sm font-black uppercase tracking-[0.18em]">{card.cta}</span>
                                    <Icons.ExternalLink size={20} className="transition duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
                                </div>
                            </button>
                        );
                    })}
                </section>
            </div>
        </div>
    );
};
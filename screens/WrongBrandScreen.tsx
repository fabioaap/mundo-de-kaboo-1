import React, { useState } from 'react';
import { Button } from '../design-system';
import { api } from '../lib/api';
import drRatazanaImg from '../assets/images/characters/dr-ratazana.png';

interface WrongBrandScreenProps {
    brandDisplayName: string;
    brandLogoUrl?: string;
    onSignOut: () => void;
}

export const WrongBrandScreen: React.FC<WrongBrandScreenProps> = ({
    brandDisplayName,
    brandLogoUrl,
    onSignOut,
}) => {
    const [loading, setLoading] = useState(false);

    const handleSignOut = async () => {
        if (loading) return;
        setLoading(true);
        await api.signOut();
        onSignOut();
    };

    return (
        <div
            className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-12 text-center"
            style={{
                background: 'radial-gradient(circle at top, rgba(93,31,88,0.12), transparent 45%), linear-gradient(180deg, #fff7ed 0%, #ffffff 60%)',
            }}
        >
            {brandLogoUrl ? (
                <img src={brandLogoUrl} alt={brandDisplayName} className="h-10 w-auto object-contain mb-10" />
            ) : (
                <p className="text-lg font-black text-brand-primary mb-10">{brandDisplayName}</p>
            )}

            {/* Dr. Ratazana — personagem confuso na porta errada */}
            <div className="relative mb-8">
                <div className="w-36 h-36 rounded-full bg-brand-primary/10 flex items-end justify-center overflow-hidden">
                    <img
                        src={drRatazanaImg}
                        alt="Dr. Ratazana confuso"
                        className="w-32 h-32 object-contain object-bottom"
                    />
                </div>
                {/* Balão de "?" */}
                <div className="absolute -top-1 -right-1 w-9 h-9 rounded-full bg-white border-2 border-brand-primary/30 shadow-sm flex items-center justify-center">
                    <span className="text-brand-primary font-black text-base leading-none">?</span>
                </div>
            </div>

            <h1 className="text-xl font-black text-gray-900 mb-3 leading-tight">
                Hmm, esta conta é de<br />outra plataforma
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed max-w-xs mb-8">
                Sua conta foi cadastrada em uma plataforma diferente.
                {' '}Acesse pelo endereço correto ou entre com um e-mail do{' '}
                <span className="font-bold text-gray-700">{brandDisplayName}</span>.
            </p>

            <div className="w-full max-w-[240px]">
                <Button fullWidth onClick={handleSignOut} disabled={loading}>
                    {loading ? 'Saindo…' : 'Sair da conta'}
                </Button>
            </div>
        </div>
    );
};

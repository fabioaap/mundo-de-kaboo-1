import React, { useEffect } from 'react';
import { Button } from '../design-system';
import { ScreenName } from '../types';
import { Icons } from '../components/Icons';
import { LOGO_URL } from '../constants';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface EmailConfirmationScreenProps {
  onNavigate: (screen: ScreenName, params?: any) => void;
  brandSlug?: string;
  brandLogoUrl?: string;
  brandName?: string;
  backgroundImageUrl?: string;
  params?: {
    status?: 'pending' | 'confirmed';
    email?: string;
    message?: string;
  };
}

export const EmailConfirmationScreen: React.FC<EmailConfirmationScreenProps> = ({ onNavigate, params, brandSlug, brandLogoUrl, brandName, backgroundImageUrl }) => {
  const isCentralCoruja = brandSlug === 'central-coruja';
  const resolvedBrandLogoUrl = brandLogoUrl || (brandSlug === 'kaboo' ? LOGO_URL : undefined);
  const resolvedBrandName = brandName || 'Mundo de Kaboo';
  const isPendingConfirmation = params?.status === 'pending';
  const shellBackgroundStyle = isCentralCoruja
    ? {
      backgroundImage: backgroundImageUrl
        ? `linear-gradient(135deg, rgba(9, 26, 38, 0.72), rgba(9, 26, 38, 0.16)), url(${backgroundImageUrl})`
        : undefined,
      backgroundColor: '#132842',
      backgroundPosition: 'center',
      backgroundSize: 'cover',
    }
    : undefined;

  // Redireciona para home se a sessão já estiver ativa (executa só no mount)
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        onNavigate('home');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const title = isPendingConfirmation ? 'Confirme seu e-mail' : 'E-mail Confirmado!';
  const description = isPendingConfirmation
    ? params?.message || 'Enviamos um link de confirmação para o seu e-mail. Verifique sua caixa de entrada e a pasta de spam antes de tentar entrar.'
    : 'Sua conta foi verificada com sucesso. Agora você tem acesso completo ao Mundo de Kaboo.';

  return (
    <div className={`flex min-h-screen items-center justify-center p-6 relative overflow-hidden ${isCentralCoruja ? 'bg-[#132842]' : 'bg-gray-50'}`} style={shellBackgroundStyle}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {isCentralCoruja ? (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(58%_42%_at_14%_8%,rgba(245,191,52,0.18),transparent_55%),radial-gradient(48%_34%_at_88%_12%,rgba(61,131,84,0.18),transparent_58%),linear-gradient(180deg,rgba(9,23,35,0.32),rgba(9,23,35,0.12))]" />
            <div className="absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-amber-200/15 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-80 w-80 translate-x-1/3 translate-y-1/3 rounded-full bg-emerald-200/10 blur-3xl" />
          </>
        ) : (
          <>
            <div className="absolute top-0 left-0 w-64 h-64 bg-kaboo-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-100 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
          </>
        )}
      </div>

      <div className={`w-full max-w-md flex flex-col items-center text-center relative z-10 animate-in fade-in zoom-in-95 duration-500 ${isCentralCoruja
        ? 'rounded-[36px] border border-white/20 bg-[linear-gradient(180deg,rgba(250,246,235,0.97)_0%,rgba(244,240,228,0.97)_100%)] p-8 shadow-[0_34px_84px_rgba(6,18,31,0.34)]'
        : 'bg-white rounded-3xl shadow-xl p-8'}`}>

        {resolvedBrandLogoUrl ? (
          <img src={resolvedBrandLogoUrl} alt={resolvedBrandName} className="w-32 h-auto mb-8" />
        ) : (
          <div className={`mb-8 inline-flex items-center justify-center rounded-[28px] px-6 py-4 text-center font-black leading-tight ${isCentralCoruja
            ? 'border border-[#e0d5ae]/55 bg-[#fff7e1]/85 text-[#17384c] shadow-[0_16px_34px_rgba(17,42,60,0.12)] text-3xl'
            : 'border border-gray-200 bg-white text-gray-800 shadow-sm text-2xl'}`}>
            {resolvedBrandName}
          </div>
        )}

        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${isCentralCoruja
          ? isPendingConfirmation
            ? 'bg-[#fff0c7] text-[#bd7a16] shadow-[0_16px_30px_rgba(189,122,22,0.18)]'
            : 'bg-[#e2f2e5] text-[#2f7d4d] shadow-[0_16px_30px_rgba(47,125,77,0.16)]'
          : isPendingConfirmation
            ? 'bg-amber-100 text-amber-700'
            : 'bg-green-100 text-green-600'}`}>
          {isPendingConfirmation ? <Icons.Mail size={36} strokeWidth={2.5} /> : <Icons.Check size={40} strokeWidth={3} />}
        </div>

        <h1 className={`text-2xl font-black mb-2 ${isCentralCoruja ? 'text-[#17384c]' : 'text-gray-800'}`}>
          {title}
        </h1>

        {isPendingConfirmation && params?.email && (
          <p className={`text-sm font-semibold mb-3 ${isCentralCoruja ? 'text-[#4a7f5e]' : 'text-kaboo-primary'}`}>
            {params.email}
          </p>
        )}

        <p className={`mb-8 leading-relaxed ${isCentralCoruja ? 'text-[#5f766f]' : 'text-gray-600'}`}>
          {description}
        </p>

        <Button
          onClick={() => onNavigate('login')}
          fullWidth
          className={isCentralCoruja ? '!rounded-[20px]' : undefined}
        >
          {isPendingConfirmation ? 'Voltar para o login' : 'Entrar no App'}
        </Button>
      </div>
    </div>
  );
};
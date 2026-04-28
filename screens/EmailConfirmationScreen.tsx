import React, { useEffect } from 'react';
import { Button } from '../design-system';
import { ScreenName } from '../types';
import { Icons } from '../components/Icons';
import { LOGO_URL } from '../constants';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface EmailConfirmationScreenProps {
  onNavigate: (screen: ScreenName, params?: any) => void;
  brandLogoUrl?: string;
  brandName?: string;
  params?: {
    status?: 'pending' | 'confirmed';
    email?: string;
    message?: string;
  };
}

export const EmailConfirmationScreen: React.FC<EmailConfirmationScreenProps> = ({ onNavigate, params, brandLogoUrl, brandName }) => {
  const resolvedBrandLogoUrl = brandLogoUrl || LOGO_URL;
  const resolvedBrandName = brandName || 'Mundo de Kaboo';
  const isPendingConfirmation = params?.status === 'pending';

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
    <div className="flex min-h-screen bg-gray-50 items-center justify-center p-6 relative">
      {/* Blobs Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-64 h-64 bg-kaboo-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-100 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center text-center relative z-10 animate-in fade-in zoom-in-95 duration-500">

        <img src={resolvedBrandLogoUrl} alt={resolvedBrandName} className="w-32 h-auto mb-8" />

        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${isPendingConfirmation ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-600'}`}>
          {isPendingConfirmation ? <Icons.Mail size={36} strokeWidth={2.5} /> : <Icons.Check size={40} strokeWidth={3} />}
        </div>

        <h1 className="text-2xl font-black text-gray-800 mb-2">
          {title}
        </h1>

        {isPendingConfirmation && params?.email && (
          <p className="text-sm font-semibold text-kaboo-primary mb-3">
            {params.email}
          </p>
        )}

        <p className="text-gray-600 mb-8 leading-relaxed">
          {description}
        </p>

        <Button
          onClick={() => onNavigate('login')}
          fullWidth
        >
          {isPendingConfirmation ? 'Voltar para o login' : 'Entrar no App'}
        </Button>
      </div>
    </div>
  );
};
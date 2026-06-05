import React, { useState } from 'react';
import { Button } from '../design-system';
import { ScreenName } from '../types';
import { buildAppUrl } from '../lib/appPaths';
import { supabase } from '../lib/supabase';
import { Icons } from '../components/Icons';
import { LOGO_URL } from '../constants';
import backgroundImage from '../assets/images/background-login.jpg';
import { layoutSpacing } from '../design-system/layout/spacing';

interface ForgotPasswordScreenProps {
  onNavigate: (screen: ScreenName) => void;
  brandSlug?: string;
  brandLogoUrl?: string;
  brandName?: string;
  backgroundImageUrl?: string;
}

const BG_IMAGE = backgroundImage;

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ onNavigate, brandSlug, brandLogoUrl, brandName, backgroundImageUrl }) => {
  const isCentralCoruja = brandSlug === 'central-coruja';
  const resolvedBrandLogoUrl = brandLogoUrl || (brandSlug === 'kaboo' ? LOGO_URL : undefined);
  const resolvedBrandName = brandName || (isCentralCoruja ? 'Central Coruja' : 'Mundo de Kaboo');
  const resolvedBackgroundImageUrl = backgroundImageUrl || BG_IMAGE;
  const shellBackgroundStyle = isCentralCoruja
    ? {
      backgroundImage: resolvedBackgroundImageUrl
        ? `linear-gradient(135deg, rgba(9, 26, 38, 0.72), rgba(9, 26, 38, 0.18)), url(${resolvedBackgroundImageUrl})`
        : undefined,
      backgroundColor: '#0C1A34',
      backgroundPosition: 'center',
      backgroundSize: 'cover',
    }
    : {
      backgroundImage: `url(${resolvedBackgroundImageUrl})`,
      backgroundPosition: 'center',
      backgroundSize: 'cover',
    };
  const titleClassName = isCentralCoruja ? 'text-[#0C1A34]' : 'text-gray-800';
  const bodyClassName = isCentralCoruja ? 'text-[#4D5974]' : 'text-gray-600';
  const labelClassName = isCentralCoruja ? 'text-[#243A60]' : 'text-gray-600';
  const inputBaseClassName = isCentralCoruja
    ? 'w-full bg-[#fffdfd]/96 border border-[#dddff3] rounded-[22px] text-[#0C1A34] placeholder:text-[#8A93AD] outline-none transition-all focus:border-[#EA9A3B] focus:ring-4 focus:ring-[#EA9A3B]/15'
    : 'w-full bg-gray-50 border-none rounded-2xl text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-brand-primary outline-none transition-all';

  const renderBrandMark = () => {
    if (resolvedBrandLogoUrl) {
      return <img src={resolvedBrandLogoUrl} alt={resolvedBrandName} className="h-12 w-auto object-contain" />;
    }

    return (
      <div className={`inline-flex items-center justify-center text-center font-black leading-none ${isCentralCoruja
        ? 'rounded-[24px] border border-[#f3d8b0]/55 bg-[#fff7eb]/85 px-5 py-3 text-xl text-[#0C1A34] shadow-[0_16px_34px_rgba(17,42,60,0.12)]'
        : 'rounded-full border border-gray-200 bg-white px-4 py-2 text-base text-gray-800 shadow-sm'}`}>
        {resolvedBrandName}
      </div>
    );
  };

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const _brandParam = brandSlug && brandSlug !== 'kaboo' ? `?brand=${brandSlug}` : '';
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: buildAppUrl(_brandParam),
      });

      if (error) throw error;

      setSuccessMsg('Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha.');
    } catch (error: any) {
      console.error(error);
      let msg = error.message;
      if (msg.includes('security purposes') || msg.includes('rate limit')) {
        msg = 'Muitas tentativas. Por segurança, aguarde alguns instantes e tente novamente.';
      }
      setErrorMsg(msg || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`flex min-h-screen items-center justify-center relative overflow-hidden ${layoutSpacing.authShell} ${isCentralCoruja ? 'bg-[#0C1A34]' : 'bg-gray-50 bg-no-repeat'}`}
      style={shellBackgroundStyle}
    >
      <div className={`absolute inset-0 ${isCentralCoruja
        ? 'bg-[radial-gradient(56%_42%_at_14%_8%,rgba(234,154,59,0.18),transparent_55%),radial-gradient(46%_34%_at_88%_12%,rgba(93,30,118,0.18),transparent_58%),linear-gradient(180deg,rgba(9,23,35,0.34),rgba(9,23,35,0.1))] backdrop-blur-[1px]'
        : 'bg-brand-primary/20 backdrop-blur-[2px]'}`}></div>

      <div className={`relative z-10 w-full min-h-screen md:min-h-0 md:h-auto md:max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300 ${isCentralCoruja
        ? 'bg-[linear-gradient(180deg,rgba(251,248,255,0.98)_0%,rgba(246,242,252,0.97)_100%)] md:rounded-[36px] md:border md:border-white/35 md:shadow-[0_34px_84px_rgba(6,18,31,0.34)]'
        : 'bg-white md:rounded-3xl md:shadow-2xl'}`}>

        {/* HEADER */}
        <div className={`${layoutSpacing.authHeader} flex items-center gap-4 shrink-0 ${isCentralCoruja ? 'border-b border-[#ece5fa]' : 'border-b border-gray-100'}`}>
          <button
            type="button"
            onClick={() => onNavigate('login')}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isCentralCoruja ? 'bg-[#f6efff] text-[#5D1E76] hover:bg-[#efe5fb]' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
          >
            <Icons.ChevronLeft size={24} />
          </button>
          <div className="flex-1 flex justify-center pr-10">{renderBrandMark()}</div>
        </div>

        <div className={`w-full mx-auto flex-1 flex flex-col justify-center ${layoutSpacing.authContent}`}>

          <div className="text-center mb-8">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${isCentralCoruja
              ? 'bg-[#fff6eb] text-[#EA9A3B] shadow-[0_16px_30px_rgba(234,154,59,0.18)]'
              : 'bg-blue-50 text-brand-primary'}`}>
              <Icons.Mail size={32} />
            </div>
            <h1 className={`text-xl font-bold mb-3 ${titleClassName}`}>Recuperar senha</h1>
            <p className={`${bodyClassName} leading-relaxed`}>
              Digite seu e-mail abaixo e enviaremos um link seguro para você criar uma nova senha.
            </p>
          </div>

          <form onSubmit={handleReset} className="space-y-6">

            {/* Email Field */}
            <div className="space-y-2">
              <label className={`text-sm font-bold ml-2 ${labelClassName}`}>E-mail</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${inputBaseClassName} p-4 pl-12`}
                  placeholder="email@exemplo.com.br"
                  required
                />
                <Icons.Mail className={`absolute left-4 top-4 ${isCentralCoruja ? 'text-[#67728A]' : 'text-gray-400'}`} size={20} />
              </div>
            </div>

            {/* Success Message */}
            {successMsg && (
              <div className="bg-green-50 text-green-600 text-sm p-3 rounded-xl font-bold text-center animate-in fade-in flex items-center justify-center gap-2">
                <Icons.Check size={16} />
                <span className="text-left leading-tight">{successMsg}</span>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="bg-red-50 text-red-500 text-sm p-3 rounded-xl font-medium text-center animate-in fade-in">
                {errorMsg}
              </div>
            )}

            <div className="pt-2">
              <Button type="submit" fullWidth disabled={loading || !!successMsg}>
                {loading ? 'Enviando...' : 'Enviar Link'}
              </Button>
            </div>
          </form>

          {successMsg && (
            <div className="mt-6 text-center">
              <button
                onClick={() => onNavigate('login')}
                className={`font-bold hover:underline ${isCentralCoruja ? 'text-[#5D1E76]' : 'text-brand-primary'}`}
              >
                Voltar para o Login
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Button } from '../design-system';
import { ScreenName } from '../types';
import { supabase } from '../lib/supabase';
import { clearPendingPasswordSetup } from '../lib/passwordSetupFlow';
import { Icons } from '../components/Icons';
import { LOGO_URL } from '../constants';
import backgroundImage from '../assets/images/background-login.jpg';
import { layoutSpacing } from '../design-system/layout/spacing';

interface SetPasswordScreenProps {
  onNavigate: (screen: ScreenName) => void;
  onPasswordSet?: () => void;
  linkExpired?: boolean;
  brandSlug?: string;
  brandLogoUrl?: string;
  brandName?: string;
  backgroundImageUrl?: string;
}

const BG_IMAGE = backgroundImage;

export const SetPasswordScreen: React.FC<SetPasswordScreenProps> = ({ onNavigate, onPasswordSet, linkExpired, brandSlug, brandLogoUrl, brandName, backgroundImageUrl }) => {
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
  const bodyClassName = isCentralCoruja ? 'text-[#4D5974]' : 'text-gray-500';
  const labelClassName = isCentralCoruja ? 'text-[#243A60]' : 'text-gray-600';
  const inputBaseClassName = isCentralCoruja
    ? 'w-full bg-[#fffdfd]/96 border border-[#dddff3] rounded-[22px] text-[#0C1A34] placeholder:text-[#8A93AD] outline-none transition-all focus:border-[#EA9A3B] focus:ring-4 focus:ring-[#EA9A3B]/15'
    : 'w-full bg-gray-50 border-none rounded-2xl text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all';

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

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // Tenta pegar o e-mail da sessão atual (válido quando o link de convite é clicado)
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setUserEmail(data.user.email);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setErrorMsg(null);

    if (password.length < 8) {
      setErrorMsg('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    if (password !== confirm) {
      setErrorMsg('As senhas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      setSuccessMsg('Senha definida com sucesso! Redirecionando para o login...');
      setTimeout(async () => {
        clearPendingPasswordSetup();
        await supabase.auth.signOut();

        if (onPasswordSet) {
          onPasswordSet();
        } else {
          onNavigate('login');
        }
      }, 1500);
    } catch (error: any) {
      let msg: string = error.message || 'Ocorreu um erro. Tente novamente.';
      if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid')) {
        msg = 'O link de convite expirou ou já foi usado. Peça ao administrador que reenvie o convite.';
      }
      if (msg.toLowerCase().includes('same password')) {
        msg = 'A nova senha não pode ser igual à senha anterior.';
      }
      setErrorMsg(msg);
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
        : 'bg-kaboo-primary/20 backdrop-blur-[2px]'}`} />

      <div className={`relative z-10 w-full min-h-screen md:min-h-0 md:h-auto md:max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300 ${isCentralCoruja
        ? 'bg-[linear-gradient(180deg,rgba(251,248,255,0.98)_0%,rgba(246,242,252,0.97)_100%)] md:rounded-[36px] md:border md:border-white/35 md:shadow-[0_34px_84px_rgba(6,18,31,0.34)]'
        : 'bg-white md:rounded-3xl md:shadow-2xl'}`}>

        {/* Header */}
        <div className={`${layoutSpacing.authHeader} flex items-center justify-center shrink-0 ${isCentralCoruja ? 'border-b border-[#ece5fa]' : 'border-b border-gray-100'}`}>
          {renderBrandMark()}
        </div>

        <div className={`w-full mx-auto flex-1 flex flex-col justify-center ${layoutSpacing.authContent}`}>

          {/* Link expirado */}
          {linkExpired ? (
            <div className="flex flex-col items-center gap-5 text-center py-8">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isCentralCoruja
                ? 'bg-[#fff6eb] text-[#EA9A3B] shadow-[0_16px_30px_rgba(234,154,59,0.18)]'
                : 'bg-amber-50 text-amber-500'}`}>
                <Icons.AlertCircle size={32} />
              </div>
              <div>
                <h2 className={`text-lg font-bold mb-2 ${titleClassName}`}>Link de convite expirado</h2>
                <p className={`text-sm leading-relaxed ${bodyClassName}`}>
                  O link que você recebeu por e-mail já foi usado ou expirou.
                  Solicite ao administrador que reenvie o convite.
                </p>
              </div>
              <Button variant="secondary" onClick={() => onNavigate('login')} className={isCentralCoruja ? '!rounded-[20px]' : undefined}>
                Voltar ao login
              </Button>
            </div>
          ) : successMsg ? (
            <div className="flex flex-col items-center gap-4 text-center py-8">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isCentralCoruja
                ? 'bg-[#f6efff] text-[#5D1E76] shadow-[0_16px_30px_rgba(93,30,118,0.16)]'
                : 'bg-emerald-50 text-emerald-500'}`}>
                <Icons.Check size={32} />
              </div>
              <p className={`font-medium ${isCentralCoruja ? 'text-[#243A60]' : 'text-gray-700'}`}>{successMsg}</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <p className={`text-sm mb-1 ${bodyClassName}`}>Você foi convidado para</p>
                <p className={`font-bold text-base ${titleClassName}`}>{resolvedBrandName}</p>
              </div>

              {/* E-mail pré-preenchido */}
              {userEmail && (
                <div className={`mb-4 rounded-2xl px-4 py-3 flex items-center gap-3 ${isCentralCoruja ? 'bg-[#fffdfd] border border-[#ece5fa]' : 'bg-gray-50'}`}>
                  <Icons.Mail size={18} className={`${isCentralCoruja ? 'text-[#67728A]' : 'text-gray-400'} shrink-0`} />
                  <span className={`text-sm font-medium truncate ${isCentralCoruja ? 'text-[#243A60]' : 'text-gray-700'}`}>{userEmail}</span>
                </div>
              )}

              <div className="text-center mb-6">
                <h1 className={`text-xl font-bold mb-3 ${titleClassName}`}>Criar sua senha</h1>
                <p className={`text-sm leading-relaxed ${bodyClassName}`}>
                  Escolha uma senha para acessar a plataforma.
                  Ela precisa ter pelo menos <strong>8 caracteres</strong>.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nova senha */}
                <div className="space-y-2">
                  <label className={`text-sm font-bold ml-2 ${labelClassName}`}>Nova senha</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setErrorMsg(null); }}
                      className={`${inputBaseClassName} p-4 pr-12`}
                      placeholder="Mínimo 8 caracteres"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className={`absolute right-4 top-4 focus:outline-none ${isCentralCoruja ? 'text-[#67728A] hover:text-[#243A60]' : 'text-gray-400 hover:text-gray-600'}`}
                      tabIndex={-1}
                    >
                      {showPassword ? <Icons.EyeOff size={20} /> : <Icons.Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Confirmar senha */}
                <div className="space-y-2">
                  <label className={`text-sm font-bold ml-2 ${labelClassName}`}>Confirmar senha</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => { setConfirm(e.target.value); setErrorMsg(null); }}
                      className={`${inputBaseClassName} p-4 pr-12`}
                      placeholder="Repita a senha"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className={`absolute right-4 top-4 focus:outline-none ${isCentralCoruja ? 'text-[#67728A] hover:text-[#243A60]' : 'text-gray-400 hover:text-gray-600'}`}
                      tabIndex={-1}
                    >
                      {showConfirm ? <Icons.EyeOff size={20} /> : <Icons.Eye size={20} />}
                    </button>
                  </div>
                </div>

                {errorMsg && (
                  <div className="bg-red-50 text-red-500 text-sm p-3 rounded-xl font-medium text-center animate-in fade-in" role="alert">
                    {errorMsg}
                  </div>
                )}

                <div className="pt-2">
                  <Button type="submit" fullWidth disabled={loading} className={isCentralCoruja ? '!rounded-[20px]' : undefined}>
                    {loading ? 'Salvando...' : 'Definir senha e entrar'}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

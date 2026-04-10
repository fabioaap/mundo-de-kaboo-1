import React, { useState } from 'react';
import { Button } from '../components/Button';
import { ScreenName, UserProfile, Voucher } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';
import { Icons } from '../components/Icons';
import { LOGO_URL, LEAD_CAPTURE_URL, PRIVACY_POLICY_URL } from '../constants';
import { api } from '../lib/api';
import { logger } from '../lib/logger';

interface LoginScreenProps {
  onNavigate: (screen: ScreenName, params?: any) => void;
  onAuthSuccess?: (profile: UserProfile | null) => void | Promise<void>;
}

import backgroundImage from '../assets/images/background-login.jpg';
const BG_IMAGE = backgroundImage;
const PENDING_SIGNUP_VOUCHER_STORAGE_KEY = 'kaboo_pending_signup_voucher';

const savePendingSignupVoucher = (voucherCode: string) => {
  if (typeof window === 'undefined') return;

  sessionStorage.setItem(PENDING_SIGNUP_VOUCHER_STORAGE_KEY, voucherCode.trim().toUpperCase());
};

const clearPendingSignupVoucher = () => {
  if (typeof window === 'undefined') return;

  sessionStorage.removeItem(PENDING_SIGNUP_VOUCHER_STORAGE_KEY);
};

const getPendingSignupVoucher = (): string => {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem(PENDING_SIGNUP_VOUCHER_STORAGE_KEY) || '';
};

const formatVoucherDurationLabel = (months: number): string => {
  return `${months} ${months === 1 ? 'mes' : 'meses'}`;
};

const normalizeAuthError = (message: string): { message: string; requiresEmailConfirmation?: boolean } => {
  if (message === 'Invalid login credentials') {
    return { message: 'E-mail ou senha incorretos.' };
  }

  if (message === 'User already registered') {
    return { message: 'Este e-mail já está cadastrado.' };
  }

  if (message === 'Email not confirmed') {
    return {
      message: 'Confirme seu e-mail para entrar. Verifique sua caixa de entrada e a pasta de spam.',
      requiresEmailConfirmation: true,
    };
  }

  if (/Email address ".+" is invalid/i.test(message)) {
    return { message: 'O e-mail informado é inválido. Use um endereço com domínio existente.' };
  }

  if (message.includes('security purposes') || message.includes('rate limit')) {
    return { message: 'Muitas tentativas. Por segurança, aguarde alguns instantes e tente novamente.' };
  }

  return { message: message || 'Ocorreu um erro. Tente novamente.' };
};

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigate, onAuthSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [voucherValidationMsg, setVoucherValidationMsg] = useState<string | null>(null);
  const [validatedVoucher, setValidatedVoucher] = useState<Voucher | null>(null);
  const [demoVouchers, setDemoVouchers] = useState<Voucher[]>([]);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [loginVoucherCode, setLoginVoucherCode] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showContinueToHome, setShowContinueToHome] = useState(false);
  const [showLoginVoucherField, setShowLoginVoucherField] = useState(false);
  const normalizedVoucherCode = voucherCode.trim().toUpperCase();
  const isRegisterVoucherValidated = Boolean(
    isRegistering &&
    validatedVoucher &&
    validatedVoucher.code === normalizedVoucherCode
  );

  const activeDemoVouchers = demoVouchers.filter((voucher) => {
    if (voucher.status !== 'active') {
      return false;
    }

    if (voucher.expires_at && new Date(voucher.expires_at).getTime() < Date.now()) {
      return false;
    }

    return true;
  });

  const redeemedDemoVouchers = demoVouchers.filter((voucher) => voucher.status === 'redeemed' || voucher.consumed_at || voucher.consumed_by_user_id);
  const expiredDemoVouchers = demoVouchers.filter((voucher) => voucher.status === 'expired' || Boolean(voucher.expires_at && new Date(voucher.expires_at).getTime() < Date.now()));
  const disabledDemoVouchers = demoVouchers.filter((voucher) => voucher.status === 'disabled');

  const clearError = () => {
    if (errorMsg) setErrorMsg(null);
    if (showContinueToHome) setShowContinueToHome(false);
  };

  const clearVoucherValidation = () => {
    setValidatedVoucher(null);
    setVoucherValidationMsg(null);
  };

  const handleVoucherCodeChange = (value: string) => {
    const nextValue = value.toUpperCase().replace(/\s+/g, '');
    setVoucherCode(nextValue);
    clearError();
    if (successMsg) setSuccessMsg(null);
    if (voucherValidationMsg) setVoucherValidationMsg(null);
    if (validatedVoucher && nextValue.trim() !== validatedVoucher.code) {
      setValidatedVoucher(null);
    }
  };

  const loadDemoVouchers = async () => {
    if (isSupabaseConfigured) {
      return;
    }

    const vouchers = await api.getVoucherSamples();
    setDemoVouchers(vouchers);
  };

  const handleValidateVoucherForSignup = async () => {
    if (loading) return;

    if (!voucherCode.trim()) {
      setErrorMsg('Informe o codigo de acesso para continuar.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setVoucherValidationMsg(null);

    try {
      const result = await api.validateVoucher(voucherCode);
      if (!result.success || !result.voucher) {
        throw new Error(result.message || 'Nao foi possivel validar o codigo informado.');
      }

      setValidatedVoucher(result.voucher);
      setVoucherCode(result.voucher.code);
      setVoucherValidationMsg(`Codigo validado. Esse voucher libera ${formatVoucherDurationLabel(result.voucher.duration_months)} de acesso apos o resgate.`);
    } catch (error: any) {
      setValidatedVoucher(null);
      setVoucherValidationMsg(null);
      setErrorMsg(normalizeAuthError(error?.message || '').message);
    } finally {
      setLoading(false);
    }
  };

  const handleUseAnotherVoucher = () => {
    clearVoucherValidation();
    setVoucherCode('');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent double submission

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isRegistering) {
        if (!voucherCode.trim()) {
          throw new Error('Informe o codigo de acesso para criar sua conta.');
        }

        if (!validatedVoucher || validatedVoucher.code !== normalizedVoucherCode) {
          throw new Error('Valide o codigo de acesso antes de continuar.');
        }

        if (!acceptedTerms) {
          throw new Error('Você precisa aceitar a política de privacidade para continuar.');
        }

        if (password !== confirmPassword) {
          throw new Error('As senhas não coincidem. Verifique e tente novamente.');
        }

        savePendingSignupVoucher(voucherCode);

        const result = await api.registerWithVoucher({
          email,
          password,
          full_name: fullName,
          school_name: schoolName,
          voucherCode,
        });

        if (!result.success) {
          throw new Error(result.error || 'Nao foi possivel criar sua conta.');
        }

        if (result.profile && onAuthSuccess) {
          await onAuthSuccess(result.profile);
        }

        if (result.requiresEmailConfirmation) {
          onNavigate('email_confirmation', {
            status: 'pending',
            email: result.email || email,
            message: result.message,
          });
          return;
        }

        if (!result.requiresLogin) {
          clearPendingSignupVoucher();
          onNavigate('home', { isNewUser: true });
          return;
        }

        setIsRegistering(false);
        setVoucherCode('');
        clearVoucherValidation();
        setConfirmPassword('');
        setSuccessMsg(result.message || 'Conta criada com sucesso! Faça login para ativar seu acesso.');
        return;
      } else {
        const result = await api.signIn(email, password);

        if (!result.success) {
          throw new Error(result.error || 'Nao foi possivel iniciar a sessao.');
        }

        let currentProfile = result.profile;

        // P1.2: resgata voucher pendente do fluxo de confirmação de e-mail
        const pendingVoucher = getPendingSignupVoucher();
        if (pendingVoucher && !loginVoucherCode.trim()) {
          const pendingRedemption = await api.redeemVoucher(pendingVoucher);
          if (pendingRedemption.success && pendingRedemption.profile) {
            currentProfile = pendingRedemption.profile;
            clearPendingSignupVoucher();
          }
        }

        // P1.1: se preencheu voucher no login, resgata automaticamente
        const voucherToRedeem = loginVoucherCode.trim().replace(/\s+/g, '');
        if (voucherToRedeem && currentProfile) {
          const redemption = await api.redeemVoucher(voucherToRedeem);
          if (redemption.success && redemption.profile) {
            currentProfile = redemption.profile;
          } else if (!redemption.success) {
            // Login OK mas voucher falhou — atualiza perfil, mostra erro sem navegar (P1.1)
            if (currentProfile && onAuthSuccess) {
              await onAuthSuccess(currentProfile);
            }
            setErrorMsg(redemption.message || 'Login realizado, mas nao foi possivel resgatar o voucher.');
            setShowContinueToHome(true);
            return;
          }
        }

        if (currentProfile && onAuthSuccess) {
          await onAuthSuccess(currentProfile);
        }

        if (currentProfile?.access_status === 'active') {
          clearPendingSignupVoucher();
        }

        onNavigate('home');
      }
    } catch (error: any) {
      logger.error('Auth error', error);
      const normalizedError = normalizeAuthError(error.message || '');

      if (normalizedError.requiresEmailConfirmation) {
        onNavigate('email_confirmation', {
          status: 'pending',
          email,
          message: normalizedError.message,
        });
        return;
      }

      setErrorMsg(normalizedError.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setErrorMsg(null);
    setSuccessMsg(null);
    setAcceptedTerms(false);
    setVoucherCode('');
    setLoginVoucherCode('');
    setConfirmPassword('');
    setShowContinueToHome(false);
    setShowLoginVoucherField(false);
    clearVoucherValidation();
    if (!isRegistering) {
      loadDemoVouchers().catch(() => undefined);
    }
    window.scrollTo(0, 0);
  };

  const enterAdminLogin = () => {
    setIsAdminLogin(true);
    setIsRegistering(false);
    setErrorMsg(null);
    setSuccessMsg(null);
    setEmail('');
    setPassword('');
    setLoginVoucherCode('');
    setShowContinueToHome(false);
    window.scrollTo(0, 0);
  };

  const exitAdminLogin = () => {
    setIsAdminLogin(false);
    setErrorMsg(null);
    setSuccessMsg(null);
    setEmail('');
    setPassword('');
    setLoginVoucherCode('');
    setShowContinueToHome(false);
    window.scrollTo(0, 0);
  };

  return (
    <div
      className="relative flex h-[100dvh] overflow-hidden bg-gray-50 bg-cover bg-center bg-no-repeat p-0 md:items-center md:justify-center md:p-6 lg:p-8"
      style={{ backgroundImage: `url(${BG_IMAGE})` }}
    >
      {/* Overlay to ensure contrast and branding */}
      <div className="absolute inset-0 bg-kaboo-primary/20 backdrop-blur-[2px]"></div>

      {/* 
         UPDATED CLASS: 
         - min-h-screen on mobile ensures it covers full height
         - w-full without max-w on mobile ensures full width
         - md: prefixes restore the card look on desktop
      */}
      <div className={`relative z-10 flex h-[100dvh] w-full flex-col overflow-hidden bg-white transition-all duration-300 md:h-auto md:max-h-[calc(100dvh-3rem)] md:max-w-md md:rounded-3xl md:shadow-2xl lg:max-h-[calc(100dvh-4rem)] ${isRegistering ? 'md:max-w-lg' : ''}`}>

        {/* HEADER FOR REGISTER MODE */}
        {isRegistering && (
          <div className="flex shrink-0 items-center gap-4 border-b border-gray-100 px-6 pb-4 pt-8 md:pt-8">
            <button
              type="button"
              onClick={toggleMode}
              aria-label="Voltar para o login"
              className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-700"
            >
              <Icons.ChevronLeft size={24} />
            </button>
            <h1 className="text-xl font-bold text-gray-800 flex-1">
              {isRegisterVoucherValidated ? 'Crie sua conta' : 'Valide seu codigo'}
            </h1>
          </div>
        )}

        {/* LOGO AREA (Only for Login Mode) */}
        {!isRegistering && (
          <div className="mb-4 flex shrink-0 flex-col items-center pt-5 animate-in fade-in slide-in-from-top-4 duration-500 md:mb-6 md:pt-8">
            <img
              src={LOGO_URL}
              alt="Mundo de Kaboo"
              className="w-36 h-auto mb-2 object-contain md:w-44"
            />
            <p className="text-gray-500 font-medium text-xs md:text-sm">
              {isAdminLogin ? 'Acesso Interno' : 'Para Professores'}
            </p>
          </div>
        )}

        <div className={`mx-auto flex min-h-0 w-full flex-1 flex-col px-6 py-4 md:px-6 md:py-6 md:pb-10 ${isRegistering ? 'justify-start overflow-y-auto' : 'justify-center overflow-hidden'}`}>

          {/* Title for Login Mode Only */}
          {!isRegistering && (
            <>
              <h2 className="text-xl font-bold text-gray-800 text-center md:text-2xl">
                {isAdminLogin ? 'Login Administrativo' : 'Bem-vindo de volta!'}
              </h2>
              {isAdminLogin && (
                <p className="mb-4 text-center text-sm leading-relaxed text-gray-500">
                  Acesso restrito a equipe interna.
                </p>
              )}
            </>
          )}

          <form onSubmit={handleAuth} className="space-y-4">

            {/* Registration Fields */}
            {isRegistering && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <label htmlFor="field-voucher-register" className="text-sm font-bold text-gray-600 ml-2">Codigo de Acesso</label>
                  <div className="relative">
                    <input
                      id="field-voucher-register"
                      type="text"
                      value={voucherCode}
                      onChange={(e) => handleVoucherCodeChange(e.target.value)}
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all"
                      placeholder="Ex.: KABOO-3MESES-2026"
                      required={isRegistering}
                      readOnly={isRegisterVoucherValidated}
                      autoComplete="off"
                      autoCapitalize="characters"
                    />
                    <Icons.Check className="absolute left-4 top-4 text-gray-400" size={20} />
                  </div>


                  {!isRegisterVoucherValidated ? (
                    <div className="rounded-2xl border border-kaboo-primary/10 bg-kaboo-primary/5 px-4 py-4 text-sm text-kaboo-primary space-y-3">
                      <p className="font-semibold leading-relaxed">
                        Valide primeiro o codigo para liberar o cadastro. So quem recebeu um voucher consegue criar conta neste fluxo.
                      </p>
                      <Button
                        type="button"
                        fullWidth
                        onClick={handleValidateVoucherForSignup}
                        disabled={loading || !voucherCode.trim()}
                      >
                        {loading ? 'Validando codigo...' : 'Validar codigo e continuar'}
                      </Button>
                      <div className="pt-1 text-center">
                        <a
                          href={LEAD_CAPTURE_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-kaboo-primary/70 hover:text-kaboo-primary font-semibold transition-colors"
                        >
                          Nao tenho um codigo &mdash; Quero conhecer a plataforma &rarr;
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-4 text-sm text-green-800 space-y-3">
                      <p className="font-semibold">Codigo pronto para uso.</p>
                      <p>{voucherValidationMsg}</p>
                      <Button type="button" variant="ghost" fullWidth onClick={handleUseAnotherVoucher}>
                        Usar outro codigo
                      </Button>
                    </div>
                  )}
                </div>

                {isRegisterVoucherValidated && (
                  <>
                    <div className="space-y-2">
                      <label htmlFor="field-name" className="text-sm font-bold text-gray-600 ml-2">Nome Completo</label>
                      <div className="relative">
                        <input
                          id="field-name"
                          type="text"
                          value={fullName}
                          onChange={(e) => { setFullName(e.target.value); clearError(); }}
                          className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all"
                          placeholder="Seu nome"
                          required={isRegistering}
                          minLength={3}
                          autoComplete="name"
                        />
                        <Icons.User className="absolute left-4 top-4 text-gray-400" size={20} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="field-school" className="text-sm font-bold text-gray-600 ml-2">Escola</label>
                      <div className="relative">
                        <input
                          id="field-school"
                          type="text"
                          value={schoolName}
                          onChange={(e) => { setSchoolName(e.target.value); clearError(); }}
                          className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all"
                          placeholder="Nome da sua escola"
                          required={isRegistering}
                          minLength={3}
                          autoComplete="organization"
                        />
                        <Icons.Home className="absolute left-4 top-4 text-gray-400" size={20} />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {(!isRegistering || isRegisterVoucherValidated) && (
              <>
                {/* Email Field */}
                <div className="space-y-2">
                  <label htmlFor="field-email" className="text-sm font-bold text-gray-600 ml-2">E-mail</label>
                  <div className="relative">
                    <input
                      id="field-email"
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); clearError(); }}
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all"
                      placeholder="email@escola.com.br"
                      required
                      autoComplete="email"
                    />
                    <Icons.Mail className="absolute left-4 top-4 text-gray-400" size={20} />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label htmlFor="field-password" className="text-sm font-bold text-gray-600 ml-2">Senha</label>
                  <div className="relative">
                    <input
                      id="field-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); clearError(); }}
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 pr-12 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all"
                      placeholder="••••••••"
                      required
                      minLength={6}
                      autoComplete={isRegistering ? 'new-password' : 'current-password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showPassword ? <Icons.EyeOff size={20} /> : <Icons.Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password - Only for Registration (P1.4) */}
                {isRegistering && (
                  <div className="space-y-2">
                    <label htmlFor="field-confirm-password" className="text-sm font-bold text-gray-600 ml-2">Confirmar Senha</label>
                    <div className="relative">
                      <input
                        id="field-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); clearError(); }}
                        className="w-full bg-gray-50 border-none rounded-2xl p-4 pr-12 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all"
                        placeholder="••••••••"
                        required
                        minLength={6}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                        className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 focus:outline-none"
                      >
                        {showConfirmPassword ? <Icons.EyeOff size={20} /> : <Icons.Eye size={20} />}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Voucher Field for Login Mode — colapsado por padrão, revelado via toggle */}
            {!isRegistering && !isAdminLogin && (
              <div className="space-y-3">
                {!showLoginVoucherField ? (
                  <button
                    type="button"
                    onClick={() => setShowLoginVoucherField(true)}
                    className="w-full flex items-center gap-3 bg-kaboo-primary/5 hover:bg-kaboo-primary/10 text-kaboo-primary font-semibold py-3 px-4 rounded-xl transition-all duration-200 group"
                  >
                    <Icons.Plus size={18} className="group-hover:scale-110 transition-transform" />
                    <span>Tenho um codigo de acesso para renovar</span>
                  </button>
                ) : (
                  <>
                    <label htmlFor="field-voucher-login" className="text-sm font-bold text-gray-600 ml-2">Codigo de Acesso <span className="font-normal text-gray-400">(opcional)</span></label>
                    <div className="relative">
                      <input
                        id="field-voucher-login"
                        type="text"
                        value={loginVoucherCode}
                        onChange={(e) => { setLoginVoucherCode(e.target.value.toUpperCase().replace(/\s+/g, '')); clearError(); }}
                        className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all"
                        placeholder="Ex.: KABOO-3MESES-2026"
                        autoComplete="off"
                        autoCapitalize="characters"
                        autoFocus
                      />
                      <Icons.Check className="absolute left-4 top-4 text-gray-400" size={20} />
                    </div>
                  </>
                )}
                {/* CTA principal: Não tenho código quero conhecer */}
                <a
                  href={LEAD_CAPTURE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-kaboo-primary/12 to-kaboo-primary/8 hover:from-kaboo-primary/18 hover:to-kaboo-primary/15 text-kaboo-primary font-bold py-3 px-4 rounded-xl transition-all duration-200 group hover:shadow-md"
                >
                  <Icons.Mail size={18} className="group-hover:animate-bounce" />
                  <span>Não tenho código quero conhecer</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </a>
              </div>
            )}

            {/* Privacy Policy Checkbox - Only for Registration */}
            {isRegistering && isRegisterVoucherValidated && (
              <div className="flex items-center gap-3 px-2 py-2 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="relative flex items-center justify-center shrink-0">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={acceptedTerms}
                    onChange={(e) => {
                      setAcceptedTerms(e.target.checked);
                      clearError();
                    }}
                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-gray-300 transition-all checked:border-kaboo-primary checked:bg-kaboo-primary focus:ring-2 focus:ring-kaboo-primary/30 outline-none"
                  />
                  <Icons.Check
                    size={14}
                    strokeWidth={4}
                    className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
                  />
                </div>
                <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer select-none leading-tight">
                  Li e concordo com a <a href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer" className="text-kaboo-primary font-bold hover:underline">política de privacidade</a> do Mundo de Kaboo.
                </label>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div role="status" aria-live="polite" className="bg-green-50 text-green-600 text-sm p-3 rounded-xl font-bold text-center animate-in fade-in flex items-center justify-center gap-2">
                <Icons.Check size={16} />
                {successMsg}
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div role="alert" className="bg-red-50 text-red-500 text-sm p-3 rounded-xl font-medium text-center animate-in fade-in">
                {errorMsg}
                {showContinueToHome && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => onNavigate('home')}
                      className="text-sm font-bold text-kaboo-primary hover:underline"
                    >
                      Ir para a plataforma mesmo assim →
                    </button>
                  </div>
                )}
              </div>
            )}

            {(!isRegistering || isRegisterVoucherValidated) && (
              <div className="pt-2">
                <Button type="submit" fullWidth disabled={loading || (isRegistering && !acceptedTerms)}>
                  {loading ? 'Carregando...' : (isRegistering ? 'Criar Conta' : 'Entrar')}
                </Button>
              </div>
            )}
          </form>

          {/* Footer Actions */}
          <div className="mt-4 pb-2 text-center space-y-2 md:mt-5 md:space-y-3">

            {!isRegistering && !isAdminLogin && (
              <p className="text-gray-600 text-sm">
                Ainda não tem conta?{' '}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="font-bold text-kaboo-light hover:text-kaboo-primary underline decoration-2 decoration-transparent hover:decoration-kaboo-primary transition-all"
                >
                  Cadastre-se
                </button>
              </p>
            )}



            {!isRegistering && (
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onNavigate('forgot_password')}
                  className="text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 py-2 px-3 rounded-lg transition-all duration-200"
                >
                  Esqueci minha senha
                </button>
                {!isAdminLogin && (
                  <>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={enterAdminLogin}
                      className="text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 py-2 px-3 rounded-lg transition-all duration-200"
                    >
                      Acesso Interno
                    </button>
                  </>
                )}
              </div>
            )}

            {isAdminLogin && (
              <button
                type="button"
                onClick={exitAdminLogin}
                className="text-xs font-semibold text-gray-400 hover:text-gray-600"
              >
                ← Voltar ao login com codigo de acesso
              </button>
            )}
          </div>


        </div>
      </div>
    </div>
  );
};
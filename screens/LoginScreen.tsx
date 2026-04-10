import React, { useState } from 'react';
import { Button } from '../components/Button';
import { ScreenName, UserProfile, Voucher } from '../types';
import { Icons } from '../components/Icons';
import { LOGO_URL, LEAD_CAPTURE_URL, PRIVACY_POLICY_URL } from '../constants';
import { api } from '../lib/api';
import { logger } from '../lib/logger';

type LoginStep =
  | 'entry'
  | 'voucher'
  | 'account_choice'
  | 'register'
  | 'login_with_voucher'
  | 'login';

const StepDots: React.FC<{ current: number; total: number }> = ({ current, total }) => (
  <div className="flex items-center gap-2 justify-center py-2">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className={`rounded-full transition-all duration-300 ${
          i + 1 === current
            ? 'w-6 h-2 bg-kaboo-primary'
            : i + 1 < current
            ? 'w-2 h-2 bg-kaboo-primary/40'
            : 'w-2 h-2 bg-gray-200'
        }`}
      />
    ))}
  </div>
);

interface LoginScreenProps {
  onNavigate: (screen: ScreenName, params?: any) => void;
  onAuthSuccess?: (profile: UserProfile | null) => void | Promise<void>;
}

import backgroundImage from '../assets/images/background-login.jpg';
const BG_IMAGE = backgroundImage;
const PENDING_SIGNUP_VOUCHER_STORAGE_KEY = 'kaboo_pending_signup_voucher';

const savePendingSignupVoucher = (voucherCode: string) => {
  if (typeof window === 'undefined') return;

  localStorage.setItem(PENDING_SIGNUP_VOUCHER_STORAGE_KEY, voucherCode.trim().toUpperCase());
};

const clearPendingSignupVoucher = () => {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(PENDING_SIGNUP_VOUCHER_STORAGE_KEY);
};

const getPendingSignupVoucher = (): string => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(PENDING_SIGNUP_VOUCHER_STORAGE_KEY) || '';
};

const formatVoucherDurationLabel = (months: number): string => {
  return `${months} ${months === 1 ? 'mês' : 'meses'}`;
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
  const [step, setStep] = useState<LoginStep>('entry');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [voucherValidationMsg, setVoucherValidationMsg] = useState<string | null>(null);
  const [validatedVoucher, setValidatedVoucher] = useState<Voucher | null>(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showContinueToHome, setShowContinueToHome] = useState(false);

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

  const handleValidateVoucher = async () => {
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
      setVoucherValidationMsg(`${formatVoucherDurationLabel(result.voucher.duration_months)} de acesso prontos para resgatar`);
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

  const goBack = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    switch (step) {
      case 'voucher': setStep('entry'); break;
      case 'account_choice': setStep('voucher'); break;
      case 'register': setStep('account_choice'); break;
      case 'login_with_voucher': setStep('account_choice'); break;
      case 'login':
        setStep('entry');
        break;
      default: setStep('entry');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (step === 'register') {
        if (!acceptedTerms) {
          throw new Error('Você precisa aceitar a política de privacidade para continuar.');
        }
        if (password !== confirmPassword) {
          throw new Error('As senhas não coincidem. Verifique e tente novamente.');
        }
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
        savePendingSignupVoucher(voucherCode);
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
        setStep('login');
        setVoucherCode('');
        clearVoucherValidation();
        setConfirmPassword('');
        setSuccessMsg(result.message || 'Conta criada com sucesso! Faça login para ativar seu acesso.');

      } else if (step === 'login_with_voucher') {
        const result = await api.signIn(email, password);
        if (!result.success) {
          throw new Error(result.error || 'Nao foi possivel iniciar a sessao.');
        }
        let currentProfile = result.profile;
        const pendingVoucher = getPendingSignupVoucher();
        if (pendingVoucher) {
          const pr = await api.redeemVoucher(pendingVoucher);
          if (pr.success && pr.profile) { currentProfile = pr.profile; clearPendingSignupVoucher(); }
        }
        const voucherToRedeem = voucherCode.trim().replace(/\s+/g, '');
        if (voucherToRedeem) {
          const redemption = await api.redeemVoucher(voucherToRedeem);
          if (redemption.success && redemption.profile) {
            currentProfile = redemption.profile;
          } else if (!redemption.success) {
            if (currentProfile && onAuthSuccess) await onAuthSuccess(currentProfile);
            setErrorMsg(redemption.message || 'Login realizado, mas nao foi possivel resgatar o voucher.');
            setShowContinueToHome(true);
            return;
          }
        }
        if (currentProfile && onAuthSuccess) await onAuthSuccess(currentProfile);
        if (currentProfile?.access_status === 'active') clearPendingSignupVoucher();
        onNavigate('home');

      } else {
        // login or admin
        const result = await api.signIn(email, password);
        if (!result.success) {
          throw new Error(result.error || 'Nao foi possivel iniciar a sessao.');
        }
        let currentProfile = result.profile;
        const pendingVoucher = getPendingSignupVoucher();
        if (pendingVoucher) {
          const pr = await api.redeemVoucher(pendingVoucher);
          if (pr.success && pr.profile) { currentProfile = pr.profile; clearPendingSignupVoucher(); }
        }
        if (currentProfile && onAuthSuccess) await onAuthSuccess(currentProfile);
        if (currentProfile?.access_status === 'active') clearPendingSignupVoucher();
        onNavigate('home');
      }
    } catch (error: any) {
      logger.error('Auth error', error);
      const normalizedError = normalizeAuthError(error.message || '');
      if (normalizedError.requiresEmailConfirmation) {
        onNavigate('email_confirmation', { status: 'pending', email, message: normalizedError.message });
        return;
      }
      setErrorMsg(normalizedError.message);
    } finally {
      setLoading(false);
    }
  };

  const isFullScreenMax = step === 'register';

  // Shared voucher badge shown in account_choice, register, login_with_voucher
  const VoucherBadge = validatedVoucher ? (
    <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm">
      <Icons.Check size={16} className="text-green-500 shrink-0" />
      <span className="font-bold text-green-700">{validatedVoucher.code}</span>
      <span className="text-green-600 ml-auto font-medium">{formatVoucherDurationLabel(validatedVoucher.duration_months)} ✓</span>
    </div>
  ) : null;

  // Shared error/success feedback
  const FeedbackArea = (
    <>
      {successMsg && (
        <div role="status" aria-live="polite" className="bg-green-50 text-green-600 text-sm p-3 rounded-xl font-bold text-center animate-in fade-in flex items-center justify-center gap-2">
          <Icons.Check size={16} />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div role="alert" aria-live="assertive" className="bg-red-50 text-red-500 text-sm p-3 rounded-xl font-medium text-center animate-in fade-in">
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
    </>
  );

  return (
    <div
      className="relative flex h-[100dvh] overflow-hidden bg-gray-50 bg-cover bg-center bg-no-repeat p-0 md:items-center md:justify-center md:p-6 lg:p-8"
      style={{ backgroundImage: `url(${BG_IMAGE})` }}
    >
      <div className="absolute inset-0 bg-kaboo-primary/20 backdrop-blur-[2px]" />

      <div className={`relative z-10 flex h-[100dvh] w-full flex-col overflow-hidden bg-white transition-all duration-300 md:h-auto md:max-h-[calc(100dvh-3rem)] md:max-w-md md:rounded-3xl md:shadow-2xl lg:max-h-[calc(100dvh-4rem)] ${isFullScreenMax ? 'md:max-w-lg' : ''}`}>

        {/* ─── HEADER: back button + centered logo (all non-entry steps) ─── */}
        {step !== 'entry' && (
          <div className="relative flex shrink-0 items-center justify-center border-b border-gray-100 px-5 py-3">
            <button
              type="button"
              onClick={goBack}
              aria-label="Voltar"
              className="absolute left-4 w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-600"
            >
              <Icons.ChevronLeft size={22} />
            </button>
            <img src={LOGO_URL} alt="Mundo de Kaboo" className="h-12 w-auto object-contain" />
          </div>
        )}

        {/* ─── STEP 0: ENTRY ─── */}
        {step === 'entry' && (
          <div className="flex flex-col items-center flex-1 justify-center px-6 py-8 animate-in fade-in duration-300">
            <img src={LOGO_URL} alt="Mundo de Kaboo" className="w-40 h-auto object-contain mb-6 md:w-48" />
            <h1 className="text-2xl font-bold text-gray-800 text-center mb-1">Bem-vindo de volta!</h1>
            <p className="text-sm text-gray-500 text-center mb-8">Como você quer acessar hoje?</p>

            <div className="w-full space-y-3 max-w-sm">
              <button
                type="button"
                onClick={() => setStep('voucher')}
                className="w-full bg-kaboo-primary text-white font-bold py-4 px-5 rounded-2xl text-base transition-all duration-200 hover:opacity-90 active:scale-[0.98] flex items-center gap-3 shadow-md shadow-kaboo-primary/20"
              >
                <Icons.Ticket size={22} className="shrink-0" />
                <span className="flex-1 text-left">Tenho um código de acesso</span>
                <Icons.ChevronRight size={20} className="opacity-70 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => setStep('login')}
                className="w-full bg-white border-2 border-kaboo-primary/20 text-kaboo-primary font-semibold py-4 px-5 rounded-2xl text-base transition-all duration-200 hover:border-kaboo-primary/40 hover:bg-kaboo-primary/5 active:scale-[0.98] flex items-center gap-3"
              >
                <Icons.User size={22} className="shrink-0" />
                <span className="flex-1 text-left">Já tenho conta</span>
                <Icons.ChevronRight size={20} className="opacity-50 shrink-0" />
              </button>
            </div>


          </div>
        )}

        {/* ─── STEP 1: VOUCHER (code-first) ─── */}
        {step === 'voucher' && (
          <div className="flex flex-col flex-1 px-6 pt-4 pb-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <StepDots current={1} total={3} />
            <h2 className="text-xl font-bold text-gray-800 mt-3 mb-1">Qual é o seu código?</h2>
            <p className="text-sm text-gray-500 mb-5">Use o código impresso no seu material de acesso</p>

            <div className="space-y-3">
              <div className="relative">
                <label htmlFor="field-voucher" className="sr-only">Código de acesso</label>
                <input
                  id="field-voucher"
                  type="text"
                  value={voucherCode}
                  onChange={(e) => handleVoucherCodeChange(e.target.value)}
                  className={`w-full bg-gray-50 border-2 rounded-2xl p-4 pl-12 text-gray-800 placeholder-gray-400 outline-none transition-all text-base tracking-widest font-mono uppercase ${
                    validatedVoucher
                      ? 'border-green-300 bg-green-50/50 focus:border-green-400'
                      : 'border-gray-100 focus:border-kaboo-primary'
                  }`}
                  placeholder="Ex.: KABOO-3MESES-2026"
                  autoComplete="one-time-code"
                  autoCapitalize="characters"
                  autoFocus
                  readOnly={!!validatedVoucher}
                />
                <span className="absolute left-4 top-4">
                  {validatedVoucher
                    ? <Icons.Check size={20} className="text-green-500" />
                    : <Icons.Ticket size={20} className="text-gray-400" />
                  }
                </span>
              </div>

              {voucherValidationMsg && validatedVoucher && (
                <div className="flex items-start gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm text-green-700 animate-in fade-in duration-200">
                  <Icons.Check size={16} className="text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">{validatedVoucher.code}</p>
                    <p>{voucherValidationMsg}</p>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div role="alert" aria-live="assertive" className="bg-red-50 text-red-500 text-sm p-3 rounded-xl font-medium animate-in fade-in">
                  {errorMsg}
                </div>
              )}

              {!validatedVoucher ? (
                <Button
                  type="button"
                  fullWidth
                  onClick={handleValidateVoucher}
                  disabled={loading || !voucherCode.trim()}
                >
                  {loading ? 'Validando...' : 'Validar código'}
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button type="button" fullWidth onClick={() => setStep('account_choice')}>
                    Continuar →
                  </Button>
                  <button
                    type="button"
                    onClick={handleUseAnotherVoucher}
                    className="w-full text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors"
                  >
                    Usar outro código
                  </button>
                </div>
              )}
            </div>

            <div className="mt-auto pt-6 text-center">
              <a
                href={LEAD_CAPTURE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-kaboo-primary/70 hover:text-kaboo-primary font-semibold transition-colors group"
              >
                Não tenho código — quero conhecer{' '}
                <span className="group-hover:translate-x-0.5 inline-block transition-transform">→</span>
              </a>
            </div>
          </div>
        )}

        {/* ─── STEP 2: ACCOUNT CHOICE (code-first) ─── */}
        {step === 'account_choice' && (
          <div className="flex flex-col flex-1 px-6 pt-4 pb-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <StepDots current={2} total={3} />
            {VoucherBadge && <div className="mt-3">{VoucherBadge}</div>}
            <h2 className="text-xl font-bold text-gray-800 mt-4 mb-1">Como você quer continuar?</h2>
            <p className="text-sm text-gray-500 mb-6">Escolha de acordo com sua situação</p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setStep('register')}
                className="w-full text-left bg-white border-2 border-gray-100 hover:border-kaboo-primary/30 hover:bg-kaboo-primary/[0.03] rounded-2xl p-5 transition-all duration-200 group active:scale-[0.99]"
              >
                <p className="font-bold text-gray-800 group-hover:text-kaboo-primary mb-1">Sou novo no Kaboo</p>
                <p className="text-sm text-gray-400">Criar uma conta agora com este código</p>
              </button>

              <button
                type="button"
                onClick={() => setStep('login_with_voucher')}
                className="w-full text-left bg-white border-2 border-gray-100 hover:border-kaboo-primary/30 hover:bg-kaboo-primary/[0.03] rounded-2xl p-5 transition-all duration-200 group active:scale-[0.99]"
              >
                <p className="font-bold text-gray-800 group-hover:text-kaboo-primary mb-1">Já tenho uma conta</p>
                <p className="text-sm text-gray-400">Entrar e resgatar este código</p>
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 3A: REGISTER (code-first — new user) ─── */}
        {step === 'register' && (
          <div className="flex flex-col flex-1 px-6 pt-4 overflow-y-auto animate-in fade-in slide-in-from-right-4 duration-300">
            <StepDots current={3} total={3} />
            {VoucherBadge && <div className="mt-3">{VoucherBadge}</div>}
            <h2 className="text-xl font-bold text-gray-800 mt-4 mb-1">Crie sua conta</h2>

            <form onSubmit={handleAuth} className="space-y-4 mt-4 pb-8">
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
                    required
                    minLength={3}
                    autoComplete="name"
                    autoFocus
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
                    required
                    minLength={3}
                    autoComplete="organization"
                  />
                  <Icons.Home className="absolute left-4 top-4 text-gray-400" size={20} />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="field-email-reg" className="text-sm font-bold text-gray-600 ml-2">E-mail</label>
                <div className="relative">
                  <input
                    id="field-email-reg"
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

              <div className="space-y-2">
                <label htmlFor="field-password-reg" className="text-sm font-bold text-gray-600 ml-2">Senha</label>
                <div className="relative">
                  <input
                    id="field-password-reg"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearError(); }}
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 pr-12 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 focus:outline-none">
                    {showPassword ? <Icons.EyeOff size={20} /> : <Icons.Eye size={20} />}
                  </button>
                </div>
              </div>

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
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? 'Ocultar confirmação' : 'Mostrar confirmação'} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 focus:outline-none">
                    {showConfirmPassword ? <Icons.EyeOff size={20} /> : <Icons.Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 px-2 py-2">
                <div className="relative flex items-center justify-center shrink-0">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={acceptedTerms}
                    onChange={(e) => { setAcceptedTerms(e.target.checked); clearError(); }}
                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-gray-300 transition-all checked:border-kaboo-primary checked:bg-kaboo-primary focus:ring-2 focus:ring-kaboo-primary/30 outline-none"
                  />
                  <Icons.Check size={14} strokeWidth={4} className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
                <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer select-none leading-tight">
                  Li e concordo com a{' '}
                  <a href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer" className="text-kaboo-primary font-bold hover:underline">
                    política de privacidade
                  </a>{' '}
                  do Mundo de Kaboo.
                </label>
              </div>

              {FeedbackArea}

              <Button type="submit" fullWidth disabled={loading || !acceptedTerms}>
                {loading ? 'Criando conta...' : 'Criar Conta'}
              </Button>
            </form>
          </div>
        )}

        {/* ─── STEP 3B: LOGIN WITH VOUCHER (code-first — existing user) ─── */}
        {step === 'login_with_voucher' && (
          <div className="flex flex-col flex-1 px-6 pt-4 pb-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <StepDots current={3} total={3} />
            {VoucherBadge && <div className="mt-3">{VoucherBadge}</div>}
            <h2 className="text-xl font-bold text-gray-800 mt-4 mb-1">Entre para resgatar</h2>
            <p className="text-sm text-gray-500 mb-5">Use sua conta existente para ativar o código</p>

            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="field-email-lwv" className="text-sm font-bold text-gray-600 ml-2">E-mail</label>
                <div className="relative">
                  <input
                    id="field-email-lwv"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearError(); }}
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all"
                    placeholder="email@escola.com.br"
                    required
                    autoComplete="email"
                    autoFocus
                  />
                  <Icons.Mail className="absolute left-4 top-4 text-gray-400" size={20} />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="field-password-lwv" className="text-sm font-bold text-gray-600 ml-2">Senha</label>
                <div className="relative">
                  <input
                    id="field-password-lwv"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearError(); }}
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 pr-12 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 focus:outline-none">
                    {showPassword ? <Icons.EyeOff size={20} /> : <Icons.Eye size={20} />}
                  </button>
                </div>
              </div>

              {FeedbackArea}

              <Button type="submit" fullWidth disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar e resgatar'}
              </Button>

              <button
                type="button"
                onClick={() => onNavigate('forgot_password')}
                className="w-full text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors text-center"
              >
                Esqueci minha senha
              </button>
            </form>
          </div>
        )}

        {/* ─── DIRECT LOGIN (já tenho conta) ─── */}
        {step === 'login' && (
          <div className="flex flex-col flex-1 px-6 pt-4 pb-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-bold text-gray-800 mb-1">Bem-vindo de volta!</h2>
            <p className="text-sm text-gray-500 mb-5">Entre com seu e-mail e senha</p>

            <form onSubmit={handleAuth} className="space-y-4">
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
                    autoFocus
                  />
                  <Icons.Mail className="absolute left-4 top-4 text-gray-400" size={20} />
                </div>
              </div>

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
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 focus:outline-none">
                    {showPassword ? <Icons.EyeOff size={20} /> : <Icons.Eye size={20} />}
                  </button>
                </div>
              </div>

              {FeedbackArea}

              <Button type="submit" fullWidth disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => onNavigate('forgot_password')}
                className="text-sm font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100 py-2 px-3 rounded-lg transition-all duration-200"
              >
                Esqueci minha senha
              </button>
            </div>
          </div>
        )}



      </div>
    </div>
  );
};


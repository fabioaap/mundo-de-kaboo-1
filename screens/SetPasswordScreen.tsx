import React, { useState, useEffect } from 'react';
import { Button } from '../design-system';
import { ScreenName } from '../types';
import { supabase } from '../lib/supabase';
import { Icons } from '../components/Icons';
import backgroundImage from '../assets/images/background-login.jpg';

interface SetPasswordScreenProps {
  onNavigate: (screen: ScreenName) => void;
  onPasswordSet?: () => void;
  linkExpired?: boolean;
}

const BG_IMAGE = backgroundImage;

export const SetPasswordScreen: React.FC<SetPasswordScreenProps> = ({ onNavigate, onPasswordSet, linkExpired }) => {
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
  }, [])

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

      setSuccessMsg('Senha definida com sucesso! Redirecionando...');
      setTimeout(() => {
        if (onPasswordSet) {
          onPasswordSet();
        } else {
          onNavigate('home');
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
      className="flex min-h-screen bg-gray-50 items-center justify-center p-0 md:p-8 relative bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${BG_IMAGE})` }}
    >
      <div className="absolute inset-0 bg-kaboo-primary/20 backdrop-blur-[2px]" />

      <div className="relative z-10 w-full bg-white min-h-screen md:min-h-0 md:h-auto md:max-w-md md:rounded-3xl md:shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">

        {/* Header */}
        <div className="px-6 pt-12 pb-4 flex items-center gap-4 border-b border-gray-100 shrink-0 md:pt-8">
          <div className="w-10 h-10 rounded-full bg-kaboo-primary/10 flex items-center justify-center text-kaboo-primary">
            <Icons.Lock size={22} />
          </div>
          <h1 className="text-xl font-bold text-gray-800 flex-1">Criar sua senha</h1>
        </div>

        <div className="w-full mx-auto flex-1 flex flex-col justify-center px-6 py-6 md:pb-12">

          {/* Link expirado */}
          {linkExpired ? (
            <div className="flex flex-col items-center gap-5 text-center py-8">
              <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                <Icons.AlertCircle size={32} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-2">Link de convite expirado</h2>
                <p className="text-gray-500 text-sm leading-relaxed">
                  O link que você recebeu por e-mail já foi usado ou expirou.
                  Solicite ao administrador que reenvie o convite.
                </p>
              </div>
              <Button variant="secondary" onClick={() => onNavigate('login')}>
                Voltar ao login
              </Button>
            </div>
          ) : successMsg ? (
            <div className="flex flex-col items-center gap-4 text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                <Icons.Check size={32} />
              </div>
              <p className="text-gray-700 font-medium">{successMsg}</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <p className="text-gray-500 text-sm mb-1">Você foi convidado para o</p>
                <p className="text-gray-800 font-bold text-base">Mundo de Kaboo</p>
              </div>

              {/* E-mail pré-preenchido */}
              {userEmail && (
                <div className="mb-4 bg-gray-50 rounded-2xl px-4 py-3 flex items-center gap-3">
                  <Icons.Mail size={18} className="text-gray-400 shrink-0" />
                  <span className="text-gray-700 text-sm font-medium truncate">{userEmail}</span>
                </div>
              )}

              <div className="text-center mb-6">
                <p className="text-gray-500 text-sm leading-relaxed">
                  Escolha uma senha para acessar a plataforma.
                  Ela precisa ter pelo menos <strong>8 caracteres</strong>.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nova senha */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-600 ml-2">Nova senha</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setErrorMsg(null); }}
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 pr-12 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all"
                      placeholder="Mínimo 8 caracteres"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 focus:outline-none"
                      tabIndex={-1}
                    >
                      {showPassword ? <Icons.EyeOff size={20} /> : <Icons.Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Confirmar senha */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-600 ml-2">Confirmar senha</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => { setConfirm(e.target.value); setErrorMsg(null); }}
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 pr-12 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all"
                      placeholder="Repita a senha"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 focus:outline-none"
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
                  <Button type="submit" fullWidth disabled={loading}>
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

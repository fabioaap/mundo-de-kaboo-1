import React, { useState } from 'react';
import { Button } from '../components/Button';
import { ScreenName } from '../types';
import { supabase } from '../lib/supabase';
import { Icons } from '../components/Icons';
import backgroundImage from '../assets/images/background-login.jpg';

interface ForgotPasswordScreenProps {
  onNavigate: (screen: ScreenName) => void;
}

const BG_IMAGE = backgroundImage;

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ onNavigate }) => {
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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin, // Simple redirect logic
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
      className="flex min-h-screen bg-gray-50 items-center justify-center p-0 md:p-8 relative bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${BG_IMAGE})` }}
    >
      {/* Overlay to ensure contrast and branding */}
      <div className="absolute inset-0 bg-kaboo-primary/20 backdrop-blur-[2px]"></div>
      
      {/* UPDATED CLASS: min-h-screen on mobile, w-full, md:max-w-md restricts width only on desktop */}
      <div className="relative z-10 w-full bg-white min-h-screen md:min-h-0 md:h-auto md:max-w-md md:rounded-3xl md:shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* HEADER */}
        <div className="px-6 pt-12 pb-4 flex items-center gap-4 border-b border-gray-100 shrink-0 md:pt-8">
          <button 
            type="button"
            onClick={() => onNavigate('login')}
            className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-700"
          >
            <Icons.ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-gray-800 flex-1">Recuperar Senha</h1>
        </div>

        <div className="w-full mx-auto flex-1 flex flex-col justify-center px-6 py-6 md:pb-12">
          
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-kaboo-primary mx-auto mb-4">
                <Icons.Mail size={32} />
            </div>
            <p className="text-gray-600 leading-relaxed">
               Digite seu e-mail abaixo e enviaremos um link seguro para você criar uma nova senha.
            </p>
          </div>

          <form onSubmit={handleReset} className="space-y-6">
            
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600 ml-2">E-mail</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all"
                  placeholder="email@escola.com.br"
                  required
                />
                <Icons.Mail className="absolute left-4 top-4 text-gray-400" size={20} />
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
                    className="text-kaboo-primary font-bold hover:underline"
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
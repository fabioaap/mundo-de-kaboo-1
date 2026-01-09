import React, { useState } from 'react';
import { Button } from '../components/Button';
import { ScreenName } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Icons } from '../components/Icons';
import { LOGO_URL } from '../constants';

interface LoginScreenProps {
  onNavigate: (screen: ScreenName, params?: any) => void;
}

import backgroundImage from '../assets/images/background-login.jpg';
const BG_IMAGE = backgroundImage;

/**
 * Helper function to create user profile
 * This is called asynchronously to avoid blocking the signup flow
 */
async function createUserProfile(
  userId: string, 
  email: string, 
  fullName: string, 
  schoolName: string
): Promise<void> {
  try {
    console.log('Creating profile for user:', userId);
    
    // First, check if profile already exists (might be created by trigger)
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned, which is OK
      console.error('Error checking existing profile:', checkError);
      throw checkError;
    }
    
    // Ensure we handle empty strings properly - convert to null
    const cleanEmail = email?.trim() || null;
    const cleanFullName = fullName?.trim() || null;
    const cleanSchoolName = schoolName?.trim() || null;
    
    const profileData = {
      id: userId,
      email: cleanEmail,
      full_name: cleanFullName,
      school_name: cleanSchoolName,
      role: 'viewer' as const,
      updated_at: new Date().toISOString()
    };
    
    console.log('Profile data to insert:', profileData);
    
    if (existingProfile) {
      // Profile already exists, just update it
      console.log('Profile exists, updating...');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          email: profileData.email,
          full_name: profileData.full_name,
          school_name: profileData.school_name,
          updated_at: profileData.updated_at
        })
        .eq('id', userId);
      
      if (updateError) {
        console.error('Error updating existing profile:', {
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint
        });
        throw updateError;
      }
      console.log('Profile updated successfully');
    } else {
      // Profile doesn't exist, create it
      console.log('Profile does not exist, creating...');
      const { error: insertError } = await supabase
        .from('profiles')
        .insert(profileData);
      
      if (insertError) {
        console.error('Error creating profile:', {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint
        });
        throw insertError;
      }
      console.log('Profile created successfully');
    }
  } catch (error: any) {
    console.error('createUserProfile error:', error);
    // Don't throw - this is non-blocking
    throw error;
  }
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigate }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  
  // UI State
  const [showPassword, setShowPassword] = useState(false);

  const clearError = () => {
    if (errorMsg) setErrorMsg(null);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent double submission
    
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // 1. Fallback Mode
    if (!isSupabaseConfigured) {
      setTimeout(() => {
        alert('Modo Demonstração: Supabase não configurado. Entrando...');
        onNavigate('home');
        setLoading(false);
      }, 1000);
      return;
    }

    // 2. Supabase Logic
    try {
      if (isRegistering) {
        // Validation: Privacy Policy
        if (!acceptedTerms) {
          throw new Error('Você precisa aceitar a política de privacidade para continuar.');
        }

        // A. Create Auth User
        // Note: We need to include metadata because the database function handle_new_user
        // expects these values to create the profile automatically
        console.log('Attempting to sign up user:', { email, hasPassword: !!password });
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              full_name: fullName.trim() || null,
              school_name: schoolName.trim() || null,
            },
          },
        });

        if (signUpError) {
          console.error('SignUp error details:', {
            message: signUpError.message,
            status: signUpError.status,
            name: signUpError.name,
            code: (signUpError as any).code,
            details: (signUpError as any).details,
            hint: (signUpError as any).hint,
            fullError: signUpError
          });
          throw signUpError;
        }

        if (!signUpData.user) {
          throw new Error('Usuário não foi criado. Por favor, tente novamente.');
        }

        console.log('User created successfully:', signUpData.user.id);
        
        // B. Create/Update Profile (async, non-blocking)
        // The database function handle_new_user should create the profile automatically,
        // but we'll verify and update it if needed (in case the function failed or needs updates)
        // Wait a bit for the database function to complete
        setTimeout(() => {
          createUserProfile(signUpData.user.id, email.trim(), fullName.trim(), schoolName.trim()).catch(err => {
              console.error('Failed to create/update profile (non-blocking):', err);
              // Profile should have been created by handle_new_user function
              // If it failed, it will be created on first access
          });
        }, 500);

        // C. Auto-login Logic with Retry
        if (signUpData.session) {
           onNavigate('home', { isNewUser: true });
           return;
        } 
        
        // Wait longer (2s) to ensure DB propagation before retrying login
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Attempt manual login as fallback
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
             email,
             password
        });
           
        if (signInData?.session) {
             onNavigate('home', { isNewUser: true });
             return;
        }
        
        if (signInError) {
            console.error('Login retry error:', signInError);
            // Don't throw here - account was created, just login failed
        }

        // D. GRACEFUL FAILURE:
        // If we reach here, account was created but auto-login failed.
        // Instead of throwing error, we switch to login mode and show success message.
        setIsRegistering(false);
        setSuccessMsg('Conta criada com sucesso! Por favor, clique em "Entrar".');
        setLoading(false);
        return;

      } else {
        // Login Flow
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.session) {
          onNavigate('home');
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      // Translate common errors
      let msg = error.message || 'Ocorreu um erro. Tente novamente.';
      
      // Database/Profile errors
      if (msg.includes('Database error saving new user')) {
        msg = 'Erro ao salvar perfil do usuário. Por favor, tente novamente ou entre em contato com o suporte.';
      } else if (msg.includes('duplicate key') || msg.includes('already exists')) {
        msg = 'Este e-mail já está cadastrado.';
      } else if (msg.includes('permission denied') || msg.includes('RLS')) {
        msg = 'Erro de permissão. Por favor, entre em contato com o suporte.';
      } else if (msg === 'Invalid login credentials') {
        msg = 'E-mail ou senha incorretos.';
      } else if (msg === 'User already registered') {
        msg = 'Este e-mail já está cadastrado.';
      } else if (msg.includes('security purposes') || msg.includes('rate limit')) {
        msg = 'Muitas tentativas. Por segurança, aguarde alguns instantes e tente novamente.';
      }
      
      setErrorMsg(msg);
    } finally {
      if (!successMsg) setLoading(false); // Only stop loading if we didn't set success manually
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setErrorMsg(null);
    setSuccessMsg(null);
    setAcceptedTerms(false);
    window.scrollTo(0,0);
  };

  return (
    <div 
      className="flex min-h-screen bg-gray-50 items-center justify-center p-0 md:p-8 relative bg-cover bg-center bg-no-repeat"
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
      <div className={`relative z-10 w-full bg-white min-h-screen md:min-h-0 md:h-auto md:max-w-md md:rounded-3xl md:shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${isRegistering ? 'md:max-w-lg' : ''}`}>
        
        {/* HEADER FOR REGISTER MODE */}
        {isRegistering && (
          <div className="px-6 pt-12 pb-4 flex items-center gap-4 border-b border-gray-100 shrink-0 md:pt-8">
            <button 
              type="button"
              onClick={toggleMode}
              className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-700"
            >
              <Icons.ChevronLeft size={24} />
            </button>
            <h1 className="text-xl font-bold text-gray-800 flex-1">Crie sua conta</h1>
          </div>
        )}

        {/* LOGO AREA (Only for Login Mode) */}
        {!isRegistering && (
          <div className="pt-12 md:pt-10 mb-8 flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-500">
            <img 
              src={LOGO_URL} 
              alt="Mundo de Kaboo" 
              className="w-48 h-auto mb-4 object-contain"
            />
            <p className="text-gray-500 font-medium text-sm">Para Professores</p>
          </div>
        )}

        <div className={`w-full mx-auto flex-1 flex flex-col justify-center px-6 py-6 md:pb-12`}>
          
          {/* Title for Login Mode Only */}
          {!isRegistering && (
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              Bem-vindo de volta!
            </h2>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            
            {/* Registration Fields */}
            {isRegistering && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Name */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-600 ml-2">Nome Completo</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => { setFullName(e.target.value); clearError(); }}
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all"
                      placeholder="Seu nome"
                      required={isRegistering}
                    />
                    <Icons.User className="absolute left-4 top-4 text-gray-400" size={20} />
                  </div>
                </div>

                {/* School - Asterisk removed */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-600 ml-2">Escola</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={schoolName}
                      onChange={(e) => { setSchoolName(e.target.value); clearError(); }}
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all"
                      placeholder="Nome da sua escola"
                      required={isRegistering}
                    />
                    <Icons.Home className="absolute left-4 top-4 text-gray-400" size={20} />
                  </div>
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600 ml-2">E-mail</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError(); }}
                  className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all"
                  placeholder="email@escola.com.br"
                  required
                />
                <Icons.Mail className="absolute left-4 top-4 text-gray-400" size={20} />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600 ml-2">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError(); }}
                  className="w-full bg-gray-50 border-none rounded-2xl p-4 pr-12 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <Icons.EyeOff size={20} /> : <Icons.Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Privacy Policy Checkbox - Only for Registration */}
            {isRegistering && (
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
                  Li e concordo com a <button type="button" className="text-kaboo-primary font-bold hover:underline">política de privacidade</button> do Mundo de Kaboo.
                </label>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="bg-green-50 text-green-600 text-sm p-3 rounded-xl font-bold text-center animate-in fade-in flex items-center justify-center gap-2">
                <Icons.Check size={16} />
                {successMsg}
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="bg-red-50 text-red-500 text-sm p-3 rounded-xl font-medium text-center animate-in fade-in">
                {errorMsg}
              </div>
            )}

            <div className="pt-2">
              <Button type="submit" fullWidth disabled={loading}>
                {loading ? 'Carregando...' : (isRegistering ? 'Criar Conta' : 'Entrar')}
              </Button>
            </div>
          </form>

          {/* Footer Actions */}
          <div className="mt-6 text-center space-y-4">
            
            {/* Show Register Link only on Login Mode */}
            {!isRegistering && (
              <p className="text-gray-600 text-sm">
                Ainda não tem conta?
                <button 
                  type="button"
                  onClick={toggleMode}
                  className="ml-1 font-bold text-kaboo-light hover:text-kaboo-primary underline decoration-2 decoration-transparent hover:decoration-kaboo-primary transition-all"
                >
                  Cadastre-se
                </button>
              </p>
            )}

            {!isRegistering && (
              <button 
                type="button" 
                onClick={() => onNavigate('forgot_password')}
                className="text-xs font-semibold text-gray-400 hover:text-gray-600"
              >
                Esqueci minha senha
              </button>
            )}
          </div>
          
          {!isSupabaseConfigured && (
             <div className="mt-8 p-3 bg-yellow-50 border border-yellow-100 rounded-xl text-xs text-yellow-700 text-center">
               ⚠️ <strong>Configuração Necessária</strong><br/>
               Adicione suas chaves no arquivo <code>lib/supabase.ts</code> para conectar o backend real.
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
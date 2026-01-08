import React from 'react';
import { Button } from '../components/Button';
import { ScreenName } from '../types';
import { Icons } from '../components/Icons';
import { LOGO_URL } from '../constants';

interface EmailConfirmationScreenProps {
  onNavigate: (screen: ScreenName) => void;
}

export const EmailConfirmationScreen: React.FC<EmailConfirmationScreenProps> = ({ onNavigate }) => {
  return (
    <div className="flex min-h-screen bg-gray-50 items-center justify-center p-6 relative">
       {/* Blobs Background */}
       <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <div className="absolute top-0 left-0 w-64 h-64 bg-kaboo-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
         <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-100 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
       </div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center text-center relative z-10 animate-in fade-in zoom-in-95 duration-500">
        
        <img src={LOGO_URL} alt="Mundo de Kaboo" className="w-32 h-auto mb-8" />

        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-6">
            <Icons.Check size={40} strokeWidth={3} />
        </div>

        <h1 className="text-2xl font-black text-gray-800 mb-2">
          E-mail Confirmado!
        </h1>
        
        <p className="text-gray-600 mb-8 leading-relaxed">
          Sua conta foi verificada com sucesso. Agora você tem acesso completo ao Mundo de Kaboo.
        </p>

        <Button 
          onClick={() => onNavigate('login')} 
          fullWidth
        >
          Entrar no App
        </Button>
      </div>
    </div>
  );
};
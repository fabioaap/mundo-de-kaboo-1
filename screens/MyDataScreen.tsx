import React, { useState, useEffect } from 'react';
import { Icons } from '../components/Icons';
import { Button } from '../design-system';
import { supabase } from '../lib/supabase';
import { isSupabaseConfigured } from '../lib/supabase';
import { api } from '../lib/api';
import { PageHeader } from '../components/PageHeader';
import { getCharacterImageUrl, getCharacterColor, getCharacterBgColor } from '../constants';
import { getAvatarCharacters } from '../lib/characters';
import { layoutSpacing } from '../design-system/layout/spacing';

interface MyDataScreenProps {
    onBack: () => void;
}

export const MyDataScreen: React.FC<MyDataScreenProps> = ({ onBack }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Visibility States
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: '', // Only for updating
        confirmPassword: '',
        avatar_id: null as string | null
    });

    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        try {
            if (!isSupabaseConfigured) {
                const profile = await api.getProfile(true);

                setFormData(prev => ({
                    ...prev,
                    full_name: profile?.full_name || '',
                    email: profile?.email || '',
                    avatar_id: profile?.avatar_id || null
                }));

                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Try fetching profile from the table
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            // Priority: 1. Profile Table, 2. Auth Metadata, 3. Empty string
            const fullName = profile?.full_name || user.user_metadata?.full_name || '';
            const email = user.email || '';
            const avatarId = profile?.avatar_id || null;

            setFormData(prev => ({
                ...prev,
                full_name: fullName,
                email: email,
                avatar_id: avatarId
            }));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field: string, value: string | null) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (msg) setMsg(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMsg(null);

        try {
            if (!isSupabaseConfigured) {
                if (formData.password && formData.password !== formData.confirmPassword) {
                    throw new Error('As senhas não coincidem.');
                }

                if (formData.password && formData.password.length < 6) {
                    throw new Error('A senha deve ter pelo menos 6 caracteres.');
                }

                const updatedProfile = await api.updateProfile({
                    full_name: formData.full_name,
                    email: formData.email,
                    avatar_id: formData.avatar_id,
                });

                if (!updatedProfile) {
                    throw new Error('Erro ao atualizar dados locais.');
                }

                setFormData(prev => ({
                    ...prev,
                    full_name: updatedProfile.full_name || '',
                    email: updatedProfile.email || '',
                    avatar_id: updatedProfile.avatar_id,
                    password: '',
                    confirmPassword: ''
                }));

                setMsg({
                    type: 'success',
                    text: formData.password
                        ? 'Dados locais atualizados. Senha nao e aplicada no modo demonstracao.'
                        : 'Dados atualizados com sucesso!'
                });

                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            // 1. Update Profile Data (Name and Avatar)
            const updates = {
                id: user.id,
                email: formData.email,
                full_name: formData.full_name,
                school_name: null,
                avatar_id: formData.avatar_id,
                updated_at: new Date().toISOString(),
            };

            const { error: profileError } = await supabase
                .from('profiles')
                .upsert(updates);

            if (profileError) throw profileError;

            // 2. Update Auth Data (Email, Password)
            const authUpdates: any = {};

            authUpdates.data = {
                full_name: formData.full_name,
                school_name: null
            };

            if (formData.email !== user.email) {
                authUpdates.email = formData.email;
            }
            if (formData.password) {
                if (formData.password !== formData.confirmPassword) {
                    throw new Error('As senhas não coincidem.');
                }
                if (formData.password.length < 6) {
                    throw new Error('A senha deve ter pelo menos 6 caracteres.');
                }
                authUpdates.password = formData.password;
            }

            const { error: authError } = await supabase.auth.updateUser(authUpdates);
            if (authError) throw authError;

            // If email changed, Supabase sends a confirmation link to the new address
            const emailChanged = formData.email !== user.email;
            setMsg({
                type: 'success',
                text: emailChanged
                    ? 'Dados salvos! Um link de confirmação foi enviado para o novo e-mail. O endereço atual permanece ativo até a confirmação.'
                    : 'Dados atualizados com sucesso!'
            });

            // Clear password fields
            setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));

        } catch (error: any) {
            console.error(error);
            setMsg({ type: 'error', text: error.message || 'Erro ao atualizar dados.' });
        } finally {
            setSaving(false);
        }
    };

    const getInitials = (name: string) => {
        if (!name) return 'MK';
        return name.trim().split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    };

    if (loading) {
        return <div className="flex h-full items-center justify-center text-kaboo-primary font-bold">Carregando dados...</div>;
    }

    return (
        <div className="flex flex-col h-full bg-white pb-24 md:pb-0 relative">

            {/* Standard Header */}
            <PageHeader title="Meus Dados" onBack={onBack} />

            <div className={`flex-1 overflow-y-auto ${layoutSpacing.pageSection} max-w-3xl`}>
                <form onSubmit={handleSave} className="space-y-6">

                    {/* Avatar Section */}
                    <div className="flex justify-center mb-6">
                        <div className="relative group cursor-pointer" onClick={() => setIsAvatarModalOpen(true)}>
                            <div className={`w-28 h-28 rounded-full border-4 border-gray-100 flex items-center justify-center overflow-hidden shadow-sm relative ${getCharacterColor(formData.avatar_id)}`}>
                                {formData.avatar_id ? (
                                    <>
                                        <div className={`absolute inset-0 opacity-50 ${getCharacterBgColor(formData.avatar_id)} pointer-events-none`} />
                                        <img
                                            src={getCharacterImageUrl(formData.avatar_id)}
                                            alt="Avatar"
                                            className="w-full h-full object-cover relative z-10"
                                            onError={(e) => {
                                                // Fallback to initials if image fails
                                                e.currentTarget.style.display = 'none';
                                                const parent = e.currentTarget.parentElement;
                                                if (parent) {
                                                    const div = document.createElement('div');
                                                    div.className = "text-3xl font-bold text-gray-400"; // Fallback color
                                                    div.innerText = getInitials(formData.full_name);
                                                    parent.appendChild(div);
                                                }
                                            }}
                                        />
                                    </>
                                ) : (
                                    <span className="text-3xl font-bold text-gray-300">
                                        {getInitials(formData.full_name)}
                                    </span>
                                )}
                            </div>
                            {/* Edit Badge - Added z-20 to ensure it is above the image (z-10) */}
                            <div className="absolute bottom-1 right-1 w-8 h-8 bg-kaboo-primary rounded-full flex items-center justify-center text-white border-2 border-white shadow-md transition-transform group-hover:scale-110 z-20">
                                <Icons.Settings size={14} />
                            </div>
                        </div>
                    </div>

                    {/* Personal Info Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Informações Pessoais</h3>

                        <div className="space-y-2">
                            <label htmlFor="mydata-full-name" className="text-sm font-bold text-gray-700 ml-1">Nome Completo</label>
                            <div className="relative">
                                <input
                                    id="mydata-full-name"
                                    type="text"
                                    value={formData.full_name}
                                    onChange={(e) => handleChange('full_name', e.target.value)}
                                    className="w-full bg-gray-50 border border-transparent focus:border-kaboo-primary/30 rounded-2xl p-4 pl-12 text-gray-800 outline-none transition-all"
                                    placeholder="Seu nome"
                                />
                                <Icons.User className="absolute left-4 top-4 text-gray-400" size={20} />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100 my-4" />

                    {/* Account Info Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Conta e Segurança</h3>

                        <div className="space-y-2">
                            <label htmlFor="mydata-email" className="text-sm font-bold text-gray-700 ml-1">E-mail</label>
                            <div className="relative">
                                <input
                                    id="mydata-email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    className="w-full bg-gray-50 border border-transparent focus:border-kaboo-primary/30 rounded-2xl p-4 pl-12 text-gray-800 outline-none transition-all"
                                    placeholder="email@exemplo.com.br"
                                />
                                <Icons.Mail className="absolute left-4 top-4 text-gray-400" size={20} />
                            </div>
                            <p className="text-xs text-gray-400 ml-2">Ao alterar o e-mail, você precisará confirmar no novo endereço.</p>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="mydata-password" className="text-sm font-bold text-gray-700 ml-1">Nova Senha (Opcional)</label>
                            <div className="relative">
                                <input
                                    id="mydata-password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={(e) => handleChange('password', e.target.value)}
                                    className="w-full bg-gray-50 border border-transparent focus:border-kaboo-primary/30 rounded-2xl p-4 pr-12 text-gray-800 outline-none transition-all"
                                    placeholder="Deixe em branco para manter"
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

                        {formData.password && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <label htmlFor="mydata-confirm-password" className="text-sm font-bold text-gray-700 ml-1">Confirmar Nova Senha</label>
                                <div className="relative">
                                    <input
                                        id="mydata-confirm-password"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={formData.confirmPassword}
                                        onChange={(e) => handleChange('confirmPassword', e.target.value)}
                                        className="w-full bg-gray-50 border border-transparent focus:border-kaboo-primary/30 rounded-2xl p-4 pr-12 text-gray-800 outline-none transition-all"
                                        placeholder="Repita a nova senha"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 focus:outline-none"
                                    >
                                        {showConfirmPassword ? <Icons.EyeOff size={20} /> : <Icons.Eye size={20} />}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {msg && (
                        <div className={`p-4 rounded-xl text-sm font-bold text-center ${msg.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                            {msg.text}
                        </div>
                    )}

                    <div className="pt-4 pb-10">
                        <Button type="submit" fullWidth disabled={saving}>
                            {saving ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                    </div>
                </form>
            </div>

            {/* Avatar Selection Modal */}
            {isAvatarModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAvatarModalOpen(false)} />

                    <div className="relative w-full md:w-[600px] h-[70vh] md:h-auto md:max-h-[80vh] bg-white rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300">

                        {/* Modal Header */}
                        <div className={`${layoutSpacing.modalHeader} border-b border-gray-100 flex items-center justify-between`}>
                            <h2 className="text-lg font-bold text-gray-800">Escolha um Personagem</h2>
                            <button onClick={() => setIsAvatarModalOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
                                <Icons.X size={16} />
                            </button>
                        </div>

                        {/* Grid */}
                        <div className={`flex-1 overflow-y-auto ${layoutSpacing.modalBody} grid grid-cols-3 md:grid-cols-4 ${layoutSpacing.cardGridGap}`}>

                            {/* Default Option (Initials) */}
                            <button
                                onClick={() => { handleChange('avatar_id', null); setIsAvatarModalOpen(false); }}
                                className="flex flex-col items-center gap-2 group"
                            >
                                <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center bg-gray-100 border-4 border-white shadow-md group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 ${!formData.avatar_id ? 'ring-4 ring-kaboo-primary ring-offset-2' : ''}`}>
                                    <span className="text-2xl font-black text-gray-400 group-hover:text-kaboo-primary transition-colors">
                                        {getInitials(formData.full_name)}
                                    </span>
                                </div>
                                <span className={`text-xs md:text-sm font-bold text-center leading-tight transition-colors ${!formData.avatar_id ? 'text-kaboo-primary' : 'text-gray-600'}`}>
                                    Usar Sigla
                                </span>
                            </button>

                            {/* Character Options */}
                            {getAvatarCharacters().map((char) => {
                                const isSelected = formData.avatar_id === char;
                                const charColor = getCharacterColor(char);

                                return (
                                    <button
                                        key={char}
                                        onClick={() => { handleChange('avatar_id', char); setIsAvatarModalOpen(false); }}
                                        className="flex flex-col items-center gap-2 group"
                                    >
                                        <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full shadow-md group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 overflow-hidden border-4 border-white relative ${isSelected ? 'ring-4 ring-kaboo-primary ring-offset-2' : ''} ${charColor}`}>
                                            {/* Background Color Layer */}
                                            <div className={`absolute inset-0 opacity-50 ${getCharacterBgColor(char)} pointer-events-none`} />
                                            {/* Image Layer */}
                                            <img
                                                src={getCharacterImageUrl(char)}
                                                alt={char}
                                                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 relative z-10"
                                                onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }}
                                            />
                                        </div>
                                        <span className={`text-xs md:text-sm font-bold text-center leading-tight transition-colors ${isSelected ? 'text-kaboo-primary' : 'text-gray-600'}`}>
                                            {char}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

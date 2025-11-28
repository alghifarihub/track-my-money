
import React, { useState } from 'react';
import { Card, Button, Input } from './ui/DesignSystem';
import { supabase } from '../lib/supabase';
import { TRANSLATIONS } from '../constants';
import { Loader2, AlertCircle, ArrowRight, Globe, ArrowLeft, Play } from 'lucide-react';
import { Language } from '../types';

interface AuthPageProps {
    onBack: () => void;
    onEnterDemo: () => void;
}

export const AuthPage = ({ onBack, onEnterDemo }: AuthPageProps) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<Language>('id'); 

  const t = TRANSLATIONS[lang];

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert(lang === 'id' ? 'Cek email Anda untuk link konfirmasi!' : 'Check your email for the confirmation link!');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Back Button */}
      <div className="absolute top-6 left-6 z-50 animate-in fade-in duration-1000">
         <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white px-4 py-2 rounded-full border border-white/5 hover:bg-white/5 transition-all">
            <ArrowLeft size={14} /> {t.back}
         </button>
      </div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-1000">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold tracking-tighter text-white mb-3">
            ghifar<span className="text-orange-500">mkcy</span>.
          </h1>
          <p className="text-zinc-400 text-lg font-light tracking-wide">Master your personal finance.</p>
        </div>

        <div className="bg-zinc-900/60 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl p-8 md:p-10">
            <h2 className="text-3xl font-bold text-center text-white mb-2 tracking-tight">
              {mode === 'login' ? t.loginTitle : t.registerTitle}
            </h2>
            <p className="text-center text-sm text-zinc-500 mb-8">
              {mode === 'login' ? t.loginDesc : t.registerDesc}
            </p>

            <form onSubmit={handleAuth} className="space-y-5">
              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-3">
                  <AlertCircle size={18} /> <span className="font-medium">{error}</span>
                </div>
              )}
              
              <div className="space-y-4">
                  <Input label={t.email} type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <Input label={t.password} type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>

              <Button type="submit" className="w-full h-12 text-base font-semibold mt-2" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : (
                   <span className="flex items-center justify-center gap-2">
                      {mode === 'login' ? t.signIn : t.signUp} <ArrowRight size={18} />
                   </span>
                )}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3">
                <div className="h-[1px] bg-zinc-800 flex-1"></div>
                <span className="text-xs text-zinc-600 font-medium">OR</span>
                <div className="h-[1px] bg-zinc-800 flex-1"></div>
            </div>

            <button 
                onClick={onEnterDemo}
                className="w-full h-12 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 text-sm font-medium"
            >
                <Play size={16} className="text-orange-500" />
                Try Demo Account (No Login)
            </button>

            <div className="mt-8 pt-6 border-t border-white/5 text-center text-sm">
              <span className="text-zinc-500">{mode === 'login' ? t.noAccount : t.hasAccount} </span>
              <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }} className="text-orange-500 hover:text-orange-400 font-semibold ml-1">
                {mode === 'login' ? t.signUp : t.signIn}
              </button>
            </div>
        </div>
      </div>
    </div>
  );
};

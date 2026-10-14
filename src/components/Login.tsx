import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { cn } from '../utils/cn';

interface LoginProps {
  onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('admin@energyguard.ai');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const apiBase = (typeof window !== 'undefined' && window.location.port === '5173')
      ? 'http://localhost:8000'
      : '';

    try {
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Invalid email or password. Access denied.');
      }

      const data = await res.json();
      if (data.token) {
        localStorage.setItem('energyguard_token', data.token);
        if (data.user) {
          localStorage.setItem('energyguard_user', JSON.stringify(data.user));
        }
        onLogin();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-accent/20 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-card p-8 md:p-10 shadow-2xl border border-white/20">
          
          <div className="flex flex-col items-center mb-10">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
              className="h-16 w-16 bg-gradient-to-br from-brand-primary to-brand-accent rounded-2xl flex items-center justify-center shadow-lg mb-6"
            >
              <Zap className="h-8 w-8 text-white" fill="currentColor" />
            </motion.div>
            <h1 className="text-3xl font-black text-brand-text mb-2 text-center">EnergyGuard AI</h1>
            <p className="text-brand-text/60 font-medium text-center text-sm">Sign in to your intelligent energy dashboard</p>
          </div>

          {errorMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-sm font-semibold flex items-center gap-3"
            >
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-brand-text/80 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-brand-text/40" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-white/50 border border-brand-primary/10 rounded-xl text-brand-text placeholder-brand-text/30 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary/50 transition-all font-medium outline-none"
                  placeholder="admin@energyguard.ai"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-text/80 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-brand-text/40" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-white/50 border border-brand-primary/10 rounded-xl text-brand-text placeholder-brand-text/30 focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary/50 transition-all font-medium outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 mb-6">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm font-medium text-brand-text/70 cursor-pointer">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-bold text-brand-primary hover:text-brand-accent transition-colors">
                  Forgot password?
                </a>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                "group relative w-full flex justify-center items-center py-3.5 px-4 border border-transparent text-sm font-black rounded-xl text-white bg-brand-primary hover:bg-brand-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-all shadow-lg overflow-hidden",
                isLoading && "opacity-80 cursor-not-allowed"
              )}
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>SECURE SIGN IN</span>
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
          
          <div className="mt-6 p-3.5 bg-black/5 rounded-xl border border-black/5 text-center text-xs text-brand-text/70 space-y-1">
            <div className="font-bold text-brand-text flex items-center justify-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-brand-primary" />
              <span>Authorized Admin Credentials:</span>
            </div>
            <div className="font-mono text-[11px] text-brand-primary select-all font-semibold">
              admin@energyguard.ai / EnergyGuard@2026!
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-brand-primary/10 flex justify-center items-center text-xs font-medium text-brand-text/50">
            <ShieldCheck className="h-4 w-4 mr-1.5" />
            End-to-End Encrypted Authentication
          </div>
        </div>
      </motion.div>
    </div>
  );
}

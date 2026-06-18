import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Info, Mail, KeyRound } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

interface AthleteAuthProps {
  onLoginSuccess: (role: string, user: { name: string; email: string }) => void;
}

export const AthleteAuth: React.FC<AthleteAuthProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in both fields.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('http://localhost:8000/api/auth/athlete/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Sign in failed');
      }

      useAuthStore.getState().setAuth({
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });

      onLoginSuccess('athlete', { name: data.name, email: data.email });
      navigate('/athlete/dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 relative overflow-hidden bg-background text-foreground transition-colors duration-300">
      {/* Background Gradient Glows */}
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-status-orange/5 blur-[120px] pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/8 blur-[130px] pointer-events-none animate-pulse-glow" />

      {/* Back link */}
      <Link
        to="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-white font-bold transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl outline-none"
        aria-label="Back to Portal"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Portal</span>
      </Link>

      {/* Form Container */}
      <div className="w-full max-w-md glass-panel p-8 md:p-10 rounded-3xl z-10 animate-fade-in relative">
        <div className="absolute top-0 inset-x-0 h-1 rounded-t-3xl bg-gradient-to-r from-status-orange via-yellow-500 to-purple-600" />
        
        <div className="text-center mb-8">
          <span className="text-[10px] uppercase tracking-widest text-status-orange font-black px-3.5 py-1.5 rounded-full bg-status-orange/10 border border-status-orange/20">
            Athlete Hub
          </span>
          <h2 className="text-3xl font-black mt-4 tracking-tight text-white leading-tight">
            Athlete Access
          </h2>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Sign in to log daily water, supplements checklist, and meals
          </p>
        </div>

        {error && (
          <div 
            className="mb-6 p-4 rounded-2xl bg-status-red/10 border border-status-red/20 text-status-red text-xs font-semibold flex items-start gap-2.5 animate-fade-in"
            aria-live="polite"
          >
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="athlete-email" className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 w-4 h-4 text-muted-foreground/60" />
              <input
                type="email"
                id="athlete-email"
                name="email"
                autoComplete="email"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="athlete@bodyartist.com"
                className="w-full py-3.5 pl-11 pr-4 rounded-2xl bg-card/40 border border-card-border focus:border-status-orange/50 focus:ring-4 focus:ring-status-orange/10 outline-none transition-all placeholder:text-muted-foreground/45 text-sm text-white font-bold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="athlete-password" className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-4 top-3.5 w-4 h-4 text-muted-foreground/60" />
              <input
                type="password"
                id="athlete-password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full py-3.5 pl-11 pr-4 rounded-2xl bg-card/40 border border-card-border focus:border-status-orange/50 focus:ring-4 focus:ring-status-orange/10 outline-none transition-all placeholder:text-muted-foreground/45 text-sm text-white font-bold"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-6 rounded-2xl bg-gradient-to-r from-status-orange to-yellow-600 text-white font-bold hover:shadow-lg hover:shadow-status-orange/25 transition-all duration-300 cursor-pointer disabled:opacity-75 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
          >
            {loading ? 'Authenticating...' : 'Authenticate Credentials'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-card-border/50 pt-6 text-xs text-muted-foreground leading-relaxed flex flex-col items-center">
          <Info className="w-4 h-4 text-status-orange/60 mb-2" />
          <p className="max-w-[280px]">
            <strong>Registration Note</strong>: Public signups are disabled. Accounts are provisioned by your coach under strict privacy rules.
          </p>
        </div>
      </div>
    </div>
  );
};

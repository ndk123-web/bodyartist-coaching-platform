import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, KeyRound, Mail, User } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

interface CoachAuthProps {
  isSignUp: boolean;
  onLoginSuccess: (role: string, user: { name: string; email: string }) => void;
}

export const CoachAuth: React.FC<CoachAuthProps> = ({ isSignUp, onLoginSuccess }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (isSignUp) {
      if (!name || !inviteCode) {
        setError('Please fill in your name and registration invite code.');
        return;
      }
      if (inviteCode !== 'ARTIST2026') {
        setError('Invalid Coach Invite Code. This platform is restricted to designated coaches.');
        return;
      }
      
      try {
        setLoading(true);
        const res = await fetch('http://localhost:8000/api/auth/coach/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, inviteCode }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || 'Registration failed');
        }
        
        useAuthStore.getState().setAuth({
          id: data.id,
          name: data.name,
          email: data.email,
          role: data.role,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });
        
        onLoginSuccess('coach', { name: data.name, email: data.email });
        navigate('/coach/dashboard');
      } catch (err: any) {
        setError(err.message || 'An error occurred during registration.');
      } finally {
        setLoading(false);
      }
    } else {
      try {
        setLoading(true);
        const res = await fetch('http://localhost:8000/api/auth/coach/signin', {
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
        
        onLoginSuccess('coach', { name: data.name, email: data.email });
        navigate('/coach/dashboard');
      } catch (err: any) {
        setError(err.message || 'An error occurred during sign in.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 relative overflow-hidden bg-background text-foreground transition-colors duration-300">
      {/* Dynamic ambient backdrop glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-status-orange/5 blur-[120px] pointer-events-none animate-pulse-glow" />

      {/* Navigation link */}
      <Link
        to="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-white font-bold transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl outline-none"
        aria-label="Back to Portal"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Portal</span>
      </Link>

      {/* Glass Form Container */}
      <div className="w-full max-w-md glass-panel p-8 md:p-10 rounded-3xl z-10 animate-fade-in relative">
        <div className="absolute top-0 inset-x-0 h-1 rounded-t-3xl bg-gradient-to-r from-primary via-purple-500 to-status-orange" />
        
        <div className="text-center mb-8">
          <span className="text-[10px] uppercase tracking-widest text-primary font-black px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            Admin Workspace
          </span>
          <h2 className="text-3xl font-black mt-4 tracking-tight text-white leading-tight">
            {isSignUp ? 'Register Team' : 'Coach Sign In'}
          </h2>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {isSignUp
              ? 'Provision a coach group workspace portal'
              : 'Access athlete logs, heatmaps, and stats'}
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
          {isSignUp && (
            <div className="space-y-2">
              <label htmlFor="coach-name" className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-3.5 w-4 h-4 text-muted-foreground/60" />
                <input
                  type="text"
                  id="coach-name"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Aryan Sharma"
                  className="w-full py-3.5 pl-11 pr-4 rounded-2xl bg-card/40 border border-card-border focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground/40 text-sm text-white font-bold"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="coach-email" className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 w-4 h-4 text-muted-foreground/60" />
              <input
                type="email"
                id="coach-email"
                name="email"
                autoComplete="email"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="coach@bodyartist.com"
                className="w-full py-3.5 pl-11 pr-4 rounded-2xl bg-card/40 border border-card-border focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground/45 text-sm text-white font-bold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="coach-password" className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-4 top-3.5 w-4 h-4 text-muted-foreground/60" />
              <input
                type="password"
                id="coach-password"
                name="password"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full py-3.5 pl-11 pr-4 rounded-2xl bg-card/40 border border-card-border focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground/45 text-sm text-white font-bold"
              />
            </div>
          </div>

          {isSignUp && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="coach-invite" className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                  Registration Invite Code
                </label>
                <span className="text-[9px] text-primary font-black bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                  Use: ARTIST2026
                </span>
              </div>
              <input
                type="text"
                id="coach-invite"
                name="inviteCode"
                autoComplete="off"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Enter workspace invite key"
                className="w-full py-3.5 px-4 rounded-2xl bg-card/40 border border-card-border focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground/45 text-sm text-white font-bold"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-6 rounded-2xl bg-gradient-to-r from-primary to-purple-600 text-white font-bold hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 cursor-pointer disabled:opacity-75 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
          >
            {loading ? 'Authenticating...' : isSignUp ? 'Register Group Portal' : 'Authenticate & Enter'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-card-border/50 pt-6">
          {isSignUp ? (
            <Link
              to="/coach/signin"
              className="text-xs text-muted-foreground hover:text-primary font-bold transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none"
            >
              Already registered? Sign In instead
            </Link>
          ) : (
            <Link
              to="/coach/signup"
              className="text-xs text-muted-foreground hover:text-primary font-bold transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none"
            >
              Don't have an admin account? Register here
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

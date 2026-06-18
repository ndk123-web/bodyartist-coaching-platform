import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Target, Camera, ChevronRight, Activity, ArrowUpRight, Database } from 'lucide-react';

export const HomePortal: React.FC = () => {
  return (
    <div className="min-h-screen relative overflow-x-hidden bg-background text-foreground transition-colors duration-300 flex flex-col justify-between">
      {/* Decorative Glow Nodes */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[50%] rounded-full bg-primary/10 blur-[140px] pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-status-orange/5 blur-[125px] pointer-events-none" />
      
      {/* Interactive Cyber Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      {/* Navigation Bar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-20 relative">
        <Link 
          to="/" 
          className="flex items-center gap-2.5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl outline-none group"
          aria-label="Body Artist Coaching - Home"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-status-orange flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform duration-300">
            <Activity className="w-5.5 h-5.5 text-white" />
          </div>
          <span className="font-extrabold tracking-tight text-xl text-white">
            BODY<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-status-orange">ARTIST</span>
          </span>
        </Link>

        <nav className="flex items-center gap-4 sm:gap-6">
          <Link
            to="/athlete/signin"
            className="text-xs sm:text-sm font-semibold text-muted-foreground hover:text-white transition-colors py-2 px-3 sm:px-4 rounded-xl focus-visible:ring-2 focus-visible:ring-primary outline-none"
          >
            Athlete Portal
          </Link>
          <Link
            to="/coach/signin"
            className="text-xs sm:text-sm font-bold py-2.5 px-4 sm:px-5 rounded-xl bg-card/45 border border-card-border hover:border-primary/30 text-foreground hover:text-white transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary outline-none shadow-sm"
          >
            Coach Log In
          </Link>
        </nav>
      </header>

      {/* Main Feature Container */}
      <main className="max-w-7xl mx-auto px-6 pt-16 pb-20 relative z-10 flex flex-col items-center flex-1 justify-center">
        
        {/* Keyboard Accessibility Skip Link */}
        <a href="#main-features" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:bg-primary focus:text-white p-3 rounded">
          Skip to main features
        </a>

        {/* Hero Banner Section */}
        <section className="text-center max-w-4xl mb-20 animate-fade-in flex flex-col items-center">
          <span className="inline-flex items-center gap-2 text-[10px] sm:text-xs uppercase tracking-widest text-primary font-black px-4.5 py-2 rounded-full bg-primary/10 border border-primary/20 shadow-sm">
            <Shield className="w-3.5 h-3.5 text-primary animate-pulse" /> DPDP ACT 2025 COMPLIANCE SEALED
          </span>
          
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold mt-8 tracking-tight leading-[1.05] text-white max-w-3xl">
            Elite Workspace for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-status-yellow to-status-orange">Enhanced Performance</span>
          </h1>
          
          <p className="mt-6 text-sm sm:text-lg text-muted-foreground font-medium max-w-2xl leading-relaxed">
            An internal coaching engine tracking photo-based meal compositions, configurable compound checklists, daily scores, and biometrics.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center w-full max-w-md">
            <Link
              to="/coach/signup"
              className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-primary to-purple-600 text-white font-bold hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-primary outline-none cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
            >
              <span>Register Coach Group</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              to="/athlete/signin"
              className="flex-1 py-4 px-6 rounded-2xl bg-card border border-card-border hover:bg-accent/40 text-white font-bold hover:border-status-orange/30 shadow-md transition-all duration-300 flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-primary outline-none cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
            >
              <span>Athlete Sign In</span>
              <ArrowUpRight className="w-4 h-4 text-status-orange" />
            </Link>
          </div>
        </section>

        {/* Feature Cards Bento Grid */}
        <section id="main-features" className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-20 animate-fade-in [animation-delay:100ms]">
          
          {/* Card 1: Image Recognition */}
          <div className="glass-panel glass-panel-hover p-8 rounded-3xl flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-6">
                <Camera className="w-5.5 h-5.5 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="text-xl font-bold tracking-tight text-white mb-2">Photo-Based Meal Scanning</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Log meals via simple camera capture. The external API returns estimated portions, macro variables, and micronutrients immediately.
              </p>
            </div>
            <div className="border-t border-card-border/50 mt-6 pt-4 text-[11px] font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>Confirm & Adjust Portion Interface</span>
            </div>
          </div>

          {/* Card 2: Adherence Score */}
          <div className="glass-panel glass-panel-hover p-8 rounded-3xl flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-status-yellow/10 border border-status-yellow/20 flex items-center justify-center text-status-yellow mb-6">
                <Target className="w-5.5 h-5.5 group-hover:rotate-12 transition-transform duration-300" />
              </div>
              <h3 className="text-xl font-bold tracking-tight text-white mb-2">Dynamic Adherence Engine</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Aggregated daily performance score (0–100) weighting required meal count, fluid targets, workouts, and supplement checklists.
              </p>
            </div>
            <div className="border-t border-card-border/50 mt-6 pt-4 text-[11px] font-bold text-status-yellow flex items-center gap-1.5 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-status-yellow" />
              <span>Color-Coded Heatmap Grid</span>
            </div>
          </div>

          {/* Card 3: Isolation Security */}
          <div className="glass-panel glass-panel-hover p-8 rounded-3xl flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-status-orange/10 border border-status-orange/20 flex items-center justify-center text-status-orange mb-6">
                <Database className="w-5.5 h-5.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
              </div>
              <h3 className="text-xl font-bold tracking-tight text-white mb-2">Supabase Isolation & RLS</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Under Postgres isolated query scopes, athletes have direct edit access to only their entries, and coaches inspect assigned athlete rosters.
              </p>
            </div>
            <div className="border-t border-card-border/50 mt-6 pt-4 text-[11px] font-bold text-status-orange flex items-center gap-1.5 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-status-orange" />
              <span>DPDP 2025 Explicit Consent</span>
            </div>
          </div>

        </section>

        {/* Cost Test Phase Disclosure */}
        <section className="w-full max-w-4xl glass-panel p-8 md:p-12 rounded-3xl animate-fade-in [animation-delay:150ms] relative overflow-hidden">
          <div className="absolute right-[-5%] top-[-10%] w-40 h-40 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <div className="md:col-span-2 text-left">
              <span className="text-[10px] text-primary uppercase tracking-widest font-black bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20">Active Calibration Pilot</span>
              <h3 className="text-2xl font-extrabold tracking-tight text-white mt-3.5">Testing Cost & Accuracy Metrics</h3>
              <p className="mt-2.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Body Artist tracks and records raw API transactions in `VisionApiCall` records. This data quantifies error patterns, retry ratios, and image volume to determine custom subscription parameters.
              </p>
            </div>
            <div className="flex flex-col gap-2.5 p-6 rounded-2xl bg-card/50 border border-card-border text-center shadow-inner">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-extrabold">Primary Vision Service</span>
              <span className="text-base font-black text-white flex items-center justify-center gap-1.5">
                LogMeal AI API
              </span>
              <div className="text-[10px] text-muted-foreground mt-2 border-t border-card-border/60 pt-2 flex items-center justify-center gap-4">
                <span>Secondary Fallback: Spike API</span>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="w-full border-t border-card-border/40 py-8 text-center text-xs text-muted-foreground relative z-10">
        <p>© 2026 Body Artist Coaching. All rights reserved. Data operations and telemetry compliant under privacy regulations.</p>
      </footer>
    </div>
  );
};

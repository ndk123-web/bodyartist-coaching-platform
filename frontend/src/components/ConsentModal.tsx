import React, { useState } from 'react';
import { Shield, Eye, Database, Info } from 'lucide-react';

interface ConsentModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
  athleteName?: string | null;
}

export const ConsentModal: React.FC<ConsentModalProps> = ({ isOpen, onAccept, onDecline, athleteName }) => {
  const [consentHealth, setConsentHealth] = useState(false);
  const [consentAPI, setConsentAPI] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleProceed = () => {
    if (!consentHealth || !consentAPI) {
      setError('Please review and accept both consent clauses to proceed.');
      return;
    }
    setError('');
    onAccept();
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="w-full max-w-lg glass-panel p-8 md:p-10 rounded-3xl relative flex flex-col justify-between max-h-[95vh] overflow-y-auto shadow-2xl">
        <div className="absolute top-0 inset-x-0 h-1 rounded-t-3xl bg-gradient-to-r from-status-orange via-yellow-500 to-primary" />
        
        {/* Header */}
        <div className="mb-6">
          <div className="w-12 h-12 rounded-2xl bg-status-orange/15 flex items-center justify-center border border-status-orange/30 text-status-orange mb-6">
            <Shield className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-foreground">
            Consent & Privacy Audit
          </h2>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            Welcome, <span className="text-primary font-bold">{athleteName || 'Athlete'}</span>. In compliance with <strong>India's DPDP Act 2025</strong>, please review and grant the required consents to establish your telemetry log.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-status-red/10 border border-status-red/20 text-status-red text-xs font-semibold flex items-center gap-2.5 animate-fade-in">
            <Info className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Clauses */}
        <div className="space-y-4 mb-8 text-xs">
          
          {/* Clause 1: Health Telemetry */}
          <div className="flex gap-4 items-start p-4 rounded-2xl bg-card/40 border border-card-border hover:border-primary/20 transition-all duration-300">
            <input
              type="checkbox"
              id="consent-health"
              checked={consentHealth}
              onChange={(e) => setConsentHealth(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-card-border text-primary focus:ring-primary cursor-pointer accent-primary"
            />
            <label htmlFor="consent-health" className="cursor-pointer leading-relaxed text-muted-foreground">
              <strong className="block text-foreground mb-1 font-bold flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-primary" />
                Health & Performance Telemetry
              </strong>
              I consent to the collection, retrieval, and storage of my metrics (daily body weight, measurements, steps, daily cardio workouts, and supplement checklists).
            </label>
          </div>

          {/* Clause 2: Image Processing */}
          <div className="flex gap-4 items-start p-4 rounded-2xl bg-card/40 border border-card-border hover:border-status-orange/20 transition-all duration-300">
            <input
              type="checkbox"
              id="consent-api"
              checked={consentAPI}
              onChange={(e) => setConsentAPI(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-card-border text-primary focus:ring-primary cursor-pointer accent-primary"
            />
            <label htmlFor="consent-api" className="cursor-pointer leading-relaxed text-muted-foreground">
              <strong className="block text-foreground mb-1 font-bold flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-status-orange" />
                Third-Party Image Processing
              </strong>
              I consent that my uploaded food photos will be securely sent to third-party image recognition APIs (LogMeal/Spike) to estimate macros and micronutrients.
            </label>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-2">
          <button
            onClick={onDecline}
            className="flex-1 py-4 px-6 rounded-2xl bg-card border border-card-border hover:bg-accent/40 text-foreground hover:text-white font-bold transition-all duration-300 cursor-pointer text-xs"
          >
            Decline & Logout
          </button>
          <button
            onClick={handleProceed}
            className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-status-orange to-yellow-600 text-white font-bold hover:shadow-lg hover:shadow-status-orange/20 transition-all duration-300 cursor-pointer text-xs hover:scale-[1.01] active:scale-[0.99]"
          >
            Grant Consents
          </button>
        </div>

      </div>
    </div>
  );
};

import React from 'react';
import { Flame, Droplet, Check, Weight, AlertCircle, Dumbbell } from 'lucide-react';

interface Athlete {
  id: string;
  name: string;
  email: string;
  score: number;
  streak: number;
  weight: number;
  waterLog: number;
  waterTarget: number;
  mealsLogged: number;
  mealsTarget: number;
  supplements: { name: string; completed: boolean; required: boolean }[];
  status: 'green' | 'yellow' | 'orange' | 'red';
}

interface AthleteCardProps {
  athlete: Athlete;
  onClick: () => void;
  large?: boolean;
}

export const AthleteCard: React.FC<AthleteCardProps> = ({ athlete, onClick, large = false }) => {
  const supplementsCompleted = (athlete as any).supplementsCompleted !== undefined 
    ? (athlete as any).supplementsCompleted 
    : athlete.supplements.filter(s => s.completed).length;
    
  const supplementsRequired = (athlete as any).supplementsRequired !== undefined 
    ? (athlete as any).supplementsRequired 
    : athlete.supplements.filter(s => s.required).length;

  const statusMeta = {
    green: {
      bg: 'bento-card-green',
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
      label: 'On Track',
    },
    yellow: {
      bg: 'bento-card-yellow',
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
      label: 'Moderate',
    },
    orange: {
      bg: 'bento-card-orange',
      badge: 'bg-orange-500/10 text-orange-400 border-orange-500/25',
      label: 'Alert',
    },
    red: {
      bg: 'bento-card-red',
      badge: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
      label: 'Critical',
    },
  };

  const currentMeta = statusMeta[athlete.status] || statusMeta.green;

  return (
    <div
      onClick={onClick}
      className={`
        glass-panel rounded-3xl cursor-pointer group flex flex-col justify-between overflow-hidden relative
        ${currentMeta.bg}
        ${large ? 'col-span-1 md:col-span-2 p-6 md:p-8 min-h-[340px]' : 'p-6 min-h-[270px]'}
        hover:-translate-y-1 hover:shadow-2xl hover:border-white/15 transition-all duration-300
      `}
    >
      {/* Decorative Glow Ring */}
      <div className="absolute top-[-20%] right-[-10%] w-32 h-32 rounded-full bg-white/[0.02] border border-white/[0.05] pointer-events-none group-hover:scale-110 transition-transform duration-500" />
      
      {/* Header */}
      <div>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="text-xl font-black text-white group-hover:text-primary transition-colors truncate tracking-tight">
              {athlete.name}
            </h3>
            <p className="text-xs text-muted-foreground truncate font-medium">{athlete.email}</p>
          </div>
          <div className={`px-2.5 py-1.5 rounded-xl border text-[10px] uppercase tracking-widest font-extrabold flex items-center gap-1 ${currentMeta.badge}`}>
            {athlete.status === 'red' && <AlertCircle className="w-3.5 h-3.5 animate-pulse" />}
            {currentMeta.label}
          </div>
        </div>

        {/* Score & Streak Bento Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="glass-panel p-3 rounded-2xl bg-card/25 border-white/[0.03]">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Performance</p>
            <p className="text-2xl font-black text-white flex items-baseline gap-0.5">
              {athlete.score}<span className="text-[10px] text-muted-foreground font-normal">/100</span>
            </p>
          </div>
          <div className="glass-panel p-3 rounded-2xl bg-card/25 border-white/[0.03] flex items-center gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Streak</p>
              <p className="text-2xl font-black text-status-orange flex items-center gap-1">
                <Flame className="w-5 h-5 text-status-orange fill-status-orange/10" />
                {athlete.streak}
              </p>
            </div>
          </div>
        </div>

        {/* Details section - dependent on card size */}
        {large ? (
          <div className="grid grid-cols-2 gap-4 mt-2 mb-4">
            {/* Meal Progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                <span>Meal Progress</span>
                <span className="text-white">{athlete.mealsLogged}/{athlete.mealsTarget}</span>
              </div>
              <div className="h-1.5 rounded-full bg-card/60 overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500" 
                  style={{ width: `${(athlete.mealsLogged / athlete.mealsTarget) * 100}%` }} 
                />
              </div>
            </div>

            {/* Hydration Progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                <span>Hydration</span>
                <span className="text-white">{athlete.waterLog}/{athlete.waterTarget} gls</span>
              </div>
              <div className="h-1.5 rounded-full bg-card/60 overflow-hidden">
                <div 
                  className="h-full bg-status-yellow transition-all duration-500" 
                  style={{ width: `${(athlete.waterLog / athlete.waterTarget) * 100}%` }} 
                />
              </div>
            </div>

            {/* Supplement Progress */}
            <div className="space-y-1 col-span-2">
              <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                <span>Required Supplements</span>
                <span className="text-white">{supplementsCompleted}/{supplementsRequired} checked</span>
              </div>
              <div className="h-1.5 rounded-full bg-card/60 overflow-hidden">
                <div 
                  className="h-full bg-status-green transition-all duration-500" 
                  style={{ width: `${(supplementsCompleted / Math.max(1, supplementsRequired)) * 100}%` }} 
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span className="flex items-center gap-1.5"><Dumbbell className="w-3.5 h-3.5 text-primary" /> Meals Logged</span>
              <span className="text-white font-bold">{athlete.mealsLogged}/{athlete.mealsTarget}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span className="flex items-center gap-1.5"><Droplet className="w-3.5 h-3.5 text-status-yellow" /> Hydration</span>
              <span className="text-white font-bold">{athlete.waterLog}/{athlete.waterTarget} glasses</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-status-green" /> Supplements</span>
              <span className="text-white font-bold">{supplementsCompleted}/{supplementsRequired}</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer view profile link */}
      <div className={`mt-5 pt-3 border-t border-card-border/50 flex justify-between items-center text-xs font-semibold ${large ? 'md:mt-0' : ''}`}>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Weight className="w-3.5 h-3.5 text-status-orange" />
          <span>{athlete.weight} kg</span>
        </div>
        <span className="text-primary group-hover:text-white transition-colors duration-300 font-extrabold uppercase tracking-widest text-[10px]">
          Inspect Profile →
        </span>
      </div>
    </div>
  );
};
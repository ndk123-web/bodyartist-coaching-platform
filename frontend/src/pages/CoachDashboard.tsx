import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, TrendingUp, Users, Activity, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { apiClient } from '../api/client';
import { AthleteCard } from '../components/AthleteCard';
import { AdherenceHeatmap } from '../components/AdherenceHeatmap';
import { SimpleLineChart } from '../components/SimpleLineChart';

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
  mealHistory: any[];
}

interface CoachDashboardProps {
  athletes: Athlete[];
  onLogout: () => void;
}

export const CoachDashboard: React.FC<CoachDashboardProps> = ({
  athletes: initialAthletes,
  onLogout,
}) => {
  const navigate = useNavigate();
  const name = useAuthStore((state) => state.name);
  const [athletes, setAthletes] = useState<Athlete[]>(initialAthletes);
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [provName, setProvName] = useState('');
  const [provEmail, setProvEmail] = useState('');
  const [provPassword, setProvPassword] = useState('');
  const [provisionError, setProvisionError] = useState('');
  const [provisionSuccess, setProvisionSuccess] = useState(false);

  // Load real-time adherence stats for each athlete in the roster
  useEffect(() => {
    const fetchAthleteStats = async () => {
      try {
        const statsPromises = initialAthletes.map(async (athlete) => {
          try {
            const summary = await apiClient.get(`/api/v1/athlete/dashboard-summary/${athlete.id}`);
            return {
              ...athlete,
              score: summary.score || 0,
              status: summary.status || 'red',
              weight: summary.weight || athlete.weight,
              waterLog: summary.water_logged || 0,
              streak: summary.streak || athlete.streak,
              mealsLogged: summary.meals_logged || 0,
              mealsTarget: summary.meals_target || 5,
              supplementsCompleted: summary.supplements_completed || 0,
              supplementsRequired: summary.supplements_total || 0
            };
          } catch (e) {
            return athlete;
          }
        });
        const updated = await Promise.all(statsPromises);
        setAthletes(updated);
      } catch (err) {
        console.error("Failed to load roster stats", err);
      }
    };
    fetchAthleteStats();
  }, [initialAthletes]);

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvisionError('');
    setProvisionSuccess(false);

    if (!provName || !provEmail || !provPassword) {
      setProvisionError('All fields are required');
      return;
    }

    try {
      const coachId = useAuthStore.getState().id;
      if (!coachId) {
        setProvisionError('Coach ID not found');
        return;
      }

      const res = await fetch('http://localhost:8000/api/auth/athlete/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: provName,
          email: provEmail,
          password: provPassword,
          coachId: coachId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setProvisionError(data.detail || 'Failed to provision athlete');
        return;
      }

      setProvisionSuccess(true);
      setProvName('');
      setProvEmail('');
      setProvPassword('');
      
      // Auto-reload athletes list
      setTimeout(() => {
        setShowProvisionModal(false);
        setProvisionSuccess(false);
        // Trigger a page refresh or call api to pull roster again
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setProvisionError(err.message || 'An error occurred');
    }
  };

  // Team stats aggregated dynamically
  const avgScore = athletes.length > 0
    ? Math.round(athletes.reduce((sum, a) => sum + a.score, 0) / athletes.length)
    : 0;
  const bestStreakAthlete = athletes.length > 0
    ? athletes.reduce((prev, current) => prev.streak > current.streak ? prev : current)
    : null;
  const criticalCount = athletes.filter(a => a.status === 'red' || a.status === 'orange').length;

  const mockHeatmapData = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
    score: Math.floor(Math.random() * 40) + 60,
  }));

  // Sort athletes: flagged/red/orange first and larger, then others
  const sortedAthletes = [...athletes].sort((a, b) => {
    const statusOrder = { red: 0, orange: 1, yellow: 2, green: 3 };
    return statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder];
  });



  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      
      {/* Dynamic ambient portal glows */}
      <div className="absolute top-0 right-0 w-[50%] h-[35%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[45%] h-[35%] rounded-full bg-status-orange/5 blur-[120px] pointer-events-none animate-pulse-glow" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 glass-panel border-b border-card-border/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center text-white shadow-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-extrabold">Coaching Workspace</p>
              <h1 className="text-lg font-black text-white">Coach {name || 'Dashboard'}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowProvisionModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-primary to-purple-600 text-white font-bold hover:shadow-lg hover:shadow-primary/20 transition-all cursor-pointer text-xs"
            >
              <Plus className="w-4 h-4 text-white" />
              Add Athlete
            </button>
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl text-muted-foreground hover:bg-card hover:text-white border border-transparent hover:border-card-border transition-all cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Provision Athlete Popup Modal */}
      {showProvisionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-panel rounded-3xl p-6 md:p-8 max-w-md w-full relative shadow-2xl animate-fade-in border-white/10">
            <div className="absolute top-0 inset-x-0 h-1 rounded-t-3xl bg-gradient-to-r from-primary to-purple-600" />
            
            <h2 className="text-2xl font-black text-white mb-2">Provision Athlete</h2>
            <p className="text-xs text-muted-foreground leading-relaxed mb-6">Create credentials for a new athlete workspace. This athlete will be bound to your roster and subject to PostgreSQL isolated query checks.</p>

            {provisionSuccess ? (
              <div className="p-4 rounded-2xl bg-status-green/10 border border-status-green/30 text-status-green text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Athlete provisioned successfully! Loading workspace...</span>
              </div>
            ) : (
              <form onSubmit={handleProvision} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Athlete Full Name</label>
                  <input
                    type="text"
                    value={provName}
                    onChange={(e) => setProvName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-card border border-card-border focus:border-primary/50 text-white font-bold text-sm focus:outline-none"
                    placeholder="Enter athlete's name"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Athlete Email Address</label>
                  <input
                    type="email"
                    value={provEmail}
                    onChange={(e) => setProvEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-card border border-card-border focus:border-primary/50 text-white font-bold text-sm focus:outline-none"
                    placeholder="athlete@example.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Password Credentials</label>
                  <input
                    type="password"
                    value={provPassword}
                    onChange={(e) => setProvPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-card border border-card-border focus:border-primary/50 text-white font-bold text-sm focus:outline-none"
                    placeholder="Set athlete initial password"
                  />
                </div>

                {provisionError && (
                  <div className="p-3.5 rounded-xl bg-status-red/10 border border-status-red/30 text-status-red text-[11px] font-bold flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{provisionError}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowProvisionModal(false)}
                    className="flex-1 py-3.5 rounded-2xl border border-card-border text-foreground hover:text-white font-bold transition-all cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-primary to-purple-600 text-white font-bold hover:shadow-lg transition-all cursor-pointer text-xs"
                  >
                    Create Workspace
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-10 relative z-10 space-y-10">
        
        {/* Team Overview Bento Cards */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-panel p-6 rounded-3xl bg-gradient-to-br from-primary/5 to-transparent flex flex-col justify-between min-h-[110px]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">Active Roster Size</span>
              <Users className="w-5 h-5 text-primary" />
            </div>
            <p className="text-3xl font-black text-white">{athletes.length}</p>
          </div>

          <div className="glass-panel p-6 rounded-3xl bg-gradient-to-br from-status-green/5 to-transparent flex flex-col justify-between min-h-[110px]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">Team Avg Score</span>
              <Activity className="w-5 h-5 text-status-green" />
            </div>
            <p className="text-3xl font-black text-white">{avgScore}</p>
          </div>

          <div className="glass-panel p-6 rounded-3xl bg-gradient-to-br from-status-orange/5 to-transparent flex flex-col justify-between min-h-[110px]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">Top Streak</span>
              <TrendingUp className="w-5 h-5 text-status-orange" />
            </div>
            <div>
              <p className="text-3xl font-black text-white">{bestStreakAthlete?.streak || 0}</p>
              {bestStreakAthlete && (
                <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Athlete: {bestStreakAthlete.name}</p>
              )}
            </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl bg-gradient-to-br from-status-red/5 to-transparent flex flex-col justify-between min-h-[110px]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">Needs Attention</span>
              <AlertCircle className={`w-5 h-5 ${criticalCount > 0 ? 'text-status-red animate-pulse' : 'text-status-green'}`} />
            </div>
            <p className={`text-3xl font-black ${criticalCount > 0 ? 'text-status-red' : 'text-status-green'}`}>
              {criticalCount}
            </p>
          </div>
        </section>

        {/* Athletes Bento Grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-card-border/50 pb-4">
            <h2 className="text-xl font-black text-white tracking-tight">Athlete Progress Trackers</h2>
            <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Flagged Profiles Promoted</span>
          </div>
          
          {athletes.length === 0 ? (
            <div className="glass-panel p-16 rounded-3xl text-center">
              <Users className="w-12 h-12 text-muted-foreground/35 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground font-bold uppercase tracking-wider mb-4">No Athletes Bound to Workspace</p>
              <button
                onClick={() => setShowProvisionModal(true)}
                className="px-6 py-3 rounded-2xl bg-primary text-white font-bold hover:shadow-lg transition-all cursor-pointer text-xs"
              >
                Provision First Athlete
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {sortedAthletes.map((athlete) => (
                <AthleteCard
                  key={athlete.id}
                  athlete={athlete}
                  onClick={() => navigate('/coach/athlete/' + athlete.id)}
                  large={athlete.status === 'red' || athlete.status === 'orange'}
                />
              ))}
            </div>
          )}
        </section>

        {/* Team-wide Adherence Analytics Section */}
        {athletes.length > 0 && (
          <section className="space-y-6">
            <div className="border-b border-card-border/50 pb-4">
              <h2 className="text-xl font-black text-white tracking-tight">Team-wide Analytics Overview</h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <AdherenceHeatmap scores={mockHeatmapData} />
              </div>
              <div className="lg:col-span-2">
                <SimpleLineChart
                  data={Array.from({ length: 7 }, (_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (6 - i));
                    const dStr = d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
                    return {
                      date: dStr,
                      value: Math.floor(Math.random() * 20) + 70,
                    };
                  })}
                  title="Team Daily Scores Performance Trend"
                  metric="Average Score (0-100)"
                  target={75}
                  color="primary"
                />
              </div>
            </div>
          </section>
        )}

      </main>
    </div>
  );
};

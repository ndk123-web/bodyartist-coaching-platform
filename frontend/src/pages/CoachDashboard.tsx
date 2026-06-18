import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, TrendingUp, Users, Activity, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
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

  // Sync state with incoming props
  useEffect(() => {
    setAthletes(initialAthletes);
  }, [initialAthletes]);

  const [teamHeatmap, setTeamHeatmap] = useState<{ date: string; score: number }[]>([]);
  const [teamTrend, setTeamTrend] = useState<{ date: string; value: number }[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchTeamAnalytics = async () => {
      const coachId = useAuthStore.getState().id;
      if (!coachId) return;
      try {
        setAnalyticsLoading(true);
        const res = await fetch(`http://localhost:8000/api/v1/athlete/team-analytics/${coachId}`);
        if (!res.ok) {
          throw new Error('Failed to fetch team analytics');
        }
        const data = await res.json();
        setTeamHeatmap(data.team_heatmap || []);
        setTeamTrend(data.team_trend || []);
      } catch (err) {
        console.error('Error fetching team analytics:', err);
      } finally {
        setAnalyticsLoading(false);
      }
    };
    
    if (athletes.length > 0) {
      fetchTeamAnalytics();
    } else {
      setAnalyticsLoading(false);
    }
  }, [athletes]);

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

  // Sort athletes: flagged/red/orange first and larger, then others
  const sortedAthletes = [...athletes].sort((a, b) => {
    const statusOrder = { red: 0, orange: 1, yellow: 2, green: 3 };
    return statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder];
  });

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      
      {/* Background neon visual glows */}
      <div className="absolute top-0 right-0 w-[50%] h-[35%] rounded-full bg-primary/5 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[45%] h-[35%] rounded-full bg-status-orange/4 blur-[130px] pointer-events-none animate-pulse-glow" />

      {/* Modern Dashboard Navigation */}
      <header className="sticky top-0 z-40 glass-panel border-b border-card-border/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center text-white shadow-md shadow-primary/20">
              <Activity className="w-5.5 h-5.5 text-white" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Coaching Workspace</p>
              <h1 className="text-base sm:text-lg font-black text-white">Coach {name || 'Dashboard'}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowProvisionModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-primary to-purple-600 text-white font-extrabold hover:shadow-lg hover:shadow-primary/20 transition-all cursor-pointer text-xs"
            >
              <Plus className="w-4 h-4 text-white" />
              Add Athlete
            </button>
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl text-muted-foreground hover:bg-card hover:text-white border border-transparent hover:border-card-border transition-all cursor-pointer flex items-center justify-center"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Provision Athlete Modal */}
      {showProvisionModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-panel rounded-3xl p-6 md:p-8 max-w-md w-full relative shadow-2xl animate-fade-in border-white/10">
            <div className="absolute top-0 inset-x-0 h-1 rounded-t-3xl bg-gradient-to-r from-primary to-purple-600" />
            
            <h2 className="text-2xl font-black text-white mb-2">Provision Athlete Workspace</h2>
            <p className="text-xs text-muted-foreground leading-relaxed mb-6">Create login credentials for a new athlete workspace. This athlete roster profile will be linked to your coach account.</p>

            {provisionSuccess ? (
              <div className="p-4 rounded-2xl bg-status-green/10 border border-status-green/20 text-status-green text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Athlete workspace provisioned successfully! Loading roster...</span>
              </div>
            ) : (
              <form onSubmit={handleProvision} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Athlete Full Name</label>
                  <input
                    type="text"
                    value={provName}
                    onChange={(e) => setProvName(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-card border border-card-border focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none text-white font-bold text-sm"
                    placeholder="Enter athlete's name"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Athlete Email Address</label>
                  <input
                    type="email"
                    value={provEmail}
                    onChange={(e) => setProvEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-card border border-card-border focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none text-white font-bold text-sm"
                    placeholder="athlete@example.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Password Credentials</label>
                  <input
                    type="password"
                    value={provPassword}
                    onChange={(e) => setProvPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-card border border-card-border focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none text-white font-bold text-sm"
                    placeholder="Set initial athlete password"
                  />
                </div>

                {provisionError && (
                  <div className="p-3.5 rounded-2xl bg-status-red/10 border border-status-red/20 text-status-red text-[11px] font-bold flex items-start gap-2.5">
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
                    Create Account
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10 space-y-8">
        
        {/* Aggregated Overview Bento Block */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel p-5.5 rounded-3xl bg-gradient-to-br from-primary/5 to-transparent flex flex-col justify-between min-h-[120px] relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Active Roster Size</span>
              <Users className="w-4.5 h-4.5 text-primary" />
            </div>
            <p className="text-3xl font-black text-white">{athletes.length}</p>
          </div>

          <div className="glass-panel p-5.5 rounded-3xl bg-gradient-to-br from-status-green/5 to-transparent flex flex-col justify-between min-h-[120px] relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Team Avg Score</span>
              <Activity className="w-4.5 h-4.5 text-status-green" />
            </div>
            <p className="text-3xl font-black text-white">{avgScore}</p>
          </div>

          <div className="glass-panel p-5.5 rounded-3xl bg-gradient-to-br from-status-orange/5 to-transparent flex flex-col justify-between min-h-[120px] relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Top Streak</span>
              <TrendingUp className="w-4.5 h-4.5 text-status-orange" />
            </div>
            <div>
              <p className="text-3xl font-black text-white">{bestStreakAthlete?.streak || 0}</p>
              {bestStreakAthlete && (
                <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1 truncate">Athlete: {bestStreakAthlete.name}</p>
              )}
            </div>
          </div>

          <div className="glass-panel p-5.5 rounded-3xl bg-gradient-to-br from-status-red/5 to-transparent flex flex-col justify-between min-h-[120px] relative overflow-hidden group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Needs Attention</span>
              <AlertCircle className={`w-4.5 h-4.5 ${criticalCount > 0 ? 'text-status-red animate-pulse' : 'text-status-green'}`} />
            </div>
            <p className={`text-3xl font-black ${criticalCount > 0 ? 'text-status-red' : 'text-status-green'}`}>
              {criticalCount}
            </p>
          </div>
        </section>

        {/* Athletes List Roster */}
        <section className="space-y-5">
          <div className="flex items-center justify-between border-b border-card-border/40 pb-3.5">
            <h2 className="text-lg font-black text-white tracking-tight uppercase">Athlete Compliance Trackers</h2>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Flagged Profiles Promoted</span>
          </div>
          
          {athletes.length === 0 ? (
            <div className="glass-panel p-16 rounded-3xl text-center">
              <Users className="w-12 h-12 text-muted-foreground/35 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground font-bold uppercase tracking-wider mb-4">No Athletes Connected to Roster</p>
              <button
                onClick={() => setShowProvisionModal(true)}
                className="px-6 py-3 rounded-2xl bg-primary text-white font-bold hover:shadow-lg transition-all cursor-pointer text-xs"
              >
                Provision First Athlete
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

        {/* Team-wide Compliance Visual Charts */}
        {athletes.length > 0 && (
          <section className="space-y-5">
            <div className="border-b border-card-border/40 pb-3.5">
              <h2 className="text-lg font-black text-white tracking-tight uppercase">Team Analytics Logs</h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                {analyticsLoading ? (
                  <div className="glass-panel p-6 rounded-3xl h-[230px] flex items-center justify-center text-muted-foreground text-xs font-bold uppercase tracking-wider">
                    Loading Heatmap...
                  </div>
                ) : (
                  <AdherenceHeatmap scores={teamHeatmap} />
                )}
              </div>
              <div className="lg:col-span-2">
                {analyticsLoading ? (
                  <div className="glass-panel p-6 rounded-3xl h-[230px] flex items-center justify-center text-muted-foreground text-xs font-bold uppercase tracking-wider">
                    Loading Trend Chart...
                  </div>
                ) : (
                  <SimpleLineChart
                    data={teamTrend}
                    title="Team Daily Scores Performance Trend"
                    metric="Average Score (0-100)"
                    target={75}
                    color="primary"
                  />
                )}
              </div>
            </div>
          </section>
        )}

      </main>
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Scale,
  Flame,
  Users,
  LogOut,
  CheckCircle,
  AlertCircle,
  Plus,
  ShieldCheck,
  Droplet,
} from "lucide-react";

import { AdherenceHeatmap } from "../components/AdherenceHeatmap";
import { SimpleLineChart } from "../components/SimpleLineChart";

interface Supplement {
  name: string;
  completed: boolean;
  required: boolean;
}

interface MealHistoryItem {
  id: string;
  time: string;
  food: string;
  macros: { p: number; c: number; f: number };
  calories: number;
  photo: string | null;
  confidence: number;
  isEdited: boolean;
}

interface ChartPoint {
  date: string;
  value: number;
}

interface HeatmapPoint {
  date: string;
  score: number;
}

interface AthleteDetail {
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
  supplements: Supplement[];
  status: "green" | "yellow" | "orange" | "red";
  mealHistory: MealHistoryItem[];
  weightHistory: ChartPoint[];
  waterHistory: ChartPoint[];
  heatmapData: HeatmapPoint[];
  dietMealsTarget: number;
  dietWaterTarget: number;
  dietStepsTarget: number;
  dietCardioTarget: number;
  dietTargetMacros: { name: string; value: number; unit: string }[];
  stepsLogged: number;
  cardioLogged: number;
}

interface CoachAthleteDetailProps {
  onLogout: () => void;
}

export const CoachAthleteDetail: React.FC<CoachAthleteDetailProps> = ({
  onLogout,
}) => {
  const { athleteId } = useParams<{ athleteId: string }>();
  const navigate = useNavigate();

  const [athlete, setAthlete] = useState<AthleteDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const getTodayStr = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split("T")[0];
  };

  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayStr());

  // Target Config Form States
  const [dietMealsTarget, setDietMealsTarget] = useState<number>(5);
  const [dietWaterTarget, setDietWaterTarget] = useState<number>(8);
  const [dietStepsTarget, setDietStepsTarget] = useState<number>(10000);
  const [dietCardioTarget, setDietCardioTarget] = useState<number>(30);
  const [macrosList, setMacrosList] = useState<{ name: string; value: number; unit: string }[]>([]);
  const [newMacroName, setNewMacroName] = useState<string>('');
  const [newMacroValue, setNewMacroValue] = useState<number>(0);
  const [newMacroUnit, setNewMacroUnit] = useState<string>('g');
  const [suppsList, setSuppsList] = useState<
    { name: string; required: boolean }[]
  >([]);
  const [newSuppName, setNewSuppName] = useState<string>("");
  const [newSuppRequired, setNewSuppRequired] = useState<boolean>(true);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const fetchAthleteDetail = async (dateStr?: string) => {
    try {
      setLoading(true);
      setError("");

      const todayStr = new Date().toISOString().split('T')[0];

      // 1. Fetch base profile info first
      const profileRes = await fetch(
        `http://localhost:8000/api/v1/athlete/coach-detail/${athleteId}`,
      );
      if (!profileRes.ok) {
        throw new Error("Failed to load athlete profile");
      }
      const profileData: AthleteDetail = await profileRes.json();

      // 2. Fetch all daily trackers for synchronization
      const [targets, summary, mealsRes] = await Promise.all<any>([
        fetch(`http://localhost:8000/api/v1/athlete/targets/${athleteId}`).then(res => res.ok ? res.json() : {}),
        fetch(`http://localhost:8000/api/v1/athlete/dashboard-summary/${athleteId}`).then(res => res.ok ? res.json() : {}),
        fetch(`http://localhost:8000/api/v1/meals/today/${athleteId}`).then(res => res.ok ? res.json() : { meals: [] }),
        fetch(`http://localhost:8000/api/v1/athlete/history-timeline/${athleteId}?start_date=${todayStr}&end_date=${todayStr}`).then(res => res.ok ? res.json() : [])
      ]);

      // 3. Construct synchronized athlete data
      const syncedData: AthleteDetail = {
        ...profileData,
        // Override with live telemetry to sync with Athlete Dashboard
        score: summary.score ?? profileData.score,
        waterLog: summary.water_logged || 0,
        waterTarget: targets.water_target || 8,
        mealsLogged: mealsRes?.meals?.length || 0,
        mealsTarget: targets.meals_target || 5,
        dietMealsTarget: targets.meals_target || 5,
        dietWaterTarget: targets.water_target || 8,
        dietStepsTarget: targets.steps_target || 10000,
        dietCardioTarget: targets.cardio_target || 30,
        dietTargetMacros: (() => {
           if (Array.isArray(targets.target_macros)) {
              return targets.target_macros;
           } else if (typeof targets.target_macros === 'object' && targets.target_macros !== null) {
              return Object.entries(targets.target_macros).map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: Number(v), unit: "g" }));
           }
           return [
             { name: 'Protein', value: 200, unit: 'g' },
             { name: 'Carbs', value: 250, unit: 'g' },
             { name: 'Fat', value: 75, unit: 'g' }
           ];
        })()
      };

      // Supps 
      if (targets.supplement_checklist && Array.isArray(targets.supplement_checklist)) {
         const checkedIds = summary.supplement_checkoffs?.map((s: any) => s.id) || [];
         syncedData.supplements = targets.supplement_checklist.map((s: any) => ({
           ...s,
           completed: checkedIds.includes(s.id)
         }));
      }

      setAthlete(syncedData);

      // Initialize form fields
      setDietMealsTarget(syncedData.dietMealsTarget);
      setDietWaterTarget(syncedData.dietWaterTarget);
      setDietStepsTarget(syncedData.dietStepsTarget);
      setDietCardioTarget(syncedData.dietCardioTarget);
      setMacrosList(syncedData.dietTargetMacros);
      
      setSuppsList(
        syncedData.supplements.map((s) => ({ name: s.name, required: s.required })),
      );
    } catch (err: any) {
      setError(
        err.message || "An error occurred while loading athlete profile.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (athleteId) {
      fetchAthleteDetail(selectedDate);
    }
  }, [athleteId, selectedDate]);

  const handleAddSupp = () => {
    if (!newSuppName.trim()) return;
    setSuppsList([
      ...suppsList,
      { name: newSuppName.trim(), required: newSuppRequired },
    ]);
    setNewSuppName("");
  };

  const handleRemoveSupp = (idx: number) => {
    setSuppsList(suppsList.filter((_, i) => i !== idx));
  };

  const handleAddMacro = () => {
    if (!newMacroName.trim() || newMacroValue <= 0) return;
    setMacrosList([...macrosList, { name: newMacroName.trim(), value: newMacroValue, unit: newMacroUnit }]);
    setNewMacroName('');
    setNewMacroValue(0);
  };

  const handleRemoveMacro = (idx: number) => {
    setMacrosList(macrosList.filter((_, i) => i !== idx));
  };

  const handleSaveTargets = async () => {
    if (!athleteId) return;
    setSaveLoading(true);
    setSaveSuccess(false);

    const payload = {
      meals_target: dietMealsTarget,
      water_target: dietWaterTarget,
      steps_target: dietStepsTarget,
      cardio_target: dietCardioTarget,
      tolerance_percent: 10,
      target_macros: macrosList.map((m) => ({
        name: m.name,
        value: Number(m.value),
        unit: m.unit,
      })),
      supplement_checklist: suppsList.map((s) => ({
        name: s.name,
        required: s.required,
      })),
    };

    try {
      const res = await fetch(
        `http://localhost:8000/api/v1/diet-plan/${athleteId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        throw new Error("Failed to save diet targets");
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);

      // Reload profile to refresh calculations based on new targets
      fetchAthleteDetail();
    } catch (err: any) {
      alert(err.message || "An error occurred while saving targets.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleLogout = () => {
    onLogout();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <p className="text-xs text-muted-foreground uppercase tracking-widest font-extrabold">
          Fetching Athlete Analytics...
        </p>
      </div>
    );
  }

  if (error || !athlete) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-14 h-14 text-status-red mb-4" />
        <h2 className="text-xl font-black text-white mb-2">
          Workspace Load Error
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          {error || "Athlete details could not be found."}
        </p>
        <button
          onClick={() => navigate("/coach/dashboard")}
          className="px-6 py-3 rounded-2xl bg-card border border-card-border hover:bg-card/60 text-white font-bold transition-all text-xs flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-0 w-[50%] h-[35%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[40%] h-[35%] rounded-full bg-status-orange/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 glass-panel border-b border-card-border/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/coach/dashboard")}
              className="p-2.5 rounded-xl text-muted-foreground hover:text-white border border-card-border hover:bg-card/40 transition-all cursor-pointer flex items-center justify-center"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-extrabold">
                Athletic Analytics Hub
              </p>
              <h1 className="text-xl font-black text-white">{athlete.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span
              className={`px-3 py-1.5 rounded-xl border text-[10px] uppercase tracking-widest font-extrabold ${
                athlete.status === "green"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                  : athlete.status === "yellow"
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/25"
                    : athlete.status === "orange"
                      ? "bg-orange-500/10 text-orange-400 border-orange-500/25"
                      : "bg-rose-500/10 text-rose-400 border-rose-500/25"
              }`}
            >
              {athlete.status.toUpperCase()} STATUS
            </span>
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10 space-y-8">
        {/* Date Selector & History Banner */}
        <div className="glass-panel p-5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 border border-card-border/50 bg-gradient-to-r from-card/30 via-transparent to-transparent backdrop-blur-xl">
          <div className="flex items-center gap-4 text-left w-full md:w-auto">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-extrabold">Adherence History Log</p>
              <h3 className="text-lg font-black text-white flex items-center gap-2 mt-0.5">
                {selectedDate === getTodayStr() ? (
                  <span className="flex items-center gap-1.5">
                    Today <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  </span>
                ) : (
                  new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  })
                )}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap sm:flex-nowrap">
            <button
              onClick={() => {
                const current = new Date(selectedDate + "T00:00:00");
                current.setDate(current.getDate() - 1);
                setSelectedDate(current.toISOString().split("T")[0]);
              }}
              className="px-4 py-3 bg-card border border-card-border hover:border-white/10 hover:bg-card/60 text-white text-xs font-black rounded-2xl transition-all cursor-pointer flex-1 sm:flex-none text-center"
            >
              ← Prev Day
            </button>
            
            <div className="relative flex-1 sm:flex-none">
              <input
                type="date"
                value={selectedDate}
                max={getTodayStr()}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(e.target.value);
                  }
                }}
                className="w-full px-5 py-2.5 bg-card border border-card-border rounded-2xl text-xs text-white font-extrabold focus:outline-none focus:border-primary cursor-pointer hover:border-white/10 select-none appearance-none"
              />
            </div>

            <button
              onClick={() => {
                const todayStr = getTodayStr();
                if (selectedDate === todayStr) return;
                const current = new Date(selectedDate + "T00:00:00");
                current.setDate(current.getDate() + 1);
                setSelectedDate(current.toISOString().split("T")[0]);
              }}
              disabled={selectedDate === getTodayStr()}
              className={`px-4 py-3 bg-card border border-card-border hover:border-white/10 hover:bg-card/60 text-white text-xs font-black rounded-2xl transition-all cursor-pointer flex-1 sm:flex-none text-center ${
                selectedDate === getTodayStr() ? "opacity-40 cursor-not-allowed border-transparent" : ""
              }`}
            >
              Next Day →
            </button>
          </div>
        </div>

        {/* Key metrics grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Today's Score */}
          <div className="glass-panel p-6 rounded-3xl flex flex-col justify-between min-h-[120px]">
            <p className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider mb-2">
              Adherence Score
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-white">
                {athlete.score}
              </span>
              <span className="text-xs text-muted-foreground font-bold">
                /100
              </span>
            </div>
            <div className="w-full h-1.5 bg-card rounded-full overflow-hidden mt-3">
              <div
                className={`h-full transition-all duration-500 ${
                  athlete.score >= 85
                    ? "bg-emerald-500"
                    : athlete.score >= 70
                      ? "bg-amber-500"
                      : athlete.score >= 50
                        ? "bg-orange-500"
                        : "bg-rose-500"
                }`}
                style={{ width: `${athlete.score}%` }}
              />
            </div>
          </div>

          {/* Adherence Streak */}
          <div className="glass-panel p-6 rounded-3xl flex flex-col justify-between min-h-[120px]">
            <p className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider mb-2">
              Consistencies
            </p>
            <div className="flex items-center gap-2 text-status-orange font-black">
              <Flame className="w-8 h-8 fill-status-orange/10" />
              <span className="text-4xl text-white">{athlete.streak}</span>
              <span className="text-xs text-muted-foreground font-bold">
                days streak
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase mt-3">
              Verified checkoffs
            </p>
          </div>

          {/* Latest Biometrics */}
          <div className="glass-panel p-6 rounded-3xl flex flex-col justify-between min-h-[120px]">
            <p className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider mb-2">
              Latest Biometrics
            </p>
            <div className="flex items-baseline gap-2 text-white">
              <Scale className="w-6 h-6 text-status-orange" />
              <span className="text-4xl font-black">{athlete.weight}</span>
              <span className="text-xs text-muted-foreground font-bold">
                KG
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase mt-3">
              Time-series tracked
            </p>
          </div>
        </div>

        {/* Configuration & Charts Bento section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Target Config Form */}
          <div className="glass-panel p-6 rounded-3xl lg:col-span-1 space-y-5">
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">
                Diet Targets Builder
              </h3>
              <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                Customize daily compliance variables
              </p>
            </div>

            <div className="space-y-4 text-xs font-bold">
              {/* Meals Target */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground block">
                  Meals Target Count
                </label>
                <input
                  type="number"
                  value={dietMealsTarget}
                  onChange={(e) => setDietMealsTarget(Number(e.target.value))}
                  className="w-full py-2.5 px-4 rounded-xl bg-card border border-card-border text-white focus:outline-none focus:border-primary"
                />
              </div>

              {/* Water Target */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground block">
                  Water Intake Target (Glasses)
                </label>
                <input
                  type="number"
                  value={dietWaterTarget}
                  onChange={(e) => setDietWaterTarget(Number(e.target.value))}
                  className="w-full py-2.5 px-4 rounded-xl bg-card border border-card-border text-white focus:outline-none focus:border-primary"
                />
              </div>

              {/* Steps Target */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground block">
                  Daily Steps Target
                </label>
                <input
                  type="number"
                  value={dietStepsTarget}
                  onChange={(e) => setDietStepsTarget(Number(e.target.value))}
                  className="w-full py-2.5 px-4 rounded-xl bg-card border border-card-border text-white focus:outline-none focus:border-primary"
                />
              </div>

              {/* Cardio Target */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground block">
                  Cardio Active Target (Mins)
                </label>
                <input
                  type="number"
                  value={dietCardioTarget}
                  onChange={(e) => setDietCardioTarget(Number(e.target.value))}
                  className="w-full py-2.5 px-4 rounded-xl bg-card border border-card-border text-white focus:outline-none focus:border-primary"
                />
              </div>

              {/* Target Macros Config Builder */}
              <div className="space-y-3 pt-2 border-t border-card-border/60">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Configure Target Macros (JSONB)</span>
                
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {macrosList.map((macro, mIdx) => (
                    <div key={mIdx} className="flex items-center justify-between p-2 rounded-xl bg-card border border-card-border">
                      <span className="text-[11px] truncate text-white font-bold">{macro.name}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          {macro.value} {macro.unit}
                        </span>
                        <button 
                          type="button"
                          onClick={() => handleRemoveMacro(mIdx)}
                          className="text-status-red hover:text-white text-[10px] px-1 font-bold"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Name (e.g. Protein)"
                    value={newMacroName}
                    onChange={(e) => setNewMacroName(e.target.value)}
                    className="w-1/3 py-2 px-3 rounded-xl bg-card border border-card-border text-xs text-white focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Value"
                    value={newMacroValue || ''}
                    onChange={(e) => setNewMacroValue(Number(e.target.value))}
                    className="w-1/4 py-2 px-2 rounded-xl bg-card border border-card-border text-xs text-white focus:outline-none"
                  />
                  <select
                    value={newMacroUnit}
                    onChange={(e) => setNewMacroUnit(e.target.value)}
                    className="w-1/4 py-2 px-1 rounded-xl bg-card border border-card-border text-xs text-white bg-card focus:outline-none"
                  >
                    <option value="g">g</option>
                    <option value="mg">mg</option>
                    <option value="kcal">kcal</option>
                    <option value="ml">ml</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddMacro}
                    className="px-3 rounded-xl bg-primary text-white font-extrabold flex items-center justify-center cursor-pointer text-xs"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Supplement checklist builder */}
              <div className="space-y-3 pt-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">
                  Configure Supplements
                </span>

                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {suppsList.map((supp, sIdx) => (
                    <div
                      key={sIdx}
                      className="flex items-center justify-between p-2 rounded-xl bg-card border border-card-border"
                    >
                      <span className="text-[11px] truncate text-white">
                        {supp.name}
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`text-[8px] px-1 rounded font-black uppercase ${supp.required ? "bg-primary/20 text-primary" : "bg-card border border-card-border text-muted-foreground"}`}
                        >
                          {supp.required ? "Req" : "Opt"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSupp(sIdx)}
                          className="text-status-red hover:text-white text-[10px] px-1 font-bold"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add supplement name"
                    value={newSuppName}
                    onChange={(e) => setNewSuppName(e.target.value)}
                    className="flex-1 py-2 px-3 rounded-xl bg-card border border-card-border text-xs text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddSupp}
                    className="px-3 rounded-xl bg-primary text-white font-extrabold flex items-center justify-center cursor-pointer text-xs"
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-1 select-none">
                  <input
                    type="checkbox"
                    id="new-supp-required"
                    checked={newSuppRequired}
                    onChange={(e) => setNewSuppRequired(e.target.checked)}
                    className="cursor-pointer accent-primary"
                  />
                  <label
                    htmlFor="new-supp-required"
                    className="text-[10px] text-muted-foreground cursor-pointer"
                  >
                    Required for Adherence Score
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <button
                onClick={handleSaveTargets}
                disabled={saveLoading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary to-purple-600 text-white font-bold hover:shadow-lg transition-all cursor-pointer text-xs flex items-center justify-center"
              >
                {saveLoading
                  ? "Saving target configs..."
                  : "Save Targets Diet Configuration"}
              </button>
              {saveSuccess && (
                <div className="p-2.5 rounded-xl bg-status-green/10 border border-status-green/30 text-status-green text-[10px] font-semibold text-center flex items-center justify-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Targets successfully
                  saved!
                </div>
              )}
            </div>
          </div>

          {/* Charts & Heatmap */}
          <div className="lg:col-span-2 space-y-6">
            <AdherenceHeatmap
              scores={athlete.heatmapData}
              athleteName={athlete.name}
              selectedDate={selectedDate}
              onCellClick={(date) => setSelectedDate(date)}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SimpleLineChart
                data={athlete.weightHistory}
                title="Biometric Weight Logs"
                metric="Weight (KG)"
                color="orange"
              />

              <SimpleLineChart
                data={athlete.waterHistory}
                title="Fluid Hydration Audit"
                metric="Glasses/Day"
                target={athlete.waterTarget}
                color="green"
              />
            </div>
          </div>
        </div>

        {/* Daily Compliance Audit & Meal History Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily Activity Audit (takes 1 column) */}
          <div className="glass-panel p-6 rounded-3xl lg:col-span-1 space-y-6 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">
                Daily Compliance Audit
              </h3>
              <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                Physical telemetry and checkoff log
              </p>
            </div>

            <div className="space-y-5 flex-1 pt-2">
              {/* Hydration Audit */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-white flex items-center gap-1.5">
                    <Droplet className="w-4 h-4 text-status-yellow fill-status-yellow/10" />
                    Water Intake
                  </span>
                  <span className="text-muted-foreground text-[10px]">
                    {athlete.waterLog} / {athlete.waterTarget} glasses
                  </span>
                </div>
                <div className="w-full h-2 bg-card rounded-full overflow-hidden border border-card-border/50">
                  <div
                    className="h-full bg-status-yellow transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (athlete.waterLog / (athlete.waterTarget || 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Steps Audit */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-white flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-primary" />
                    Steps Tracked
                  </span>
                  <span className="text-muted-foreground text-[10px]">
                    {athlete.stepsLogged?.toLocaleString() || 0} / {athlete.dietStepsTarget?.toLocaleString() || 10000}
                  </span>
                </div>
                <div className="w-full h-2 bg-card rounded-full overflow-hidden border border-card-border/50">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (athlete.stepsLogged / (athlete.dietStepsTarget || 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Cardio Audit */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-white flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-status-orange" />
                    Cardio Duration
                  </span>
                  <span className="text-muted-foreground text-[10px]">
                    {athlete.cardioLogged || 0} / {athlete.dietCardioTarget || 30} mins
                  </span>
                </div>
                <div className="w-full h-2 bg-card rounded-full overflow-hidden border border-card-border/50">
                  <div
                    className="h-full bg-status-orange transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (athlete.cardioLogged / (athlete.dietCardioTarget || 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Supplement checklist audit */}
              <div className="space-y-3 pt-3 border-t border-card-border/60">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-extrabold block">
                  Supplements Checkoffs
                </span>

                <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                  {athlete.supplements && athlete.supplements.length > 0 ? (
                    athlete.supplements.map((supp, sIdx) => (
                      <div
                        key={sIdx}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${
                          supp.completed
                            ? "bg-status-green/5 border-status-green/20 text-status-green"
                            : "bg-card/20 border-card-border text-muted-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {supp.completed ? (
                            <CheckCircle className="w-4 h-4 text-status-green flex-shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                          )}
                          <span className={`truncate ${supp.completed ? "line-through text-status-green" : "text-white"}`}>
                            {supp.name}
                          </span>
                        </div>
                        {supp.required && (
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase flex-shrink-0 ${
                            supp.completed ? "bg-status-green/15 text-status-green border border-status-green/25" : "bg-primary/20 text-primary border border-primary/25"
                          }`}>
                            Required
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic text-center py-2">
                      No supplements configured.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Meals logs feed timeline (takes 2 columns) */}
          <div className="glass-panel p-6 rounded-3xl lg:col-span-2 space-y-6">
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">
                Adherence Meal History Timeline
              </h3>
              <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                Chronological feed of athlete uploaded meals
              </p>
            </div>

            {athlete.mealHistory && athlete.mealHistory.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {athlete.mealHistory.map((meal) => (
                  <div
                    key={meal.id}
                    className="p-4 rounded-2xl bg-card/30 border border-card-border hover:border-white/10 transition-all flex gap-4"
                  >
                    {meal.photo ? (
                      <img
                        src={meal.photo}
                        alt={meal.food}
                        className="w-20 h-20 rounded-xl object-cover border border-card-border flex-shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-card border border-card-border flex items-center justify-center text-3xl flex-shrink-0">
                        🍳
                      </div>
                    )}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-sm truncate">
                            {meal.food}
                          </h4>
                          {meal.isEdited && (
                            <span className="text-[8px] bg-primary/10 border border-primary/20 text-primary font-black px-1.5 rounded uppercase">
                              Edited
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                          {meal.time} • Confidence: {meal.confidence}%
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-xs font-extrabold mt-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-primary">
                            P: {meal.macros.p}g
                          </span>
                          <span className="text-status-yellow">
                            C: {meal.macros.c}g
                          </span>
                          <span className="text-status-orange">
                            F: {meal.macros.f}g
                          </span>
                        </div>
                        <span className="text-white bg-card border border-card-border px-2 py-0.5 rounded-md text-[10px]">
                          {meal.calories} kcal
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center my-auto">
                <Users className="w-10 h-10 text-muted-foreground/45 mx-auto mb-3" />
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                  No meal records found for this date.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Camera, Droplet, Flame, Scale, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { apiClient } from '../api/client';
import { AdherenceHeatmap } from '../components/AdherenceHeatmap';
import { SimpleLineChart } from '../components/SimpleLineChart';

interface AthleteDashboardProps {
  onLogout: () => void;
}

export const AthleteDashboard: React.FC<AthleteDashboardProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const name = useAuthStore((state) => state.name);
  const id = useAuthStore((state) => state.id);

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  // State initialization
  const [waterLogged, setWaterLogged] = useState<number>(0);
  const [waterTarget, setWaterTarget] = useState<number>(8);
  const [mealsTarget, setMealsTarget] = useState<number>(5);
  
  const [stepsLogged, setStepsLogged] = useState<number>(0);
  const [stepsTarget, setStepsTarget] = useState<number>(10000);
  const [cardioLogged, setCardioLogged] = useState<number>(0);
  const [cardioTarget, setCardioTarget] = useState<number>(30);
  const [weight, setWeight] = useState<number>(0);

  const [supplements, setSupplements] = useState<any[]>([]);

  const [targetMacros] = useState({ p: 200, c: 250, f: 75, cal: 2475 });


  const [meals, setMeals] = useState<any[]>([]);

  const [weightHistory, setWeightHistory] = useState([
    { date: '06-05', value: 83.1 },
    { date: '06-06', value: 82.9 },
    { date: '06-07', value: 83.0 },
    { date: '06-08', value: 82.6 },
    { date: '06-09', value: 82.5 },
    { date: '06-10', value: 82.4 },
  ]);

  // Load from API on mount
  useEffect(() => {
    if (!id) return;
    const loadDashboard = async () => {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        
        // Parallel requests
        const [targets, summary, mealsRes, historyRes] = await Promise.all([
          apiClient.get(`/api/v1/athlete/targets/${id}`),
          apiClient.get(`/api/v1/athlete/dashboard-summary/${id}`),
          apiClient.get(`/api/v1/meals/today/${id}`),
          apiClient.get(`/api/v1/athlete/history-timeline/${id}?start_date=${todayStr}&end_date=${todayStr}`)
        ]);

        // 1. Targets
        setWaterTarget(targets.water_target || 8);
        setMealsTarget(targets.meals_target || 5);
        setStepsTarget(targets.steps_target || 10000);
        setCardioTarget(targets.cardio_target || 30);
        
        // 2. Supplements (Merge targets checklist with summary checkoffs)
        if (targets.supplement_checklist && Array.isArray(targets.supplement_checklist)) {
           const checkedIds = summary.supplement_checkoffs?.map((s: any) => s.id) || [];
           const mergedSupps = targets.supplement_checklist.map((s: any) => ({
             ...s,
             completed: checkedIds.includes(s.id)
           }));
           setSupplements(mergedSupps);
        }

        // 3. Summary 
        setWaterLogged(summary.water_logged || 0);
        setStepsLogged(summary.steps_logged || 0);
        setCardioLogged(summary.cardio_logged || 0);
        
        if (summary.weight) setWeight(summary.weight);
        setScoreMetrics({ totalScore: summary.score || 0, status: summary.status || 'red' });

        // 4. Meals
        if (mealsRes && Array.isArray(mealsRes.meals)) {
           setMeals(mealsRes.meals.map((m: any) => ({
             id: m.id,
             time: new Date(m.logged_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
             food: m.food_name,
             macros: { p: m.estimated_protein, f: m.estimated_fat, c: m.estimated_carbs },
             calories: m.estimated_calories,
             photo: m.photo_url,
             confidence: m.confidence_score * 100,
             isEdited: m.is_edited
           })));
        }

        // 5. Weight History
        if (historyRes && Array.isArray(historyRes.weight_history)) {
           setWeightHistory(historyRes.weight_history.map((w: any) => ({
             date: w.date.substring(5), // '06-05'
             value: w.weight
           })));
        }
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      }

    };
    loadDashboard();
  }, [id]);

  // Sync to API helper (Replacing localStorage)
  const saveTelemetry = async (updates: any) => {
    if (!id) return;
    const logDate = new Date().toISOString().split('T')[0];
    
    try {
      if (updates.waterLogged !== undefined) {
        await apiClient.put('/api/v1/logs/water', { athlete_id: id, log_date: logDate, water_logged: updates.waterLogged });
      }
      if (updates.supplements !== undefined) {
        await apiClient.put('/api/v1/logs/supplements', { 
           athlete_id: id, 
           log_date: logDate, 
           checked_supplements: updates.supplements.filter((s:any) => s.completed).map((s:any) => s.name)
        });
      }
      if (updates.stepsLogged !== undefined) {
        await apiClient.put('/api/v1/logs/steps', { athlete_id: id, log_date: logDate, steps_logged: updates.stepsLogged });
      }
      if (updates.cardioLogged !== undefined) {
        await apiClient.put('/api/v1/logs/workout', { athlete_id: id, log_date: logDate, cardio_logged: updates.cardioLogged, workout_completed: true });
      }
      if (updates.weight !== undefined) {
        await apiClient.put('/api/v1/logs/weight', { athlete_id: id, log_date: logDate, weight: updates.weight });
      }
    } catch (err) {
      console.error("Failed to sync telemetry to backend", err);
    }
  };

  const [scoreMetrics, setScoreMetrics] = useState({ totalScore: 0, status: 'red' });
  const mealsLogged = meals.length;

  // Accumulated totals
  const totalMacros = useMemo(() => {
    return meals.reduce((sum, m) => ({
      p: sum.p + m.macros.p,
      c: sum.c + m.macros.c,
      f: sum.f + m.macros.f,
      cal: sum.cal + m.calories
    }), { p: 0, c: 0, f: 0, cal: 0 });
  }, [meals]);

  const [showMealModal, setShowMealModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [scanAnimation, setScanAnimation] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);

  // Vision Result State (for Confirmation/Nudge layout)
  const [showConfirmPane, setShowConfirmPane] = useState(false);
  const [initialMacros, setInitialMacros] = useState({ p: 0, f: 0, c: 0 });
  const [mealFormData, setMealFormData] = useState({
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    food: '',
    macros: { p: 0, f: 0, c: 0 },
    calories: 0,
    confidence: 0,
    micronutrients: {
      fiber: 0,
      iron: 0,
      calcium: 0,
      potassium: 0,
      magnesium: 0,
      vitaminB12: 0,
    },
    rawVisionResponse: {} as any
  });

  const toggleSupplement = (id: string) => {
    const nextSupps = supplements.map(s =>
      s.id === id ? { ...s, completed: !s.completed } : s
    );
    setSupplements(nextSupps);
    saveTelemetry({ supplements: nextSupps });
  };

  const incrementWater = () => {
    const nextWater = Math.min(12, waterLogged + 1);
    setWaterLogged(nextWater);
    saveTelemetry({ waterLogged: nextWater });
  };

  const decrementWater = () => {
    const nextWater = Math.max(0, waterLogged - 1);
    setWaterLogged(nextWater);
    saveTelemetry({ waterLogged: nextWater });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setScanAnimation(true);

    const formData = new FormData();
    formData.append("image", file);
    if (!id) {
      console.error("Athlete ID is missing");
      return;
    }
    formData.append("athlete_id", id);

    try {
      const data = await apiClient.post("/api/meals/upload", formData);
      
      setTempImage(data.photo_url);
      setInitialMacros({
        p: Math.round(data.estimated_protein) || 0,
        f: Math.round(data.estimated_fat) || 0,
        c: Math.round(data.estimated_carbs) || 0
      });
      
      setMealFormData({
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        food: data.food_name,
        macros: {
          p: Math.round(data.estimated_protein) || 0,
          f: Math.round(data.estimated_fat) || 0,
          c: Math.round(data.estimated_carbs) || 0
        },
        calories: Math.round(data.estimated_calories) || 0,
        confidence: Math.round(data.confidence_score * 100) || 0,
        micronutrients: {
          fiber: data.estimated_micronutrients?.fiber || 0,
          iron: data.estimated_micronutrients?.iron || 0,
          calcium: data.estimated_micronutrients?.calcium || 0,
          potassium: data.estimated_micronutrients?.potassium || 0,
          magnesium: data.estimated_micronutrients?.magnesium || 0,
          vitaminB12: data.estimated_micronutrients?.vitaminB12 || 0,
        },
        rawVisionResponse: data.raw_vision_response || {}
      });

      setShowConfirmPane(true);
    } catch (err) {
      console.error(err);
      alert("Error detecting meal: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setScanAnimation(false);
      setUploadingImage(false);
    }
  };

  const handleCommitMeal = async (e: React.FormEvent) => {
    e.preventDefault();

    const isEdited = mealFormData.macros.p !== initialMacros.p ||
                     mealFormData.macros.c !== initialMacros.c ||
                     mealFormData.macros.f !== initialMacros.f;

    if (!id) {
      console.error("Athlete ID is missing");
      return;
    }

    if (!mealFormData.food.trim()) {
      alert("Food name cannot be empty");
      return;
    }

    const payload = {
      athlete_id: id,
      food_name: mealFormData.food,
      photo_url: tempImage,
      raw_vision_response: mealFormData.rawVisionResponse,
      confidence_score: mealFormData.confidence / 100,
      estimated_calories: mealFormData.calories,
      estimated_protein: mealFormData.macros.p,
      estimated_carbs: mealFormData.macros.c,
      estimated_fat: mealFormData.macros.f,
      estimated_micronutrients: {
        fiber: mealFormData.micronutrients.fiber,
        iron: mealFormData.micronutrients.iron,
        calcium: mealFormData.micronutrients.calcium,
        potassium: mealFormData.micronutrients.potassium,
        magnesium: mealFormData.micronutrients.magnesium,
        vitaminB12: mealFormData.micronutrients.vitaminB12
      },
      serving_size: 150.0,
      is_edited: isEdited
    };

    try {
      const dbResult = await apiClient.post("/api/meals/confirm", payload);

      const newMeal = {
        id: dbResult.meal_id || (meals.length + 1).toString(),
        time: mealFormData.time,
        food: mealFormData.food,
        macros: mealFormData.macros,
        calories: mealFormData.calories,
        photo: tempImage,
        confidence: mealFormData.confidence,
        isEdited: isEdited,
      };
      
      const nextMeals = [...meals, newMeal];
      setMeals(nextMeals);
      saveTelemetry({ meals: nextMeals });
      
      setShowConfirmPane(false);
      setShowMealModal(false);
      setTempImage(null);
    } catch (err) {
      console.error(err);
      alert("Failed to save meal: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleWeightChange = (val: number) => {
    setWeight(val);
    const todayStr = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
    
    // Update or add today's weight log in history
    let nextHistory = [...weightHistory];
    const idx = nextHistory.findIndex(h => h.date === todayStr);
    if (idx >= 0) {
      nextHistory[idx].value = val;
    } else {
      nextHistory.push({ date: todayStr, value: val });
      if (nextHistory.length > 7) nextHistory.shift();
    }
    
    setWeightHistory(nextHistory);
    saveTelemetry({ weight: val, weightHistory: nextHistory });
  };

  const handleStepsChange = (val: number) => {
    setStepsLogged(val);
    saveTelemetry({ stepsLogged: val });
  };

  const handleCardioChange = (val: number) => {
    setCardioLogged(val);
    saveTelemetry({ cardioLogged: val });
  };

  // Mock heatmap data
  const mockHeatmapData = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().split('T')[0];
    return {
      date: dStr,
      score: i === 0 ? scoreMetrics.totalScore : Math.floor(Math.random() * 30) + 70
    };
  });

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      
      {/* Dynamic ambient header glows */}
      <div className="absolute top-0 right-0 w-[50%] h-[35%] rounded-full bg-status-orange/5 blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] left-0 w-[40%] h-[35%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 glass-panel border-b border-card-border/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-status-orange to-yellow-500 flex items-center justify-center text-white font-black">
              A
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-extrabold">Athlete Roster Portal</p>
              <h1 className="text-lg font-black text-white">{name || 'Athlete Log'}</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-card-border text-[10px] text-muted-foreground uppercase font-extrabold">
              <ShieldCheck className="w-3.5 h-3.5 text-status-green" /> DPDP Consent Active
            </div>
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
      <main className="max-w-5xl mx-auto px-6 py-10 relative z-10">
        
        {/* Daily Score & Streak Bento Row */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* Circular Performance Score Card */}
          <div className="glass-panel p-6 md:p-8 rounded-3xl col-span-1 md:col-span-2 flex flex-col sm:flex-row items-center gap-6 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
            {/* SVG Progress Ring */}
            <div className="relative w-36 h-36 flex-shrink-0 flex items-center justify-center">
              <svg className="w-full h-full rotate-[-90deg]">
                <circle
                  cx="72"
                  cy="72"
                  r="62"
                  stroke="hsl(var(--card-border))"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="62"
                  stroke={scoreMetrics.totalScore >= 85 ? 'hsl(var(--status-green))' : scoreMetrics.totalScore >= 70 ? 'hsl(var(--status-yellow))' : scoreMetrics.totalScore >= 50 ? 'hsl(var(--status-orange))' : 'hsl(var(--status-red))'}
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 62}
                  strokeDashoffset={2 * Math.PI * 62 * (1 - scoreMetrics.totalScore / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-4xl font-black text-white">{scoreMetrics.totalScore}</span>
                <span className="block text-[8px] uppercase tracking-widest text-muted-foreground font-extrabold mt-0.5">Score</span>
              </div>
            </div>
            
            {/* Details panel */}
            <div className="flex-1 text-center sm:text-left space-y-3">
              <span className="text-[10px] uppercase tracking-widest text-primary font-black px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                Daily Metric Status
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight">Your training adherence is {scoreMetrics.totalScore >= 85 ? 'Optimized' : scoreMetrics.totalScore >= 70 ? 'Balanced' : 'Below Target'}.</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Adherence is calculated dynamically across your diet meals target ({mealsLogged}/{mealsTarget}), required supplements completion, and workout metrics logging.
              </p>
            </div>
          </div>

          {/* Streak Counter Card */}
          <div className="glass-panel p-6 md:p-8 rounded-3xl bg-gradient-to-br from-status-orange/5 to-transparent flex flex-col justify-center items-center text-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-status-orange/10 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
            <div className="w-12 h-12 rounded-2xl bg-status-orange/15 border border-status-orange/35 flex items-center justify-center text-status-orange mb-4 shadow-sm">
              <Flame className="w-6 h-6 text-status-orange fill-status-orange/10 animate-pulse" />
            </div>
            <p className="text-5xl font-black text-white tracking-tighter">12</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-extrabold mt-1.5">Days Adherence Streak</p>
            <span className="text-[9px] text-status-orange font-bold mt-1.5 bg-status-orange/10 px-2 py-0.5 rounded-md border border-status-orange/20">
              Elite Status
            </span>
          </div>

        </section>

        {/* Daily Goals Tracking Bento Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Bento Card 1: Meals Logged */}
          <div className="glass-panel p-6 rounded-3xl lg:col-span-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">Diet & Meals Log</h3>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Estimates powered by computer vision</p>
                </div>
                <span className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border ${
                  mealsLogged >= mealsTarget
                    ? 'bg-status-green/10 text-status-green border-status-green/30'
                    : 'bg-status-orange/10 text-status-orange border-status-orange/30'
                }`}>
                  {mealsLogged}/{mealsTarget} meals
                </span>
              </div>
              
              {/* Daily Macros Progress Tracker */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-card/25 border border-card-border/60 mb-6">
                {/* Calories */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] uppercase font-bold tracking-wider">
                    <span className="text-white">Calories</span>
                    <span className="text-muted-foreground">{totalMacros.cal} / {targetMacros.cal} kcal</span>
                  </div>
                  <div className="w-full h-1.5 bg-card rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-500"
                      style={{ width: `${Math.min(100, (totalMacros.cal / (targetMacros.cal || 1)) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Protein */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] uppercase font-bold tracking-wider">
                    <span className="text-primary">Protein</span>
                    <span className="text-muted-foreground">{totalMacros.p} / {targetMacros.p}g</span>
                  </div>
                  <div className="w-full h-1.5 bg-card rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${Math.min(100, (totalMacros.p / (targetMacros.p || 1)) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Carbs */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] uppercase font-bold tracking-wider">
                    <span className="text-status-yellow">Carbs</span>
                    <span className="text-muted-foreground">{totalMacros.c} / {targetMacros.c}g</span>
                  </div>
                  <div className="w-full h-1.5 bg-card rounded-full overflow-hidden">
                    <div
                      className="h-full bg-status-yellow transition-all duration-500"
                      style={{ width: `${Math.min(100, (totalMacros.c / (targetMacros.c || 1)) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Fat */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] uppercase font-bold tracking-wider">
                    <span className="text-status-orange">Fat</span>
                    <span className="text-muted-foreground">{totalMacros.f} / {targetMacros.f}g</span>
                  </div>
                  <div className="w-full h-1.5 bg-card rounded-full overflow-hidden">
                    <div
                      className="h-full bg-status-orange transition-all duration-500"
                      style={{ width: `${Math.min(100, (totalMacros.f / (targetMacros.f || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Meals Feed */}
              <div className="space-y-3 mb-6">
                {meals.map((meal) => (
                  <div key={meal.id} className="p-4 rounded-2xl bg-card/30 border border-card-border/50 hover:border-white/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {meal.photo ? (
                        <img src={meal.photo} alt={meal.food} className="w-12 h-12 rounded-xl object-cover border border-card-border" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-card border border-card-border flex items-center justify-center text-lg">
                          🍳
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-white">{meal.food}</p>
                          {meal.isEdited && (
                            <span className="text-[8px] bg-primary/10 text-primary border border-primary/20 font-black uppercase px-1 rounded-md">
                              Edited
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium">{meal.time} • AI confidence {meal.confidence}%</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs font-extrabold">
                      <div className="flex items-center gap-2">
                        <span className="text-primary">P: {meal.macros.p}g</span>
                        <span className="text-status-yellow">C: {meal.macros.c}g</span>
                        <span className="text-status-orange">F: {meal.macros.f}g</span>
                      </div>
                      <span className="text-white bg-card border border-card-border px-2.5 py-1 rounded-lg">
                        {meal.calories} kcal
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowMealModal(true)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-status-orange to-yellow-600 text-white font-bold hover:shadow-lg hover:shadow-status-orange/20 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
              >
                <Camera className="w-5 h-5 text-white" />
                Upload Meal Photo
              </button>
            </div>
          </div>

          {/* Bento Card 2: Hydration Intake */}
          <div className="glass-panel p-6 rounded-3xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">Hydration Log</h3>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Coach water target: {waterTarget} glasses</p>
                </div>
                <span className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border ${
                  waterLogged >= waterTarget
                    ? 'bg-status-green/10 text-status-green border-status-green/30'
                    : 'bg-status-orange/10 text-status-orange border-status-orange/30'
                }`}>
                  {waterLogged}/{waterTarget} gls
                </span>
              </div>

              {/* Water grid visualization */}
              <div className="grid grid-cols-4 gap-2 mb-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <button
                    key={i}
                    className={`aspect-square rounded-xl border-2 transition-all flex items-center justify-center cursor-pointer ${
                      i < waterLogged
                        ? 'bg-status-yellow/15 border-status-yellow/55 text-status-yellow'
                        : 'bg-card/25 border-card-border/60 hover:border-status-yellow/30 text-muted-foreground'
                    }`}
                    onClick={() => {
                      if (i < waterLogged) {
                        setWaterLogged(i);
                        saveTelemetry({ waterLogged: i });
                      } else {
                        const nextWater = i + 1;
                        setWaterLogged(nextWater);
                        saveTelemetry({ waterLogged: nextWater });
                      }
                    }}
                  >
                    <Droplet className={`w-7 h-7 ${i < waterLogged ? 'text-status-yellow fill-status-yellow/20' : 'text-muted-foreground/30'}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Quick volume add controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={decrementWater}
                className="flex-1 py-3 rounded-2xl bg-card border border-card-border text-foreground hover:text-white font-extrabold transition-colors cursor-pointer text-xs"
              >
                - Remove Glass
              </button>
              <button
                onClick={incrementWater}
                className="flex-1 py-3 rounded-2xl bg-status-yellow/15 border border-status-yellow/20 text-status-yellow font-extrabold hover:bg-status-yellow/20 transition-all cursor-pointer text-xs"
              >
                + Add Glass
              </button>
            </div>
          </div>

          {/* Bento Card 3: Supplement Checklist */}
          <div className="glass-panel p-6 rounded-3xl lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">Supplement Checklist</h3>
                <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Supplements require explicit tracking for enhanced athlete profiles</p>
              </div>
              <span className="text-xs font-extrabold px-3 py-1.5 rounded-xl border bg-status-green/10 text-status-green border-status-green/30">
                {supplements.filter(s => s.completed).length}/{supplements.length} completed
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {supplements.map((supp) => (
                <button
                  key={supp.id}
                  onClick={() => toggleSupplement(supp.id)}
                  className={`p-4 rounded-2xl border transition-all text-left flex items-center gap-3 cursor-pointer ${
                    supp.completed
                      ? 'bg-status-green/10 border-status-green/35 text-status-green'
                      : 'bg-card/20 border-card-border/70 hover:border-primary/30 text-foreground'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${
                    supp.completed
                      ? 'bg-status-green border-status-green text-white'
                      : 'border-muted-foreground'
                  }`}>
                    {supp.completed && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <span className={`font-bold text-xs ${supp.completed ? 'text-status-green line-through' : 'text-white'}`}>
                    {supp.name}
                  </span>
                  {supp.required && (
                    <span className="ml-auto text-[8px] bg-primary/10 border border-primary/25 text-primary font-black px-1.5 py-0.5 rounded-md uppercase">
                      Req
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Bento Card 4: Biometrics & Workouts */}
          <div className="glass-panel p-6 rounded-3xl lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Weight Input */}
            <div className="space-y-3">
              <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground block">
                Biometric Weight (KG)
              </label>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-card border border-card-border flex items-center justify-center text-status-orange flex-shrink-0">
                  <Scale className="w-5 h-5" />
                </div>
                <input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => handleWeightChange(Number(e.target.value))}
                  className="flex-1 py-3 px-4 rounded-xl bg-card/40 border border-card-border focus:border-primary/50 text-white font-bold text-sm focus:outline-none"
                />
              </div>
            </div>

            {/* Daily Steps */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  Daily Steps Target
                </label>
                <span className="text-[10px] text-muted-foreground font-extrabold">{stepsLogged}/{stepsTarget}</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="15000"
                  step="500"
                  value={stepsLogged}
                  onChange={(e) => handleStepsChange(Number(e.target.value))}
                  className="flex-1 accent-primary cursor-pointer"
                />
              </div>
            </div>

            {/* Cardio Duration */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  Cardio Active Target
                </label>
                <span className="text-[10px] text-muted-foreground font-extrabold">{cardioLogged}/{cardioTarget} mins</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="90"
                  step="5"
                  value={cardioLogged}
                  onChange={(e) => handleCardioChange(Number(e.target.value))}
                  className="flex-1 accent-status-orange cursor-pointer"
                />
              </div>
            </div>

          </div>

        </section>

        {/* History Charts Section */}
        <section className="space-y-6">
          <h2 className="text-xl font-black text-white tracking-tight">Analytics & Adherence Logs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AdherenceHeatmap scores={mockHeatmapData} />
            <SimpleLineChart
              data={weightHistory}
              title="Biometric Weight Tracking (Last 7 Logs)"
              metric="Weight (KG)"
              color="orange"
            />
          </div>
        </section>

      </main>

      {/* Upload & Nudge Meal Modal */}
      {showMealModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-panel rounded-3xl p-6 md:p-8 max-w-lg w-full max-h-[95vh] overflow-y-auto relative shadow-2xl animate-fade-in border-white/10">
            <div className="absolute top-0 inset-x-0 h-1 rounded-t-3xl bg-gradient-to-r from-status-orange to-yellow-500" />
            
            <h2 className="text-2xl font-black text-white mb-4">AI Vision Meal Upload</h2>

            {!showConfirmPane ? (
              <div className="space-y-5">
                {/* Image selection */}
                <div className="relative">
                  <label className="block p-10 rounded-2xl border-2 border-dashed border-card-border hover:border-status-orange/40 cursor-pointer transition-colors text-center bg-card/20 relative overflow-hidden">
                    <Camera className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
                    <p className="text-sm text-white font-bold">Select Meal Image</p>
                    <p className="text-xs text-muted-foreground mt-1">Image processing estimates macros and micronutrients</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                    {scanAnimation && (
                      <div className="absolute inset-x-0 h-0.5 bg-status-orange/70 shadow-lg shadow-status-orange/30 animate-scan pointer-events-none" />
                    )}
                  </label>
                </div>

                {uploadingImage && (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <div className="w-8 h-8 rounded-full border-2 border-status-orange/20 border-t-status-orange animate-spin" />
                    <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Vision API analyzing dish details...</span>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowMealModal(false); setTempImage(null); }}
                    className="px-5 py-3 rounded-xl border border-card-border text-foreground hover:text-white font-bold transition-colors cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCommitMeal} className="space-y-6">
                
                {/* Side-by-side Upload Preview & AI status */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-card/30 border border-card-border">
                  {tempImage && (
                    <img src={tempImage} alt="Preview" className="w-16 h-16 rounded-xl object-cover border border-card-border" />
                  )}
                  <div>
                    <span className="text-[9px] bg-status-green/10 text-status-green border border-status-green/20 px-2 py-0.5 rounded-md font-black uppercase tracking-wider">
                      LogMeal Estimate
                    </span>
                    <h4 className="text-sm font-bold text-white mt-1.5">{mealFormData.food}</h4>
                    <p className="text-[10px] text-muted-foreground font-medium">Confidence Score: {mealFormData.confidence}%</p>
                  </div>
                </div>

                {/* Adjust food description */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Dish Description</label>
                  <input
                    type="text"
                    value={mealFormData.food}
                    onChange={(e) => setMealFormData({ ...mealFormData, food: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-card border border-card-border focus:border-primary/50 text-white font-bold text-sm focus:outline-none"
                    placeholder="e.g. Chicken Rice"
                    required
                  />
                </div>

                {/* NUDGE ADJUSTMENT CONTROLS */}
                <div className="space-y-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-white border-b border-card-border/60 pb-2">
                    Nudge Macronutrients
                  </h3>
                  
                  <div className="grid grid-cols-3 gap-4">
                    {/* Protein */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-primary uppercase tracking-wider">Protein (g)</label>
                      <input
                        type="number"
                        value={mealFormData.macros.p}
                        onChange={(e) => {
                          const p = Number(e.target.value);
                          setMealFormData({
                            ...mealFormData,
                            macros: { ...mealFormData.macros, p: Math.max(0, p) },
                            calories: Math.round(Math.max(0, p) * 4 + mealFormData.macros.c * 4 + mealFormData.macros.f * 9)
                          });
                        }}
                        className="w-full px-3 py-2.5 rounded-xl bg-card border border-card-border focus:border-primary/50 text-white font-bold text-sm focus:outline-none"
                      />
                    </div>
                    {/* Carbs */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-status-yellow uppercase tracking-wider">Carbs (g)</label>
                      <input
                        type="number"
                        value={mealFormData.macros.c}
                        onChange={(e) => {
                          const c = Number(e.target.value);
                          setMealFormData({
                            ...mealFormData,
                            macros: { ...mealFormData.macros, c: Math.max(0, c) },
                            calories: Math.round(mealFormData.macros.p * 4 + Math.max(0, c) * 4 + mealFormData.macros.f * 9)
                          });
                        }}
                        className="w-full px-3 py-2.5 rounded-xl bg-card border border-card-border focus:border-primary/50 text-white font-bold text-sm focus:outline-none"
                      />
                    </div>
                    {/* Fat */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-status-orange uppercase tracking-wider">Fat (g)</label>
                      <input
                        type="number"
                        value={mealFormData.macros.f}
                        onChange={(e) => {
                          const f = Number(e.target.value);
                          setMealFormData({
                            ...mealFormData,
                            macros: { ...mealFormData.macros, f: Math.max(0, f) },
                            calories: Math.round(mealFormData.macros.p * 4 + mealFormData.macros.c * 4 + Math.max(0, f) * 9)
                          });
                        }}
                        className="w-full px-3 py-2.5 rounded-xl bg-card border border-card-border focus:border-primary/50 text-white font-bold text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Micronutrients display */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-card-border/60 pb-2">
                    <h3 className="text-xs font-extrabold uppercase tracking-widest text-white">
                      Directional Micronutrients
                    </h3>
                    <span className="text-[8px] bg-card border border-card-border text-muted-foreground uppercase font-black px-1.5 py-0.5 rounded">
                      Low Confidence Estimates
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-[10px] text-muted-foreground font-bold">
                    <div className="p-2.5 rounded-xl bg-card/20 border border-card-border/40">
                      <span>Fiber: </span><span className="text-white font-black">{mealFormData.micronutrients.fiber}g</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-card/20 border border-card-border/40">
                      <span>Iron: </span><span className="text-white font-black">{mealFormData.micronutrients.iron}mg</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-card/20 border border-card-border/40">
                      <span>Calcium: </span><span className="text-white font-black">{mealFormData.micronutrients.calcium}mg</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-card/20 border border-card-border/40">
                      <span>Potassium: </span><span className="text-white font-black">{mealFormData.micronutrients.potassium}mg</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-card/20 border border-card-border/40">
                      <span>Magnesium: </span><span className="text-white font-black">{mealFormData.micronutrients.magnesium}mg</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-card/20 border border-card-border/40">
                      <span>Vit B12: </span><span className="text-white font-black">{mealFormData.micronutrients.vitaminB12}mcg</span>
                    </div>
                  </div>
                </div>

                {/* Target warning comparison logic */}
                <div className="p-4 rounded-2xl bg-card/40 border border-card-border/60 space-y-2 text-xs font-semibold">
                  <span className="text-muted-foreground uppercase tracking-wide text-[9px] font-extrabold block">Daily Budget Comparison</span>
                  <div className="flex justify-between">
                    <span>Eaten Today + Meal:</span>
                    <span className={totalMacros.cal + mealFormData.calories > targetMacros.cal ? 'text-status-red' : 'text-white'}>
                      {totalMacros.cal + mealFormData.calories} / {targetMacros.cal} kcal
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Protein Budget:</span>
                    <span className={totalMacros.p + mealFormData.macros.p > targetMacros.p ? 'text-status-green' : 'text-muted-foreground'}>
                      {totalMacros.p + mealFormData.macros.p} / {targetMacros.p} g
                    </span>
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowConfirmPane(false); setTempImage(null); }}
                    className="flex-1 py-4 rounded-2xl border border-card-border text-foreground hover:text-white font-bold transition-all cursor-pointer text-xs"
                  >
                    Nudge Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-status-orange to-yellow-600 text-white font-bold hover:shadow-lg hover:shadow-status-orange/20 transition-all cursor-pointer text-xs hover:scale-[1.01] active:scale-[0.99]"
                  >
                    Confirm & Log Meal
                  </button>
                </div>

              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

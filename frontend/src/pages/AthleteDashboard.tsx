import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Camera, Droplet, Flame, Scale, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { AdherenceHeatmap } from '../components/AdherenceHeatmap';
import { SimpleLineChart } from '../components/SimpleLineChart';

interface AthleteDashboardProps {
  onLogout: () => void;
}

export const AthleteDashboard: React.FC<AthleteDashboardProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const name = useAuthStore((state) => state.name);
  const email = useAuthStore((state) => state.email);
  const id = useAuthStore((state) => state.id);

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  // Scoped localStorage persistence
  const storageKey = `athlete-data-${email || 'guest'}`;

  // State initialization
  const [waterLogged, setWaterLogged] = useState<number>(3);
  const [waterTarget, setWaterTarget] = useState<number>(8);
  const [mealsTarget, setMealsTarget] = useState<number>(5);
  
  const [stepsLogged, setStepsLogged] = useState<number>(6000);
  const [stepsTarget, setStepsTarget] = useState<number>(10000);
  const [cardioLogged, setCardioLogged] = useState<number>(15);
  const [cardioTarget, setCardioTarget] = useState<number>(30);
  const [weight, setWeight] = useState<number>(82.4);

  const [supplements, setSupplements] = useState([
    { id: '1', name: 'Creatine Monohydrate', completed: true, required: true },
    { id: '2', name: 'Omega 3 Fish Oil', completed: false, required: true },
    { id: '3', name: 'Multivitamin Formula', completed: true, required: true },
  ]);

  const [targetMacros, setTargetMacros] = useState({ p: 200, c: 250, f: 75, cal: 2475 });

  const [meals, setMeals] = useState<any[]>([]);
  const [weightHistory, setWeightHistory] = useState<{ date: string; value: number }[]>([]);
  const [heatmapData, setHeatmapData] = useState<{ date: string; score: number }[]>([]);
  const [createdAt, setCreatedAt] = useState<string | undefined>(undefined);
  const [streak, setStreak] = useState<number>(0);

  // Load from localStorage if present
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.waterLogged === 'number') setWaterLogged(parsed.waterLogged);
        if (Array.isArray(parsed.supplements)) setSupplements(parsed.supplements);
        if (Array.isArray(parsed.meals)) setMeals(parsed.meals);
        if (typeof parsed.stepsLogged === 'number') setStepsLogged(parsed.stepsLogged);
        if (typeof parsed.cardioLogged === 'number') setCardioLogged(parsed.cardioLogged);
        if (typeof parsed.weight === 'number') setWeight(parsed.weight);
        if (Array.isArray(parsed.weightHistory)) setWeightHistory(parsed.weightHistory);
      } catch (err) {
        console.error('Failed to parse saved athlete telemetry data', err);
      }
    }
  }, [storageKey]);

  const loadAdherenceData = () => {
    if (!id) return;

    fetch(`http://localhost:8000/api/v1/athlete/heatmap/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Heatmap data not found');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setHeatmapData(data);
        }
      })
      .catch(err => console.warn('Could not fetch heatmap data from server:', err));

    fetch(`http://localhost:8000/api/v1/athlete/weight-history/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Weight history not found');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          const mapped = data.map((d: any) => ({
            date: d.date,
            value: d.value
          }));
          setWeightHistory(mapped);
        }
      })
      .catch(err => console.warn('Could not fetch weight history from server:', err));

    fetch(`http://localhost:8000/api/v1/athlete/dashboard-summary/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Dashboard summary not found');
        return res.json();
      })
      .then(data => {
        if (data && typeof data.current_streak === 'number') {
          setStreak(data.current_streak);
        }
      })
      .catch(err => console.warn('Could not fetch dashboard summary from server:', err));
  };

  // Load from database if athlete is authenticated
  useEffect(() => {
    if (!id) return;

    loadAdherenceData();

    // 1. Fetch Diet Plan Targets
    fetch(`http://localhost:8000/api/v1/athlete/targets/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Targets not found');
        return res.json();
      })
      .then(data => {
        if (data) {
          setMealsTarget(data.target_meals || 5);
          setWaterTarget(data.water_target || 8);
          setStepsTarget(data.steps_target || 10000);
          setCardioTarget(data.cardio_target || 30);
          if (data.created_at) {
            setCreatedAt(data.created_at.split("T")[0]);
          }
          
          if (Array.isArray(data.target_macros)) {
            let p = 0, c = 0, f = 0;
            data.target_macros.forEach((m: any) => {
              const name = m.name?.toLowerCase();
              if (name === 'protein') p = m.value;
              else if (name === 'carbs') c = m.value;
              else if (name === 'fat') f = m.value;
            });
            const cal = p * 4 + c * 4 + f * 9;
            setTargetMacros({ p, c, f, cal });
          }

          if (Array.isArray(data.supplement_checklist)) {
            setSupplements(prevSupps => {
              return data.supplement_checklist.map((s: any, idx: number) => {
                const existing = prevSupps.find(p => p.name.toLowerCase() === s.name.toLowerCase());
                return {
                  id: (idx + 1).toString(),
                  name: s.name,
                  completed: existing ? existing.completed : false,
                  required: s.required
                };
              });
            });
          }
        }
      })
      .catch(err => console.warn('Could not fetch diet targets from server:', err));

    // 2. Fetch today's meal logs from the database
    fetch(`http://localhost:8000/api/v1/meals/today/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Meal logs not found');
        return res.json();
      })
      .then(data => {
        if (data && Array.isArray(data.meals)) {
          const mappedMeals = data.meals.map((m: any, idx: number) => {
            const macros = m.confirmed_macros || {};
            return {
              id: m.id || (idx + 1).toString(),
              time: new Date(m.logged_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
              food: m.raw_food_log || 'Unknown Meal',
              macros: {
                p: macros.protein || 0,
                c: macros.carbs || 0,
                f: macros.fat || 0
              },
              calories: macros.calories || 0,
              photo: m.photo_url || null,
              confidence: Math.round((m.confidence_score || 0) * 100),
              isEdited: macros.is_edited || false
            };
          });
          setMeals(mappedMeals);
        }
      })
      .catch(err => console.warn('Could not fetch meal logs from server:', err));

    // 3. Fetch today's daily log from the database
    fetch(`http://localhost:8000/api/v1/athlete/daily-log/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Daily log not found');
        return res.json();
      })
      .then(data => {
        if (data) {
          if (typeof data.water_logged === 'number') setWaterLogged(data.water_logged);
          if (typeof data.steps_logged === 'number') setStepsLogged(data.steps_logged);
          if (typeof data.cardio_logged === 'number') setCardioLogged(data.cardio_logged);
          if (typeof data.weight === 'number' && data.weight > 0) setWeight(data.weight);
          
          if (Array.isArray(data.supplement_checkoffs)) {
            const completedNames = new Set(
              data.supplement_checkoffs
                .filter((s: any) => s.completed)
                .map((s: any) => s.name?.toLowerCase())
            );
            setSupplements(prevSupps => 
              prevSupps.map(s => ({
                ...s,
                completed: completedNames.has(s.name?.toLowerCase())
              }))
            );
          }
        }
      })
      .catch(err => console.warn('Could not fetch daily log from server:', err));

  }, [id]);

  // Save to localStorage helper
  const saveTelemetry = (updates: any) => {
    const current = {
      waterLogged,
      supplements,
      meals,
      stepsLogged,
      cardioLogged,
      weight,
      weightHistory
    };
    localStorage.setItem(storageKey, JSON.stringify({ ...current, ...updates }));
  };

  // Sync to backend DB helper
  const syncTelemetry = (type: string, value: any) => {
    if (!id) return;
    const log_date = new Date().toISOString().split("T")[0];
    
    let url = "";
    let body: any = {};
    
    switch (type) {
      case "water":
        url = "http://localhost:8000/api/v1/logs/water";
        body = { athlete_id: id, log_date, water_logged: value };
        break;
      case "steps":
        url = "http://localhost:8000/api/v1/logs/steps";
        body = { athlete_id: id, log_date, steps_logged: value };
        break;
      case "cardio":
        url = "http://localhost:8000/api/v1/logs/cardio";
        body = { athlete_id: id, log_date, cardio_logged: value };
        break;
      case "supplements":
        url = "http://localhost:8000/api/v1/logs/supplements";
        body = { athlete_id: id, log_date, checked_supplements: value };
        break;
      case "weight":
        url = "http://localhost:8000/api/v1/logs/weight";
        body = { athlete_id: id, log_date, weight: value };
        break;
      default:
        return;
    }
    
    fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
    .then(async (res) => {
      if (!res.ok) {
        console.warn(`[TELEMETRY SYNC] Failed to sync ${type} to backend`);
      } else {
        loadAdherenceData();
      }
    })
    .catch(err => console.error(`[TELEMETRY SYNC] Error syncing ${type}:`, err));
  };

  // Dynamic Score Calculation
  const mealsLogged = meals.length;
  
  const scoreMetrics = useMemo(() => {
    // 1. Meal Adherence (50%)
    const mealScore = Math.min(100, (mealsLogged / mealsTarget) * 100);
    
    // 2. Supplements (20%)
    const requiredSupps = supplements.filter(s => s.required);
    const completedRequiredSupps = requiredSupps.filter(s => s.completed).length;
    const suppScore = requiredSupps.length > 0 
      ? (completedRequiredSupps / requiredSupps.length) * 100 
      : 100;
      
    // 3. Hydration (15%) - 100 if target met, else 0
    const waterScore = waterLogged >= waterTarget ? 100 : 0;
    
    // 4. Cardio / Steps (15%)
    const stepsPct = Math.min(100, (stepsLogged / stepsTarget) * 100);
    const cardioPct = Math.min(100, (cardioLogged / cardioTarget) * 100);
    const workoutScore = (stepsPct + cardioPct) / 2;

    // Weighted Score
    const totalScore = Math.round((mealScore * 0.50) + (suppScore * 0.20) + (waterScore * 0.15) + (workoutScore * 0.15));
    
    // Status Bucket
    let status: 'green' | 'yellow' | 'orange' | 'red' = 'red';
    if (totalScore >= 85) status = 'green';
    else if (totalScore >= 70) status = 'yellow';
    else if (totalScore >= 50) status = 'orange';

    return { totalScore, status };
  }, [mealsLogged, mealsTarget, supplements, waterLogged, waterTarget, stepsLogged, stepsTarget, cardioLogged, cardioTarget]);

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

  const toggleSupplement = (suppId: string) => {
    const nextSupps = supplements.map(s =>
      s.id === suppId ? { ...s, completed: !s.completed } : s
    );
    setSupplements(nextSupps);
    saveTelemetry({ supplements: nextSupps });
    
    const checkedNames = nextSupps.filter(s => s.completed).map(s => s.name);
    syncTelemetry("supplements", checkedNames);
  };

  const incrementWater = () => {
    const nextWater = Math.min(12, waterLogged + 1);
    setWaterLogged(nextWater);
    saveTelemetry({ waterLogged: nextWater });
    syncTelemetry("water", nextWater);
  };

  const decrementWater = () => {
    const nextWater = Math.max(0, waterLogged - 1);
    setWaterLogged(nextWater);
    saveTelemetry({ waterLogged: nextWater });
    syncTelemetry("water", nextWater);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setScanAnimation(true);

    const formData = new FormData();
    formData.append("image", file);
    formData.append("athlete_id", id || "00000000-0000-0000-0000-000000000000");

    try {
      const response = await fetch("http://localhost:8000/api/meals/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload and recognize meal");
      }

      const data = await response.json();
      
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

    const payload = {
      athlete_id: id || "00000000-0000-0000-0000-000000000000",
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
      const response = await fetch("http://localhost:8000/api/meals/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Failed to save confirmed meal");
      }

      const dbResult = await response.json();

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
      loadAdherenceData();
    } catch (err) {
      console.error(err);
      alert("Failed to save meal: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleWeightChange = (val: number) => {
    setWeight(val);
    const todayStr = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
    
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
    syncTelemetry("weight", val);
  };

  const handleStepsChange = (val: number) => {
    setStepsLogged(val);
    saveTelemetry({ stepsLogged: val });
    syncTelemetry("steps", val);
  };

  const handleCardioChange = (val: number) => {
    setCardioLogged(val);
    saveTelemetry({ cardioLogged: val });
    syncTelemetry("cardio", val);
  };

  const currentStatusMeta = useMemo(() => {
    const meta = {
      green: { text: 'Optimized Adherence', stroke: 'hsl(var(--status-green))', textClass: 'text-emerald-400', badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
      yellow: { text: 'Balanced Adherence', stroke: 'hsl(var(--status-yellow))', textClass: 'text-amber-400', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
      orange: { text: 'Incomplete Thresholds', stroke: 'hsl(var(--status-orange))', textClass: 'text-orange-400', badgeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
      red: { text: 'Critical Attention', stroke: 'hsl(var(--status-red))', textClass: 'text-rose-400', badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20' }
    };
    return meta[scoreMetrics.status] || meta.red;
  }, [scoreMetrics.status]);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      
      {/* Background neon visual glows */}
      <div className="absolute top-0 right-0 w-[50%] h-[35%] rounded-full bg-status-orange/4 blur-[130px] pointer-events-none" />
      <div className="absolute top-[20%] left-0 w-[40%] h-[35%] rounded-full bg-primary/4 blur-[130px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 glass-panel border-b border-card-border/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-status-orange to-yellow-500 flex items-center justify-center text-white font-extrabold shadow-sm">
              A
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Athlete Workspace</p>
              <h1 className="text-base sm:text-lg font-black text-white">{name || 'Athlete Log'}</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-card-border text-[10px] text-muted-foreground uppercase font-black tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-status-green" /> DPDP Consent Verified
            </div>
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

      {/* Main Layout Container */}
      <main className="max-w-5xl mx-auto px-6 py-8 relative z-10 space-y-6">
        
        {/* Adherence Score & Streaks block */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Circular Adherence Ring */}
          <div className="glass-panel p-6 md:p-8 rounded-3xl col-span-1 md:col-span-2 flex flex-col sm:flex-row items-center gap-6 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
            {/* SVG Progress Circle */}
            <div className="relative w-32 h-32 flex-shrink-0 flex items-center justify-center">
              <svg className="w-full h-full rotate-[-90deg]">
                <circle
                  cx="64"
                  cy="64"
                  r="54"
                  stroke="hsl(var(--card-border))"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="54"
                  stroke={currentStatusMeta.stroke}
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 54}
                  strokeDashoffset={2 * Math.PI * 54 * (1 - scoreMetrics.totalScore / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-3xl font-black text-white">{scoreMetrics.totalScore}</span>
                <span className="block text-[8px] uppercase tracking-widest text-muted-foreground font-black mt-0.5">Adherence</span>
              </div>
            </div>
            
            {/* Adherence summary details */}
            <div className="flex-1 text-center sm:text-left space-y-2.5">
              <span className={`inline-block px-3 py-1 rounded-full border text-[9px] uppercase tracking-widest font-black ${currentStatusMeta.badgeClass}`}>
                {currentStatusMeta.text}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Your physical compliance is on target.</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Adherence aggregates dietary meal goals ({mealsLogged}/{mealsTarget} logged), required daily supplements checkoffs, and target cardiovascular workout telemetry.
              </p>
            </div>
          </div>

          {/* Streak Counter Card */}
          <div className="glass-panel p-6 md:p-8 rounded-3xl bg-gradient-to-br from-status-orange/5 to-transparent flex flex-col justify-center items-center text-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-status-orange/10 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
            <div className="w-12 h-12 rounded-2xl bg-status-orange/15 border border-status-orange/35 flex items-center justify-center text-status-orange mb-3 shadow-sm">
              <Flame className="w-6 h-6 text-status-orange fill-status-orange/10 animate-pulse" />
            </div>
            <p className="text-4xl font-black text-white tracking-tighter">{streak}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mt-1">Days Adherence Streak</p>
            <span className="text-[8px] text-status-orange font-black mt-2 bg-status-orange/10 px-2 py-0.5 rounded border border-status-orange/20 uppercase tracking-widest">
              Verified Adherence
            </span>
          </div>

        </section>

        {/* Daily Goals trackers bento layout */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Card 1: Diet and Meals Log */}
          <div className="glass-panel p-6 rounded-3xl lg:col-span-2 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">Diet & Meal Logs</h3>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Macro verification metrics</p>
                </div>
                <span className={`text-xs font-black px-3 py-1.5 rounded-xl border ${
                  mealsLogged >= mealsTarget
                    ? 'bg-status-green/10 text-status-green border-status-green/30'
                    : 'bg-status-orange/10 text-status-orange border-status-orange/30'
                }`}>
                  {mealsLogged} / {mealsTarget} meals
                </span>
              </div>
              
              {/* Macros Summary Tracker */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-card/25 border border-card-border/60 mb-5">
                {/* Calories */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] uppercase font-black tracking-wider">
                    <span className="text-white">Calories</span>
                    <span className="text-muted-foreground font-bold">{totalMacros.cal} / {targetMacros.cal} kcal</span>
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
                  <div className="flex justify-between text-[9px] uppercase font-black tracking-wider">
                    <span className="text-primary font-black">Protein</span>
                    <span className="text-muted-foreground font-bold">{totalMacros.p} / {targetMacros.p}g</span>
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
                  <div className="flex justify-between text-[9px] uppercase font-black tracking-wider">
                    <span className="text-status-yellow font-black">Carbs</span>
                    <span className="text-muted-foreground font-bold">{totalMacros.c} / {targetMacros.c}g</span>
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
                  <div className="flex justify-between text-[9px] uppercase font-black tracking-wider">
                    <span className="text-status-orange font-black">Fat</span>
                    <span className="text-muted-foreground font-bold">{totalMacros.f} / {targetMacros.f}g</span>
                  </div>
                  <div className="w-full h-1.5 bg-card rounded-full overflow-hidden">
                    <div
                      className="h-full bg-status-orange transition-all duration-500"
                      style={{ width: `${Math.min(100, (totalMacros.f / (targetMacros.f || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Meal log list */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {meals.map((meal) => (
                  <div key={meal.id} className="p-3.5 rounded-2xl bg-card/25 border border-card-border/50 hover:border-white/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {meal.photo ? (
                        <img src={meal.photo} alt={meal.food} className="w-11 h-11 rounded-xl object-cover border border-card-border" />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-card border border-card-border flex items-center justify-center text-lg">
                          🍳
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-extrabold text-sm text-white">{meal.food}</p>
                          {meal.isEdited && (
                            <span className="text-[7px] bg-primary/15 text-primary border border-primary/20 font-black uppercase px-1.5 rounded-md">
                              Edited
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{meal.time} • AI confidence {meal.confidence}%</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs font-extrabold">
                      <div className="flex items-center gap-2">
                        <span className="text-primary">P:{meal.macros.p}g</span>
                        <span className="text-status-yellow">C:{meal.macros.c}g</span>
                        <span className="text-status-orange">F:{meal.macros.f}g</span>
                      </div>
                      <span className="text-white bg-card border border-card-border px-2 py-0.5 rounded-md text-[10px]">
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
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-status-orange to-yellow-600 text-white font-bold hover:shadow-lg hover:shadow-status-orange/20 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
              >
                <Camera className="w-4.5 h-4.5 text-white" />
                Upload Meal Photo
              </button>
            </div>
          </div>

          {/* Card 2: Hydration Intake */}
          <div className="glass-panel p-6 rounded-3xl flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">Hydration Log</h3>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Target: {waterTarget} glasses</p>
                </div>
                <span className={`text-xs font-black px-3 py-1.5 rounded-xl border ${
                  waterLogged >= waterTarget
                    ? 'bg-status-green/10 text-status-green border-status-green/30'
                    : 'bg-status-orange/10 text-status-orange border-status-orange/30'
                }`}>
                  {waterLogged} / {waterTarget} glasses
                </span>
              </div>

              {/* Fluid glasses visualization */}
              <div className="grid grid-cols-4 gap-2.5 mb-5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <button
                    key={i}
                    className={`aspect-square rounded-2xl border-2 transition-all flex items-center justify-center cursor-pointer ${
                      i < waterLogged
                        ? 'bg-status-yellow/10 border-status-yellow/50 text-status-yellow'
                        : 'bg-card/20 border-card-border/60 hover:border-status-yellow/20 text-muted-foreground'
                    }`}
                    onClick={() => {
                      if (i < waterLogged) {
                        setWaterLogged(i);
                        saveTelemetry({ waterLogged: i });
                        syncTelemetry("water", i);
                      } else {
                        const nextWater = i + 1;
                        setWaterLogged(nextWater);
                        saveTelemetry({ waterLogged: nextWater });
                        syncTelemetry("water", nextWater);
                      }
                    }}
                  >
                    <Droplet className={`w-6.5 h-6.5 ${i < waterLogged ? 'text-status-yellow fill-status-yellow/10' : 'text-muted-foreground/20'}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Quick volume triggers */}
            <div className="flex items-center gap-3">
              <button
                onClick={decrementWater}
                className="flex-1 py-3 rounded-2xl bg-card border border-card-border text-foreground hover:text-white font-extrabold transition-all cursor-pointer text-xs"
              >
                - Glass
              </button>
              <button
                onClick={incrementWater}
                className="flex-1 py-3 rounded-2xl bg-status-yellow/15 border border-status-yellow/20 text-status-yellow font-extrabold hover:bg-status-yellow/20 transition-all cursor-pointer text-xs"
              >
                + Add Glass
              </button>
            </div>
          </div>

          {/* Card 3: Supplement Checklist */}
          <div className="glass-panel p-6 rounded-3xl lg:col-span-3">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Supplement Checklist</h3>
                <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Verify mandatory checkoffs configure by coach</p>
              </div>
              <span className="text-xs font-black px-3 py-1.5 rounded-xl border bg-status-green/10 text-status-green border-status-green/30">
                {supplements.filter(s => s.completed).length} / {supplements.length} completed
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {supplements.map((supp) => (
                <button
                  key={supp.id}
                  onClick={() => toggleSupplement(supp.id)}
                  className={`p-4 rounded-2xl border transition-all text-left flex items-center gap-3 cursor-pointer ${
                    supp.completed
                      ? 'bg-status-green/10 border-status-green/30 text-status-green'
                      : 'bg-card/25 border-card-border/60 hover:border-primary/20 text-foreground'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${
                    supp.completed
                      ? 'bg-status-green border-status-green text-white'
                      : 'border-muted-foreground'
                  }`}>
                    {supp.completed && <CheckCircle2 className="w-3.5 h-3.5 text-white fill-status-green" />}
                  </div>
                  <span className={`font-bold text-xs flex-1 truncate ${supp.completed ? 'text-status-green line-through' : 'text-white'}`}>
                    {supp.name}
                  </span>
                  {supp.required && (
                    <span className="text-[8px] bg-primary/10 border border-primary/20 text-primary font-black px-1.5 py-0.5 rounded uppercase">
                      Req
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Card 4: Biometrics weight input & metrics sliders */}
          <div className="glass-panel p-6 rounded-3xl lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Weight Input Box */}
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
                  className="flex-1 py-3 px-4 rounded-2xl bg-card border border-card-border focus:border-primary/50 text-white font-bold text-sm focus:outline-none"
                />
              </div>
            </div>

            {/* Daily Steps Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-extrabold uppercase tracking-wider text-muted-foreground">Daily Steps</span>
                <span className="text-white font-extrabold">{stepsLogged.toLocaleString()} / {stepsTarget.toLocaleString()}</span>
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

            {/* Cardio Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-extrabold uppercase tracking-wider text-muted-foreground">Cardio Minutes</span>
                <span className="text-white font-extrabold">{cardioLogged} / {cardioTarget} mins</span>
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

        {/* Heatmaps & Trend Charts */}
        <section className="space-y-5">
          <h2 className="text-lg font-black text-white tracking-tight uppercase">Analytics & Adherence Logs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AdherenceHeatmap scores={heatmapData} startDate={createdAt} />
            <SimpleLineChart
              data={weightHistory}
              title="Biometric Weight Tracking"
              metric="Weight (KG)"
              color="orange"
            />
          </div>
        </section>

      </main>

      {/* Image Upload & Nudge modal overlay */}
      {showMealModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-panel rounded-3xl p-6 md:p-8 max-w-lg w-full max-h-[95vh] overflow-y-auto relative shadow-2xl animate-fade-in border-white/10">
            <div className="absolute top-0 inset-x-0 h-1 rounded-t-3xl bg-gradient-to-r from-status-orange to-yellow-500" />
            
            <h2 className="text-2xl font-black text-white mb-4">AI Vision Meal Log</h2>

            {!showConfirmPane ? (
              <div className="space-y-5">
                {/* Camera upload zone */}
                <div className="relative">
                  <label className="block p-10 rounded-2xl border-2 border-dashed border-card-border hover:border-status-orange/30 cursor-pointer transition-colors text-center bg-card/15 relative overflow-hidden">
                    <Camera className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
                    <p className="text-sm text-white font-bold">Select Meal Image</p>
                    <p className="text-xs text-muted-foreground mt-1">Image uploads estimate dish macro and micro ingredients</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                    {scanAnimation && (
                      <div className="absolute inset-x-0 h-0.5 bg-status-orange/80 shadow-lg animate-scan pointer-events-none" />
                    )}
                  </label>
                </div>

                {uploadingImage && (
                  <div className="flex flex-col items-center gap-2.5 py-4">
                    <div className="w-8 h-8 rounded-full border-2 border-status-orange/20 border-t-status-orange animate-spin" />
                    <span className="text-xs text-muted-foreground font-black uppercase tracking-wider">AI analysis endpoint running...</span>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowMealModal(false); setTempImage(null); }}
                    className="px-5 py-3 rounded-xl border border-card-border text-foreground hover:text-white font-bold transition-all cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCommitMeal} className="space-y-6">
                
                {/* Result Preview Header */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-card/30 border border-card-border">
                  {tempImage && (
                    <img src={tempImage} alt="Preview" className="w-16 h-16 rounded-xl object-cover border border-card-border" />
                  )}
                  <div>
                    <span className="text-[9px] bg-status-green/10 text-status-green border border-status-green/20 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                      LogMeal Estimates
                    </span>
                    <h4 className="text-sm font-extrabold text-white mt-1.5">{mealFormData.food}</h4>
                    <p className="text-[10px] text-muted-foreground font-semibold">Vision Confidence: {mealFormData.confidence}%</p>
                  </div>
                </div>

                {/* Confirm dish descriptions */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Dish Description</label>
                  <input
                    type="text"
                    value={mealFormData.food}
                    onChange={(e) => setMealFormData({ ...mealFormData, food: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-card border border-card-border focus:border-primary/50 text-white font-bold text-sm focus:outline-none"
                    placeholder="e.g. Chicken Rice"
                    required
                  />
                </div>

                {/* Adjust macros nudge step */}
                <div className="space-y-3.5">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-white border-b border-card-border/60 pb-1.5">
                    Nudge Macronutrients
                  </h3>
                  
                  <div className="grid grid-cols-3 gap-4">
                    {/* Protein */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-primary uppercase tracking-wider block">Protein (g)</label>
                      <input
                        type="number"
                        value={mealFormData.macros.p}
                        onChange={(e) => {
                          const p = Number(e.target.value);
                          setMealFormData({
                            ...mealFormData,
                            macros: { ...mealFormData.macros, p },
                            calories: Math.round(p * 4 + mealFormData.macros.c * 4 + mealFormData.macros.f * 9)
                          });
                        }}
                        className="w-full px-3 py-2.5 rounded-xl bg-card border border-card-border focus:border-primary/50 text-white font-bold text-sm focus:outline-none"
                      />
                    </div>
                    {/* Carbs */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-status-yellow uppercase tracking-wider block">Carbs (g)</label>
                      <input
                        type="number"
                        value={mealFormData.macros.c}
                        onChange={(e) => {
                          const c = Number(e.target.value);
                          setMealFormData({
                            ...mealFormData,
                            macros: { ...mealFormData.macros, c },
                            calories: Math.round(mealFormData.macros.p * 4 + c * 4 + mealFormData.macros.f * 9)
                          });
                        }}
                        className="w-full px-3 py-2.5 rounded-xl bg-card border border-card-border focus:border-primary/50 text-white font-bold text-sm focus:outline-none"
                      />
                    </div>
                    {/* Fat */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-status-orange uppercase tracking-wider block">Fat (g)</label>
                      <input
                        type="number"
                        value={mealFormData.macros.f}
                        onChange={(e) => {
                          const f = Number(e.target.value);
                          setMealFormData({
                            ...mealFormData,
                            macros: { ...mealFormData.macros, f },
                            calories: Math.round(mealFormData.macros.p * 4 + mealFormData.macros.c * 4 + f * 9)
                          });
                        }}
                        className="w-full px-3 py-2.5 rounded-xl bg-card border border-card-border focus:border-primary/50 text-white font-bold text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Micronutrients section */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-card-border/60 pb-1.5">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-white">
                      Directional Micronutrients
                    </h3>
                    <span className="text-[8px] bg-card border border-card-border text-muted-foreground uppercase font-black px-1.5 py-0.5 rounded">
                      Directional estimates only
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[10px] text-muted-foreground font-bold">
                    <div className="p-2.5 rounded-xl bg-card/25 border border-card-border/40 flex justify-between">
                      <span>Fiber:</span><span className="text-white font-black">{mealFormData.micronutrients.fiber}g</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-card/25 border border-card-border/40 flex justify-between">
                      <span>Iron:</span><span className="text-white font-black">{mealFormData.micronutrients.iron}mg</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-card/25 border border-card-border/40 flex justify-between">
                      <span>Calcium:</span><span className="text-white font-black">{mealFormData.micronutrients.calcium}mg</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-card/25 border border-card-border/40 flex justify-between">
                      <span>Potassium:</span><span className="text-white font-black">{mealFormData.micronutrients.potassium}mg</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-card/25 border border-card-border/40 flex justify-between">
                      <span>Magnesium:</span><span className="text-white font-black">{mealFormData.micronutrients.magnesium}mg</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-card/25 border border-card-border/40 flex justify-between">
                      <span>Vit B12:</span><span className="text-white font-black">{mealFormData.micronutrients.vitaminB12}mcg</span>
                    </div>
                  </div>
                </div>

                {/* Target progress warning summary */}
                <div className="p-4 rounded-2xl bg-card/35 border border-card-border/50 space-y-2 text-xs font-semibold">
                  <span className="text-muted-foreground uppercase tracking-wide text-[9px] font-extrabold block">Daily Budget Impact</span>
                  <div className="flex justify-between">
                    <span>Eaten Today + Meal:</span>
                    <span className={totalMacros.cal + mealFormData.calories > targetMacros.cal ? 'text-status-red font-black' : 'text-white'}>
                      {totalMacros.cal + mealFormData.calories} / {targetMacros.cal} kcal
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Protein Budget:</span>
                    <span className={totalMacros.p + mealFormData.macros.p >= targetMacros.p ? 'text-status-green font-black' : 'text-muted-foreground'}>
                      {totalMacros.p + mealFormData.macros.p} / {targetMacros.p} g
                    </span>
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowConfirmPane(false); setTempImage(null); }}
                    className="flex-1 py-3.5 rounded-2xl border border-card-border text-foreground hover:text-white font-bold transition-all cursor-pointer text-xs"
                  >
                    Back to Scan
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-status-orange to-yellow-600 text-white font-bold hover:shadow-lg transition-all cursor-pointer text-xs hover:scale-[1.01] active:scale-[0.99]"
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

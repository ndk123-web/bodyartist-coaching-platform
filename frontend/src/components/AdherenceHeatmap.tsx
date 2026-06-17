import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface HeatmapProps {
  scores: { date: string; score: number }[];
  athleteName?: string;
  compact?: boolean;
  onCellClick?: (date: string) => void;
  selectedDate?: string;
  startDate?: string;
}

interface TooltipState {
  date: string;
  score: number | null;
  x: number;
  y: number;
}

// Portal tooltip — renders outside the overflow container so it never clips
const HeatmapTooltip: React.FC<{ tip: TooltipState }> = ({ tip }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: tip.x, top: tip.y });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { innerWidth, innerHeight } = window;
    const { width, height } = el.getBoundingClientRect();
    let left = tip.x - width / 2;
    let top = tip.y - height - 10;
    if (left < 6) left = 6;
    if (left + width > innerWidth - 6) left = innerWidth - width - 6;
    if (top < 6) top = tip.y + 20; // flip below if too close to top
    if (top + height > innerHeight - 6) top = tip.y - height - 10;
    setPos({ left, top });
  }, [tip.x, tip.y]);

  const label =
    tip.score === null
      ? "No Log"
      : tip.score >= 85
      ? "✅ Great"
      : tip.score >= 60
      ? "🟡 Moderate"
      : "🔴 Critical";

  return createPortal(
    <div
      ref={ref}
      style={{ position: "fixed", left: pos.left, top: pos.top, zIndex: 9999, pointerEvents: "none" }}
      className="px-3 py-2 bg-[hsl(var(--card))] border border-[hsl(var(--card-border))] rounded-xl shadow-2xl whitespace-nowrap"
    >
      <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">{tip.date}</p>
      <p className="text-xs font-black text-foreground mt-0.5">
        Score:{" "}
        <span
          className={
            tip.score === null
              ? "text-white/40"
              : tip.score >= 85
              ? "text-emerald-400"
              : tip.score >= 60
              ? "text-amber-400"
              : "text-rose-400"
          }
        >
          {tip.score !== null ? `${tip.score}%` : "—"}
        </span>
      </p>
      <p className="text-[9px] text-white/40 mt-0.5">{label}</p>
    </div>,
    document.body
  );
};

export const AdherenceHeatmap: React.FC<HeatmapProps> = ({
  scores,
  athleteName,
  compact = false,
  onCellClick,
  selectedDate,
  startDate,
}) => {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const handleCellEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, date: string, score: number | null) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltip({
        date,
        score,
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    },
    []
  );

  const handleCellLeave = useCallback(() => setTooltip(null), []);

  const heatmapData = useMemo(() => {
    const cells: { date: string; score: number | null }[] = [];
    const scoreMap = new Map(scores.map((s) => [s.date, s.score]));

    let start: Date;
    if (startDate) {
      const [sy, sm, sd] = startDate.split("-").map(Number);
      start = new Date(sy, sm - 1, sd);
    } else {
      const today = new Date();
      start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 83);
    }

    for (let i = 0; i < 84; i++) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;
      cells.push({ date: dateStr, score: scoreMap.get(dateStr) ?? null });
    }
    return cells;
  }, [scores, startDate]);

  // Color: green=good (≥85), amber=moderate (≥60), red=critical (<60), grey=no log
  const getColorClass = (score: number | null): string => {
    if (score === null) return "bg-white/5 border-white/8";
    if (score >= 85) return "bg-emerald-500 border-emerald-400/40 shadow-sm shadow-emerald-500/25";
    if (score >= 60) return "bg-amber-500/80 border-amber-400/35 shadow-sm shadow-amber-500/15";
    return "bg-rose-500/80 border-rose-400/35 shadow-sm shadow-rose-500/15";
  };

  const days = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className={compact ? "" : "glass-panel p-6 rounded-3xl"}>
      {!compact && (
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-white mb-5 flex items-center gap-2">
          <span>📊 12-Week Adherence Heatmap</span>
          {athleteName && (
            <span className="text-xs text-muted-foreground font-normal lowercase">({athleteName})</span>
          )}
        </h3>
      )}

      <div className="flex items-start gap-3">
        {/* Day labels */}
        <div className="flex flex-col gap-[5px] text-[9px] text-muted-foreground font-extrabold pr-1 select-none pt-0.5">
          {days.map((day, i) => (
            <span key={i} className="h-3.5 flex items-center">{day}</span>
          ))}
        </div>

        {/* Grid */}
        <div className="overflow-x-auto flex-1 pb-1" style={{ scrollbarWidth: "thin" }}>
          <div
            className="inline-grid gap-[5px]"
            style={{
              gridTemplateRows: "repeat(7, 14px)",
              gridAutoFlow: "column",
              gridAutoColumns: "14px",
            }}
          >
            {heatmapData.map((cell, idx) => {
              const isSelected = cell.date === selectedDate;
              return (
                <div
                  key={idx}
                  onClick={() => onCellClick?.(cell.date)}
                  onMouseEnter={(e) => handleCellEnter(e, cell.date, cell.score)}
                  onMouseLeave={handleCellLeave}
                  className={[
                    "w-3.5 h-3.5 rounded-[3px] border transition-all duration-150 cursor-pointer",
                    "hover:scale-[1.3] hover:z-10 relative",
                    getColorClass(cell.score),
                    isSelected ? "ring-2 ring-white ring-offset-1 ring-offset-transparent scale-125 z-20" : "",
                  ].join(" ")}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-3 mt-4 select-none">
        <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wide">Less</span>
        <div className="flex gap-1 items-center">
          <div className="w-2.5 h-2.5 rounded-[3px] bg-white/5 border border-white/8" />
          <div className="w-2.5 h-2.5 rounded-[3px] bg-rose-500/80 border border-rose-400/35" />
          <div className="w-2.5 h-2.5 rounded-[3px] bg-amber-500/80 border border-amber-400/35" />
          <div className="w-2.5 h-2.5 rounded-[3px] bg-emerald-500 border border-emerald-400/40" />
        </div>
        <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wide">More</span>
        <div className="flex items-center gap-1.5 ml-2">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
          <span className="text-[8px] text-rose-400/70 font-bold uppercase">Critical</span>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block ml-1.5" />
          <span className="text-[8px] text-amber-400/70 font-bold uppercase">Moderate</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block ml-1.5" />
          <span className="text-[8px] text-emerald-400/70 font-bold uppercase">Great</span>
        </div>
      </div>

      {/* Portal tooltip */}
      {tooltip && <HeatmapTooltip tip={tooltip} />}
    </div>
  );
};

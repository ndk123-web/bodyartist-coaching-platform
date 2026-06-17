import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';

interface ChartDataPoint {
  date: string;
  value: number;
}

interface SimpleLineChartProps {
  data: ChartDataPoint[];
  title: string;
  metric: string;
  target?: number;
  color?: 'primary' | 'green' | 'orange';
  height?: number;
}

const PADDING = { top: 20, right: 20, bottom: 40, left: 44 };

export const SimpleLineChart: React.FC<SimpleLineChartProps> = ({
  data,
  title,
  metric,
  target,
  color = 'primary',
  height = 180,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(400);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; value: number; date: string } | null>(null);

  // Observe container resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    setContainerWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  const strokeColor = useMemo(() => {
    if (color === 'green') return 'hsl(var(--status-green))';
    if (color === 'orange') return 'hsl(var(--status-orange))';
    return 'hsl(var(--primary))';
  }, [color]);

  const chartData = useMemo(() => {
    return data && data.length > 0 ? data : [
      { date: 'Day 1', value: 70 },
      { date: 'Day 2', value: 80 },
    ];
  }, [data]);

  const { min, max, points, targetY } = useMemo(() => {
    const values = chartData.map(d => d.value);
    const minVal = Math.min(...values, target ?? Infinity);
    const maxVal = Math.max(...values, target ?? -Infinity);
    const diff = maxVal - minVal || 1;
    const pad = diff * 0.15 || 10;
    const min = Math.max(0, minVal - pad);
    const max = maxVal + pad;

    const w = containerWidth;
    const h = height;
    const innerW = w - PADDING.left - PADDING.right;
    const innerH = h - PADDING.top - PADDING.bottom;

    const points = chartData.map((d, i) => {
      const x = PADDING.left + (chartData.length === 1 ? innerW / 2 : (i / (chartData.length - 1)) * innerW);
      const y = PADDING.top + innerH - ((d.value - min) / (max - min)) * innerH;
      return { x, y, value: d.value, date: d.date };
    });

    const targetY = target !== undefined
      ? PADDING.top + innerH - ((target - min) / (max - min)) * innerH
      : null;

    return { min, max, points, targetY };
  }, [chartData, containerWidth, height, target]);

  // Cubic bezier smooth path
  const pathD = useMemo(() => {
    if (points.length < 2) return points.length === 1 ? `M ${points[0].x} ${points[0].y}` : '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const cpx1 = curr.x + (next.x - curr.x) / 3;
      const cpy1 = curr.y;
      const cpx2 = curr.x + (2 * (next.x - curr.x)) / 3;
      const cpy2 = next.y;
      d += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${next.x} ${next.y}`;
    }
    return d;
  }, [points]);

  const areaD = useMemo(() => {
    if (!pathD || points.length < 2) return '';
    const bottomY = height - PADDING.bottom;
    return `${pathD} L ${points[points.length - 1].x} ${bottomY} L ${points[0].x} ${bottomY} Z`;
  }, [pathD, points, height]);

  // Y-axis labels
  const yLabels = useMemo(() => {
    return [0, 0.25, 0.5, 0.75, 1].map(pct => {
      const value = min + (max - min) * pct;
      const y = PADDING.top + (height - PADDING.top - PADDING.bottom) * (1 - pct);
      return { value: Math.round(value), y };
    });
  }, [min, max, height]);

  const gradientId = useMemo(() => `chart-grad-${title.replace(/\s+/g, '-').toLowerCase()}`, [title]);

  // Tooltip via mouse move on SVG overlay
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGRectElement>) => {
    // rect.left is already at PADDING.left inside the SVG — don't add it again
    const rect = (e.currentTarget as SVGRectElement).getBoundingClientRect();
    const mouseX = e.clientX - rect.left;  // position within inner chart area
    const svgX = mouseX + PADDING.left;    // convert to SVG coordinate space
    // Find closest point
    let best = points[0];
    let bestDist = Infinity;
    for (const p of points) {
      const dist = Math.abs(p.x - svgX);
      if (dist < bestDist) { bestDist = dist; best = p; }
    }
    setTooltip({ x: best.x, y: best.y, value: best.value, date: best.date });
  }, [points]);

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  const w = containerWidth;
  const h = height;
  const innerW = w - PADDING.left - PADDING.right;
  const innerH = h - PADDING.top - PADDING.bottom;

  // Clamp tooltip box
  const tipBoxW = 72;
  const tipBoxH = 36;
  const tipX = tooltip ? Math.min(Math.max(tooltip.x - tipBoxW / 2, 4), w - tipBoxW - 4) : 0;
  const tipY = tooltip ? Math.max(tooltip.y - tipBoxH - 10, 4) : 0;

  return (
    <div className="glass-panel p-5 rounded-3xl relative select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-extrabold uppercase tracking-wider text-foreground">{title}</h4>
          <span className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase mt-0.5 block">{metric}</span>
        </div>
        {target !== undefined && (
          <span className="text-[10px] text-status-orange/80 font-bold bg-status-orange/10 border border-status-orange/20 px-2 py-1 rounded-lg">
            Target: {target}
          </span>
        )}
      </div>

      {/* Chart */}
      <div ref={containerRef} className="w-full">
        <svg
          width="100%"
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="none"
          style={{ display: 'block' }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.22" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Y-axis grid lines + labels */}
          {yLabels.map((l, i) => (
            <g key={i}>
              <line
                x1={PADDING.left}
                y1={l.y}
                x2={w - PADDING.right}
                y2={l.y}
                stroke="hsl(var(--card-border))"
                strokeDasharray="3 4"
              />
              <text
                x={PADDING.left - 6}
                y={l.y}
                textAnchor="end"
                dominantBaseline="middle"
                fill="hsl(var(--muted-foreground))"
                fontSize={9}
                fontWeight="bold"
              >
                {l.value}
              </text>
            </g>
          ))}

          {/* Target dashed line */}
          {targetY !== null && (
            <>
              <line
                x1={PADDING.left}
                y1={targetY}
                x2={w - PADDING.right}
                y2={targetY}
                stroke="hsl(var(--status-orange))"
                strokeDasharray="5 4"
                strokeWidth={1.5}
                opacity={0.55}
              />
              <text
                x={w - PADDING.right - 4}
                y={targetY - 5}
                textAnchor="end"
                fill="hsl(var(--status-orange))"
                fontSize={8}
                fontWeight="bold"
                opacity={0.8}
              >
                TARGET
              </text>
            </>
          )}

          {/* Area fill */}
          {areaD && <path d={areaD} fill={`url(#${gradientId})`} />}

          {/* Line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke={strokeColor}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Axes */}
          <line x1={PADDING.left} y1={PADDING.top} x2={PADDING.left} y2={h - PADDING.bottom} stroke="hsl(var(--card-border))" />
          <line x1={PADDING.left} y1={h - PADDING.bottom} x2={w - PADDING.right} y2={h - PADDING.bottom} stroke="hsl(var(--card-border))" />

          {/* X labels (first and last) */}
          {chartData.length > 0 && (
            <>
              <text x={PADDING.left} y={h - PADDING.bottom + 14} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={8} fontWeight="bold">
                {chartData[0].date}
              </text>
              {chartData.length > 1 && (
                <text x={w - PADDING.right} y={h - PADDING.bottom + 14} textAnchor="end" fill="hsl(var(--muted-foreground))" fontSize={8} fontWeight="bold">
                  {chartData[chartData.length - 1].date}
                </text>
              )}
            </>
          )}

          {/* Dot on hovered point */}
          {tooltip && (
            <>
              {/* Vertical crosshair */}
              <line
                x1={tooltip.x}
                y1={PADDING.top}
                x2={tooltip.x}
                y2={h - PADDING.bottom}
                stroke="hsl(var(--card-border))"
                strokeDasharray="3 3"
              />
              {/* Glow dot */}
              <circle cx={tooltip.x} cy={tooltip.y} r={7} fill={strokeColor} opacity={0.18} />
              <circle cx={tooltip.x} cy={tooltip.y} r={4.5} fill="hsl(var(--background))" stroke={strokeColor} strokeWidth={2.5} />

              {/* Tooltip box */}
              <rect x={tipX} y={tipY} width={tipBoxW} height={tipBoxH} rx={6} fill="hsl(var(--card))" stroke="hsl(var(--card-border))" strokeWidth={1} />
              <text x={tipX + tipBoxW / 2} y={tipY + 13} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={8} fontWeight="bold">
                {tooltip.date}
              </text>
              <text x={tipX + tipBoxW / 2} y={tipY + 27} textAnchor="middle" fill="hsl(var(--foreground))" fontSize={11} fontWeight="bold">
                {tooltip.value}
              </text>
            </>
          )}

          {/* Invisible hover capture rect (covers inner area) */}
          <rect
            x={PADDING.left}
            y={PADDING.top}
            width={innerW}
            height={innerH}
            fill="transparent"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: 'crosshair' }}
          />
        </svg>
      </div>
    </div>
  );
};

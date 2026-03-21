import { useEffect, useState } from 'react';

interface TrustScoreGaugeProps {
  score: number;       // 0-100
  riskLevel: string;
}

export default function TrustScoreGauge({ score, riskLevel }: TrustScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  // Animate the number counting up
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const duration = 1400;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * score));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  // SVG circle math
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  // Color based on score
  const getColor = () => {
    if (score < 40) return { stroke: '#ef4444', glow: 'rgba(239,68,68,0.25)', text: 'text-danger' };
    if (score < 75) return { stroke: '#f59e0b', glow: 'rgba(245,158,11,0.25)', text: 'text-warning' };
    return { stroke: '#10b981', glow: 'rgba(16,185,129,0.25)', text: 'text-success' };
  };
  const color = getColor();

  return (
    <div className="flex flex-col items-center gap-4 animate-fade-in-up">
      <div className="relative">
        <svg width="220" height="220" viewBox="0 0 220 220" className="drop-shadow-lg">
          {/* Background track */}
          <circle
            cx="110" cy="110" r={radius}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Glow filter */}
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Score arc */}
          <circle
            cx="110" cy="110" r={radius}
            fill="none"
            stroke={color.stroke}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            filter="url(#glow)"
            className="animate-score-fill origin-center -rotate-90"
            style={{
              transformOrigin: '110px 110px',
              transition: 'stroke-dashoffset 1.4s ease-out',
            }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-5xl font-extrabold tabular-nums tracking-tight ${color.text}`}>
            {animatedScore}
            <span className="text-2xl font-semibold">%</span>
          </span>
          <span className="text-xs uppercase tracking-widest text-text-muted mt-1">Trust Score</span>
        </div>

        {/* Soft outer glow */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ boxShadow: `0 0 60px ${color.glow}` }}
        />
      </div>

      {/* Risk label */}
      <span
        className={`
          inline-block rounded-full px-5 py-1.5 text-sm font-semibold tracking-wide
          ${score < 40
            ? 'bg-danger-soft/50 text-danger border border-danger/20'
            : score < 75
              ? 'bg-warning-soft/50 text-warning border border-warning/20'
              : 'bg-success-soft/50 text-success border border-success/20'
          }
        `}
      >
        {riskLevel}
      </span>
    </div>
  );
}

import React from 'react';
import { Fuel, ShieldAlert, Disc, Power } from 'lucide-react';
import { Gear } from '../types';

interface DashboardGaugeProps {
  speed: number;
  gear: Gear;
  engineOn: boolean;
  fuel: number;
  damage: number;
  odometer: number;
  isBrakeActive: boolean;
  hazardBlinker: boolean;
  leftIndicator: boolean;
  rightIndicator: boolean;
}

export const DashboardGauge: React.FC<DashboardGaugeProps> = ({
  speed,
  gear,
  engineOn,
  fuel,
  damage,
  odometer,
  isBrakeActive,
  hazardBlinker,
  leftIndicator,
  rightIndicator,
}) => {
  const maxSpeed = 180;
  const absSpeed = Math.abs(speed);
  const clampedSpeed = Math.min(absSpeed, maxSpeed);

  // Angular logic for needle: -135deg (0 km/h) to 135deg (180 km/h)
  const startAngle = -135;
  const totalAngle = 270;
  const needleAngle = startAngle + (clampedSpeed / maxSpeed) * totalAngle;

  // Generate ticks for SVG
  const ticks = Array.from({ length: 19 }).map((_, i) => {
    const val = i * 10;
    const angle = startAngle + (val / maxSpeed) * totalAngle;
    const isMajor = val % 30 === 0;
    return { val, angle, isMajor };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch bg-neutral-950 p-5 rounded-2xl border border-neutral-800 shadow-2xl relative overflow-hidden">
      {/* Background soft ambient grid line */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(0,180,216,0.15),transparent)] pointer-events-none" />

      {/* Speedometer Gauge column (LG 5 spans) */}
      <div className="lg:col-span-5 flex flex-col items-center justify-center bg-neutral-900/60 p-4 rounded-xl border border-neutral-800/80 relative">
        <h2 className="text-[10px] tracking-wider text-neutral-500 font-display uppercase mb-2">Analog Cluster</h2>

        <div className="relative w-56 h-56 flex items-center justify-center">
          {/* Main Dial Outer ring SVG */}
          <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none" viewBox="0 0 200 200">
            {/* Background Arch */}
            <circle
              cx="100"
              cy="100"
              r="85"
              fill="transparent"
              stroke="#262626"
              strokeWidth="6"
              strokeDasharray="400 500"
              strokeLinecap="round"
              className="origin-center rotate-[45deg]"
            />
            {/* Speed Fill Glowing Arch */}
            <circle
              cx="100"
              cy="100"
              r="85"
              fill="transparent"
              stroke={clampedSpeed > 100 ? '#ef4444' : '#06b6d4'}
              strokeWidth="6"
              strokeDasharray={`${(clampedSpeed / maxSpeed) * 400} 500`}
              strokeLinecap="round"
              className="origin-center rotate-[135deg] transition-all duration-300 ease-out filter drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]"
            />
          </svg>

          {/* Speed Dial Ticks and Labels */}
          <div className="absolute inset-0 pointer-events-none">
            {ticks.map((t, idx) => {
              const rad = (t.angle * Math.PI) / 180;
              // Positioning factors
              const xMajor = 50 + Math.cos(rad) * 36;
              const yMajor = 50 + Math.sin(rad) * 36;
              const xtickOuter = 50 + Math.cos(rad) * 44;
              const ytickOuter = 50 + Math.sin(rad) * 44;
              const xtickInner = 50 + Math.cos(rad) * (t.isMajor ? 38 : 41);
              const ytickInner = 50 + Math.sin(rad) * (t.isMajor ? 38 : 41);

              return (
                <React.Fragment key={idx}>
                  {/* Tick line */}
                  <div
                    className={`absolute w-0.5 h-2 bg-neutral-500 origin-bottom`}
                    style={{
                      left: '50%',
                      top: '50%',
                      transform: `translate(-50%, -100%) rotate(${t.angle + 90}deg) translateY(-38px)`,
                      height: t.isMajor ? '8px' : '4px',
                      backgroundColor: t.isMajor ? '#06b6d4' : '#525252',
                      opacity: t.isMajor ? 1 : 0.6,
                    }}
                  />
                  {/* Labels for major markers */}
                  {t.isMajor && (
                    <div
                      className="absolute text-[9px] font-mono font-medium text-neutral-400"
                      style={{
                        left: `${xMajor}%`,
                        top: `${yMajor}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      {t.val}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Central needle spinning element */}
          <div
            className="absolute bottom-1/2 left-1/2 w-1.5 h-24 origin-bottom rounded-full transition-transform duration-75 ease-[cubic-bezier(0.1,0.8,0.3,1.0)] bg-linear-to-t from-red-600 via-pink-500 to-rose-400 shadow-[0_0_12px_rgba(239,68,68,0.7)]"
            style={{
              transform: `translate(-50%, 0) rotate(${needleAngle}deg) translateY(-10px)`,
            }}
          >
            {/* Small glow cap over needle base */}
            <div className="absolute top-[80%] left-1/2 -translate-x-1/2 w-4.5 h-4.5 rounded-full bg-neutral-900 border border-neutral-700 shadow-md flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
            </div>
          </div>

          {/* Digital Core readout inside outer dial */}
          <div className="absolute flex flex-col items-center justify-center text-center mt-12 select-none">
            <span className="text-4xl font-display font-black tracking-tighter text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">
              {Math.floor(absSpeed)}
            </span>
            <span className="text-[10px] font-mono text-neutral-400 tracking-widest mt-0.5">KM/H</span>
            <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/30 mt-2 font-semibold">
              LIMIT: 90
            </span>
          </div>
        </div>
      </div>

      {/* Main Stats column (LG 7 spans) */}
      <div className="lg:col-span-7 flex flex-col justify-between gap-4">
        {/* Indicators and system lights row */}
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 text-center text-xs font-mono">
          {/* L Turn Blinker */}
          <div
            className={`py-2 px-1 rounded-md border flex flex-col items-center justify-center transition-all ${
              leftIndicator && hazardBlinker
                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                : 'bg-neutral-900/40 border-neutral-800/80 text-neutral-600'
            }`}
          >
            <span className="text-base font-bold">◀</span>
            <span className="text-[8px] mt-0.5">INDICATOR L</span>
          </div>

          {/* Brake alert */}
          <div
            className={`py-2 px-1 rounded-md border flex flex-col items-center justify-center transition-all ${
              isBrakeActive
                ? 'bg-rose-950 border-rose-500 text-rose-400 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.3)]'
                : 'bg-neutral-900/40 border-neutral-800/80 text-neutral-600'
            }`}
          >
            <span className="text-xs font-bold leading-none">🛑</span>
            <span className="text-[8px] mt-1 uppercase font-semibold">Brakes</span>
          </div>

          {/* Gear displays P, R, N, D */}
          <div className="col-span-2 bg-neutral-900/60 border border-neutral-800 rounded-md p-1 grid grid-cols-4 items-center gap-1 font-display">
            {(['P', 'R', 'N', 'D'] as Gear[]).map((g) => (
              <div
                key={g}
                className={`py-1 text-center rounded text-sm font-black transition-all ${
                  gear === g
                    ? 'bg-cyan-500 text-black font-extrabold shadow-sm filter drop-shadow-[0_0_4px_rgba(6,182,212,0.4)]'
                    : 'text-neutral-500'
                }`}
              >
                {g}
              </div>
            ))}
          </div>

          {/* R Turn Blinker */}
          <div
            className={`py-2 px-1 rounded-md border flex flex-col items-center justify-center transition-all ${
              rightIndicator && hazardBlinker
                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                : 'bg-neutral-900/40 border-neutral-800/80 text-neutral-600'
            }`}
          >
            <span className="text-base font-bold">▶</span>
            <span className="text-[8px] mt-0.5">INDICATOR R</span>
          </div>

          {/* Engine Light */}
          <div
            className={`py-2 px-1 rounded-md border flex flex-col items-center justify-center transition-all ${
              engineOn
                ? 'bg-amber-950/60 border-amber-500 text-amber-400 font-bold'
                : 'bg-neutral-900/40 border-neutral-800/80 text-neutral-600'
            }`}
          >
            <Power className="w-3.5 h-3.5 mb-1" />
            <span className="text-[8px] uppercase">Engine</span>
          </div>
        </div>

        {/* Core gauges: Fuel and Damage */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Fuel sub-panel */}
          <div className="bg-neutral-900/70 p-3.5 rounded-xl border border-neutral-800">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 font-mono">
                <Fuel className={`w-3.5 h-3.5 ${fuel < 20 ? 'text-rose-500 animate-bounce' : 'text-cyan-400'}`} />
                Diesel Fuel
              </span>
              <span
                className={`text-sm font-mono font-bold ${
                  fuel < 20 ? 'text-red-500 animate-pulse' : 'text-neutral-200'
                }`}
              >
                {Math.ceil(fuel)}%
              </span>
            </div>
            {/* Linear fuel gauge */}
            <div className="w-full bg-neutral-950 h-2.5 rounded-full overflow-hidden border border-neutral-800 p-[1px]">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  fuel < 20 ? 'bg-rose-500 animate-pulse' : fuel < 50 ? 'bg-amber-500' : 'bg-cyan-500'
                }`}
                style={{ width: `${fuel}%` }}
              />
            </div>
            <div className="flex justify-between text-[8px] font-mono text-neutral-600 mt-1 uppercase">
              <span>E</span>
              <span>1/2</span>
              <span>F</span>
            </div>
          </div>

          {/* Bus Integrity / Damage sub-panel */}
          <div className="bg-neutral-900/70 p-3.5 rounded-xl border border-neutral-800">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 font-mono">
                <ShieldAlert className={`w-3.5 h-3.5 ${damage > 40 ? 'text-amber-500 animate-pulse' : 'text-emerald-400'}`} />
                Integrity (Health)
              </span>
              <span className={`text-sm font-mono font-bold ${damage > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {100 - damage}%
              </span>
            </div>
            {/* Linear health gauge */}
            <div className="w-full bg-neutral-950 h-2.5 rounded-full overflow-hidden border border-neutral-800 p-[1px]">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  damage > 60 ? 'bg-rose-600' : damage > 25 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${100 - damage}%` }}
              />
            </div>
            <div className="flex justify-between text-[8px] font-mono text-neutral-600 mt-1 uppercase">
              <span>CRITICAL</span>
              <span>SECURE</span>
            </div>
          </div>
        </div>

        {/* Lower digital odometer panel */}
        <div className="bg-neutral-900/80 p-3 rounded-xl border border-neutral-800/70 flex flex-wrap justify-between items-center">
          <div className="flex items-center gap-2">
            <Disc className="w-5 h-5 text-cyan-500 animate-spin" style={{ animationDuration: speed > 0 ? `${120 / speed}s` : '0s' }} />
            <div>
              <span className="block text-[8px] font-mono text-neutral-500 uppercase tracking-wider">Accumulated Run</span>
              <span className="font-mono text-xs text-neutral-300 font-medium">Digital Trip Meter</span>
            </div>
          </div>
          {/* LCD glowing numbers */}
          <div className="bg-black/60 border border-neutral-800 rounded px-3 py-1 font-mono text-base tracking-widest text-cyan-400 font-extrabold shadow-inner shadow-black/80">
            {odometer.toFixed(3).padStart(8, '0')} <span className="text-[10px] text-cyan-600 ml-1">KM</span>
          </div>
        </div>
      </div>
    </div>
  );
};

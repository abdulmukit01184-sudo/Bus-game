import React from 'react';
import { Landmark, Users, TrendingUp, AlertTriangle, HelpCircle } from 'lucide-react';
import { PassengerStop } from '../types';

interface RouteTransitLoggerProps {
  collectedFare: number;
  passengerCount: number;
  totalTrips: number;
  currentStopIndex: number;
  allStops: PassengerStop[];
  damage: number;
  alertLog: string[];
}

export const RouteTransitLogger: React.FC<RouteTransitLoggerProps> = ({
  collectedFare,
  passengerCount,
  totalTrips,
  currentStopIndex,
  allStops,
  damage,
  alertLog,
}) => {
  const currentStop = allStops[currentStopIndex];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 bg-neutral-950 p-5 rounded-2xl border border-neutral-800 shadow-2xl font-mono text-zinc-300">
      
      {/* Col 1: Commercial / Fare collection Ledger */}
      <div className="bg-neutral-900/60 p-4 rounded-xl border border-neutral-800/80 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
            <span className="text-[10px] tracking-wider text-neutral-500 font-display uppercase font-bold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Ticket Ledger (Rupees)
            </span>
            <span className="text-[9px] text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-800/30">ONLINE</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black/40 p-2.5 rounded border border-neutral-800">
              <span className="text-[8px] text-neutral-500 uppercase block">Total Revenue</span>
              <span className="text-xl font-bold text-emerald-400">₹{collectedFare}</span>
            </div>
            
            <div className="bg-black/40 p-2.5 rounded border border-neutral-800">
              <span className="text-[8px] text-neutral-500 uppercase block">On Board</span>
              <span className="text-xl font-bold text-cyan-400 flex items-center gap-1">
                <Users className="w-4 h-4 text-cyan-500" /> {passengerCount}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-neutral-800 text-[10px] text-neutral-400 space-y-1">
          <div className="flex justify-between">
            <span>Ticket Fare Rate:</span>
            <span>₹45 / Stop</span>
          </div>
          <div className="flex justify-between">
            <span>Total Completed Stops:</span>
            <span className="text-zinc-200">{totalTrips}</span>
          </div>
        </div>
      </div>

      {/* Col 2: GPS Transit Route mapping */}
      <div className="bg-neutral-900/60 p-4 rounded-xl border border-neutral-800/80 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-2">
            <span className="text-[10px] tracking-wider text-neutral-500 font-display uppercase font-bold flex items-center gap-1">
              <Landmark className="w-3.5 h-3.5 text-amber-500" /> Nav GPS Route
            </span>
            <span className="text-[9px] text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-900/40">National Highway 48</span>
          </div>

          <div className="relative pl-3 border-l border-cyan-800 space-y-3 py-1 text-xs">
            {allStops.map((stop, sIdx) => {
              const isPassed = sIdx < currentStopIndex;
              const isCurrent = sIdx === currentStopIndex;
              return (
                <div key={stop.name} className="relative flex flex-col">
                  {/* Miniature bullet dot */}
                  <div
                    className={`absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full border-2 ${
                      isPassed
                        ? 'bg-neutral-600 border-neutral-800'
                        : isCurrent
                        ? 'bg-cyan-500 border-black animate-ping'
                        : 'bg-neutral-900 border-neutral-800'
                    }`}
                  />
                  {/* Miniature bullet dot for ping preservation */}
                  {isCurrent && (
                    <div className="absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full border-2 bg-cyan-500 border-neutral-950" />
                  )}

                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${isCurrent ? 'text-cyan-400' : isPassed ? 'text-neutral-500 line-through' : 'text-neutral-300'}`}>
                      {stop.name}
                    </span>
                    <span className="text-[9px] text-neutral-500 font-normal">
                      {isPassed ? 'ARRIVED' : isCurrent ? 'TARGET' : 'UPCOMING'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current status alert */}
        <div className="mt-3 bg-black/50 p-2 rounded border border-neutral-850 text-[10px]">
          {currentStop ? (
            <div className="flex justify-between items-center text-cyan-400/90 font-semibold text-[11px]">
              <span>Next Terminal: {currentStop.name}</span>
              <span>{Math.round(currentStop.distanceRemaining)}m</span>
            </div>
          ) : (
            <span className="text-emerald-400">All stops successfully conquered!</span>
          )}
        </div>
      </div>

      {/* Col 3: Road Diagnostics & Telemetry logs */}
      <div className="bg-neutral-900/60 p-4 rounded-xl border border-neutral-800/80 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
            <span className="text-[10px] tracking-wider text-neutral-500 font-display uppercase font-bold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Log Diagnostic & Manual
            </span>
            <span className="text-[9px] text-neutral-500">SYS STATUS</span>
          </div>

          {/* Diagnostic console alerts */}
          <div className="bg-black/55 p-3 rounded-lg border border-neutral-800 h-24 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-neutral-800 text-[10px]">
            {alertLog.slice(-5).map((log, lIdx) => (
              <div key={lIdx} className="text-zinc-400 flex items-start gap-1">
                <span className="text-cyan-500 font-bold">»</span>
                <span className="leading-tight">{log}</span>
              </div>
            ))}
            {alertLog.length === 0 && (
              <div className="text-neutral-600 italic">Console idle. Awaiting bus boot sequence...</div>
            )}
          </div>
        </div>

        {/* Diagnostic warnings */}
        <div className="mt-3 flex gap-2 items-center text-[9px] bg-amber-950/20 border border-amber-900/30 p-2 rounded text-amber-500">
          <HelpCircle className="w-4 h-4 shrink-0 text-amber-500" />
          <span>
            {damage > 60
              ? 'WARNING: Body structural integrity degraded. Drive with caution!'
              : 'Manual: Start engine 🔑, shifting gear to D ⚡, steer with Arrow Keys.'}
          </span>
        </div>
      </div>

    </div>
  );
};

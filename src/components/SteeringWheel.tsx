import React, { useRef, useState, useEffect } from 'react';

interface SteeringWheelProps {
  steerAngle: number; // in degrees, -45 to 45
  setSteerAngle: (angle: number) => void;
  keyboardSteer: boolean;
}

export const SteeringWheel: React.FC<SteeringWheelProps> = ({
  steerAngle,
  setSteerAngle,
  keyboardSteer,
}) => {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startAngleRef = useRef(0);
  const currentAngleRef = useRef(0);

  const getAngle = (clientX: number, clientY: number) => {
    if (!wheelRef.current) return 0;
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const clickAngle = getAngle(e.clientX, e.clientY);
    startAngleRef.current = clickAngle - steerAngle;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      setIsDragging(true);
      const clickAngle = getAngle(e.touches[0].clientX, e.touches[0].clientY);
      startAngleRef.current = clickAngle - steerAngle;
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const angle = getAngle(e.clientX, e.clientY);
      let targetWheelAngle = angle - startAngleRef.current;
      // Clamp to -45 to +45
      targetWheelAngle = Math.max(-45, Math.min(45, targetWheelAngle));
      setSteerAngle(targetWheelAngle);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !e.touches[0]) return;
      const angle = getAngle(e.touches[0].clientX, e.touches[0].clientY);
      let targetWheelAngle = angle - startAngleRef.current;
      targetWheelAngle = Math.max(-45, Math.min(45, targetWheelAngle));
      setSteerAngle(targetWheelAngle);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  // Center alignment effect when releasing drag and no key is pressed
  useEffect(() => {
    if (!isDragging && !keyboardSteer && steerAngle !== 0) {
      const interval = setInterval(() => {
        setSteerAngle((prev) => {
          if (Math.abs(prev) < 2) {
            clearInterval(interval);
            return 0;
          }
          return prev * 0.82; // quickly return to center
        });
      }, 30);
      return () => clearInterval(interval);
    }
  }, [isDragging, keyboardSteer, steerAngle]);

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl relative select-none">
      <h3 className="text-[10px] tracking-wider text-neutral-500 font-display uppercase mb-3">Steering Column</h3>

      {/* Outer interactive grabbing ring */}
      <div
        ref={wheelRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{ transform: `rotate(${steerAngle}deg)` }}
        className={`w-40 h-40 rounded-full border-12 border-neutral-800 bg-neutral-950/60 flex items-center justify-center cursor-grab active:cursor-grabbing relative transition-shadow duration-300 ${
          isDragging ? 'shadow-[0_0_20px_rgba(6,182,212,0.45)] border-neutral-700' : 'shadow-inner'
        }`}
      >
        {/* Leather texture stitches effect */}
        <div className="absolute inset-2 rounded-full border border-neutral-900 border-dashed" />

        {/* 3 spoke horizontal center beam */}
        <div className="absolute w-full h-8 bg-neutral-800 flex items-center justify-between px-3 border-y border-neutral-700 box-content">
          <span className="w-4 h-1 bg-neutral-900 rounded" />
          <span className="w-4 h-1 bg-neutral-900 rounded" />
        </div>

        {/* Vertical third spoke */}
        <div className="absolute w-8 h-1/2 bottom-0 left-1/2 -translate-x-1/2 bg-neutral-800 border-x border-b border-neutral-700" />

        {/* Center Horn cap button */}
        <div className="absolute w-16 h-16 rounded-full bg-neutral-900 border-4 border-neutral-800 flex flex-col items-center justify-center shadow-lg text-center font-display text-[9px] text-cyan-400 font-bold active:bg-cyan-950">
          <span className="text-xl">🚌</span>
          <span className="text-[7px] text-neutral-500 tracking-tighter uppercase font-semibold">LAIB BUS</span>
        </div>
      </div>

      <div className="mt-3 text-center">
        <div className="text-[10px] font-mono text-neutral-400">
          STABILITY ANGLE: <span className={steerAngle === 0 ? 'text-emerald-400' : 'text-cyan-400 font-bold'}>{Math.round(steerAngle)}°</span>
        </div>
        <p className="text-[8px] font-mono text-neutral-600 uppercase mt-1">
          Grab & Rotate to Steer bus or use Left/Right arrows
        </p>
      </div>
    </div>
  );
};

import React, { useRef, useEffect, useState } from 'react';
import { TrafficVehicle, ScenicObject, PassengerStop, Particle } from '../types';

interface BusRoadCanvasProps {
  speed: number;
  gear: 'P' | 'R' | 'N' | 'D';
  steerAngle: number;
  engineOn: boolean;
  busX: number;
  setBusX: React.Dispatch<React.SetStateAction<number>>;
  traffic: TrafficVehicle[];
  setTraffic: React.Dispatch<React.SetStateAction<TrafficVehicle[]>>;
  scenicObjects: ScenicObject[];
  setScenicObjects: React.Dispatch<React.SetStateAction<ScenicObject[]>>;
  passengerStop: PassengerStop | null;
  onArriveAtStop: () => void;
  isDoorOpen: boolean;
  areWipersOn: boolean;
  areCabinLightsOn: boolean;
  isBrakeActive: boolean;
  isRaining: boolean;
  indicatorState: 'none' | 'left' | 'right' | 'both';
}

export const BusRoadCanvas: React.FC<BusRoadCanvasProps> = ({
  speed,
  gear,
  steerAngle,
  engineOn,
  busX,
  setBusX,
  traffic,
  setTraffic,
  scenicObjects,
  setScenicObjects,
  passengerStop,
  onArriveAtStop,
  isDoorOpen,
  areWipersOn,
  areCabinLightsOn,
  isBrakeActive,
  isRaining,
  indicatorState,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [cameraView, setCameraView] = useState<'exterior' | 'cockpit'>('exterior');
  const [wiperAngle, setWiperAngle] = useState(0);
  const [wiperDir, setWiperDir] = useState(1);
  const [rainDrops, setRainDrops] = useState<{ x: number; y: number; s: number }[]>([]);
  const [exhaustParticles, setExhaustParticles] = useState<Particle[]>([]);

  // Local track offset
  const roadOffsetRef = useRef(0);

  // Initialize rain drops
  useEffect(() => {
    const drops = Array.from({ length: 60 }).map(() => ({
      x: Math.random() * 800,
      y: Math.random() * 450,
      s: 2 + Math.random() * 3,
    }));
    setRainDrops(drops);
  }, []);

  // Update wipers and rain animation
  useEffect(() => {
    let animId: number;
    const animateWipersAndRain = () => {
      // 1. Wiper swing calculation
      if (areWipersOn && engineOn) {
        setWiperAngle((prev) => {
          let next = prev + wiperDir * 4;
          if (next > 75) {
            setWiperDir(-1);
            return 75;
          }
          if (next < -5) {
            setWiperDir(1);
            return -5;
          }
          return next;
        });
      } else {
        // Return to resting position
        setWiperAngle((prev) => (prev > 0 ? Math.max(0, prev - 2) : 0));
      }

      // 2. Continuous rain update
      if (isRaining) {
        setRainDrops((prev) =>
          prev.map((d) => {
            let nextY = d.y + d.s + speed / 12;
            let nextX = d.x - (steerAngle / 15);
            if (nextY > 450) {
              nextY = -10;
              nextX = Math.random() * 800;
            }
            if (nextX < 0) nextX = 800;
            if (nextX > 800) nextX = 0;
            return { ...d, x: nextX, y: nextY };
          })
        );
      }

      // 3. Exhaust puff particles update (low frequency diesel chug)
      if (engineOn) {
        setExhaustParticles((prev) => {
          const updated = prev
            .map((p) => ({
              ...p,
              x: p.x + p.vx,
              y: p.y - p.vy - speed / 15,
              life: p.life - 0.02,
              size: p.size + 0.15,
            }))
            .filter((p) => p.life > 0);

          // Spawn new exhaust puff occasionally
          if (Math.random() < (speed > 10 ? 0.35 : 0.15)) {
            const absAngle = (steerAngle * Math.PI) / 180;
            updated.push({
              x: busX + 15 + Math.random() * 6,
              y: 450 - 40, // exhaust location
              vx: -1 - Math.random() * 2 + Math.sin(absAngle) * -1,
              vy: -0.5 - Math.random() * 1,
              life: 1.0,
              color: `rgba(${120 + Math.random() * 40}, ${120 + Math.random() * 40}, ${120 + Math.random() * 40}, 0.35)`,
              size: 2.5 + Math.random() * 4,
            });
          }
          return updated;
        });
      } else {
        setExhaustParticles([]);
      }

      animId = requestAnimationFrame(animateWipersAndRain);
    };

    animId = requestAnimationFrame(animateWipersAndRain);
    return () => cancelAnimationFrame(animId);
  }, [areWipersOn, isRaining, engineOn, speed, steerAngle, wiperDir, busX]);

  // Handle steering update based on keys / drift
  useEffect(() => {
    if (!engineOn || gear === 'P') return;
    
    // Update steering drifting
    const steerFactor = (speed / 120.0) * (steerAngle / 16);
    if (Math.abs(steerAngle) > 0.1) {
      setBusX((prev) => {
        let next = prev + steerFactor;
        if (next < 100) next = 100;
        if (next > 700 - 80) next = 700 - 80;
        return next;
      });
    }
  }, [speed, steerAngle, engineOn, gear]);

  // Standard React state syncing to raw Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear Screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate highway offset scroll value
    roadOffsetRef.current += speed / 8;

    if (cameraView === 'exterior') {
      drawExteriorView(ctx, canvas);
    } else {
      drawCockpitView(ctx, canvas);
    }
  }, [speed, gear, steerAngle, engineOn, busX, traffic, scenicObjects, passengerStop, isDoorOpen, areCabinLightsOn, isBrakeActive, isRaining, indicatorState, cameraView, wiperAngle, rainDrops, exhaustParticles]);

  // ===================== EXTERIOR OVERHEAD DRAWING =====================
  const drawExteriorView = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const W = canvas.width;
    const H = canvas.height;

    // Grass margins Landscape
    ctx.fillStyle = isRaining ? '#162e1e' : '#224e2d';
    ctx.fillRect(0, 0, W, H);

    // Hard Soil underlay side rails
    ctx.fillStyle = '#4a3f35';
    ctx.fillRect(80, 0, 70, H);
    ctx.fillRect(W - 150, 0, 70, H);

    // Asphalt Dual Highway (Lanes spanning from x=150 to x=650)
    ctx.fillStyle = '#1e1e24';
    ctx.fillRect(150, 0, 500, H);

    // Concrete side kerbs
    ctx.fillStyle = '#7a7a85';
    for (let y = -40; y < H + 40; y += 40) {
      const scrollY = (y + roadOffsetRef.current) % (H + 80) - 40;
      ctx.fillStyle = Math.floor((y + roadOffsetRef.current) / 40) % 2 === 0 ? '#ffffff' : '#d11a2a'; // red and white dividers
      ctx.fillRect(145, scrollY, 5, 20);
      ctx.fillRect(W - 150, scrollY, 5, 20);
    }

    // Yellow highway margins
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(155, 0); ctx.lineTo(155, H);
    ctx.moveTo(W - 155, 0); ctx.lineTo(W - 155, H);
    ctx.stroke();

    // White dashed lane markings
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([25, 35]);
    ctx.lineDashOffset = -roadOffsetRef.current;
    
    // Lane 1 divider
    ctx.beginPath();
    ctx.moveTo(275, 0); ctx.lineTo(275, H);
    // Lane 2 divider (center)
    ctx.moveTo(400, 0); ctx.lineTo(400, H);
    // Lane 3 divider
    ctx.moveTo(525, 0); ctx.lineTo(525, H);
    ctx.stroke();
    ctx.setLineDash([]); // clear dash

    // Draw Static Scenic items (Trees, shrubs, lights)
    scenicObjects.forEach((obj) => {
      ctx.save();
      if (obj.side === 'left') {
        // Draw elegant evergreen tree
        const treeX = obj.x;
        const treeY = obj.y;
        
        ctx.fillStyle = '#5c4033'; // trunk
        ctx.fillRect(treeX - 4 * obj.scale, treeY, 8 * obj.scale, 25 * obj.scale);
        
        ctx.fillStyle = isRaining ? '#0a4f1a' : '#1e8238'; // leaves lobes
        ctx.beginPath();
        ctx.arc(treeX, treeY - 5 * obj.scale, 18 * obj.scale, 0, Math.PI * 2);
        ctx.arc(treeX - 10 * obj.scale, treeY - 15 * obj.scale, 14 * obj.scale, 0, Math.PI * 2);
        ctx.arc(treeX + 10 * obj.scale, treeY - 15 * obj.scale, 14 * obj.scale, 0, Math.PI * 2);
        ctx.arc(treeX, treeY - 25 * obj.scale, 15 * obj.scale, 0, Math.PI * 2);
        ctx.fill();
      } else if (obj.side === 'right') {
        const poleX = obj.x;
        const poleY = obj.y;
        // High-voltage power pole or Streetlamp
        ctx.strokeStyle = '#a1a1aa';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(poleX, poleY + 40);
        ctx.lineTo(poleX, poleY - 30); // pole main branch
        ctx.lineTo(poleX - 15, poleY - 30); // horizontal light hang
        ctx.stroke();

        // Bulb node glowing
        ctx.fillStyle = engineOn ? '#fef08a' : '#52525b';
        ctx.beginPath();
        ctx.arc(poleX - 15, poleY - 28, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    // Draw active Bus Station Shelter on the left lane edge (x = 110) if nearby
    if (passengerStop && passengerStop.active) {
      // Map stop distance 0m - 500m to Canvas Y: 
      // Stop is stationary on earth, scroll along path
      const stopY = Math.min(H - 60, H - (passengerStop.distanceRemaining * 0.8) - 100);
      
      if (stopY > -100 && stopY < H + 100) {
        // Concrete bay lane indicators
        ctx.strokeStyle = '#a1a1aa';
        ctx.lineWidth = 1.5;
        ctx.fillStyle = '#262626';
        ctx.fillRect(115, stopY, 40, 110);
        
        ctx.strokeStyle = '#eab308';
        ctx.strokeRect(115, stopY, 40, 110);

        // Platform Shelter Roof in isometric style
        ctx.fillStyle = '#0f766e'; // teal shelter
        ctx.fillRect(60, stopY + 15, 50, 75);
        ctx.strokeStyle = '#ffffff';
        ctx.strokeRect(60, stopY + 15, 50, 75);
        
        // Bench
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(72, stopY + 35, 8, 35);
        
        // Waiting passengers stick figures
        ctx.fillStyle = '#fff';
        for (let i = 0; i < Math.min(passengerStop.passengerCount, 4); i++) {
          const px = 85 + (i * 7);
          const py = stopY + 45 + (i * 5);
          // Head
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fill();
          // Body lines
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(px, py + 2.5);
          ctx.lineTo(px, py + 8);
          ctx.stroke();
        }

        // Bus Terminal Board
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(52, stopY + 5, 45, 12);
        ctx.fillStyle = '#000';
        ctx.font = 'bold 7px monospace';
        ctx.fillText(passengerStop.name.substring(0, 9).toUpperCase(), 54, stopY + 13);
      }
    }

    // Draw other traffic vehicles
    traffic.forEach((car) => {
      ctx.save();
      // Drop Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(car.x + 3, car.y + 4, car.width, car.height);

      // Body Paint
      ctx.fillStyle = car.color;
      ctx.beginPath();
      ctx.roundRect(car.x, car.y, car.width, car.height, 4);
      ctx.fill();

      // Windshield and Windows
      ctx.fillStyle = '#000000';
      ctx.fillRect(car.x + 4, car.y + 12, car.width - 8, 8); // Front window
      ctx.fillRect(car.x + 4, car.y + car.height - 18, car.width - 8, 6); // Rear window
      ctx.fillRect(car.x + 2, car.y + 24, 2, car.height / 3); // Sides
      ctx.fillRect(car.x + car.width - 4, car.y + 24, 2, car.height / 3);

      // Headlights front yellow/white
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(car.x + 4, car.y - 1, 6, 2);
      ctx.fillRect(car.x + car.width - 10, car.y - 1, 6, 2);

      // Tail lights red
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(car.x + 3, car.y + car.height - 1, 4, 2);
      ctx.fillRect(car.x + car.width - 7, car.y + car.height - 1, 4, 2);

      ctx.restore();
    });

    // Draw Exhaust particles trail
    exhaustParticles.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // ================== DRAW THE PLAYER BUS (Detailed) ==================
    const BX = busX;
    const BY = H - 120; // Anchor position
    const BW = 56;
    const BH = 100;

    ctx.save();
    
    // 1. Bus shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(BX + 5, BY + 6, BW, BH);

    // 2. Main Bus Metal Body (Heavy coach orange/indigo)
    ctx.fillStyle = areCabinLightsOn ? '#ea580c' : '#c2410c'; // Vibrant highway orange
    ctx.beginPath();
    ctx.roundRect(BX, BY, BW, BH, 6);
    ctx.fill();

    // 3. Side panels accents / stripes
    ctx.fillStyle = '#fdba74'; // Gold livery stripe down the sides
    ctx.fillRect(BX + 1, BY + 20, 2, BH - 40);
    ctx.fillRect(BX + BW - 3, BY + 20, 2, BH - 40);

    // 4. Wheels with steering rotation angle!
    const steerRad = (steerAngle * Math.PI) / 180;
    const drawTire = (tx: number, ty: number, rotateWheel: boolean) => {
      ctx.save();
      ctx.translate(tx, ty);
      if (rotateWheel) {
        ctx.rotate(steerRad * 0.7); // scale down visible rotation slightly
      }
      ctx.fillStyle = '#171717'; // tire carbon rubber
      ctx.fillRect(-4, -10, 8, 20);
      ctx.fillStyle = '#737373'; // steel ring hub
      ctx.fillRect(-2, -5, 4, 10);
      ctx.restore();
    };

    // Front Wheels
    drawTire(BX + 4, BY + 20, true);
    drawTire(BX + BW - 4, BY + 20, true);
    // Rear dual heavy wheels (stationary straight direction)
    drawTire(BX + 3, BY + BH - 25, false);
    drawTire(BX + BW - 3, BY + BH - 25, false);

    // 5. Roof elements & AC box Unit
    ctx.fillStyle = '#e2e8f0'; // bright white heat-reflective AC unit box
    ctx.beginPath();
    ctx.roundRect(BX + BW / 4, BY + BH / 3, BW / 2, BH / 5, 3);
    ctx.fill();
    // AC Fan grill textures
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(BX + BW / 2, BY + BH / 3 + 10, 5, 0, Math.PI * 2);
    ctx.stroke();

    // 6. Windshield Glass Front
    ctx.fillStyle = '#111827';
    ctx.fillRect(BX + 4, BY + 6, BW - 8, 8); // solid gloss header visor
    
    // Glass window panels (Translucent turquoise glass with seat sketches!)
    ctx.fillStyle = areCabinLightsOn ? 'rgba(254, 240, 138, 0.4)' : 'rgba(186, 230, 253, 0.25)';
    ctx.fillRect(BX + 5, BY + 15, BW - 10, BH - 30);

    // Split passenger frame window panes
    ctx.fillStyle = '#475569';
    for (let i = 0; i < 4; i++) {
      const windowY = BY + 22 + (i * 15);
      ctx.fillRect(BX + 4, windowY, BW - 8, 2); // glass frames
    }

    // Commuters head outlines inside!
    ctx.fillStyle = '#d97706';
    if (areCabinLightsOn) {
      ctx.fillStyle = '#374151';
    }
    // Render brief silhouette of bus passengers
    const passCount = Math.min(10, Math.floor(BW / 6));
    for (let i = 0; i < passCount; i++) {
      const px = BX + 10 + (i * 12) % (BW - 20);
      const py = BY + 30 + (i * 14) % (BH - 50);
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 7. Headlight Beams projection
    if (engineOn) {
      ctx.fillStyle = 'rgba(253, 224, 71, 0.15)'; // transparent gold beams
      ctx.beginPath();
      ctx.moveTo(BX + 6, BY);
      ctx.lineTo(BX - 30, BY - 140);
      ctx.lineTo(BX + 20, BY - 140);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(BX + BW - 6, BY);
      ctx.lineTo(BX + BW - 20, BY - 140);
      ctx.lineTo(BX + BW + 30, BY - 140);
      ctx.fill();

      // Draw shiny lens bulks
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(BX + 3, BY - 1, 6, 2);
      ctx.fillRect(BX + BW - 9, BY - 1, 6, 2);
    }

    // 8. Custom Passenger Doors on the Left front side
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    if (isDoorOpen) {
      // open visual: draw sliding glass panels retracted
      ctx.fillStyle = 'rgba(186, 230, 253, 0.8)';
      ctx.fillRect(BX - 6, BY + 14, 5, 12);
      ctx.strokeRect(BX - 6, BY + 14, 5, 12);
    } else {
      // closed visual: flush against carriage body
      ctx.fillStyle = 'rgba(71, 85, 105, 0.8)';
      ctx.fillRect(BX + 1, BY + 14, 3, 12);
    }

    // 9. Rear Brakelights
    // Glowing red indicators when brakes active
    ctx.fillStyle = isBrakeActive ? '#f87171' : '#dc2626';
    if (isBrakeActive) {
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ef4444';
    }
    ctx.fillRect(BX + 2, BY + BH - 1, 8, 2);
    ctx.fillRect(BX + BW - 10, BY + BH - 1, 8, 2);
    ctx.shadowBlur = 0; // clear shadow

    // 10. Dashboard Ticking Turn Signals on Bus Body
    const ticksCount = Math.floor(roadOffsetRef.current / 3) % 2 === 0;
    if (ticksCount && (indicatorState === 'left' || indicatorState === 'both')) {
      // Left indicator orange dot glows
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(BX - 1, BY + 6, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (ticksCount && (indicatorState === 'right' || indicatorState === 'both')) {
      // Right indicator orange dot glows
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(BX + BW + 1, BY + 6, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 11. Custom digital LED scrolling board on front bumper
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(BX + 12, BY + 1, BW - 24, 4);
    ctx.fillStyle = '#fbbf24'; // digital amber LED
    ctx.font = 'bold 3.5px monospace';
    ctx.fillText("DELHI EXPRESS", BX + 14, BY + 4);

    ctx.restore();

    // Rainy visual atmosphere overlays
    if (isRaining) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.18)'; // darker bluish atmosphere
      ctx.fillRect(0, 0, W, H);

      // Render rain streaks
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.17)';
      ctx.lineWidth = 1;
      rainDrops.forEach((d) => {
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - (steerAngle / 20), d.y + 12);
        ctx.stroke();
      });
    }
  };

  // ===================== COCKPIT WINDSHIELD 3D DRAWING =====================
  const drawCockpitView = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const W = canvas.width;
    const H = canvas.height;

    // Sky Horizon gradients
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    if (isRaining) {
      gradient.addColorStop(0, '#111827');
      gradient.addColorStop(0.35, '#1f2937');
      gradient.addColorStop(0.36, '#2a343a'); // road starts
      gradient.addColorStop(1, '#111827');
    } else {
      gradient.addColorStop(0, '#0369a1'); // high sky
      gradient.addColorStop(0.35, '#0ea5e9'); // bright horizon
      gradient.addColorStop(0.36, '#2d3748'); // highway asphalt
      gradient.addColorStop(1, '#1a202c');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    // Sunset mountains or sky clouds silhouettes
    ctx.fillStyle = isRaining ? '#0f172a' : '#0369a1';
    for (let i = 0; i < 4; i++) {
      const mx = (100 + i * 220 - (steerAngle * 4) + W) % (W + 200) - 100;
      ctx.beginPath();
      ctx.moveTo(mx, 160);
      ctx.lineTo(mx + 80, 110);
      ctx.lineTo(mx + 160, 160);
      ctx.fill();
    }

    // Draw the 3D projected road center lanes flaring outwards
    const vanishingX = W / 2 - (steerAngle * 1.5);
    const vanishingY = 160;

    // Grass borders projecting
    ctx.fillStyle = isRaining ? '#0f2916' : '#14532d';
    // Left boundary polygon
    ctx.beginPath();
    ctx.moveTo(0, vanishingY);
    ctx.lineTo(vanishingX - 250, vanishingY);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    // Right boundary polygon
    ctx.beginPath();
    ctx.moveTo(W, vanishingY);
    ctx.lineTo(vanishingX + 250, vanishingY);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    // Road margins concrete curb lines in flaring 3D
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(vanishingX - 250, vanishingY);
    ctx.lineTo(-40, H);
    ctx.moveTo(vanishingX + 250, vanishingY);
    ctx.lineTo(W + 40, H);
    ctx.stroke();

    // White dashed road division lines flaring from center horizon
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.setLineDash([15, 30]);
    // Scroll dynamic line dash using offset
    ctx.lineDashOffset = -roadOffsetRef.current * 1.5;

    // Center divider
    ctx.beginPath();
    ctx.moveTo(vanishingX, vanishingY);
    ctx.lineTo(W / 2, H);
    
    // Left side divider
    ctx.moveTo(vanishingX - 125, vanishingY);
    ctx.lineTo(W / 4 - 60, H);

    // Right side divider
    ctx.moveTo(vanishingX + 125, vanishingY);
    ctx.lineTo((3 * W) / 4 + 60, H);
    
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw oncoming/overtaking traffic in 3D perspective scales!
    traffic.forEach((car) => {
      // Map car's overhead dynamic Y position to a depth ratio (0% at horizon, 100% at screen bottom)
      // Car is between Y=-80 and Y=500. Let's normalize it to cockpit depth
      const depth = Math.max(0.01, Math.min(1.0, (car.y + 80) / 450));
      
      // Calculate 3D scales
      const scale = depth * 1.6; // get larger as it approaches
      const centerX = vanishingX + (car.x - 350) * depth * 1.8;
      const centerY = vanishingY + depth * (H - vanishingY);

      const cw = car.width * scale * 0.9;
      const ch = car.height * scale * 0.45;

      if (centerY > vanishingY && centerY < H + 100) {
        ctx.save();
        
        // Car chassis bounding
        ctx.fillStyle = car.color;
        ctx.fillRect(centerX - cw / 2, centerY - ch, cw, ch);

        // Windows black
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(centerX - cw / 2 + 5 * scale, centerY - ch + 3 * scale, cw - 10 * scale, ch / 2);

        // Tires
        ctx.fillStyle = '#000';
        ctx.fillRect(centerX - cw / 2 + 3 * scale, centerY - 2 * scale, 5 * scale, 3 * scale);
        ctx.fillRect(centerX + cw / 2 - 8 * scale, centerY - 2 * scale, 5 * scale, 3 * scale);

        // Taillights glowing red if they are ahead (moving same direction)
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(centerX - cw / 2 + 2 * scale, centerY - ch + 3 * scale, 4 * scale, 2.5 * scale);
        ctx.fillRect(centerX + cw / 2 - 6 * scale, centerY - ch + 3 * scale, 4 * scale, 2.5 * scale);

        ctx.restore();
      }
    });

    // Draw active Bus Shelter terminal in 3D on the Left side
    if (passengerStop && passengerStop.active) {
      const depth = Math.max(0.01, Math.min(1.0, 1.0 - (passengerStop.distanceRemaining / 500)));
      const stopScale = depth * 1.8;
      const stopX = vanishingX - 250 * depth - 40 * stopScale;
      const stopY = vanishingY + depth * (H - vanishingY) - 10 * stopScale;

      if (depth > 0.05 && stopY < H + 50) {
        ctx.save();
        // Shelter Concrete poles
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 3 * stopScale;
        ctx.beginPath();
        ctx.moveTo(stopX, stopY);
        ctx.lineTo(stopX, stopY - 35 * stopScale);
        ctx.lineTo(stopX + 30 * stopScale, stopY - 35 * stopScale);
        ctx.stroke();

        // Shelter header board
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(stopX - 5 * stopScale, stopY - 45 * stopScale, 40 * stopScale, 11 * stopScale);
        ctx.fillStyle = '#000';
        ctx.font = `bold ${Math.max(4, 6 * stopScale)}px monospace`;
        ctx.fillText(passengerStop.name.toUpperCase(), stopX - 1 * stopScale, stopY - 37 * stopScale);

        // Passengers stick-figures
        ctx.fillStyle = '#cbd5e1';
        for (let i = 0; i < 2; i++) {
          const px = stopX + 5 * stopScale + (i * 10 * stopScale);
          const py = stopY - 15 * stopScale;
          ctx.beginPath();
          ctx.arc(px, py, 3 * stopScale, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // ================== COCKPIT INTERIOR FRAME overlay ==================
    // Dashboard structure
    ctx.fillStyle = '#17171e';
    ctx.beginPath();
    ctx.moveTo(0, H - 75);
    // Draw modern sloping dash console
    ctx.lineTo(W / 4, H - 90);
    ctx.lineTo((3 * W) / 4, H - 90);
    ctx.lineTo(W, H - 75);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    // Dark grey borders
    ctx.strokeStyle = '#2d2d39';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Dynamic LCD driver computer cluster built into cockpit dashboard
    ctx.fillStyle = '#020617';
    ctx.fillRect(W / 2 - 130, H - 65, 260, 55);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(W / 2 - 130, H - 65, 260, 55);

    // Draw little gauges in cluster
    ctx.fillStyle = '#3b82f6'; // glowing cyan metrics
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`GEAR: [ ${gear} ]`, W / 2 - 120, H - 52);
    ctx.fillText(`SYS: OK`, W / 2 - 120, H - 40);
    ctx.fillText(`PASSENGERS: ${passengerStop ? passengerStop.passengerCount : 0} AWAIT`, W / 2 - 120, H - 28);

    ctx.fillStyle = '#fbbf24'; // digital amber speed
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`${Math.floor(Math.abs(speed))} KM/H`, W / 2 + 10, H - 42);
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 9px monospace';
    ctx.fillText("CRUISE PILOT", W / 2 + 10, H - 24);

    // Left and Right structural pillars / window frame limits
    ctx.fillStyle = '#0f0f13';
    ctx.fillRect(0, 0, 45, H); // Left pillar
    ctx.fillRect(W - 45, 0, 45, H); // Right pillar

    // windshield header frame
    ctx.fillRect(0, 0, W, 40);

    // Rearview Mirror rendering (Upper center projection screen)
    ctx.fillStyle = '#111827';
    ctx.fillRect(W / 2 - 90, 8, 180, 40);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(W / 2 - 90, 8, 180, 40);
    // Draw miniature road view inside mirror!
    ctx.fillStyle = '#1a202c';
    ctx.fillRect(W / 2 - 87, 10, 174, 36);
    // Drawing lines inside mirror
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.moveTo(W / 2, 46);
    ctx.lineTo(W / 2, 25); // horizon vanishing backwards
    ctx.stroke();
    // draw trailing traffic as tiny circles in mirror
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(W / 2 - 25, 30, 2.5, 0, Math.PI * 2);
    ctx.arc(W / 2 + 15, 24, 2, 0, Math.PI * 2);
    ctx.fill();

    // ================= DYNAMIC WIPER SWEEPS (When areWipersOn is true) =================
    // Draw windshield wiper arm
    ctx.save();
    ctx.translate(W / 3, H - 90); // pivot left wiper
    ctx.rotate((wiperAngle * Math.PI) / 180);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -95); // main arm length
    ctx.stroke();
    // blade cross section
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-7, -95);
    ctx.lineTo(7, -94);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate((2 * W) / 3, H - 90); // pivot right wiper
    ctx.rotate((wiperAngle * Math.PI) / 180);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -95);
    ctx.stroke();
    // blade cross section
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-7, -95);
    ctx.lineTo(7, -94);
    ctx.stroke();
    ctx.restore();

    // Rainy glass overlay streaks inside cockpit
    if (isRaining) {
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(45, 40, W - 90, H - 115); // rain static window shine

      // water bubble dots cling to glass outside swept paths!
      ctx.fillStyle = 'rgba(186, 230, 253, 0.4)';
      rainDrops.slice(0, 25).forEach((d) => {
        // avoid drawing drops in the core swept wiper arch
        const pivotX = W / 3;
        const pivotY = H - 90;
        const dist = Math.hypot(d.x - pivotX, d.y - pivotY);
        if (d.x > 45 && d.x < W - 45 && d.y > 40 && d.y < H - 90) {
          if (dist > 110) {
            ctx.beginPath();
            ctx.arc(d.x, d.y, 1.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });
    }
  };

  return (
    <div ref={containerRef} className="relative w-full flex flex-col items-center">
      {/* Cam perspective toggle headers */}
      <div className="absolute top-3 right-4 z-20 flex gap-2">
        <button
          onClick={() => setCameraView('exterior')}
          id="cam-exterior-btn"
          className={`px-3 py-1 text-[10px] font-mono rounded-md font-bold uppercase transition-all tracking-wider ${
            cameraView === 'exterior'
              ? 'bg-cyan-500 text-neutral-950 shadow-[0_0_8px_rgba(6,182,212,0.5)]'
              : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
          }`}
        >
          🛩️ Exterior CAM
        </button>
        <button
          onClick={() => setCameraView('cockpit')}
          id="cam-cockpit-btn"
          className={`px-3 py-1 text-[10px] font-mono rounded-md font-bold uppercase transition-all tracking-wider ${
            cameraView === 'cockpit'
              ? 'bg-cyan-500 text-neutral-950 shadow-[0_0_8px_rgba(6,182,212,0.5)]'
              : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
          }`}
        >
          🕹️ Cockpit CAM
        </button>
      </div>

      <div className="relative border-4 border-neutral-800 rounded-2xl overflow-hidden shadow-[0_0_35px_rgba(0,0,0,0.8)] w-full max-w-[800px] aspect-[80/42]">
        <canvas
          ref={canvasRef}
          width={800}
          height={420}
          className="w-full h-full bg-neutral-950 block"
        />

        {/* Dynamic onboard alerts notification card overlay */}
        {passengerStop && passengerStop.active && passengerStop.distanceRemaining < 120 && (
          <div className="absolute top-14 left-4 z-10 bg-cyan-950/90 border border-cyan-400/50 backdrop-blur-md text-cyan-300 font-mono text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-lg animate-pulse shadow-lg flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
            <span>Align Bus & Brake here at: {passengerStop.name}</span>
          </div>
        )}

        {isDoorOpen && (
          <div className="absolute bottom-5 left-4 z-10 bg-emerald-950/95 border border-emerald-500 backdrop-blur-md text-emerald-400 font-mono text-[9px] font-bold uppercase px-3 py-1.5 rounded-lg shadow-lg">
            🚪 Passenger Door Open | COMMUTERS BOARDING...
          </div>
        )}

        {gear === 'R' && (
          <div className="absolute top-4 left-4 z-10 bg-red-950/90 border border-red-500 text-red-500 font-display text-[10px] uppercase.font-black px-3 py-1 rounded shadow-lg animate-pulse flex items-center gap-1.5">
            <span>⚠️ REVERSE ENGAGED</span>
          </div>
        )}
      </div>
    </div>
  );
};
export default BusRoadCanvas;

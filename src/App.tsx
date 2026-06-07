import React, { useState, useEffect, useRef } from 'react';
import { 
  Compass, 
  Tv, 
  CloudRain, 
  HelpCircle, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Eye, 
  Wifi, 
  Moon, 
  Sun,
  MapPin,
  Play
} from 'lucide-react';
import { Gear, TrafficVehicle, ScenicObject, PassengerStop } from './types';
import { DashboardGauge } from './components/DashboardGauge';
import { SteeringWheel } from './components/SteeringWheel';
import { RouteTransitLogger } from './components/RouteTransitLogger';
import { BusRoadCanvas } from './components/BusRoadCanvas';
import { busAudio } from './utils/audio';
import { busRadio } from './utils/radioSynth';

// Constants for highway stations
const INITIAL_STOPS: PassengerStop[] = [
  { name: 'Rajiv Chowk', distanceRemaining: 300, passengerCount: 4, active: true, type: 'pickup' },
  { name: 'Pragati Maidan', distanceRemaining: 450, passengerCount: 6, active: false, type: 'pickup' },
  { name: 'India Gate Bypass', distanceRemaining: 600, passengerCount: 3, active: false, type: 'pickup' },
  { name: 'Cyber City Hub', distanceRemaining: 800, passengerCount: 8, active: false, type: 'pickup' },
  { name: 'Jaipur highway T2', distanceRemaining: 1000, passengerCount: 5, active: false, type: 'pickup' }
];

export default function App() {
  // --- STATE DECLARATIONS ---
  const [engineOn, setEngineOn] = useState(false);
  const [gear, setGear] = useState<Gear>('P');
  const [speed, setSpeed] = useState(0);
  const [odometer, setOdometer] = useState(() => {
    const saved = localStorage.getItem('bus_simulator_odometer');
    return saved ? parseFloat(saved) : 104.285;
  });
  const [fuel, setFuel] = useState(94.5);
  const [isBrakeActive, setIsBrakeActive] = useState(false);
  const [isAcceleratorActive, setIsAcceleratorActive] = useState(false);
  const [isHornActive, setIsHornActive] = useState(false);
  const [isDoorOpen, setIsDoorOpen] = useState(false);
  const [areCabinLightsOn, setAreCabinLightsOn] = useState(false);
  const [areWipersOn, setAreWipersOn] = useState(false);
  const [isRaining, setIsRaining] = useState(false);
  const [indicatorState, setIndicatorState] = useState<'none' | 'left' | 'right' | 'both'>('none');
  const [steerAngle, setSteerAngle] = useState(0);

  // Stats / commercial ledger
  const [collectedFare, setCollectedFare] = useState(() => {
    const saved = localStorage.getItem('bus_simulator_revenue');
    return saved ? parseInt(saved, 10) : 1480;
  });
  const [passengerCount, setPassengerCount] = useState(12);
  const [totalTrips, setTotalTrips] = useState(4);
  const [damage, setDamage] = useState(0);
  const [alertLog, setAlertLog] = useState<string[]>([
    'Booting heavy transit diagnostic module v3.8...',
    'Air-brake cylinders pressure nominal (120 PSI).',
    'Tips: Spark ignition engine requires key start (🔑 START ENGINE).'
  ]);

  // Audio mute controls
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [activeStation, setActiveStation] = useState<'off' | 'lofi' | 'retro' | 'jazz'>('off');

  // Highway scrolling elements
  const [busX, setBusX] = useState(360); // W/2 - 40 approx
  const [traffic, setTraffic] = useState<TrafficVehicle[]>([]);
  const [scenicObjects, setScenicObjects] = useState<ScenicObject[]>([]);
  const [stopsList, setStopsList] = useState<PassengerStop[]>(INITIAL_STOPS);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);

  // Key pressed statuses
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const isCrankingRef = useRef(false);

  // --- LOGGING HELPER ---
  const addLog = (message: string) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setAlertLog((prev) => [...prev, `[${timeStr}] ${message}`]);
  };

  // Keep revenue and odometer in localStorage
  useEffect(() => {
    localStorage.setItem('bus_simulator_odometer', odometer.toString());
  }, [odometer]);

  useEffect(() => {
    localStorage.setItem('bus_simulator_revenue', collectedFare.toString());
  }, [collectedFare]);

  // --- AUDIO BLINKERS MANAGEMENT ---
  useEffect(() => {
    if (indicatorState !== 'none' && !isSoundMuted) {
      busAudio.startBlinkerTick();
    } else {
      busAudio.stopBlinkerTick();
    }
  }, [indicatorState, isSoundMuted]);

  // --- INITIALIZE SCENERY ---
  useEffect(() => {
    const initialObjects: ScenicObject[] = [];
    // Generate side trees and lights
    for (let i = 0; i < 10; i++) {
      initialObjects.push({
        id: Math.random(),
        kind: Math.random() > 0.5 ? 'tree' : 'shrub',
        x: Math.random() > 0.5 ? 20 + Math.random() * 30 : 680 + Math.random() * 30,
        y: Math.random() * 450,
        side: Math.random() > 0.5 ? 'left' : 'right',
        speedMultiplier: 1.0,
        scale: 0.85 + Math.random() * 0.4,
        variant: Math.floor(Math.random() * 3)
      });
    }
    setScenicObjects(initialObjects);
  }, []);

  // --- SPAWN TRAFFIC & SCENERY MOVEMENT LOOP ---
  useEffect(() => {
    let lastTime = 0;
    let animId: number;

    const gameLoop = (timestamp: number) => {
      const elapsed = timestamp - lastTime;
      lastTime = timestamp;

      // Only iterate physics elements at discrete rates
      // 1. SCENERY MOVEMENT
      setScenicObjects((prev) =>
        prev.map((obj) => {
          let nextY = obj.y + speed / 8; // move relative to bus speed
          if (nextY > 450) {
            nextY = -40;
            // random left/right
            obj.x = obj.side === 'left' ? 20 + Math.random() * 32 : 680 + Math.random() * 32;
          }
          return { ...obj, y: nextY };
        })
      );

      // 2. BUS STOP GPS CALCULATION
      setStopsList((prev) => {
        return prev.map((stop, idx) => {
          if (idx === currentStopIndex && stop.active) {
            const nextDistance = Math.max(0, stop.distanceRemaining - (Math.abs(speed) / 3.6) * 0.05); // move delta meters
            return { ...stop, distanceRemaining: nextDistance };
          }
          return stop;
        });
      });

      // 3. TRAFFIC SPAWN AND MOVEMENT
      setTraffic((prev) => {
        // filter out old offscreen traffic
        const updated = prev
          .map((car) => {
            // vehicles approach player if they are driving, some might travel slower
            let nextY = car.y + (speed / 7 - car.speed * 0.8);
            return { ...car, y: nextY };
          })
          .filter((car) => car.y > -150 && car.y < 550);

        // spawn logic
        if (updated.length < 3 && Math.random() < 0.015 && engineOn && speed > 5) {
          const lane = Math.floor(Math.random() * 3); // 3 lanes (x left margins: 200, 325, 450)
          const carX = 200 + lane * 135 + Math.random() * 15;
          const carColors = ['#dc2626', '#2563eb', '#16a34a', '#db2777', '#f59e0b', '#06b6d4'];
          const carTypes = ['car', 'truck', 'suv'] as const;

          updated.push({
            id: Math.random(),
            x: carX,
            y: -100, // starts offscreen
            width: 32,
            height: 52,
            speed: 3 + Math.random() * 6, // speed delta
            type: carTypes[Math.floor(Math.random() * carTypes.length)],
            color: carColors[Math.floor(Math.random() * carColors.length)],
            lane: lane
          });
        }
        return updated;
      });

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [speed, engineOn, currentStopIndex]);

  // --- COLLISION DIAGNOSIS ---
  useEffect(() => {
    const handleCollisions = () => {
      for (const car of traffic) {
        // Player bus bounds: busX to busX + 56, Y: ~330 to 430
        const isOverlapX = busX < car.x + 32 && busX + 56 > car.x;
        const isOverlapY = 320 < car.y + 52 && 410 > car.y;

        if (isOverlapX && isOverlapY) {
          // Play Crash Audio
          if (!isSoundMuted) {
            busAudio.playCrashBoom();
          }

          // Slow down bus and shut off engine
          setSpeed(0);
          setEngineOn(false);
          setGear('N');
          setDamage((prev) => Math.min(100, prev + 25));
          addLog('💥 TRANSIT COLLISION ALERT! Body grid structure impacted. Engine halted.');
          setTraffic([]); // clear hazard cars
          break;
        }
      }
    };

    if (traffic.length > 0) {
      handleCollisions();
    }
  }, [traffic, busX, isSoundMuted]);

  // --- KEYBOARD CONTROLS LISTENERS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent keyboard scrolling
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      keysPressed.current[e.key] = true;

      // Quick Gear shifting shortcuts via classic keys
      if (e.key.toLowerCase() === 'd') {
        if (engineOn) {
          setGear('D');
          if (!isSoundMuted) {
            busAudio.playClickSync();
            busAudio.playAirHiss();
          }
          addLog('Gearbox shifted to DRIVE (D).');
        }
      }
      if (e.key.toLowerCase() === 'r') {
        if (engineOn) {
          setGear('R');
          if (!isSoundMuted) {
            busAudio.playClickSync();
            busAudio.playAirHiss();
          }
          addLog('Gearbox shifted to REVERSE (R) - Caution advised.');
        }
      }
      if (e.key.toLowerCase() === 'n') {
        if (engineOn) {
          setGear('N');
          if (!isSoundMuted) {
            busAudio.playClickSync();
          }
          addLog('Gearbox is now in NEUTRAL (N).');
        }
      }
      if (e.key.toLowerCase() === 'p') {
        if (speed === 0) {
          setGear('P');
          if (!isSoundMuted) busAudio.playClickSync();
          addLog('Parking BRAKE (P) engaged securely.');
        } else {
          addLog('WARNING: Bring bus to full halt before engaging Park (P)!');
        }
      }

      // Windshield Wiper
      if (e.key.toLowerCase() === 'w') {
        setAreWipersOn((prev) => !prev);
      }

      // Horn
      if (e.key.toLowerCase() === 'h' || e.key === ' ' || e.key === 'Spacebar') {
        setIsHornActive(true);
        if (!isSoundMuted) busAudio.startHorn();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = false;
      if (e.key.toLowerCase() === 'h' || e.key === ' ' || e.key === 'Spacebar') {
        setIsHornActive(false);
        busAudio.stopHorn();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [engineOn, speed, isSoundMuted]);

  // --- CORE SYSTEM PHYSICS TICKER ---
  useEffect(() => {
    const physicsInterval = setInterval(() => {
      // 1. Key indicators steering steering tilt logic
      let keyboardSteerActive = false;
      if (keysPressed.current['ArrowLeft']) {
        setSteerAngle((prev) => Math.max(-45, prev - 3.8));
        keyboardSteerActive = true;
      }
      if (keysPressed.current['ArrowRight']) {
        setSteerAngle((prev) => Math.min(45, prev + 3.8));
        keyboardSteerActive = true;
      }

      // Smooth steering return if keys are not pressed (handled inside SteeringWheel logic as well)
      if (!keyboardSteerActive) {
        // slightly center it slowly if keyboard steer used
        // setSteerAngle(p => p * 0.9);
      }

      // Keyboard Speed control
      const isPowerPressed = keysPressed.current['ArrowUp'] || isAcceleratorActive;
      const isBrakePressed = keysPressed.current['ArrowDown'] || isBrakeActive;

      // 2. FUEL DECAY
      if (engineOn) {
        setFuel((prev) => {
          const consumption = 0.002 + (Math.abs(speed) / 180.0) * 0.015;
          const nextFuel = Math.max(0, prev - consumption);
          if (nextFuel === 0) {
            setEngineOn(false);
            setSpeed(0);
            setGear('P');
            addLog('🔌 SYSTEM ENGINE FAULT: Out of Diesel fuel standard levels.');
          }
          return nextFuel;
        });
      }

      // 3. SPEED PHYSICS
      if (!engineOn) {
        // Friction dampening
        setSpeed((prev) => {
          const next = prev * 0.96;
          return Math.abs(next) < 0.2 ? 0 : next;
        });
        return;
      }

      // Brake slow down factor
      if (isBrakePressed) {
        setSpeed((prev) => {
          const decelerationFactor = 4.2;
          let next = prev;
          if (prev > 0) next = Math.max(0, prev - decelerationFactor);
          else if (prev < 0) next = Math.min(0, prev + decelerationFactor);
          
          // Play squealing sound when braking fast
          if (Math.abs(prev) > 20 && !isSoundMuted && Math.random() < 0.2) {
            busAudio.playBrakeSqueal();
          }
          return next;
        });
      } else {
        // Normal acceleration based on gears
        if (gear === 'D') {
          if (isPowerPressed) {
            setSpeed((prev) => Math.min(120, prev + 1.2)); // safe stable pickup
          } else {
            // natural deceleration to idle crawl
            setSpeed((prev) => (prev > 8 ? prev - 0.5 : Math.min(8, prev + 0.2)));
          }
        } else if (gear === 'R') {
          if (isPowerPressed) {
            setSpeed((prev) => Math.max(-30, prev - 0.8)); // reverse speed cap
          } else {
            setSpeed((prev) => (prev < -4 ? prev + 0.4 : -4));
          }
        } else {
          // Neutral / Park: roll to a halt
          setSpeed((prev) => {
            const next = prev * 0.97;
            return Math.abs(next) < 0.1 ? 0 : next;
          });
        }
      }

      // 4. ODOMETER ADVANCEMENT (convert real-time speed to km per tick)
      setOdometer((prev) => {
        if (Math.abs(speed) > 0.1) {
          const deltaKm = (Math.abs(speed) / 3600.0) * (50 / 1000.0); // 50ms interval fraction
          return prev + deltaKm;
        }
        return prev;
      });

      // 5. UPDATE COCKPIT ENGINE AUDIO
      updateEngineSounds();

    }, 50);

    return () => clearInterval(physicsInterval);
  }, [engineOn, gear, speed, isAcceleratorActive, isBrakeActive, isSoundMuted]);

  // --- AUDIO SOUND UPDATERS ---
  const updateEngineSounds = () => {
    if (!isSoundMuted && engineOn) {
      busAudio.updateEngineSound(speed, isBrakeActive);
    }
  };

  // --- MANUAL IGNITION AND GEAR BUTTONS ---
  const toggleEngine = () => {
    if (isCrankingRef.current) return;
    
    if (engineOn) {
      setEngineOn(false);
      setSpeed(0);
      setGear('P');
      busAudio.stopEngineSound();
      addLog('Heavy diesel motor shut down. Cabin diagnostics offline.');
    } else {
      isCrankingRef.current = true;
      addLog('Key ignition standard sequence initiated... cranking cylinders 🔑');
      if (!isSoundMuted) {
        busAudio.startEngine(() => {
          setEngineOn(true);
          setGear('N');
          isCrankingRef.current = false;
          addLog('SYSTEM ONLINE: Cummins Turbo Diesel active idling at 750 RPM.');
        });
      } else {
        setEngineOn(true);
        setGear('N');
        isCrankingRef.current = false;
        addLog('SYSTEM ONLINE: Diesel engine live (Muted sound).');
      }
    }
  };

  // --- BUS STOP BOARDING / REFUEL MECHANISM ---
  const handleArriveAtStop = () => {
    addLog('Bus stop approaching within boarding margins.');
  };

  const openCabinDoors = () => {
    if (speed > 2) {
      addLog('HAZARD WARNING: Lock safety prevents door operation above 2 KM/H!');
      return;
    }
    
    // Toggle door open
    setIsDoorOpen((prev) => {
      const nextState = !prev;
      if (nextState) {
        if (!isSoundMuted) {
          busAudio.playDoorBuzzer();
          busAudio.playAirHiss();
        }
        addLog('Passenger Pneumatic doors retracted open.');

        // Verify if we are at an active transit stop
        const currentStop = stopsList[currentStopIndex];
        if (currentStop && currentStop.active && currentStop.distanceRemaining < 15) {
          addLog(`COMMUTERS BOARDING/DROPPING OFF AT: ${currentStop.name}...`);
          
          setTimeout(() => {
            // Pick up calculations
            const boardingCount = currentStop.passengerCount;
            const fareEarnings = boardingCount * 45;
            
            setPassengerCount((p) => p + boardingCount);
            setCollectedFare((f) => f + fareEarnings);
            setTotalTrips((t) => t + 1);
            
            addLog(`SUCCESS: ${boardingCount} commercial tickets sold. Earned ₹${fareEarnings}!`);
            
            // Advance to next stop
            setStopsList((prevStops) => {
              const updated = prevStops.map((st, i) => {
                if (i === currentStopIndex) return { ...st, active: false };
                if (i === currentStopIndex + 1) return { ...st, active: true, distanceRemaining: 400 + Math.random() * 200 };
                return st;
              });
              
              // End of line loop reset
              if (currentStopIndex + 1 >= updated.length) {
                updated[0].active = true;
                updated[0].distanceRemaining = 500;
                setCurrentStopIndex(0);
              } else {
                setCurrentStopIndex((p) => p + 1);
              }
              return updated;
            });
            
          }, 2400);
        }
      } else {
        if (!isSoundMuted) {
          busAudio.playAirHiss();
        }
        addLog('Pneumatic safety door locked and sealed.');
      }
      return nextState;
    });
  };

  const engageHornPneumatic = () => {
    if (!isSoundMuted) {
      busAudio.startHorn();
      setTimeout(() => busAudio.stopHorn(), 550);
    }
    setIsHornActive(true);
    setTimeout(() => setIsHornActive(false), 550);
    addLog('Air Horn blasted 📢 - clearing roadway.');
  };

  const handleRefuelAction = () => {
    if (speed > 0) {
      addLog('Cannot top up fuel tank while diesel engine or bus is moving.');
      return;
    }
    addLog('Top-up service vehicle connected. Pumps activated ⛽');
    setFuel(100);
    addLog('Diesel fuel tank replenished back to 100%.');
  };

  const handleRepairAction = () => {
    if (speed > 0) {
      addLog('Park bus before structural technician repairs.');
      return;
    }
    addLog('Heavy hydraulic jack deployed. Welding panel grids...');
    setDamage(0);
    addLog('Excellent. Frame repairs completed. Integrity status: 100% nominal.');
  };

  // --- PROCEDURAL FM CYBER RADIO HANDLER ---
  const handleRadioStationChange = (station: 'off' | 'lofi' | 'retro' | 'jazz') => {
    if (station === 'off') {
      busRadio.stop();
      setActiveStation('off');
      addLog('Dashboard Radio Tuner: Offline.');
    } else {
      busRadio.setStation(station);
      setActiveStation(station);
      addLog(`FM Radio tuned to: [ ${station.toUpperCase()} HIGHWAY RADIO ]`);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-black">
      {/* Upper Global Navigation HUD Bar */}
      <header className="bg-neutral-900 border-b border-neutral-800 py-3.5 px-6 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo Brand Brandings */}
          <div className="flex items-center gap-3">
            <div className="bg-cyan-500 text-black p-2 rounded-xl flex items-center justify-center font-black animate-pulse shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <span className="text-xl leading-none">🚌</span>
            </div>
            <div>
              <h1 className="text-base font-display font-extrabold text-white tracking-widest flex items-center gap-2">
                LAIB TECH <span className="text-cyan-400 text-xs font-mono font-semibold pb-0.5 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">COACH PRO</span>
              </h1>
              <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest leading-none mt-1">
                Realistic Heavy-Vehicle Highway Simulator
              </p>
            </div>
          </div>

          {/* Quick diagnostics values */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <div className={`px-2.5 py-1 rounded border flex items-center gap-1.5 ${isRaining ? 'bg-cyan-950/40 border-cyan-800 text-cyan-300' : 'bg-neutral-950 border-neutral-800 text-neutral-400'}`}>
              <CloudRain className={`w-3.5 h-3.5 ${isRaining ? 'animate-bounce text-cyan-400' : ''}`} />
              <span>{isRaining ? 'RAINING' : 'CLEAR SKY'}</span>
            </div>

            <div className="px-2.5 py-1 rounded bg-neutral-950 border border-neutral-800 flex items-center gap-1.5 text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span>GPS ONLINE</span>
            </div>

            {/* Global Mute control */}
            <button
              onClick={() => {
                const mute = !isSoundMuted;
                setIsSoundMuted(mute);
                if (mute) {
                  busAudio.stopEngineSound();
                  busAudio.stopBlinkerTick();
                  busRadio.stop();
                  setActiveStation('off');
                } else {
                  updateEngineSounds();
                }
              }}
              className={`p-1 px-3 rounded-lg border font-bold text-[10px] uppercase flex items-center gap-1 transition-all ${
                isSoundMuted 
                  ? 'bg-rose-950 text-rose-400 border-rose-800/60' 
                  : 'bg-cyan-500 text-black border-cyan-400 hover:bg-cyan-400'
              }`}
            >
              {isSoundMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{isSoundMuted ? 'Muted' : 'Audio On'}</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Container Grid */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Game Canvas Viewport */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Active Canvas Simulator wrapper */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 sm:p-5 relative overflow-hidden">
            <div className="absolute top-4 left-4 z-10 font-mono text-[9px] uppercase tracking-widest text-[#a1a1aa] bg-neutral-950/70 py-1 px-2.5 rounded border border-neutral-800">
              📌 Route Destination: <span className="text-white font-bold">Delhi to Jaipur Express Route</span>
            </div>
            
            <BusRoadCanvas
              speed={speed}
              gear={gear}
              steerAngle={steerAngle}
              engineOn={engineOn}
              busX={busX}
              setBusX={setBusX}
              traffic={traffic}
              setTraffic={setTraffic}
              scenicObjects={scenicObjects}
              setScenicObjects={setScenicObjects}
              passengerStop={stopsList[currentStopIndex]}
              onArriveAtStop={handleArriveAtStop}
              isDoorOpen={isDoorOpen}
              areWipersOn={areWipersOn}
              areCabinLightsOn={areCabinLightsOn}
              isBrakeActive={isBrakeActive}
              isRaining={isRaining}
              indicatorState={indicatorState}
            />
          </div>

          {/* Detailed Commercial Routing logs */}
          <RouteTransitLogger
            collectedFare={collectedFare}
            passengerCount={passengerCount}
            totalTrips={totalTrips}
            currentStopIndex={currentStopIndex}
            allStops={stopsList}
            damage={damage}
            alertLog={alertLog}
          />

        </div>

        {/* Right Side: Driving Dashboard & Controls console */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Neon digital Analog Gauges cluster */}
          <DashboardGauge
            speed={speed}
            gear={gear}
            engineOn={engineOn}
            fuel={fuel}
            damage={damage}
            odometer={odometer}
            isBrakeActive={isBrakeActive}
            hazardBlinker={keysPressed.current['l'] || indicatorState === 'both'}
            leftIndicator={indicatorState === 'left' || indicatorState === 'both'}
            rightIndicator={indicatorState === 'right' || indicatorState === 'both'}
          />

          {/* Interactive Core Steering Wheel Component */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
            <SteeringWheel
              steerAngle={steerAngle}
              setSteerAngle={setSteerAngle}
              keyboardSteer={keysPressed.current['ArrowLeft'] || keysPressed.current['ArrowRight']}
            />

            {/* Board Passenger, Weather, Refuel & Horn commands panel */}
            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl flex flex-col justify-between gap-3 font-mono">
              <h3 className="text-[10px] tracking-wider text-neutral-500 font-display uppercase border-b border-neutral-800 pb-2">Secondary Actions</h3>
              
              <div className="grid grid-cols-1 gap-2 flex-1 pt-1">
                {/* Boarding Doors button */}
                <button
                  onClick={openCabinDoors}
                  className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 border uppercase ${
                    isDoorOpen 
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)] animate-pulse' 
                      : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  🚪 {isDoorOpen ? 'Seal Doors' : 'Open Cabin Door'}
                </button>

                {/* Windshield wiping toggle */}
                <button
                  onClick={() => setAreWipersOn((prev) => !prev)}
                  className={`py-2 px-2 rounded text-xs font-semibold uppercase flex items-center justify-center gap-1.5 border transition-all ${
                    areWipersOn 
                      ? 'bg-cyan-950 text-cyan-400 border-cyan-800' 
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  💦 WIPERS: {areWipersOn ? 'SWEEPING' : 'OFF'}
                </button>

                {/* Rain Storm Climate toggler */}
                <button
                  onClick={() => setIsRaining((prev) => !prev)}
                  className={`py-2 px-2 rounded text-xs font-semibold uppercase flex items-center justify-center gap-1.5 border transition-all ${
                    isRaining 
                      ? 'bg-amber-950 text-amber-500 border-amber-800/80' 
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  ⛈️ WEATHER: {isRaining ? 'RAINING' : 'CLEAR'}
                </button>

                {/* High Power Air Horn */}
                <button
                  onClick={engageHornPneumatic}
                  onMouseDown={() => {
                    setIsHornActive(true);
                    if (!isSoundMuted) busAudio.startHorn();
                  }}
                  onMouseUp={() => {
                    setIsHornActive(false);
                    busAudio.stopHorn();
                  }}
                  onMouseLeave={() => {
                    setIsHornActive(false);
                    busAudio.stopHorn();
                  }}
                  className={`py-2 px-2 rounded text-xs font-black uppercase text-center border transition-all ${
                    isHornActive
                      ? 'bg-rose-600 text-black border-red-500 shadow-[0_0_10px_rgb(239,68,68)]'
                      : 'bg-rose-950 text-rose-400 border-rose-900/60 hover:bg-rose-900/40'
                  }`}
                >
                  📢 PRESS HORN (H)
                </button>
              </div>

              {/* Maintenance top up actions */}
              <div className="grid grid-cols-2 gap-1.5 text-[9px] font-bold">
                <button
                  onClick={handleRefuelAction}
                  className="bg-neutral-950 p-1.5 rounded text-cyan-400 border border-neutral-850 hover:bg-neutral-900"
                >
                  ⛽ REFUEL TANK
                </button>
                <button
                  onClick={handleRepairAction}
                  className="bg-neutral-950 p-1.5 rounded text-amber-500 border border-neutral-850 hover:bg-neutral-900"
                >
                  🔧 FIX INTEGRITY
                </button>
              </div>
            </div>
          </div>

          {/* Tactical Cockpit Control Center Switches (Igni, Indicators, Cabin) */}
          <div className="bg-neutral-900 border border-neutral-800 p-4 sm:p-5 rounded-2xl shadow-xl space-y-4">
            <h3 className="text-[10px] font-mono tracking-widest text-neutral-500 font-display uppercase border-b border-neutral-800 pb-2">Cockpit Switch Panel</h3>

            <div className="grid grid-cols-3 gap-3 font-mono text-center">
              {/* Ignition key toggle switch */}
              <button
                onClick={toggleEngine}
                className={`py-3 px-1.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-bold leading-tight ${
                  engineOn
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)] animate-pulse'
                    : 'bg-red-950 text-red-500 border-red-800/60 hover:border-red-700'
                }`}
              >
                <span className="text-xl">🔑</span>
                <span>{engineOn ? 'MOTOR ON' : 'START MOTOR'}</span>
              </button>

              {/* Left turn blinker */}
              <button
                onClick={() => setIndicatorState((p) => (p === 'left' ? 'none' : 'left'))}
                className={`py-3 px-1.5 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all text-[11px] font-bold ${
                  indicatorState === 'left'
                    ? 'bg-amber-950 text-amber-500 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                    : 'bg-neutral-950 text-neutral-400 border-neutral-850 hover:border-neutral-800'
                }`}
              >
                <span className="text-lg">◀ L</span>
                <span>BLINK L</span>
              </button>

              {/* Right turn blinker */}
              <button
                onClick={() => setIndicatorState((p) => (p === 'right' ? 'none' : 'right'))}
                className={`py-3 px-1.5 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all text-[11px] font-bold ${
                  indicatorState === 'right'
                    ? 'bg-amber-950 text-amber-500 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                    : 'bg-neutral-950 text-neutral-400 border-neutral-850 hover:border-neutral-800'
                }`}
              >
                <span className="text-lg">▶ R</span>
                <span>BLINK R</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono text-center">
              {/* Emergency hazard flashers */}
              <button
                onClick={() => setIndicatorState((p) => (p === 'both' ? 'none' : 'both'))}
                className={`py-2 px-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                  indicatorState === 'both'
                    ? 'bg-red-950/60 text-red-500 border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                    : 'bg-neutral-950 text-neutral-400 border-neutral-850 hover:border-neutral-800'
                }`}
              >
                ⚠️ HAZARDS
              </button>

              {/* Cabin internal glowing lights switch */}
              <button
                onClick={() => setAreCabinLightsOn((prev) => !prev)}
                className={`py-2 px-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                  areCabinLightsOn
                    ? 'bg-yellow-950/60 text-yellow-500 border-yellow-500 shadow-[0_0_8px_rgba(251,191,36,0.4)]'
                    : 'bg-neutral-950 text-neutral-400 border-neutral-850 hover:border-neutral-800'
                }`}
              >
                💡 CABIN LIGHTS
              </button>
            </div>
          </div>

          {/* Highway Radio FM Tuner station module */}
          <div className="bg-neutral-900 border border-neutral-800 p-4 sm:p-5 rounded-2xl shadow-xl font-mono">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-2 mb-3">
              <span className="text-[10px] tracking-wider text-neutral-500 font-display uppercase font-bold">
                📻 HW-FM RADIO TUNER
              </span>
              <span className="text-[10px] text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800/40">
                STATION: {busRadio.getStationName()}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 text-[9px] font-bold text-center">
              <button
                onClick={() => handleRadioStationChange('off')}
                className={`p-2 rounded border uppercase transition-all ${
                  activeStation === 'off'
                    ? 'bg-white text-black border-white'
                    : 'bg-neutral-950 text-zinc-400 border-neutral-850 hover:border-neutral-800'
                }`}
              >
                OFF
              </button>
              <button
                onClick={() => handleRadioStationChange('lofi')}
                className={`p-2 rounded border uppercase transition-all ${
                  activeStation === 'lofi'
                    ? 'bg-cyan-500 text-black border-cyan-400'
                    : 'bg-neutral-950 text-cyan-400 border-cyan-950 hover:border-cyan-900'
                }`}
              >
                93.5 Lofi
              </button>
              <button
                onClick={() => handleRadioStationChange('retro')}
                className={`p-2 rounded border uppercase transition-all ${
                  activeStation === 'retro'
                    ? 'bg-purple-600 text-white border-purple-500'
                    : 'bg-neutral-950 text-purple-400 border-purple-950 hover:border-purple-900'
                }`}
              >
                104 Retro
              </button>
              <button
                onClick={() => handleRadioStationChange('jazz')}
                className={`p-2 rounded border uppercase transition-all ${
                  activeStation === 'jazz'
                    ? 'bg-amber-600 text-white border-amber-500'
                    : 'bg-neutral-950 text-amber-400 border-amber-950 hover:border-amber-900'
                }`}
              >
                91.1 Jazz
              </button>
            </div>
          </div>

          {/* Touch-Screen Accelerator & Brake Pedals (Essential for Mobile/Tablets) */}
          <div className="bg-neutral-900 border border-neutral-805 p-4 sm:p-5 rounded-2xl shadow-xl font-mono">
            <h3 className="text-[10px] tracking-widest text-neutral-500 font-display uppercase border-b border-slate-800 pb-2 mb-3">Tactile Pedal Actuators</h3>
            <div className="grid grid-cols-2 gap-4 items-stretch h-28">
              
              {/* Brake pedal (Left) */}
              <button
                onMouseDown={() => setIsBrakeActive(true)}
                onMouseUp={() => setIsBrakeActive(false)}
                onMouseLeave={() => setIsBrakeActive(false)}
                onTouchStart={(e) => { e.preventDefault(); setIsBrakeActive(true); }}
                onTouchEnd={() => setIsBrakeActive(false)}
                className={`rounded-xl border flex flex-col justify-center items-center gap-1.5 transition-all text-xs font-black uppercase tracking-wider ${
                  isBrakeActive
                    ? 'bg-red-600 text-black border-red-500 scale-95 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                    : 'bg-neutral-950 text-red-500 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="w-1.5 h-10 bg-neutral-800 rounded-full flex flex-col justify-between p-[2px]">
                  <div className={`w-full h-1/2 rounded-full ${isBrakeActive ? 'bg-red-500' : 'bg-red-950'}`} />
                </div>
                <span>BRAKE [↓]</span>
              </button>

              {/* Accelerator pedal (Right) */}
              <button
                onMouseDown={() => setIsAcceleratorActive(true)}
                onMouseUp={() => setIsAcceleratorActive(false)}
                onMouseLeave={() => setIsAcceleratorActive(false)}
                onTouchStart={(e) => { e.preventDefault(); setIsAcceleratorActive(true); }}
                onTouchEnd={() => setIsAcceleratorActive(false)}
                className={`rounded-xl border flex flex-col justify-center items-center gap-1.5 transition-all text-xs font-black uppercase tracking-wider ${
                  isAcceleratorActive
                    ? 'bg-cyan-500 text-black border-cyan-400 scale-95 shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                    : 'bg-neutral-950 text-cyan-400 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="w-1.5 h-10 bg-neutral-800 rounded-full flex flex-col justify-between p-[2px]">
                  <div className={`w-full h-1/2 rounded-full ${isAcceleratorActive ? 'bg-cyan-500' : 'bg-cyan-950'}`} />
                </div>
                <span>GAS [↑]</span>
              </button>

            </div>
            <p className="text-[8px] font-mono text-neutral-600 text-center mt-2.5 uppercase">
              Hold buttons down or use Up/Down Arrow keyboard shortcuts
            </p>
          </div>

        </div>

      </main>

      {/* Modern Compact Site Footer info lines */}
      <footer className="bg-neutral-950 border-t border-neutral-900 py-4 text-center font-mono text-[9px] text-zinc-600 space-y-1 mt-6">
        <p>🎮 Keyboard Shortcuts: UP / DOWN arrow for Speed | LEFT / RIGHT arrow for Steering Wheel | SPACBAR for Horn | W for Wipers</p>
        <p>🚌 Bus Engine Synthesizers & Cyber HW-FM Radio coded with vanilla HTML5 Web Audio oscillators. Made for Laib Tech.</p>
        <p className="text-cyan-600 font-semibold uppercase tracking-widest mt-1">Delhi - Jaipur National Highway Express Corridor</p>
      </footer>
    </div>
  );
}

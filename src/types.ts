export interface TrafficVehicle {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  type: 'car' | 'truck' | 'bike' | 'suv';
  color: string;
  lane: number;
}

export type Gear = 'P' | 'R' | 'N' | 'D';

export interface BusState {
  engineOn: boolean;
  gear: Gear;
  speed: number; // km/h
  odometer: number; // km
  fuel: number; // %
  isBrakeActive: boolean;
  isHornActive: boolean;
  isDoorOpen: boolean;
  areCabinLightsOn: boolean;
  areWipersOn: boolean;
  areHazardsOn: boolean;
  steerAngle: number; // -45 to 45 degrees
  indicators: 'none' | 'left' | 'right' | 'both';
  damage: number; // 0 to 100%
  passengerCount: number;
  collectedFare: number; // total Rupee earnings
  score: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface ScenicObject {
  id: number;
  kind: 'tree' | 'building' | 'streetlight' | 'cloud' | 'shrub';
  x: number;
  y: number;
  side: 'left' | 'right' | 'sky';
  speedMultiplier: number;
  scale: number;
  variant: number;
}

export interface PassengerStop {
  name: string;
  distanceRemaining: number; // in meters/scale
  passengerCount: number;
  active: boolean;
  type: 'pickup' | 'dropoff';
}

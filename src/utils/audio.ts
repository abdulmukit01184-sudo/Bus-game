/**
 * Web Audio API synthesizer for the Realistic Bus Driver Simulator.
 * Provides real-time interactive audio feedback with zero external file dependencies.
 */

class BusAudioEngine {
  private ctx: AudioContext | null = null;
  
  // Oscillators and Nodes
  private engineStarter: OscillatorNode | null = null;
  private engineIdleOsc1: OscillatorNode | null = null;
  private engineIdleOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;

  private hornOsc1: OscillatorNode | null = null;
  private hornOsc2: OscillatorNode | null = null;
  private hornGain: GainNode | null = null;

  private blinkerIntervalRef: any = null;

  constructor() {
    // Lazy initialized to satisfy browser audio autoplay blocking
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Triggers the cranking key sound, then starts the engine running sound
   */
  public startEngine(onStarted: () => void) {
    this.initCtx();
    if (!this.ctx) return;

    // A low frequency starter crank pulsing
    const now = this.ctx.currentTime;
    
    // Play starter cylinder chugs
    for (let i = 0; i < 4; i++) {
      const chugTime = now + (i * 0.2);
      this.playChug(chugTime);
    }

    // After 1 second, spin up the active idling engine
    setTimeout(() => {
      this.startIdleEngineState();
      onStarted();
    }, 1000);
  }

  private playChug(time: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(45, time);
    osc.frequency.exponentialRampToValueAtTime(20, time + 0.15);
    
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.18);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(time);
    osc.stop(time + 0.2);
  }

  private startIdleEngineState() {
    this.initCtx();
    if (!this.ctx) return;
    
    // Clean old nodes if running
    this.stopEngineSound();

    const now = this.ctx.currentTime;

    // Create low pitch rumble
    this.engineIdleOsc1 = this.ctx.createOscillator();
    this.engineIdleOsc2 = this.ctx.createOscillator();
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineGain = this.ctx.createGain();

    // 1st Harmonic (Sub Rumble)
    this.engineIdleOsc1.type = 'sawtooth';
    this.engineIdleOsc1.frequency.setValueAtTime(53, now); // ~53Hz

    // 2nd Harmonic (Mid Frequency)
    this.engineIdleOsc2.type = 'triangle';
    this.engineIdleOsc2.frequency.setValueAtTime(105, now);

    // Warm Lowpass Filter
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(250, now);
    this.engineFilter.Q.setValueAtTime(2, now);

    this.engineGain.gain.setValueAtTime(0.2, now);

    // Connect nodes
    this.engineIdleOsc1.connect(this.engineFilter);
    this.engineIdleOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.engineIdleOsc1.start(now);
    this.engineIdleOsc2.start(now);
  }

  /**
   * Changes the engine hum pitch and intensity based on vehicle speed/RPM
   */
  public updateEngineSound(speedKmh: number, isBraking: boolean) {
    if (!this.ctx || !this.engineIdleOsc1 || !this.engineIdleOsc2 || !this.engineFilter || !this.engineGain) {
      return;
    }

    const absSpeed = Math.abs(speedKmh);
    const speedRatio = absSpeed / 120.0; // max speed normalization

    // Calculate simulated bus RPM spectrum
    const idleFreq1 = 53 + (speedRatio * 85); // 53Hz to ~138Hz
    const idleFreq2 = 105 + (speedRatio * 170); // 105Hz to ~275Hz
    const filterFreq = 250 + (speedRatio * 450) + (isBraking ? -50 : 0);
    const volume = 0.18 + (speedRatio * 0.16) + (isBraking ? 0.05 : 0);

    const now = this.ctx.currentTime;
    
    // Linear smooth frequency transformations
    this.engineIdleOsc1.frequency.setTargetAtTime(idleFreq1, now, 0.1);
    this.engineIdleOsc2.frequency.setTargetAtTime(idleFreq2, now, 0.1);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.15);
    this.engineGain.gain.setTargetAtTime(volume, now, 0.1);
  }

  public stopEngineSound() {
    const now = this.ctx ? this.ctx.currentTime : 0;
    
    if (this.engineIdleOsc1) {
      try { this.engineIdleOsc1.stop(now); } catch(e){}
      this.engineIdleOsc1.disconnect();
      this.engineIdleOsc1 = null;
    }
    if (this.engineIdleOsc2) {
      try { this.engineIdleOsc2.stop(now); } catch(e){}
      this.engineIdleOsc2.disconnect();
      this.engineIdleOsc2 = null;
    }
    if (this.engineFilter) {
      this.engineFilter.disconnect();
      this.engineFilter = null;
    }
    if (this.engineGain) {
      this.engineGain.disconnect();
      this.engineGain = null;
    }
  }

  /**
   * Dual-tone air horn
   */
  public startHorn() {
    this.initCtx();
    if (!this.ctx) return;
    if (this.hornOsc1 || this.hornOsc2) return; // already active

    const now = this.ctx.currentTime;
    this.hornOsc1 = this.ctx.createOscillator();
    this.hornOsc2 = this.ctx.createOscillator();
    this.hornGain = this.ctx.createGain();

    // Indian styled Air Horn chords (370Hz + 440Hz / F# and A chord)
    this.hornOsc1.type = 'sawtooth';
    this.hornOsc1.frequency.setValueAtTime(370, now);
    
    this.hornOsc2.type = 'sawtooth';
    this.hornOsc2.frequency.setValueAtTime(444, now);

    this.hornGain.gain.setValueAtTime(0, now);
    this.hornGain.gain.linearRampToValueAtTime(0.25, now + 0.05); // quick fade in

    // Connect to simple lowpass to make it less abrasive, sounding like a genuine outer horn sound
    const hornFilter = this.ctx.createBiquadFilter();
    hornFilter.type = 'lowpass';
    hornFilter.frequency.setValueAtTime(1500, now);

    this.hornOsc1.connect(hornFilter);
    this.hornOsc2.connect(hornFilter);
    hornFilter.connect(this.hornGain);
    this.hornGain.connect(this.ctx.destination);

    this.hornOsc1.start(now);
    this.hornOsc2.start(now);
  }

  public stopHorn() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (this.hornOsc1 && this.hornOsc2 && this.hornGain) {
      const g = this.hornGain;
      const o1 = this.hornOsc1;
      const o2 = this.hornOsc2;
      
      // smooth discharge of air sound
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      
      o1.stop(now + 0.2);
      o2.stop(now + 0.2);

      this.hornOsc1 = null;
      this.hornOsc2 = null;
      this.hornGain = null;
    }
  }

  /**
   * Air Brake pressure release (pneumatic screech)
   */
  public playAirHiss() {
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Create white-noise style sound using an oscillator or buffer
    const bufferSize = this.ctx.sampleRate * 0.6; // 0.6 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Fill buffer with noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;

    // Filter to make it sound like a hiss "Pshhhh"
    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1200, now);
    bandpass.Q.setValueAtTime(1, now);
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    noiseNode.connect(bandpass);
    bandpass.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    noiseNode.start(now);
    noiseNode.stop(now + 0.6);
  }

  /**
   * Passengers Ding/Bell chime
   */
  public playDoorBuzzer() {
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Double chime "Ding-Dong" or single premium "Ding!"
    const playChime = (freq: number, startTime: number, duration: number) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.1);
    };

    playChime(988, now, 0.4); // B5 (Ding)
    playChime(784, now + 0.25, 0.6); // G5 (Dong)
  }

  /**
   * Gear Shift mechanical click
   */
  public playClickSync() {
    this.initCtx();
    if (!this.ctx) return;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.07);
  }

  /**
   * Blinker ticking
   */
  public startBlinkerTick() {
    this.initCtx();
    if (!this.ctx) return;
    if (this.blinkerIntervalRef) return;

    const tick = () => {
      this.playClickSync();
    };

    tick();
    this.blinkerIntervalRef = setInterval(tick, 450);
  }

  public stopBlinkerTick() {
    if (this.blinkerIntervalRef) {
      clearInterval(this.blinkerIntervalRef);
      this.blinkerIntervalRef = null;
    }
  }

  /**
   * Squealing brakes sound
   */
  public playBrakeSqueal() {
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2500, now);
    // add minor pitch modulation/wabbling for realism
    osc.frequency.linearRampToValueAtTime(2450, now + 0.3);

    gain.gain.setValueAtTime(0.02, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  /**
   * Play simple collision crash chime
   */
  public playCrashBoom() {
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Low rumble boom
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.8);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 1.0);
  }
}

// Global lazy-initialized singleton
export const busAudio = new BusAudioEngine();
export default busAudio;

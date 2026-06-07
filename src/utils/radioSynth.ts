/**
 * Web Audio procedural background radio synthesizer for highway driving beats.
 * Generates chill cyber-highway lo-fi themes and retro-synthwave patterns.
 */

class BusRadioSynthesizer {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private currentStation: 'off' | 'lofi' | 'retro' | 'jazz' = 'off';
  
  // Synthesizer nodes
  private mainGain: GainNode | null = null;
  private sequencerInterval: any = null;
  private tempo: number = 100; // BPM
  private beatStep: number = 0;
  
  // Lo-Fi Chord Scales
  private lofiScale = [220, 261.63, 293.66, 329.63, 392.00, 440.00]; // A Minor Pentatonic
  // Synthwave scale
  private retroScale = [110, 130.81, 146.83, 164.81, 196.00, 220.00];

  constructor() {}

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

  public setStation(station: 'off' | 'lofi' | 'retro' | 'jazz') {
    this.initCtx();
    if (!this.ctx) return;

    if (station === 'off' || this.currentStation === station) {
      this.stop();
      this.currentStation = 'off';
      return;
    }

    this.stop();
    this.currentStation = station;
    this.isPlaying = true;
    
    // Create master gain
    this.mainGain = this.ctx.createGain();
    this.mainGain.gain.setValueAtTime(0.06, this.ctx.currentTime); // gentle background volume
    this.mainGain.connect(this.ctx.destination);

    this.tempo = station === 'lofi' ? 84 : 115;
    const intervalMs = (60 / this.tempo / 2) * 1000; // eighth notes

    this.sequencerInterval = setInterval(() => {
      this.playSequencerStep();
    }, intervalMs);
  }

  private playSequencerStep() {
    if (!this.ctx || !this.mainGain) return;
    const now = this.ctx.currentTime;
    
    // Drum beats
    if (this.beatStep % 4 === 0) {
      // Procedural Kick drum
      this.triggerKick(now);
    }
    if (this.beatStep % 4 === 2) {
      // Procedural Snare drop
      this.triggerSnare(now);
    }
    if (this.beatStep % 2 === 0 && Math.random() > 0.4) {
      // Hihat tick
      this.triggerHihat(now);
    }

    // Melodies or chords
    if (this.currentStation === 'lofi') {
      // Play a calming bass chord & random soft pluck
      if (this.beatStep % 8 === 0) {
        const root = this.lofiScale[Math.floor(Math.random() * 3)];
        this.triggerSynthPad(root, now, 2.0);
        this.triggerSynthPad(root * 1.5, now + 0.1, 1.8);
      }
      if (this.beatStep % 2 === 0 && Math.random() > 0.6) {
        // High melody bell note
        const bellNote = this.lofiScale[Math.floor(Math.random() * this.lofiScale.length)] * 2;
        this.triggerBell(bellNote, now);
      }
    } else if (this.currentStation === 'retro') {
      // Driving electronic bassline
      const bassNote = this.retroScale[this.beatStep % 4 === 0 ? 0 : (this.beatStep % 3 === 0 ? 1 : 2)];
      this.triggerBassline(bassNote, now);

      if (this.beatStep % 4 === 2 && Math.random() > 0.5) {
        const synthNote = this.retroScale[Math.floor(Math.random() * this.retroScale.length)] * 2;
        this.triggerRetroLead(synthNote, now);
      }
    }

    this.beatStep = (this.beatStep + 1) % 16;
  }

  private triggerKick(time: number) {
    if (!this.ctx || !this.mainGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);

    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.14);

    osc.connect(gain);
    gain.connect(this.mainGain);

    osc.start(time);
    osc.stop(time + 0.15);
  }

  private triggerSnare(time: number) {
    if (!this.ctx || !this.mainGain) return;
    
    // white noise burst + mid snap
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.mainGain);

    noise.start(time);
    noise.stop(time + 0.15);
  }

  private triggerHihat(time: number) {
    if (!this.ctx || !this.mainGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(10000, time);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, time);

    gain.gain.setValueAtTime(0.07, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.mainGain);

    osc.start(time);
    osc.stop(time + 0.06);
  }

  private triggerSynthPad(freq: number, time: number, duration: number) {
    if (!this.ctx || !this.mainGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, time);

    gain.gain.setValueAtTime(0.12, time);
    gain.gain.linearRampToValueAtTime(0.06, time + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.mainGain);

    osc.start(time);
    osc.stop(time + duration + 0.1);
  }

  private triggerBell(freq: number, time: number) {
    if (!this.ctx || !this.mainGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.09, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.75);

    osc.connect(gain);
    gain.connect(this.mainGain);

    osc.start(time);
    osc.stop(time + 0.82);
  }

  private triggerBassline(freq: number, time: number) {
    if (!this.ctx || !this.mainGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, time);

    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.mainGain);

    osc.start(time);
    osc.stop(time + 0.35);
  }

  private triggerRetroLead(freq: number, time: number) {
    if (!this.ctx || !this.mainGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.06, time);
    gain.gain.linearRampToValueAtTime(0.03, time + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.28);

    osc.connect(gain);
    gain.connect(this.mainGain);

    osc.start(time);
    osc.stop(time + 0.3);
  }

  public stop() {
    this.isPlaying = false;
    if (this.sequencerInterval) {
      clearInterval(this.sequencerInterval);
      this.sequencerInterval = null;
    }
    if (this.mainGain) {
      try {
        this.mainGain.disconnect();
      } catch(e){}
      this.mainGain = null;
    }
  }

  public getStationName(): string {
    return this.currentStation.toUpperCase();
  }
}

export const busRadio = new BusRadioSynthesizer();
export default busRadio;

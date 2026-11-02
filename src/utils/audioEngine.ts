import { SoundType } from '../types/metronome';

class MetronomeAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private pannerNode: StereoPannerNode | null = null;
  private volume: number = 0.8;
  private pan: number = 0; // -1 (Left) to 1 (Right)
  private muted: boolean = false;
  private soundType: SoundType = 'woodblock';

  constructor() {
    // Lazy initialization on first user interaction
  }

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);

      if (this.ctx.createStereoPanner) {
        this.pannerNode = this.ctx.createStereoPanner();
        this.pannerNode.pan.setValueAtTime(this.pan, this.ctx.currentTime);
        this.masterGain.connect(this.pannerNode);
        this.pannerNode.connect(this.ctx.destination);
      } else {
        this.masterGain.connect(this.ctx.destination);
      }
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    return this.ctx;
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setPan(panVal: number) {
    this.pan = Math.max(-1, Math.min(1, panVal));
    if (this.pannerNode && this.ctx) {
      this.pannerNode.pan.setValueAtTime(this.pan, this.ctx.currentTime);
    }
  }

  public getPan(): number {
    return this.pan;
  }

  public setSoundType(type: SoundType) {
    this.soundType = type;
  }

  public getSoundType(): SoundType {
    return this.soundType;
  }

  /**
   * Plays a synthesized beat sound at the specified AudioContext timestamp
   * @param time Web Audio context target time (or current time if omitted)
   * @param isAccent Whether this is the first beat of the measure (downbeat)
   * @param isSubdivision Whether this is a fractional subdivision tick
   */
  public playClick(time?: number, isAccent: boolean = false, isSubdivision: boolean = false) {
    if (this.muted) return;
    const ctx = this.initContext();
    const targetTime = time !== undefined ? Math.max(ctx.currentTime, time) : ctx.currentTime;

    switch (this.soundType) {
      case 'woodblock':
        this.playWoodblock(ctx, targetTime, isAccent, isSubdivision);
        break;
      case 'digital':
        this.playDigital(ctx, targetTime, isAccent, isSubdivision);
        break;
      case 'rimshot':
        this.playRimshot(ctx, targetTime, isAccent, isSubdivision);
        break;
      case 'hihat':
        this.playHiHat(ctx, targetTime, isAccent, isSubdivision);
        break;
      case 'cowbell':
        this.playCowbell(ctx, targetTime, isAccent, isSubdivision);
        break;
      default:
        this.playWoodblock(ctx, targetTime, isAccent, isSubdivision);
    }
  }

  // --- 1. Woodblock Synthesis ---
  private playWoodblock(ctx: AudioContext, time: number, isAccent: boolean, isSubdivision: boolean) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'bandpass';
    filter.Q.setValueAtTime(7, time);

    const baseFreq = isAccent ? 980 : isSubdivision ? 720 : 640;
    const decay = isAccent ? 0.07 : isSubdivision ? 0.035 : 0.055;
    const peakGain = isAccent ? 1.0 : isSubdivision ? 0.35 : 0.75;

    filter.frequency.setValueAtTime(baseFreq, time);
    filter.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, time + decay);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * 1.25, time);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, time + decay);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peakGain, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + decay);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(time);
    osc.stop(time + decay + 0.01);
  }

  // --- 2. Digital Beep Synthesis ---
  private playDigital(ctx: AudioContext, time: number, isAccent: boolean, isSubdivision: boolean) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const freq = isAccent ? 1760 : isSubdivision ? 1100 : 1320; // A6 or E6
    const decay = isAccent ? 0.06 : isSubdivision ? 0.025 : 0.045;
    const peakGain = isAccent ? 0.9 : isSubdivision ? 0.3 : 0.65;

    osc.type = isAccent ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peakGain, time + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + decay);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(time);
    osc.stop(time + decay + 0.01);
  }

  // --- 3. Rimshot / Stick Click ---
  private playRimshot(ctx: AudioContext, time: number, isAccent: boolean, isSubdivision: boolean) {
    // Noise burst
    const bufferSize = ctx.sampleRate * 0.05;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(2400, time);

    const noiseGain = ctx.createGain();
    const decay = isAccent ? 0.05 : isSubdivision ? 0.025 : 0.04;
    const peakGain = isAccent ? 0.8 : isSubdivision ? 0.25 : 0.55;

    noiseGain.gain.setValueAtTime(peakGain, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + decay);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain!);

    // Resonant wooden body tone
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    const bodyFreq = isAccent ? 780 : isSubdivision ? 580 : 620;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(bodyFreq, time);
    osc.frequency.exponentialRampToValueAtTime(bodyFreq * 0.7, time + decay);

    oscGain.gain.setValueAtTime(peakGain * 0.8, time);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, time + decay);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain!);

    whiteNoise.start(time);
    whiteNoise.stop(time + decay + 0.01);
    osc.start(time);
    osc.stop(time + decay + 0.01);
  }

  // --- 4. Hi-Hat Click ---
  private playHiHat(ctx: AudioContext, time: number, isAccent: boolean, isSubdivision: boolean) {
    const bufferSize = ctx.sampleRate * 0.07;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isAccent ? 9000 : 10500, time);
    filter.Q.setValueAtTime(4, time);

    const gain = ctx.createGain();
    const decay = isAccent ? 0.065 : isSubdivision ? 0.02 : 0.038;
    const peakGain = isAccent ? 0.85 : isSubdivision ? 0.3 : 0.6;

    gain.gain.setValueAtTime(peakGain, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + decay);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    noise.start(time);
    noise.stop(time + decay + 0.01);
  }

  // --- 5. 808 Style Cowbell ---
  private playCowbell(ctx: AudioContext, time: number, isAccent: boolean, isSubdivision: boolean) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    const mult = isAccent ? 1.25 : isSubdivision ? 0.85 : 1.0;
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(587 * mult, time);
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(845 * mult, time);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800 * mult, time);
    filter.Q.setValueAtTime(5, time);

    const decay = isAccent ? 0.08 : isSubdivision ? 0.03 : 0.055;
    const peak = isAccent ? 0.7 : isSubdivision ? 0.25 : 0.5;

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peak, time + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + decay);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + decay + 0.01);
    osc2.stop(time + decay + 0.01);
  }

  public getCurrentAudioTime(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }
}

export const audioEngine = new MetronomeAudioEngine();

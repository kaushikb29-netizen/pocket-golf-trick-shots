/**
 * Lightweight procedural Web Audio synthesizer for cartoon arcade mini-golf SFX & cozy music.
 * Gracefully degrades in environments without AudioContext or before user gesture.
 */
export type CelebrationTier =
  | 'hole_in_one'
  | 'eagle'
  | 'birdie'
  | 'par'
  | 'last_chance'
  | 'standard';

const MUSIC_PATTERN = [
  523.25, // C5
  659.25, // E5
  783.99, // G5
  659.25, // E5
  587.33, // D5
  698.46, // F5
  880.0, // A5
  698.46, // F5
  493.88, // B4
  587.33, // D5
  783.99, // G5
  587.33, // D5
  523.25, // C5
  659.25, // E5
  783.99, // G5
  1046.5, // C6
];

class GolfAudio {
  private ctx: AudioContext | null = null;
  private soundEnabled = true;
  private musicEnabled = true;
  private musicTimerId: number | null = null;
  private musicStep = 0;

  private ensureContext(forMusic = false): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!forMusic && !this.soundEnabled) return null;
    if (forMusic && !this.musicEnabled) return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      try {
        this.ctx = new AudioCtx();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (!enabled) {
      this.stopMusicLoop();
    } else if (this.ctx && this.ctx.state === 'running') {
      this.startMusicLoop();
    }
  }

  public isMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  /** Legacy mute helper maps cleanly to sound + music together */
  public setMuted(muted: boolean): void {
    this.setSoundEnabled(!muted);
    this.setMusicEnabled(!muted);
  }

  public isMuted(): boolean {
    return !this.soundEnabled && !this.musicEnabled;
  }

  /** Call on user gesture to unlock audio and start gentle background music if enabled */
  public unlockAndStartMusic(): void {
    if (!this.musicEnabled) return;
    const ctx = this.ensureContext(true);
    if (ctx) {
      this.startMusicLoop();
    }
  }

  private startMusicLoop(): void {
    if (typeof window === 'undefined' || !this.musicEnabled) return;
    if (this.musicTimerId !== null) return;

    const scheduleNote = () => {
      if (!this.musicEnabled) {
        this.stopMusicLoop();
        return;
      }
      const ctx = this.ctx;
      if (!ctx || ctx.state !== 'running') return;

      const freq = MUSIC_PATTERN[this.musicStep % MUSIC_PATTERN.length];
      this.musicStep = (this.musicStep + 1) % MUSIC_PATTERN.length;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * 0.5, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.022, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.42);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    };

    this.musicTimerId = window.setInterval(scheduleNote, 460);
  }

  public stopMusicLoop(): void {
    if (this.musicTimerId !== null && typeof window !== 'undefined') {
      window.clearInterval(this.musicTimerId);
      this.musicTimerId = null;
    }
  }

  /** Crisp lightweight tactile button click for menus & HUD */
  public playButtonClick(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (this.musicEnabled) this.startMusicLoop();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.04);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  /** Bright two-tone pluck when selecting a course or hole card */
  public playCardSelect(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (this.musicEnabled) this.startMusicLoop();

    const now = ctx.currentTime;
    const notes = [440, 622.25];
    notes.forEach((freq, i) => {
      const t = now + i * 0.042;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.095);
    });
  }

  /** Layered putter strike: crisp club click + warm power-scaled thump */
  public playPutt(power: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (this.musicEnabled) this.startMusicLoop();

    const now = ctx.currentTime;
    const clampedPower = Math.max(0.08, Math.min(1, power));
    const pitchJitter = 0.95 + Math.random() * 0.1;

    // Warm resonant body thump
    const bodyOsc = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    bodyOsc.type = 'triangle';
    const baseFreq = (175 + clampedPower * 135) * pitchJitter;
    bodyOsc.frequency.setValueAtTime(baseFreq, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(68, now + 0.085);

    const bodyVol = 0.12 + clampedPower * 0.2;
    bodyGain.gain.setValueAtTime(bodyVol, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

    bodyOsc.connect(bodyGain);
    bodyGain.connect(ctx.destination);
    bodyOsc.start(now);
    bodyOsc.stop(now + 0.1);

    // Crisp putter-face contact transient
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'sine';
    clickOsc.frequency.setValueAtTime((820 + clampedPower * 420) * pitchJitter, now);
    clickOsc.frequency.exponentialRampToValueAtTime(280, now + 0.024);

    clickGain.gain.setValueAtTime(0.06 + clampedPower * 0.09, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);

    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start(now);
    clickOsc.stop(now + 0.032);
  }

  public playWoodBounce(impactSpeed: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const intensity = Math.min(1, impactSpeed / 650);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const jitter = 0.92 + Math.random() * 0.16;

    osc.type = 'sine';
    osc.frequency.setValueAtTime((315 + intensity * 195) * jitter, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.065);

    gain.gain.setValueAtTime(0.06 + intensity * 0.17, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.075);
  }

  /** Playful harmonic bumper boing with crisp upper shimmer */
  public playBumperBounce(impactSpeed: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const intensity = Math.min(1, impactSpeed / 550);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(235, now);
    osc.frequency.exponentialRampToValueAtTime(530 + intensity * 150, now + 0.085);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.19);

    gain.gain.setValueAtTime(0.14 + intensity * 0.13, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.21);

    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmer.type = 'triangle';
    shimmer.frequency.setValueAtTime(760 + intensity * 240, now + 0.012);
    shimmer.frequency.exponentialRampToValueAtTime(1020 + intensity * 180, now + 0.09);

    shimmerGain.gain.setValueAtTime(0.05 + intensity * 0.06, now + 0.012);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    shimmer.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);
    shimmer.start(now + 0.012);
    shimmer.stop(now + 0.14);
  }

  /** Subtle cup rattle + tailored celebratory arpeggio by shot quality */
  public playCupSink(tier: CelebrationTier = 'standard'): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const plunk = ctx.createOscillator();
    const plunkGain = ctx.createGain();
    plunk.type = 'sine';
    plunk.frequency.setValueAtTime(240, now);
    plunk.frequency.exponentialRampToValueAtTime(115, now + 0.07);
    plunkGain.gain.setValueAtTime(0.14, now);
    plunkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    plunk.connect(plunkGain);
    plunkGain.connect(ctx.destination);
    plunk.start(now);
    plunk.stop(now + 0.085);

    let notes: number[];
    let step = 0.072;
    let hold = 0.28;

    if (tier === 'hole_in_one') {
      notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
      step = 0.065;
      hold = 0.44;
    } else if (tier === 'last_chance') {
      // Heroic dramatic clutch save arpeggio
      notes = [440, 554.37, 659.25, 880, 1108.73, 1318.5];
      step = 0.062;
      hold = 0.4;
    } else if (tier === 'eagle') {
      notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      step = 0.07;
      hold = 0.36;
    } else if (tier === 'birdie') {
      notes = [523.25, 659.25, 783.99, 1046.5];
      step = 0.072;
      hold = 0.32;
    } else {
      notes = [440, 554.37, 659.25];
      step = 0.078;
      hold = 0.25;
    }

    notes.forEach((freq, idx) => {
      const t = now + 0.05 + idx * step;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(tier === 'hole_in_one' || tier === 'last_chance' ? 0.16 : 0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + hold);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + hold + 0.02);
    });

    if (tier === 'hole_in_one' || tier === 'eagle' || tier === 'last_chance') {
      const chordTime = now + 0.05 + (notes.length - 1) * step;
      const chordFreqs =
        tier === 'hole_in_one' || tier === 'last_chance'
          ? [523.25, 783.99, 1046.5]
          : [523.25, 783.99];
      chordFreqs.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, chordTime);
        gain.gain.setValueAtTime(0.08, chordTime);
        gain.gain.exponentialRampToValueAtTime(0.001, chordTime + 0.55);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(chordTime);
        osc.stop(chordTime + 0.57);
      });
    }
  }

  /** Sympathetic soft descending arcade cadence when player runs out of strokes */
  public playOutOfStrokes(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [392.0, 349.23, 311.13, 261.63];
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.11;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.94, t + 0.22);
      gain.gain.setValueAtTime(0.13, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.28);
    });
  }

  public playVictoryFanfare(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.085;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.48);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.5);
    });

    const resolveAt = now + notes.length * 0.085;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, resolveAt);
      gain.gain.setValueAtTime(0.07, resolveAt);
      gain.gain.exponentialRampToValueAtTime(0.001, resolveAt + 0.65);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(resolveAt);
      osc.stop(resolveAt + 0.68);
    });
  }

  public playWaterSplash(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(135, now + 0.16);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.23);

    const pop = ctx.createOscillator();
    const popGain = ctx.createGain();
    pop.type = 'triangle';
    pop.frequency.setValueAtTime(280, now + 0.08);
    pop.frequency.exponentialRampToValueAtTime(520, now + 0.17);
    popGain.gain.setValueAtTime(0.11, now + 0.08);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    pop.connect(popGain);
    popGain.connect(ctx.destination);
    pop.start(now + 0.08);
    pop.stop(now + 0.21);
  }

  public playGateBounce(impactSpeed: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const intensity = Math.min(1, impactSpeed / 600);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(520 + intensity * 240, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.09);

    gain.gain.setValueAtTime(0.06 + intensity * 0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playPortalWarp(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.22);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }
}

export const golfAudio = new GolfAudio();

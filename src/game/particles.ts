import type { CelebrationTier } from './audio';
import type { LevelTheme } from './types';

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  shape: 'circle' | 'confetti' | 'ring' | 'sparkle';
  rotation: number;
  vRot: number;
  drag: number;
  ringSpeed: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
  radius: number;
}

const POOL_SIZE = 180;
const TRAIL_SIZE = 22;

const CONFETTI_COLORS = ['#FF595E', '#FFCA3A', '#34D399', '#38BDF8', '#FF9F1C', '#FFFFFF'];
const GOLD_SPARKLE_COLORS = ['#FDE047', '#FBBF24', '#FFFFFF', '#FF595E', '#38BDF8'];

export class ParticlePool {
  public readonly items: Particle[];
  public readonly trail: TrailPoint[];
  private cursor = 0;
  private trailTimer = 0;

  constructor() {
    this.items = Array.from({ length: POOL_SIZE }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 4,
      life: 0,
      maxLife: 0.5,
      color: '#ffffff',
      shape: 'circle',
      rotation: 0,
      vRot: 0,
      drag: 3,
      ringSpeed: 130,
    }));

    this.trail = Array.from({ length: TRAIL_SIZE }, () => ({
      x: 0,
      y: 0,
      alpha: 0,
      radius: 4,
    }));
  }

  public clear(): void {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.items[i].active = false;
    }
    for (let i = 0; i < TRAIL_SIZE; i++) {
      this.trail[i].alpha = 0;
    }
  }

  private spawn(
    x: number,
    y: number,
    vx: number,
    vy: number,
    size: number,
    maxLife: number,
    color: string,
    shape: Particle['shape'],
    drag = 3.2,
    ringSpeed = 130
  ): void {
    const p = this.items[this.cursor];
    this.cursor = (this.cursor + 1) % POOL_SIZE;
    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.size = size;
    p.life = maxLife;
    p.maxLife = maxLife;
    p.color = color;
    p.shape = shape;
    p.rotation = Math.random() * Math.PI * 2;
    p.vRot = (Math.random() - 0.5) * 12;
    p.drag = drag;
    p.ringSpeed = ringSpeed;
  }

  public emitPuttPuff(
    x: number,
    y: number,
    dirX: number,
    dirY: number,
    power: number,
    theme: LevelTheme = 'resort'
  ): void {
    // Soft launch ring right at the ball
    const ringColor =
      theme === 'neon'
        ? '#38BDF8'
        : theme === 'frost'
        ? '#E0F7FF'
        : '#FFFFFF';
    this.spawn(x, y, 0, 0, 7, 0.22, ringColor, 'ring', 0, 88 + power * 42);

    const count = 4 + Math.round(power * 5);
    const baseAngle = Math.atan2(-dirY, -dirX);
    const primary =
      theme === 'neon'
        ? '#7DD3FC'
        : theme === 'frost'
        ? '#BAE6FD'
        : theme === 'beach'
        ? '#FDE68A'
        : '#A7F3D0';
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 1.15;
      const spd = (55 + Math.random() * 110) * (0.45 + power * 0.7);
      const a = baseAngle + spread;
      const color = i % 2 === 0 ? primary : '#FFFFFF';
      this.spawn(
        x,
        y,
        Math.cos(a) * spd,
        Math.sin(a) * spd,
        2.8 + Math.random() * 3.2,
        0.24 + Math.random() * 0.18,
        color,
        'circle',
        4.5
      );
    }
  }

  public emitWallSpark(
    x: number,
    y: number,
    nx: number,
    ny: number,
    speed: number,
    theme: LevelTheme = 'resort'
  ): void {
    const intensity = Math.min(1, speed / 600);
    // Soft expanding impact ring at wall contact point
    const ringColor =
      theme === 'neon'
        ? '#38BDF8'
        : theme === 'frost'
        ? '#BAE6FD'
        : '#FEF3C7';
    this.spawn(x, y, 0, 0, 5, 0.24, ringColor, 'ring', 0, 72 + intensity * 64);

    const count = 5 + Math.round(intensity * 6);
    const baseAngle = Math.atan2(ny, nx);
    const accent =
      theme === 'neon'
        ? '#F472B6'
        : theme === 'frost'
        ? '#7DD3FC'
        : '#FDE68A';
    for (let i = 0; i < count; i++) {
      const a = baseAngle + (Math.random() - 0.5) * 1.45;
      const spd = (60 + Math.random() * 135) * (0.45 + intensity * 0.85);
      const color = i % 2 === 0 ? accent : '#FFFFFF';
      this.spawn(
        x,
        y,
        Math.cos(a) * spd,
        Math.sin(a) * spd,
        2.3 + Math.random() * 2.8,
        0.2 + Math.random() * 0.18,
        color,
        'circle',
        4.3
      );
    }
  }

  public emitBumperBurst(x: number, y: number, color: string): void {
    // Crisp double expanding impact ring
    this.spawn(x, y, 0, 0, 12, 0.34, '#FFE066', 'ring', 0, 145);
    this.spawn(x, y, 0, 0, 6, 0.24, '#FFFFFF', 'ring', 0, 105);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + Math.random() * 0.25;
      const spd = 95 + Math.random() * 125;
      this.spawn(
        x,
        y,
        Math.cos(a) * spd,
        Math.sin(a) * spd,
        3.2 + Math.random() * 3,
        0.28 + Math.random() * 0.2,
        i % 2 === 0 ? color : '#FFF3B0',
        'circle',
        3.6
      );
    }
  }

  public emitHoleCelebration(
    x: number,
    y: number,
    tier: CelebrationTier = 'standard'
  ): void {
    // Smooth concentric cup entry ripples
    this.spawn(x, y, 0, 0, 10, 0.46, '#FFFFFF', 'ring', 0, 88);
    this.spawn(
      x,
      y,
      0,
      0,
      14,
      0.56,
      tier === 'hole_in_one' || tier === 'eagle' ? '#FACC15' : '#34D399',
      'ring',
      0,
      132
    );
    if (tier === 'hole_in_one' || tier === 'eagle') {
      this.spawn(x, y, 0, 0, 18, 0.66, '#FF595E', 'ring', 0, 175);
    }

    const confettiCount =
      tier === 'hole_in_one'
        ? 52
        : tier === 'eagle'
        ? 44
        : tier === 'birdie'
        ? 36
        : 24;

    const palette =
      tier === 'hole_in_one' || tier === 'eagle' ? GOLD_SPARKLE_COLORS : CONFETTI_COLORS;

    for (let i = 0; i < confettiCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd =
        (tier === 'hole_in_one' ? 105 : 80) +
        Math.random() * (tier === 'hole_in_one' ? 255 : 210);
      const color = palette[i % palette.length];
      const isSparkle =
        (tier === 'hole_in_one' || tier === 'eagle' || tier === 'birdie') && i % 4 === 0;
      this.spawn(
        x,
        y,
        Math.cos(a) * spd,
        Math.sin(a) * spd - 36,
        isSparkle ? 5.5 + Math.random() * 4 : 4.8 + Math.random() * 4.2,
        0.65 + Math.random() * 0.55,
        color,
        isSparkle ? 'sparkle' : 'confetti',
        2.15
      );
    }
  }

  public emitWaterSplash(x: number, y: number): void {
    this.spawn(x, y, 0, 0, 10, 0.45, '#E0F2FE', 'ring', 0, 115);
    this.spawn(x, y, 0, 0, 4, 0.34, '#7DD3FC', 'ring', 0, 90);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + Math.random() * 0.2;
      const spd = 65 + Math.random() * 120;
      const color = i % 2 === 0 ? '#E0F2FE' : '#38BDF8';
      this.spawn(
        x,
        y,
        Math.cos(a) * spd,
        Math.sin(a) * spd,
        3 + Math.random() * 3.5,
        0.34 + Math.random() * 0.22,
        color,
        'circle',
        3.4
      );
    }
  }

  public update(dt: number, ballX: number, ballY: number, ballSpeed: number, ballHoled: boolean): void {
    // Update particles in place
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = this.items[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      if (p.shape === 'ring') {
        p.size += dt * p.ringSpeed;
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const damp = Math.exp(-p.drag * dt);
        p.vx *= damp;
        p.vy *= damp;
        p.rotation += p.vRot * dt;
      }
    }

    // Fade existing trail gently
    for (let i = 0; i < TRAIL_SIZE; i++) {
      if (this.trail[i].alpha > 0) {
        this.trail[i].alpha = Math.max(0, this.trail[i].alpha - dt * 2.8);
      }
    }

    // Emit smooth subtle fading wake even on medium/gentle rolling putts
    if (!ballHoled && ballSpeed > 52) {
      this.trailTimer += dt;
      if (this.trailTimer >= 0.015) {
        this.trailTimer = 0;
        for (let i = TRAIL_SIZE - 1; i > 0; i--) {
          this.trail[i].x = this.trail[i - 1].x;
          this.trail[i].y = this.trail[i - 1].y;
          this.trail[i].alpha = this.trail[i - 1].alpha;
          this.trail[i].radius = this.trail[i - 1].radius;
        }
        const speedNorm = Math.min(1, (ballSpeed - 45) / 600);
        this.trail[0].x = ballX;
        this.trail[0].y = ballY;
        this.trail[0].alpha = 0.26 + speedNorm * 0.44;
        this.trail[0].radius = 4.2 + speedNorm * 3.8;
      }
    }
  }
}

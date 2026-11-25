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
  shape: 'circle' | 'confetti' | 'ring';
  rotation: number;
  vRot: number;
  drag: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

const POOL_SIZE = 140;
const TRAIL_SIZE = 18;

const CONFETTI_COLORS = ['#FF595E', '#FFCA3A', '#8AC926', '#1982C4', '#FF9F1C', '#FFFFFF'];

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
    }));

    this.trail = Array.from({ length: TRAIL_SIZE }, () => ({
      x: 0,
      y: 0,
      alpha: 0,
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
    drag = 3.2
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
  }

  public emitPuttPuff(x: number, y: number, dirX: number, dirY: number, power: number): void {
    const count = 4 + Math.round(power * 5);
    const baseAngle = Math.atan2(-dirY, -dirX);
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 1.15;
      const spd = (55 + Math.random() * 110) * (0.45 + power * 0.7);
      const a = baseAngle + spread;
      const color = i % 2 === 0 ? '#A7F3D0' : '#FFFFFF';
      this.spawn(
        x,
        y,
        Math.cos(a) * spd,
        Math.sin(a) * spd,
        3 + Math.random() * 3.5,
        0.26 + Math.random() * 0.2,
        color,
        'circle',
        4.5
      );
    }
  }

  public emitWallSpark(x: number, y: number, nx: number, ny: number, speed: number): void {
    const intensity = Math.min(1, speed / 600);
    const count = 4 + Math.round(intensity * 6);
    const baseAngle = Math.atan2(ny, nx);
    for (let i = 0; i < count; i++) {
      const a = baseAngle + (Math.random() - 0.5) * 1.4;
      const spd = (65 + Math.random() * 130) * (0.5 + intensity * 0.8);
      const color = i % 2 === 0 ? '#FDE68A' : '#FFFFFF';
      this.spawn(
        x,
        y,
        Math.cos(a) * spd,
        Math.sin(a) * spd,
        2.5 + Math.random() * 3,
        0.22 + Math.random() * 0.18,
        color,
        'circle',
        4.2
      );
    }
  }

  public emitBumperBurst(x: number, y: number, color: string): void {
    // Expanding shock ring
    this.spawn(x, y, 0, 0, 12, 0.34, '#FFE066', 'ring', 0);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + Math.random() * 0.25;
      const spd = 95 + Math.random() * 125;
      this.spawn(
        x,
        y,
        Math.cos(a) * spd,
        Math.sin(a) * spd,
        3.5 + Math.random() * 3,
        0.3 + Math.random() * 0.2,
        i % 2 === 0 ? color : '#FFF3B0',
        'circle',
        3.5
      );
    }
  }

  public emitHoleCelebration(x: number, y: number): void {
    this.spawn(x, y, 0, 0, 14, 0.48, '#FFD93D', 'ring', 0);
    for (let i = 0; i < 34; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 80 + Math.random() * 230;
      const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      this.spawn(
        x,
        y,
        Math.cos(a) * spd,
        Math.sin(a) * spd - 35,
        5 + Math.random() * 4.5,
        0.7 + Math.random() * 0.55,
        color,
        'confetti',
        2.1
      );
    }
  }

  public emitWaterSplash(x: number, y: number): void {
    this.spawn(x, y, 0, 0, 10, 0.45, '#E0F2FE', 'ring', 0);
    this.spawn(x, y, 0, 0, 4, 0.34, '#7DD3FC', 'ring', 0);
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
        p.size += dt * 135;
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const damp = Math.exp(-p.drag * dt);
        p.vx *= damp;
        p.vy *= damp;
        p.rotation += p.vRot * dt;
      }
    }

    // Update ball speed trail
    for (let i = 0; i < TRAIL_SIZE; i++) {
      if (this.trail[i].alpha > 0) {
        this.trail[i].alpha = Math.max(0, this.trail[i].alpha - dt * 3.4);
      }
    }

    if (!ballHoled && ballSpeed > 130) {
      this.trailTimer += dt;
      if (this.trailTimer >= 0.018) {
        this.trailTimer = 0;
        // Shift trail
        for (let i = TRAIL_SIZE - 1; i > 0; i--) {
          this.trail[i].x = this.trail[i - 1].x;
          this.trail[i].y = this.trail[i - 1].y;
          this.trail[i].alpha = this.trail[i - 1].alpha;
        }
        this.trail[0].x = ballX;
        this.trail[0].y = ballY;
        this.trail[0].alpha = Math.min(0.7, (ballSpeed - 120) / 700);
      }
    }
  }
}

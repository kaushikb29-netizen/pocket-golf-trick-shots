import {
  BallState,
  Bumper,
  CollisionEvent,
  ConveyorBelt,
  ForceZone,
  LevelDefinition,
  MovingGate,
  PortalPair,
  RotatingObstacle,
  ScoreLabelInfo,
  SimState,
  SurfaceZone,
  Vec2,
} from './types';
import { BALL_RADIUS } from './levels';

export const MAX_DRAG_DISTANCE = 175;
export const MIN_DRAG_CANCEL = 14;
export const MAX_LAUNCH_SPEED = 980;
export const MIN_LAUNCH_SPEED = 75;
export const WALL_RESTITUTION = 0.78;
export const ROTATOR_RESTITUTION = 0.82;
export const STOP_SPEED_THRESHOLD = 14;
export const HOLE_CAPTURE_MAX_SPEED = 470;
export const PHYSICS_SUBSTEPS = 6;

export function createInitialSimState(level: LevelDefinition): SimState {
  return {
    ball: {
      x: level.tee.x,
      y: level.tee.y,
      vx: 0,
      vy: 0,
      radius: BALL_RADIUS,
      isMoving: false,
      lastSafePos: { x: level.tee.x, y: level.tee.y },
      teleportCooldown: 0,
      sinkProgress: 0,
      holed: false,
      scaleX: 1,
      scaleY: 1,
      stretchAngle: 0,
      rollDistance: 0,
    },
    rotatorAngles: level.rotators.map((r) => r.initialAngle),
    elapsedTime: 0,
    bumperPulse: {},
    jellySplashCooldown: 0,
  };
}

export function pointInSurfaceZone(x: number, y: number, zone: SurfaceZone): boolean {
  let dx = x - zone.x;
  let dy = y - zone.y;
  if (zone.angle) {
    const cos = Math.cos(-zone.angle);
    const sin = Math.sin(-zone.angle);
    const rxRot = dx * cos - dy * sin;
    const ryRot = dx * sin + dy * cos;
    dx = rxRot;
    dy = ryRot;
  }
  const rx = zone.w / 2;
  const ry = zone.h / 2;
  if (zone.shape === 'ellipse') {
    const nx = dx / rx;
    const ny = dy / ry;
    return nx * nx + ny * ny <= 1;
  }
  const cr = Math.min(zone.radius ?? 0, rx, ry);
  const innerX = rx - cr;
  const innerY = ry - cr;
  const ax = Math.max(0, Math.abs(dx) - innerX);
  const ay = Math.max(0, Math.abs(dy) - innerY);
  return ax * ax + ay * ay <= cr * cr;
}

export function getActiveHazard(
  x: number,
  y: number,
  level: LevelDefinition
): SurfaceZone | null {
  const hazards = level.hazards;
  if (!hazards || hazards.length === 0) return null;
  let matched: SurfaceZone | null = null;
  for (const h of hazards) {
    if (pointInSurfaceZone(x, y, h)) {
      if (h.kind === 'water') return h;
      if (!matched || h.kind === 'jelly' || h.kind === 'sand') {
        matched = h;
      }
    }
  }
  return matched;
}

/**
 * Evaluate a moving gate's smooth periodic open/close state at a given simulation time.
 * Includes comfortable open & closed dwell windows so timing shots feels crisp and fair.
 */
export function evaluateGateState(
  gate: MovingGate,
  elapsedTime: number
): { x: number; y: number; vx: number; vy: number; openAmount: number } {
  const evalOpen = (t: number) => {
    const raw = Math.sin((Math.PI * 2 * t) / gate.period + gate.phaseOffset);
    const clamped = Math.max(0, Math.min(1, (raw + 0.55) / 1.1));
    return clamped * clamped * (3 - 2 * clamped);
  };

  const openAmount = evalOpen(elapsedTime);
  const eps = 0.005;
  const openNext = evalOpen(elapsedTime + eps);
  const rate = (openNext - openAmount) / eps;

  const dx = gate.openX - gate.closedX;
  const dy = gate.openY - gate.closedY;

  return {
    x: gate.closedX + dx * openAmount,
    y: gate.closedY + dy * openAmount,
    vx: dx * rate,
    vy: dy * rate,
    openAmount,
  };
}

export const PORTAL_COOLDOWN_SECONDS = 0.48;

/**
 * Lightweight 2D radial force zone calculation:
 * - 'attract' (blue): gently pulls moving ball toward zone center
 * - 'repel' (red): gently pushes moving ball away from zone center
 */
function applyForceZones(ball: BallState, zones: ForceZone[] | undefined, subDt: number): void {
  if (!zones || zones.length === 0 || !ball.isMoving) return;

  for (const zone of zones) {
    const dx = zone.x - ball.x;
    const dy = zone.y - ball.y;
    const dist = Math.hypot(dx, dy);
    if (dist >= zone.radius || dist < 1e-4) continue;

    // Smooth sinusoidal falloff from edge (0) to core (1) with gentle center damping
    const t = 1 - dist / zone.radius;
    const falloff = Math.sin(t * Math.PI * 0.5);
    const coreDamp = Math.min(1, dist / 14);
    const accel = zone.strength * falloff * coreDamp;
    const sign = zone.kind === 'attract' ? 1 : -1;

    ball.vx += (dx / dist) * sign * accel * subDt;
    ball.vy += (dy / dist) * sign * accel * subDt;
  }

  // Keep force zone acceleration noticeable yet always controllable
  const sp = Math.hypot(ball.vx, ball.vy);
  const cap = MAX_LAUNCH_SPEED * 1.05;
  if (sp > cap) {
    ball.vx = (ball.vx / sp) * cap;
    ball.vy = (ball.vy / sp) * cap;
  }
}

export function pointInConveyor(x: number, y: number, belt: ConveyorBelt): boolean {
  let dx = x - belt.x;
  let dy = y - belt.y;
  if (belt.angle) {
    const cos = Math.cos(-belt.angle);
    const sin = Math.sin(-belt.angle);
    const rx = dx * cos - dy * sin;
    const ry = dx * sin + dy * cos;
    dx = rx;
    dy = ry;
  }
  return Math.abs(dx) <= belt.w / 2 && Math.abs(dy) <= belt.h / 2;
}

export function getActiveConveyor(
  x: number,
  y: number,
  level: LevelDefinition
): ConveyorBelt | null {
  const conveyors = level.conveyors;
  if (!conveyors || conveyors.length === 0) return null;
  for (const belt of conveyors) {
    if (pointInConveyor(x, y, belt)) {
      return belt;
    }
  }
  return null;
}

/**
 * Gently accelerates and steers the ball along an active conveyor belt's direction.
 * Wakes a slow/resting ball on the belt so it glides cleanly off the exit onto open turf,
 * while tapering acceleration past the belt's cruise speed so shots stay controllable.
 */
function applyConveyors(
  ball: BallState,
  conveyors: ConveyorBelt[] | undefined,
  subDt: number
): ConveyorBelt | null {
  if (!conveyors || conveyors.length === 0) return null;

  let activeBelt: ConveyorBelt | null = null;
  for (const belt of conveyors) {
    if (!pointInConveyor(ball.x, ball.y, belt)) continue;
    activeBelt = belt;
    const len = Math.hypot(belt.dirX, belt.dirY);
    if (len < 1e-4) continue;
    const ux = belt.dirX / len;
    const uy = belt.dirY / len;

    ball.isMoving = true;
    const alongSpeed = ball.vx * ux + ball.vy * uy;
    const targetSpeed = belt.targetSpeed ?? 175;
    const accel = alongSpeed < targetSpeed ? belt.strength : belt.strength * 0.25;
    ball.vx += ux * accel * subDt;
    ball.vy += uy * accel * subDt;
  }

  if (activeBelt) {
    const sp = Math.hypot(ball.vx, ball.vy);
    const cap = MAX_LAUNCH_SPEED * 1.05;
    if (sp > cap) {
      ball.vx = (ball.vx / sp) * cap;
      ball.vy = (ball.vy / sp) * cap;
    }
  }

  return activeBelt;
}

/**
 * Check if moving ball entered a linked teleportation portal and warp it to the paired exit.
 */
function checkPortalTeleport(
  ball: BallState,
  portals: PortalPair[] | undefined
): CollisionEvent | null {
  if (!portals || portals.length === 0 || !ball.isMoving || ball.teleportCooldown > 0) {
    return null;
  }

  for (const pair of portals) {
    const distA = Math.hypot(ball.x - pair.a.x, ball.y - pair.a.y);
    const distB = Math.hypot(ball.x - pair.b.x, ball.y - pair.b.y);
    const triggerA = pair.a.radius + ball.radius * 0.45;
    const triggerB = pair.b.radius + ball.radius * 0.45;

    let entry = null;
    let exit = null;
    if (distA < triggerA) {
      entry = pair.a;
      exit = pair.b;
    } else if (distB < triggerB) {
      entry = pair.b;
      exit = pair.a;
    }

    if (entry && exit) {
      const speed = Math.hypot(ball.vx, ball.vy);
      const dirX = speed > 1e-4 ? ball.vx / speed : 1;
      const dirY = speed > 1e-4 ? ball.vy / speed : 0;
      const preservedSpeed = Math.max(135, Math.min(speed, MAX_LAUNCH_SPEED));

      ball.vx = dirX * preservedSpeed;
      ball.vy = dirY * preservedSpeed;
      ball.x = exit.x + dirX * (exit.radius * 0.35);
      ball.y = exit.y + dirY * (exit.radius * 0.35);
      ball.teleportCooldown = PORTAL_COOLDOWN_SECONDS;
      ball.stretchAngle = Math.atan2(dirY, dirX);
      ball.scaleX = 1.26;
      ball.scaleY = 0.76;

      return {
        type: 'portal',
        x: entry.x,
        y: entry.y,
        exitX: exit.x,
        exitY: exit.y,
        nx: dirX,
        ny: dirY,
        impactSpeed: preservedSpeed,
        id: pair.id,
      };
    }
  }

  return null;
}

/**
 * Convert a drag-back vector (from ball/anchor toward pointer) into shot launch velocity.
 * Dragging backward from the ball aims in the opposite direction.
 */
export function computeShotFromDrag(
  anchor: Vec2,
  current: Vec2
): {
  valid: boolean;
  power: number; // 0..1
  vx: number;
  vy: number;
  aimDir: Vec2;
  dragDist: number;
} {
  const dx = anchor.x - current.x;
  const dy = anchor.y - current.y;
  const dist = Math.hypot(dx, dy);

  if (dist < MIN_DRAG_CANCEL) {
    return {
      valid: false,
      power: 0,
      vx: 0,
      vy: 0,
      aimDir: { x: 1, y: 0 },
      dragDist: dist,
    };
  }

  const clamped = Math.min(dist, MAX_DRAG_DISTANCE);
  const power = (clamped - MIN_DRAG_CANCEL) / (MAX_DRAG_DISTANCE - MIN_DRAG_CANCEL);
  // Slight quadratic ease gives fine precision on gentle putts while reaching full speed on long drags
  const speed = MIN_LAUNCH_SPEED + Math.pow(power, 1.15) * (MAX_LAUNCH_SPEED - MIN_LAUNCH_SPEED);
  const nx = dx / dist;
  const ny = dy / dist;

  return {
    valid: true,
    power,
    vx: nx * speed,
    vy: ny * speed,
    aimDir: { x: nx, y: ny },
    dragDist: clamped,
  };
}

export function launchBall(ball: BallState, vx: number, vy: number): void {
  ball.lastSafePos = { x: ball.x, y: ball.y };
  ball.vx = vx;
  ball.vy = vy;
  ball.isMoving = true;
  ball.stretchAngle = Math.atan2(vy, vx);
  const speedRatio = Math.min(1, Math.hypot(vx, vy) / MAX_LAUNCH_SPEED);
  ball.scaleX = 1 + 0.24 * speedRatio;
  ball.scaleY = 1 - 0.18 * speedRatio;
}

/**
 * Resolve circle vs oriented bounding box (OBB).
 * Optionally supports surface velocity at contact point (for rotating blades).
 */
function collideCircleOBB(
  ball: BallState,
  cx: number,
  cy: number,
  w: number,
  h: number,
  angle: number,
  restitution: number,
  angularVelocity = 0,
  pivotX = cx,
  pivotY = cy,
  linearVx = 0,
  linearVy = 0
): { hit: boolean; nx: number; ny: number; impactSpeed: number; cx: number; cy: number } {
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);

  // Transform ball center into OBB local space
  const relX = ball.x - cx;
  const relY = ball.y - cy;
  const localX = relX * cos - relY * sin;
  const localY = relX * sin + relY * cos;

  const halfW = w / 2;
  const halfH = h / 2;

  const clampedX = Math.max(-halfW, Math.min(halfW, localX));
  const clampedY = Math.max(-halfH, Math.min(halfH, localY));

  let diffX = localX - clampedX;
  let diffY = localY - clampedY;
  const distSq = diffX * diffX + diffY * diffY;

  if (distSq >= ball.radius * ball.radius) {
    return { hit: false, nx: 0, ny: 0, impactSpeed: 0, cx: 0, cy: 0 };
  }

  let localNx = 0;
  let localNy = 0;
  let penetration = 0;

  if (distSq > 1e-8) {
    const dist = Math.sqrt(distSq);
    localNx = diffX / dist;
    localNy = diffY / dist;
    penetration = ball.radius - dist;
  } else {
    // Ball center is inside the OBB — push out along shallowest axis
    const overlapX = halfW - Math.abs(localX);
    const overlapY = halfH - Math.abs(localY);
    if (overlapX < overlapY) {
      localNx = localX >= 0 ? 1 : -1;
      localNy = 0;
      penetration = overlapX + ball.radius;
    } else {
      localNx = 0;
      localNy = localY >= 0 ? 1 : -1;
      penetration = overlapY + ball.radius;
    }
  }

  // Transform normal and contact point back to world space
  const cosW = Math.cos(angle);
  const sinW = Math.sin(angle);
  const nx = localNx * cosW - localNy * sinW;
  const ny = localNx * sinW + localNy * cosW;

  const contactX = cx + (clampedX * cosW - clampedY * sinW);
  const contactY = cy + (clampedX * sinW + clampedY * cosW);

  // Push ball out of collision
  ball.x += nx * (penetration + 0.05);
  ball.y += ny * (penetration + 0.05);

  // Surface velocity at contact point due to rotation + linear translation
  const rx = contactX - pivotX;
  const ry = contactY - pivotY;
  const surfVx = -angularVelocity * ry + linearVx;
  const surfVy = angularVelocity * rx + linearVy;

  const relVx = ball.vx - surfVx;
  const relVy = ball.vy - surfVy;
  const relVn = relVx * nx + relVy * ny;

  if (relVn < 0) {
    const impulse = -(1 + restitution) * relVn;
    ball.vx += impulse * nx;
    ball.vy += impulse * ny;

    // Slight tangential transfer from spinning paddle for realistic bat feel
    if (angularVelocity !== 0) {
      const tx = -ny;
      const ty = nx;
      const relVt = relVx * tx + relVy * ty;
      ball.vx -= relVt * 0.12 * tx;
      ball.vy -= relVt * 0.12 * ty;
    }

    // Clamp max velocity so spinning blade can't launch ball infinitely
    const speed = Math.hypot(ball.vx, ball.vy);
    const maxCap = MAX_LAUNCH_SPEED * 1.25;
    if (speed > maxCap) {
      ball.vx = (ball.vx / speed) * maxCap;
      ball.vy = (ball.vy / speed) * maxCap;
    }

    ball.isMoving = true;
    return {
      hit: true,
      nx,
      ny,
      impactSpeed: Math.abs(relVn),
      cx: contactX,
      cy: contactY,
    };
  }

  return { hit: false, nx, ny, impactSpeed: 0, cx: contactX, cy: contactY };
}

function collideCircleBumper(
  ball: BallState,
  bumper: Bumper
): { hit: boolean; nx: number; ny: number; impactSpeed: number; cx: number; cy: number } {
  const dx = ball.x - bumper.x;
  const dy = ball.y - bumper.y;
  const dist = Math.hypot(dx, dy);
  const minDist = ball.radius + bumper.radius;

  if (dist >= minDist) {
    return { hit: false, nx: 0, ny: 0, impactSpeed: 0, cx: 0, cy: 0 };
  }

  const nx = dist > 1e-6 ? dx / dist : 1;
  const ny = dist > 1e-6 ? dy / dist : 0;
  const penetration = minDist - dist;

  ball.x += nx * (penetration + 0.05);
  ball.y += ny * (penetration + 0.05);

  const vn = ball.vx * nx + ball.vy * ny;
  if (vn < 0) {
    if (bumper.style === 'spring') {
      const springPower = Math.max(
        Math.abs(vn) * Math.max(bumper.restitution, 1.25),
        bumper.launchSpeed ?? 410
      );
      if (bumper.launchDirX !== undefined && bumper.launchDirY !== undefined) {
        const dLen = Math.hypot(bumper.launchDirX, bumper.launchDirY) || 1;
        const lx = bumper.launchDirX / dLen;
        const ly = bumper.launchDirY / dLen;
        // Blend directional spring aim (76%) with surface normal (24%) so angled hits stay exciting & controllable
        const bx = lx * 0.76 + nx * 0.24;
        const by = ly * 0.76 + ny * 0.24;
        const bLen = Math.hypot(bx, by) || 1;
        ball.vx = (bx / bLen) * springPower;
        ball.vy = (by / bLen) * springPower;
      } else {
        const tangentVx = ball.vx - vn * nx;
        const tangentVy = ball.vy - vn * ny;
        ball.vx = tangentVx * 0.85 + nx * springPower;
        ball.vy = tangentVy * 0.85 + ny * springPower;
      }
    } else {
      const bounceBoost = Math.max(Math.abs(vn) * bumper.restitution, 160);
      const tangentVx = ball.vx - vn * nx;
      const tangentVy = ball.vy - vn * ny;
      ball.vx = tangentVx + nx * bounceBoost;
      ball.vy = tangentVy + ny * bounceBoost;
    }

    const speed = Math.hypot(ball.vx, ball.vy);
    const maxCap = MAX_LAUNCH_SPEED * 1.15;
    if (speed > maxCap) {
      ball.vx = (ball.vx / speed) * maxCap;
      ball.vy = (ball.vy / speed) * maxCap;
    }
    ball.isMoving = true;

    return {
      hit: true,
      nx,
      ny,
      impactSpeed: Math.abs(vn),
      cx: bumper.x + nx * bumper.radius,
      cy: bumper.y + ny * bumper.radius,
    };
  }

  return { hit: false, nx, ny, impactSpeed: 0, cx: 0, cy: 0 };
}

function resolveRotatorCollision(
  ball: BallState,
  rotator: RotatingObstacle,
  angle: number
): { hit: boolean; nx: number; ny: number; impactSpeed: number; cx: number; cy: number } {
  // Check center hub circle first
  const dx = ball.x - rotator.cx;
  const dy = ball.y - rotator.cy;
  const dist = Math.hypot(dx, dy);
  const hubMin = ball.radius + rotator.hubRadius;
  if (dist < hubMin) {
    const nx = dist > 1e-6 ? dx / dist : 1;
    const ny = dist > 1e-6 ? dy / dist : 0;
    ball.x += nx * (hubMin - dist + 0.05);
    ball.y += ny * (hubMin - dist + 0.05);
    const vn = ball.vx * nx + ball.vy * ny;
    if (vn < 0) {
      ball.vx -= (1 + WALL_RESTITUTION) * vn * nx;
      ball.vy -= (1 + WALL_RESTITUTION) * vn * ny;
      ball.isMoving = true;
      return {
        hit: true,
        nx,
        ny,
        impactSpeed: Math.abs(vn),
        cx: rotator.cx + nx * rotator.hubRadius,
        cy: rotator.cy + ny * rotator.hubRadius,
      };
    }
  }

  // Check each rotating blade OBB
  for (let b = 0; b < rotator.blades; b++) {
    const bladeAngle = angle + (b * Math.PI) / rotator.blades;
    const res = collideCircleOBB(
      ball,
      rotator.cx,
      rotator.cy,
      rotator.length,
      rotator.thickness,
      bladeAngle,
      ROTATOR_RESTITUTION,
      rotator.angularVelocity,
      rotator.cx,
      rotator.cy
    );
    if (res.hit) {
      return res;
    }
  }

  return { hit: false, nx: 0, ny: 0, impactSpeed: 0, cx: 0, cy: 0 };
}

/**
 * Advance simulation by dt seconds (already clamped <= 0.05s).
 * Returns list of collision/capture events for audio and particle effects.
 */
export function stepSimulation(
  sim: SimState,
  level: LevelDefinition,
  rawDt: number
): CollisionEvent[] {
  const dt = Math.min(Math.max(rawDt, 0), 0.05);
  const events: CollisionEvent[] = [];
  sim.elapsedTime += dt;

  // Decay bumper pulse animations & jelly splash cooldown
  for (const key of Object.keys(sim.bumperPulse)) {
    sim.bumperPulse[key] = Math.max(0, sim.bumperPulse[key] - dt * 4.5);
  }
  sim.jellySplashCooldown = Math.max(0, (sim.jellySplashCooldown ?? 0) - dt);

  const ball = sim.ball;

  // Exponentially relax ball squash/stretch back to (1, 1)
  const relax = 1 - Math.exp(-16 * dt);
  ball.scaleX += (1 - ball.scaleX) * relax;
  ball.scaleY += (1 - ball.scaleY) * relax;

  // Always rotate obstacles so level feels alive even while aiming or sinking
  const subDt = dt / PHYSICS_SUBSTEPS;

  if (ball.holed) {
    for (let i = 0; i < level.rotators.length; i++) {
      sim.rotatorAngles[i] += level.rotators[i].angularVelocity * dt;
    }
    ball.sinkProgress = Math.min(1, ball.sinkProgress + dt * 3.4);
    ball.x += (level.hole.x - ball.x) * Math.min(1, dt * 14);
    ball.y += (level.hole.y - ball.y) * Math.min(1, dt * 14);
    return events;
  }

  let wallSoundCooldown = false;

  for (let step = 0; step < PHYSICS_SUBSTEPS; step++) {
    // Advance rotators incrementally in sync with ball movement
    for (let i = 0; i < level.rotators.length; i++) {
      sim.rotatorAngles[i] += level.rotators[i].angularVelocity * subDt;
    }

    if (ball.teleportCooldown > 0) {
      ball.teleportCooldown = Math.max(0, ball.teleportCooldown - subDt);
    }

    // Moving conveyor belts wake resting balls and gently accelerate moving balls along the belt direction
    applyConveyors(ball, level.conveyors, subDt);

    if (ball.isMoving) {
      // Apply lightweight 2D attract/repel force zones before integrating position
      applyForceZones(ball, level.forceZones, subDt);

      ball.x += ball.vx * subDt;
      ball.y += ball.vy * subDt;

      const speed = Math.hypot(ball.vx, ball.vy);
      ball.rollDistance += speed * subDt;

      // Linked teleportation portal check (with anti-loop cooldown)
      const portalEv = checkPortalTeleport(ball, level.portals);
      if (portalEv) {
        events.push(portalEv);
      }

      const hazard = getActiveHazard(ball.x, ball.y, level);
      if (hazard?.kind === 'water') {
        const splashX = ball.x;
        const splashY = ball.y;
        ball.x = ball.lastSafePos.x;
        ball.y = ball.lastSafePos.y;
        ball.vx = 0;
        ball.vy = 0;
        ball.isMoving = false;
        ball.scaleX = 1.18;
        ball.scaleY = 0.84;
        events.push({
          type: 'water_hazard',
          x: splashX,
          y: splashY,
          nx: 0,
          ny: -1,
          impactSpeed: speed,
          id: hazard.id,
        });
        break;
      }

      // Natural rolling friction: sticky jelly & sand slow strongly (never trapping), ice glides, normal turf grips smoothly
      const inSand = hazard?.kind === 'sand';
      const inJelly = hazard?.kind === 'jelly';
      const inIce = hazard?.kind === 'ice';
      if (inJelly && speed > 105 && (sim.jellySplashCooldown ?? 0) <= 0) {
        sim.jellySplashCooldown = 0.22;
        events.push({
          type: 'jelly_splash',
          x: ball.x,
          y: ball.y,
          nx: 0,
          ny: -1,
          impactSpeed: speed,
          id: hazard.id,
        });
      }

      const expRate = inJelly ? 4.1 : inSand ? 3.5 : inIce ? 0.24 : 0.92;
      const linearRate = inJelly ? 158 : inSand ? 145 : inIce ? 8 : 32;

      const expDrag = Math.exp(-expRate * subDt);
      ball.vx *= expDrag;
      ball.vy *= expDrag;

      const newSpeed = Math.hypot(ball.vx, ball.vy);
      if (newSpeed > 0.001) {
        const linearDecel = linearRate * subDt;
        const reduced = Math.max(0, newSpeed - linearDecel);
        const factor = reduced / newSpeed;
        ball.vx *= factor;
        ball.vy *= factor;
      }
    }

    // Check collisions with static walls
    for (const wall of level.walls) {
      const res = collideCircleOBB(
        ball,
        wall.x,
        wall.y,
        wall.w,
        wall.h,
        wall.angle,
        WALL_RESTITUTION
      );
      if (res.hit && !wallSoundCooldown && res.impactSpeed > 18) {
        wallSoundCooldown = true;
        ball.stretchAngle = Math.atan2(res.ny, res.nx);
        const squash = Math.min(0.22, res.impactSpeed / 2200);
        ball.scaleX = 1 - squash;
        ball.scaleY = 1 + squash;
        events.push({
          type: 'wall',
          x: res.cx,
          y: res.cy,
          nx: res.nx,
          ny: res.ny,
          impactSpeed: res.impactSpeed,
          id: wall.id,
        });
      }
    }

    // Check collisions with bumpers
    for (const bumper of level.bumpers) {
      const res = collideCircleBumper(ball, bumper);
      if (res.hit) {
        sim.bumperPulse[bumper.id] = 1;
        ball.stretchAngle = Math.atan2(res.ny, res.nx);
        ball.scaleX = 1.24;
        ball.scaleY = 0.78;
        events.push({
          type: 'bumper',
          x: res.cx,
          y: res.cy,
          nx: res.nx,
          ny: res.ny,
          impactSpeed: res.impactSpeed,
          id: bumper.id,
        });
      }
    }

    // Check collisions with rotating obstacles (even if ball was stationary!)
    for (let i = 0; i < level.rotators.length; i++) {
      const rotator = level.rotators[i];
      const res = resolveRotatorCollision(ball, rotator, sim.rotatorAngles[i]);
      if (res.hit && !wallSoundCooldown) {
        wallSoundCooldown = true;
        ball.stretchAngle = Math.atan2(res.ny, res.nx);
        ball.scaleX = 1.2;
        ball.scaleY = 0.82;
        events.push({
          type: 'rotator',
          x: res.cx,
          y: res.cy,
          nx: res.nx,
          ny: res.ny,
          impactSpeed: Math.max(res.impactSpeed, 90),
          id: rotator.id,
        });
      }
    }

    // Check collisions with moving gates (closed or sliding gates bounce the ball back safely)
    if (level.gates && level.gates.length > 0) {
      const subTime = sim.elapsedTime - dt + (step + 1) * subDt;
      for (const gate of level.gates) {
        const gs = evaluateGateState(gate, subTime);
        const res = collideCircleOBB(
          ball,
          gs.x,
          gs.y,
          gate.w,
          gate.h,
          0,
          WALL_RESTITUTION,
          0,
          gs.x,
          gs.y,
          gs.vx,
          gs.vy
        );
        if (res.hit && !wallSoundCooldown && res.impactSpeed > 12) {
          wallSoundCooldown = true;
          ball.stretchAngle = Math.atan2(res.ny, res.nx);
          ball.scaleX = 0.84;
          ball.scaleY = 1.18;
          events.push({
            type: 'gate',
            x: res.cx,
            y: res.cy,
            nx: res.nx,
            ny: res.ny,
            impactSpeed: res.impactSpeed,
            id: gate.id,
          });
        }
      }
    }

    // Hole gravity well & capture check
    const hdx = level.hole.x - ball.x;
    const hdy = level.hole.y - ball.y;
    const hDist = Math.hypot(hdx, hdy);
    const speed = Math.hypot(ball.vx, ball.vy);

    if (hDist < level.holeRadius * 1.15) {
      // Gentle cup rim slope pulls ball toward center when slow enough
      if (hDist > 1 && speed < HOLE_CAPTURE_MAX_SPEED * 1.25) {
        const pull = 360 * (1 - hDist / (level.holeRadius * 1.15));
        ball.vx += (hdx / hDist) * pull * subDt;
        ball.vy += (hdy / hDist) * pull * subDt;
      }

      // Sink threshold: closer to center tolerates slightly higher speed
      const centerFactor = 1 - hDist / level.holeRadius;
      const maxCaptureSpeed = HOLE_CAPTURE_MAX_SPEED * (0.45 + Math.max(0, centerFactor) * 0.7);
      if (hDist < level.holeRadius * 0.72 && speed < maxCaptureSpeed) {
        ball.holed = true;
        ball.isMoving = false;
        ball.vx = 0;
        ball.vy = 0;
        ball.sinkProgress = 0.05;
        events.push({
          type: 'hole_sink',
          x: level.hole.x,
          y: level.hole.y,
          nx: 0,
          ny: -1,
          impactSpeed: speed,
        });
        break;
      }
    }

    // Settle stop check (never stall mid-conveyor so the belt always carries the ball cleanly off)
    if (ball.isMoving && Math.hypot(ball.vx, ball.vy) < STOP_SPEED_THRESHOLD) {
      const onConveyor = getActiveConveyor(ball.x, ball.y, level) !== null;
      if (!onConveyor && hDist >= level.holeRadius * 0.95) {
        ball.vx = 0;
        ball.vy = 0;
        ball.isMoving = false;
      }
    }
  }

  return events;
}

/**
 * Predict an aiming dotted trajectory with up to 1 wall bounce for crisp visual feedback.
 */
export function predictAimPath(
  ball: BallState,
  vx: number,
  vy: number,
  level: LevelDefinition,
  rotatorAngles: number[],
  maxSteps = 28,
  elapsedTime = 0
): Vec2[] {
  const speed = Math.hypot(vx, vy);
  if (speed < 10) return [];

  const ghost: BallState = {
    ...ball,
    vx,
    vy,
    isMoving: true,
    holed: false,
    sinkProgress: 0,
    teleportCooldown: 0,
  };

  const points: Vec2[] = [{ x: ghost.x, y: ghost.y }];
  const stepDt = 0.014;
  let bounced = false;

  for (let i = 0; i < maxSteps; i++) {
    if (ghost.teleportCooldown > 0) {
      ghost.teleportCooldown = Math.max(0, ghost.teleportCooldown - stepDt);
    }
    applyForceZones(ghost, level.forceZones, stepDt);
    applyConveyors(ghost, level.conveyors, stepDt);
    ghost.x += ghost.vx * stepDt;
    ghost.y += ghost.vy * stepDt;

    const portalEv = checkPortalTeleport(ghost, level.portals);
    if (portalEv) {
      points.push({ x: portalEv.x, y: portalEv.y });
      points.push({ x: ghost.x, y: ghost.y });
    }

    const hazard = getActiveHazard(ghost.x, ghost.y, level);
    if (hazard?.kind === 'water') {
      points.push({ x: ghost.x, y: ghost.y });
      break;
    }
    const dragRate =
      hazard?.kind === 'jelly'
        ? 4.1
        : hazard?.kind === 'sand'
        ? 3.5
        : hazard?.kind === 'ice'
        ? 0.24
        : 0.92;
    ghost.vx *= Math.exp(-dragRate * stepDt);
    ghost.vy *= Math.exp(-dragRate * stepDt);

    for (const wall of level.walls) {
      const res = collideCircleOBB(
        ghost,
        wall.x,
        wall.y,
        wall.w,
        wall.h,
        wall.angle,
        WALL_RESTITUTION
      );
      if (res.hit) {
        points.push({ x: ghost.x, y: ghost.y });
        bounced = true;
        break;
      }
    }

    for (const bumper of level.bumpers) {
      const res = collideCircleBumper(ghost, bumper);
      if (res.hit) {
        points.push({ x: ghost.x, y: ghost.y });
        bounced = true;
        break;
      }
    }

    for (let r = 0; r < level.rotators.length; r++) {
      const res = resolveRotatorCollision(ghost, level.rotators[r], rotatorAngles[r]);
      if (res.hit) {
        points.push({ x: ghost.x, y: ghost.y });
        bounced = true;
        break;
      }
    }

    if (level.gates && level.gates.length > 0) {
      for (const gate of level.gates) {
        const gs = evaluateGateState(gate, elapsedTime + i * stepDt);
        const res = collideCircleOBB(ghost, gs.x, gs.y, gate.w, gate.h, 0, WALL_RESTITUTION);
        if (res.hit) {
          points.push({ x: ghost.x, y: ghost.y });
          bounced = true;
          break;
        }
      }
    }

    if (i % 2 === 1) {
      points.push({ x: ghost.x, y: ghost.y });
    }

    if (bounced && points.length >= 12) {
      // Show a clean short bounce segment then stop
      if (i > 20) break;
    }

    if (Math.hypot(ghost.x - level.hole.x, ghost.y - level.hole.y) < level.holeRadius * 0.7) {
      points.push({ x: level.hole.x, y: level.hole.y });
      break;
    }
  }

  return points;
}

/** Maximum strokes allowed per hole: Par + 3 */
export function getMaxStrokes(par: number): number {
  return Math.max(1, Math.round(par)) + 3;
}

/**
 * Three-star rating rules:
 * - 3 stars: Finish at or below par
 * - 2 stars: Finish at par + 1
 * - 1 star:  Finish at par + 2 or par + 3
 * - 0 stars: Fail to complete the hole (or exceed Par + 3)
 */
export function calculateStars(
  strokes: number,
  par: number,
  completed = true
): 0 | 1 | 2 | 3 {
  if (!completed) return 0;
  const maxStrokes = getMaxStrokes(par);
  if (strokes < 1 || strokes > maxStrokes) return 0;
  const diff = strokes - par;
  if (diff <= 0) return 3;
  if (diff === 1) return 2;
  return 1;
}

/** True when the player sinks the ball using the very last available stroke (Par + 3) */
export function isLastChanceSave(strokes: number, par: number): boolean {
  return strokes > 1 && strokes === getMaxStrokes(par);
}

export function getScoreLabel(strokes: number, par: number): ScoreLabelInfo {
  if (strokes === 1) {
    return {
      title: 'HOLE IN ONE!',
      detail: 'Master trick shot!',
      stars: 3,
      tone: 'gold',
    };
  }
  const diff = strokes - par;
  if (diff <= -2) {
    return {
      title: 'EAGLE!',
      detail: `${Math.abs(diff)} under par`,
      stars: 3,
      tone: 'gold',
    };
  }
  if (diff === -1) {
    return {
      title: 'BIRDIE!',
      detail: '1 under par',
      stars: 3,
      tone: 'emerald',
    };
  }
  if (diff === 0) {
    return {
      title: 'NICE PAR!',
      detail: 'Right on target',
      stars: 3,
      tone: 'sky',
    };
  }
  if (diff === 1) {
    return {
      title: 'BOGEY',
      detail: '+1 over par',
      stars: 2,
      tone: 'coral',
    };
  }
  if (isLastChanceSave(strokes, par)) {
    return {
      title: 'LAST CHANCE SAVE!',
      detail: 'Clutch finish on the final stroke!',
      stars: 1,
      tone: 'gold',
      isLastChance: true,
    };
  }
  return {
    title: 'IN THE CUP!',
    detail: `+${diff} over par`,
    stars: 1,
    tone: 'coral',
  };
}

export function formatParDelta(totalStrokes: number, totalPar: number): string {
  const diff = totalStrokes - totalPar;
  if (diff === 0) return 'Even Par';
  if (diff < 0) return `${diff} Under Par`;
  return `+${diff} Over Par`;
}

import {
  Bumper,
  DecorProp,
  LevelDefinition,
  RectWall,
  RotatingObstacle,
  SimState,
  SurfaceZone,
  Vec2,
} from './types';
import { ParticlePool } from './particles';
import { computeShotFromDrag, evaluateGateState, predictAimPath } from './physics';

export interface SplashCallout {
  x: number;
  y: number;
  life: number;
  maxLife: number;
}

export interface AimVisualState {
  active: boolean;
  anchor: Vec2;
  current: Vec2;
}

export interface ViewportTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

export function computeViewportTransform(
  canvasCssW: number,
  canvasCssH: number,
  worldW: number,
  worldH: number
): ViewportTransform {
  // Leave comfortable top margin for HUD plaques and bottom margin for hints
  const topPad = canvasCssW < 640 ? 68 : 70;
  const bottomPad = canvasCssW < 640 ? 44 : 42;
  const sidePad = canvasCssW < 640 ? 10 : 28;

  const availW = Math.max(100, canvasCssW - sidePad * 2);
  const availH = Math.max(100, canvasCssH - topPad - bottomPad);
  const scale = Math.min(availW / worldW, availH / worldH);

  const drawW = worldW * scale;
  const drawH = worldH * scale;
  const offsetX = (canvasCssW - drawW) / 2;
  const offsetY = topPad + (availH - drawH) / 2;

  return { scale, offsetX, offsetY, width: canvasCssW, height: canvasCssH };
}

export function screenToWorld(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  transform: ViewportTransform
): Vec2 {
  const sx = clientX - rect.left;
  const sy = clientY - rect.top;
  return {
    x: (sx - transform.offsetX) / transform.scale,
    y: (sy - transform.offsetY) / transform.scale,
  };
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  time: number
): void {
  // Bright tropical resort turquoise lagoon gradient
  const grad = ctx.createLinearGradient(0, 0, cssW, cssH);
  grad.addColorStop(0, '#19B5C4');
  grad.addColorStop(0.5, '#139DB0');
  grad.addColorStop(1, '#0E859A');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, cssW, cssH);

  // Soft animated sunlit water caustic ribbons
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  const spacing = 74;
  for (let y = -20; y < cssH + 40; y += spacing) {
    for (let x = -40; x < cssW + 60; x += 148) {
      const wave = Math.sin(time * 1.15 + x * 0.014 + y * 0.02) * 8;
      const shift = ((y / spacing) % 2) * 74;
      ctx.beginPath();
      ctx.moveTo(x + shift + wave, y);
      ctx.quadraticCurveTo(x + shift + 28 + wave, y - 6, x + shift + 56 + wave, y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawGardenIsland(
  ctx: CanvasRenderingContext2D,
  level: LevelDefinition,
  time: number
): void {
  const theme = level.theme ?? 'resort';
  const padX = 24;
  const padY = 20;
  const rx = padX;
  const ry = padY;
  const rw = level.worldWidth - padX * 2;
  const rh = level.worldHeight - padY * 2;

  const foamPulse = Math.sin(time * 2.1) * 3;
  ctx.save();
  if (theme === 'neon') {
    // Soft outer arcade neon halo (lightweight layered translucent strokes, baked into static layer)
    drawRoundedRectPath(ctx, rx - 10, ry - 10, rw + 20, rh + 20, 48);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.1)';
    ctx.fill();

    // Deep cabinet shadow
    drawRoundedRectPath(ctx, rx + 4, ry + 10, rw, rh, 40);
    ctx.fillStyle = 'rgba(4, 2, 14, 0.65)';
    ctx.fill();

    // Dark obsidian-violet arcade deck
    drawRoundedRectPath(ctx, rx, ry, rw, rh, 40);
    const deckGrad = ctx.createLinearGradient(rx, ry, rx + rw, ry + rh);
    deckGrad.addColorStop(0, '#1A0F3B');
    deckGrad.addColorStop(0.5, '#130A2E');
    deckGrad.addColorStop(1, '#1C0D38');
    ctx.fillStyle = deckGrad;
    ctx.fill();

    // Subtle neon grid inside deck frame
    ctx.save();
    drawRoundedRectPath(ctx, rx + 4, ry + 4, rw - 8, rh - 8, 36);
    ctx.clip();
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.16)';
    ctx.lineWidth = 1;
    for (let x = rx + 44; x < rx + rw; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, ry);
      ctx.lineTo(x, ry + rh);
      ctx.stroke();
    }
    for (let y = ry + 44; y < ry + rh; y += 48) {
      ctx.beginPath();
      ctx.moveTo(rx, y);
      ctx.lineTo(rx + rw, y);
      ctx.stroke();
    }
    ctx.restore();

    // Glowing dual-tone neon deck rim (electric blue + hot pink accent bars)
    ctx.save();
    drawRoundedRectPath(ctx, rx, ry, rw, rh, 40);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Glowing pink side accent strips along deck left/right/top/bottom margins
    ctx.strokeStyle = 'rgba(244, 63, 142, 0.85)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(rx + 96, ry + 26);
    ctx.lineTo(rx + 250, ry + 26);
    ctx.moveTo(rx + rw - 250, ry + 26);
    ctx.lineTo(rx + rw - 96, ry + 26);
    ctx.moveTo(rx + 96, ry + rh - 26);
    ctx.lineTo(rx + 250, ry + rh - 26);
    ctx.moveTo(rx + rw - 250, ry + rh - 26);
    ctx.lineTo(rx + rw - 96, ry + rh - 26);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
    ctx.beginPath();
    ctx.moveTo(rx + 36, ry + 130);
    ctx.lineTo(rx + 36, ry + rh - 130);
    ctx.moveTo(rx + rw - 36, ry + 130);
    ctx.lineTo(rx + rw - 36, ry + rh - 130);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
    return;
  }

  // Outer halo (foam on water themes, soft sunlit grass border on garden theme)
  drawRoundedRectPath(
    ctx,
    rx - 10 - foamPulse,
    ry - 10 - foamPulse,
    rw + 20 + foamPulse * 2,
    rh + 20 + foamPulse * 2,
    54
  );
  ctx.fillStyle =
    theme === 'garden'
      ? 'rgba(255, 250, 224, 0.28)'
      : theme === 'beach'
      ? 'rgba(255, 251, 235, 0.42)'
      : 'rgba(224, 251, 252, 0.34)';
  ctx.fill();

  // Island drop shadow
  drawRoundedRectPath(ctx, rx + 4, ry + 12, rw, rh, 44);
  ctx.fillStyle =
    theme === 'garden' ? 'rgba(20, 68, 32, 0.28)' : 'rgba(9, 66, 82, 0.32)';
  ctx.fill();

  // Deck fill tuned per theme
  drawRoundedRectPath(ctx, rx, ry, rw, rh, 44);
  const sandGrad = ctx.createLinearGradient(rx, ry, rx, ry + rh);
  if (theme === 'beach') {
    sandGrad.addColorStop(0, '#FFEFB8');
    sandGrad.addColorStop(0.55, '#FAD786');
    sandGrad.addColorStop(1, '#EBB85E');
  } else if (theme === 'garden') {
    sandGrad.addColorStop(0, '#FFF9E6');
    sandGrad.addColorStop(0.55, '#F4E8C6');
    sandGrad.addColorStop(1, '#E3D09F');
  } else {
    sandGrad.addColorStop(0, '#FFF1CC');
    sandGrad.addColorStop(0.55, '#F6DFAA');
    sandGrad.addColorStop(1, '#E8C884');
  }
  ctx.fillStyle = sandGrad;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle =
    theme === 'beach' ? '#CE8D38' : theme === 'garden' ? '#B9A06B' : '#C99B53';
  ctx.stroke();

  // Subtle patio stone seams (resort/garden) or warm beach sand contours (beach)
  ctx.save();
  drawRoundedRectPath(ctx, rx + 4, ry + 4, rw - 8, rh - 8, 40);
  ctx.clip();
  if (theme === 'beach') {
    ctx.strokeStyle = 'rgba(196, 134, 48, 0.16)';
    ctx.lineWidth = 2;
    for (let y = ry + 34; y < ry + rh; y += 54) {
      ctx.beginPath();
      ctx.moveTo(rx, y);
      ctx.quadraticCurveTo(rx + rw * 0.35, y - 10, rx + rw * 0.7, y + 6);
      ctx.quadraticCurveTo(rx + rw * 0.88, y + 12, rx + rw, y);
      ctx.stroke();
    }
  } else {
    ctx.strokeStyle = 'rgba(186, 141, 74, 0.16)';
    ctx.lineWidth = 1.5;
    for (let x = rx + 60; x < rx + rw; x += 68) {
      ctx.beginPath();
      ctx.moveTo(x, ry);
      ctx.lineTo(x, ry + rh);
      ctx.stroke();
    }
    for (let y = ry + 60; y < ry + rh; y += 68) {
      ctx.beginPath();
      ctx.moveTo(rx, y);
      ctx.lineTo(rx + rw, y);
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.restore();
}

function drawDecorProp(ctx: CanvasRenderingContext2D, prop: DecorProp, time: number): void {
  ctx.save();
  ctx.translate(prop.x, prop.y);
  ctx.scale(prop.scale, prop.scale);

  if (prop.kind === 'bush') {
    // Shadow
    ctx.fillStyle = 'rgba(54, 83, 20, 0.22)';
    ctx.beginPath();
    ctx.ellipse(3, 6, 26, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Base lush foliage puffs
    const puffs = [
      { x: -12, y: 2, r: 15, c: '#238B45' },
      { x: 12, y: 4, r: 14, c: '#238B45' },
      { x: 0, y: -6, r: 17, c: '#2EAA53' },
      { x: -6, y: -9, r: 10, c: '#54C96D' },
    ];
    for (const p of puffs) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.c;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#14532D';
      ctx.stroke();
    }
  } else if (prop.kind === 'flower') {
    // Mini shrub with bright flower petals
    ctx.fillStyle = '#2EA44F';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#14532D';
    ctx.stroke();

    const petalColor = prop.color || '#FF6B6B';
    const sway = Math.sin(time * 2.2 + prop.x * 0.05) * 0.08;
    ctx.rotate(sway);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 6, Math.sin(a) * 6, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = petalColor;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#FEF08A';
    ctx.fill();
  } else if (prop.kind === 'palm') {
    const sway = Math.sin(time * 1.4 + prop.x * 0.03) * 0.07;
    ctx.rotate((prop.rotation || 0) + sway);

    // Shadow
    ctx.fillStyle = 'rgba(20, 60, 40, 0.2)';
    ctx.beginPath();
    ctx.arc(6, 9, 28, 0, Math.PI * 2);
    ctx.fill();

    // 6 tropical fronds
    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.rotate((i / 6) * Math.PI * 2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(16, -12, 34, -2);
      ctx.quadraticCurveTo(16, 10, 0, 0);
      ctx.fillStyle = i % 2 === 0 ? '#22A858' : '#35C46C';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#14532D';
      ctx.stroke();
      ctx.restore();
    }
    // Center coconuts
    ctx.fillStyle = '#7C4A22';
    ctx.beginPath();
    ctx.arc(-3, -2, 4.5, 0, Math.PI * 2);
    ctx.arc(4, 1, 4.5, 0, Math.PI * 2);
    ctx.arc(-1, 4, 4.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (prop.kind === 'umbrella') {
    const color = prop.color || '#FF6B4A';
    ctx.fillStyle = 'rgba(30, 41, 59, 0.22)';
    ctx.beginPath();
    ctx.arc(6, 8, 28, 0, Math.PI * 2);
    ctx.fill();

    const segments = 8;
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 27, a0, a1);
      ctx.closePath();
      ctx.fillStyle = i % 2 === 0 ? color : '#FFFBEB';
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 27, 0, Math.PI * 2);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#4A2511';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#FDE047';
    ctx.fill();
    ctx.stroke();
  } else if (prop.kind === 'stone') {
    ctx.fillStyle = '#D6C29F';
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 12, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#A89371';
    ctx.stroke();
  }

  ctx.restore();
}

function drawTurf(ctx: CanvasRenderingContext2D, level: LevelDefinition): void {
  const isNeon = level.theme === 'neon';

  for (const poly of level.turfPolygons) {
    if (poly.points.length < 3) continue;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(poly.points[0].x, poly.points[0].y);
    for (let i = 1; i < poly.points.length; i++) {
      ctx.lineTo(poly.points[i].x, poly.points[i].y);
    }
    ctx.closePath();

    // Base putting surface color
    ctx.fillStyle = isNeon ? '#26124D' : '#38B85C';
    ctx.fill();

    // Clip stripes & lane markings inside turf polygon
    ctx.clip();

    const stripeWidth = 42;
    ctx.fillStyle = isNeon ? '#1E0E3E' : '#2FA752';
    for (let x = 0; x < level.worldWidth + stripeWidth; x += stripeWidth * 2) {
      ctx.fillRect(x, 0, stripeWidth, level.worldHeight);
    }

    // Soft inner shadow along turf polygon edges for recessed depth (while polygon path is active)
    ctx.strokeStyle = isNeon ? 'rgba(9, 4, 24, 0.55)' : 'rgba(13, 74, 34, 0.28)';
    ctx.lineWidth = 14;
    ctx.stroke();

    if (isNeon) {
      // Subtle cyber grid lines on dark purple putting surface
      ctx.strokeStyle = 'rgba(167, 139, 250, 0.14)';
      ctx.lineWidth = 1;
      for (let x = 100; x < level.worldWidth; x += 42) {
        ctx.beginPath();
        ctx.moveTo(x, 95);
        ctx.lineTo(x, 445);
        ctx.stroke();
      }
      for (let y = 130; y < 445; y += 35) {
        ctx.beginPath();
        ctx.moveTo(95, y);
        ctx.lineTo(805, y);
        ctx.stroke();
      }

      if (level.id === 9) {
        // Contrasting glowing lane guide rails and dashed center laser corridor
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(108, 202);
        ctx.lineTo(792, 202);
        ctx.moveTo(108, 338);
        ctx.lineTo(792, 338);
        ctx.stroke();

        ctx.save();
        ctx.strokeStyle = 'rgba(244, 63, 142, 0.34)';
        ctx.lineWidth = 2;
        ctx.setLineDash([12, 10]);
        ctx.beginPath();
        ctx.moveTo(185, 270);
        ctx.lineTo(715, 270);
        ctx.stroke();
        ctx.restore();

        // Forward directional chevrons in upper, lower, and center lanes
        const chevrons = [
          { x: 256, y: 270, color: 'rgba(56, 189, 248, 0.38)' },
          { x: 478, y: 152, color: 'rgba(244, 63, 142, 0.38)' },
          { x: 478, y: 388, color: 'rgba(244, 63, 142, 0.38)' },
          { x: 676, y: 270, color: 'rgba(56, 189, 248, 0.38)' },
        ];
        for (const ch of chevrons) {
          ctx.strokeStyle = ch.color;
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          for (const ox of [-10, 4]) {
            ctx.beginPath();
            ctx.moveTo(ch.x + ox - 6, ch.y - 10);
            ctx.lineTo(ch.x + ox + 4, ch.y);
            ctx.lineTo(ch.x + ox - 6, ch.y + 10);
            ctx.stroke();
          }
        }
      } else if (level.id === 12) {
        // Highlight the final narrow putting runway leading to the glowing cup
        ctx.save();
        ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.fillRect(586, 216, 210, 108);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.42)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.moveTo(594, 270);
        ctx.lineTo(724, 270);
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.restore();
  }

  // Draw crisp tee-off mat around starting tee
  ctx.save();
  drawRoundedRectPath(ctx, level.tee.x - 24, level.tee.y - 34, 48, 68, 10);
  ctx.fillStyle = isNeon ? '#160B33' : '#258D44';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = isNeon ? '#38BDF8' : '#7CE696';
  ctx.stroke();

  // Small tee markers
  ctx.fillStyle = isNeon ? '#F43F8E' : '#FFFFFF';
  ctx.strokeStyle = isNeon ? '#FDF2F8' : '#1E5B31';
  ctx.lineWidth = 2;
  for (const dy of [-22, 22]) {
    ctx.beginPath();
    ctx.arc(level.tee.x - 10, level.tee.y + dy, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Subtle tee dot
  ctx.fillStyle = isNeon ? 'rgba(56, 189, 248, 0.7)' : 'rgba(255, 255, 255, 0.5)';
  ctx.beginPath();
  ctx.arc(level.tee.x, level.tee.y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function traceHazardPath(ctx: CanvasRenderingContext2D, zone: SurfaceZone): void {
  if (zone.shape === 'ellipse') {
    ctx.beginPath();
    ctx.ellipse(zone.x, zone.y, zone.w / 2, zone.h / 2, 0, 0, Math.PI * 2);
  } else {
    drawRoundedRectPath(
      ctx,
      zone.x - zone.w / 2,
      zone.y - zone.h / 2,
      zone.w,
      zone.h,
      zone.radius ?? 16
    );
  }
}

function drawSandHazards(ctx: CanvasRenderingContext2D, level: LevelDefinition): void {
  const hazards = level.hazards;
  if (!hazards) return;

  for (const zone of hazards) {
    if (zone.kind !== 'sand') continue;
    ctx.save();

    // Soft lip border on turf
    traceHazardPath(ctx, zone);
    const sandGrad = ctx.createRadialGradient(
      zone.x - zone.w * 0.15,
      zone.y - zone.h * 0.15,
      8,
      zone.x,
      zone.y,
      Math.max(zone.w, zone.h) * 0.65
    );
    sandGrad.addColorStop(0, '#FCE6A4');
    sandGrad.addColorStop(0.7, '#F0CB74');
    sandGrad.addColorStop(1, '#DDB052');
    ctx.fillStyle = sandGrad;
    ctx.fill();

    // Recessed inner lip shadow + decorative sand speckles
    ctx.save();
    traceHazardPath(ctx, zone);
    ctx.clip();
    ctx.strokeStyle = 'rgba(146, 94, 28, 0.34)';
    ctx.lineWidth = 8;
    traceHazardPath(ctx, zone);
    ctx.stroke();

    // Sand grain speckles and gentle raked lines
    ctx.strokeStyle = 'rgba(180, 122, 42, 0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let dy = -zone.h * 0.32; dy <= zone.h * 0.32; dy += 16) {
      ctx.moveTo(zone.x - zone.w * 0.36, zone.y + dy);
      ctx.quadraticCurveTo(zone.x, zone.y + dy - 5, zone.x + zone.w * 0.36, zone.y + dy);
    }
    ctx.stroke();

    ctx.fillStyle = 'rgba(161, 98, 27, 0.28)';
    const dotOffsets = [
      [-0.24, -0.18],
      [0.2, -0.22],
      [-0.1, 0.2],
      [0.26, 0.14],
      [0.02, -0.04],
      [-0.28, 0.08],
    ];
    for (const [ox, oy] of dotOffsets) {
      ctx.beginPath();
      ctx.arc(zone.x + zone.w * ox, zone.y + zone.h * oy, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Crisp cartoon outline
    traceHazardPath(ctx, zone);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#9A6B2F';
    ctx.stroke();

    ctx.restore();
  }
}

function drawWaterHazards(
  ctx: CanvasRenderingContext2D,
  level: LevelDefinition,
  time: number
): void {
  const hazards = level.hazards;
  if (!hazards) return;

  for (const zone of hazards) {
    if (zone.kind !== 'water') continue;
    ctx.save();

    // Sandy/pebble bank rim around water hazard for instant readability
    ctx.save();
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#EBD39A';
    traceHazardPath(ctx, zone);
    ctx.stroke();
    ctx.restore();

    // Deep bright lagoon water fill
    traceHazardPath(ctx, zone);
    const waterGrad = ctx.createLinearGradient(
      zone.x,
      zone.y - zone.h / 2,
      zone.x,
      zone.y + zone.h / 2
    );
    waterGrad.addColorStop(0, '#22D3EE');
    waterGrad.addColorStop(0.5, '#0FA8C2');
    waterGrad.addColorStop(1, '#087A94');
    ctx.fillStyle = waterGrad;
    ctx.fill();

    // Inner foam & gentle animated shimmer waves
    ctx.save();
    traceHazardPath(ctx, zone);
    ctx.clip();

    ctx.strokeStyle = 'rgba(224, 251, 252, 0.45)';
    ctx.lineWidth = 5;
    traceHazardPath(ctx, zone);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const waveShift = Math.sin(time * 2.2 + zone.x * 0.02) * 5;
    for (let dy = -zone.h * 0.25; dy <= zone.h * 0.28; dy += 24) {
      const wx = zone.x - zone.w * 0.22 + (dy > 0 ? -waveShift : waveShift);
      const wy = zone.y + dy;
      ctx.moveTo(wx, wy);
      ctx.quadraticCurveTo(wx + 18, wy - 4, wx + 36, wy);
    }
    ctx.stroke();
    ctx.restore();

    // Crisp cartoon teal border
    traceHazardPath(ctx, zone);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#0B4F6C';
    ctx.stroke();

    ctx.restore();
  }
}

function drawSplashCallout(
  ctx: CanvasRenderingContext2D,
  callout: SplashCallout | null | undefined
): void {
  if (!callout || callout.life <= 0) return;
  const progress = 1 - callout.life / callout.maxLife;
  const alpha = callout.life < 0.35 ? callout.life / 0.35 : 1;
  const yOffset = -18 - progress * 28;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.font = '700 18px "Fredoka", "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#0B4F6C';
  ctx.strokeText('SPLASH! +1', callout.x, callout.y + yOffset);
  ctx.fillStyle = '#E0F2FE';
  ctx.fillText('SPLASH! +1', callout.x, callout.y + yOffset);
  ctx.restore();
}

function drawHoleAndFlag(
  ctx: CanvasRenderingContext2D,
  level: LevelDefinition,
  ballX: number,
  ballY: number,
  time: number
): void {
  const { x, y } = level.hole;
  const r = level.holeRadius;
  const isNeon = level.theme === 'neon';

  ctx.save();
  if (isNeon) {
    // Lightweight pulsing 2D neon glow rings around the hole
    const pulse = (Math.sin(time * 3.8) + 1) * 0.5;
    ctx.beginPath();
    ctx.arc(x, y, r + 15 + pulse * 5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(56, 189, 248, ${0.12 + pulse * 0.08})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, r + 8 + pulse * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(244, 63, 142, ${0.22 + pulse * 0.1})`;
    ctx.fill();

    // Glowing cyan outer rim
    ctx.beginPath();
    ctx.arc(x, y, r + 2, 0, Math.PI * 2);
    ctx.fillStyle = '#38BDF8';
    ctx.fill();

    // Inner bright highlight rim
    ctx.beginPath();
    ctx.arc(x, y, r - 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#BAE6FD';
    ctx.fill();

    // Deep neon void cup cavity
    const cupGrad = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, r - 2);
    cupGrad.addColorStop(0, '#050212');
    cupGrad.addColorStop(0.75, '#12082E');
    cupGrad.addColorStop(1, '#2D1460');
    ctx.beginPath();
    ctx.arc(x, y, r - 3, 0, Math.PI * 2);
    ctx.fillStyle = cupGrad;
    ctx.fill();
  } else {
    // Subtle light ring around cup lip
    ctx.beginPath();
    ctx.arc(x, y, r + 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fill();

    // White cup rim liner
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#E2E8F0';
    ctx.fill();

    // Deep dark inner cup cavity
    const cupGrad = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, r - 2);
    cupGrad.addColorStop(0, '#0F172A');
    cupGrad.addColorStop(0.75, '#1E293B');
    cupGrad.addColorStop(1, '#334155');
    ctx.beginPath();
    ctx.arc(x, y, r - 2.5, 0, Math.PI * 2);
    ctx.fillStyle = cupGrad;
    ctx.fill();
  }

  // Flag lifts & turns semi-transparent when ball approaches close so cup stays clear
  const distToBall = Math.hypot(ballX - x, ballY - y);
  const proximity = Math.max(0, Math.min(1, (85 - distToBall) / 55));
  const liftY = proximity * 26;
  const flagAlpha = 1 - proximity * 0.58;

  ctx.globalAlpha = flagAlpha;
  // Pole ground shadow
  ctx.strokeStyle = isNeon ? 'rgba(56, 189, 248, 0.22)' : 'rgba(15, 23, 42, 0.22)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + 2, y + 2);
  ctx.lineTo(x + 28, y - 8);
  ctx.stroke();

  // Flag pole
  const poleTopY = y - 62 - liftY;
  ctx.strokeStyle = isNeon ? '#E0F2FE' : '#FFFBEB';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y - 2 - liftY);
  ctx.lineTo(x, poleTopY);
  ctx.stroke();
  ctx.strokeStyle = isNeon ? '#38BDF8' : '#4A2511';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Fluttering pennant flag
  const wave1 = Math.sin(time * 5.2) * 3.5;
  const wave2 = Math.cos(time * 5.2 + 1) * 4.5;
  ctx.beginPath();
  ctx.moveTo(x + 1, poleTopY + 1);
  ctx.quadraticCurveTo(x + 19, poleTopY + 5 + wave1, x + 36, poleTopY + 13 + wave2);
  ctx.quadraticCurveTo(x + 19, poleTopY + 21 + wave1, x + 1, poleTopY + 25);
  ctx.closePath();
  ctx.fillStyle = isNeon ? '#F43F8E' : '#FF4D4F';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = isNeon ? '#FBCFE8' : '#7F1D1D';
  ctx.stroke();

  // Finial ball atop pole
  ctx.beginPath();
  ctx.arc(x, poleTopY, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = isNeon ? '#38BDF8' : '#FACC15';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = isNeon ? '#E0F2FE' : '#78350F';
  ctx.stroke();

  ctx.restore();
}

function drawWoodenWall(
  ctx: CanvasRenderingContext2D,
  wall: RectWall,
  theme: LevelDefinition['theme'] = 'resort'
): void {
  ctx.save();
  ctx.translate(wall.x, wall.y);
  ctx.rotate(wall.angle);

  const hw = wall.w / 2;
  const hh = wall.h / 2;
  const radius = Math.min(6, hh * 0.45, hw * 0.45);

  if (theme === 'neon') {
    const isHorizontalBorder = wall.kind === 'border' && wall.w >= wall.h;
    const isPink =
      (wall.kind === 'border' && !isHorizontalBorder) ||
      wall.id.includes('gate2') ||
      wall.id.includes('mid');
    const glowHex = isPink ? '#F43F8E' : '#38BDF8';
    const glowSoft = isPink ? 'rgba(244, 63, 142, 0.28)' : 'rgba(56, 189, 248, 0.28)';
    const coreTint = isPink ? '#FBCFE8' : '#E0F2FE';

    // Lightweight 2D layered neon glow halo (baked once into static cache)
    drawRoundedRectPath(ctx, -hw - 4, -hh - 4, wall.w + 8, wall.h + 8, radius + 3);
    ctx.fillStyle = glowSoft;
    ctx.fill();

    // Dark futuristic neon rail core
    drawRoundedRectPath(ctx, -hw, -hh, wall.w, wall.h, radius);
    const bodyGrad = ctx.createLinearGradient(0, -hh, 0, hh);
    bodyGrad.addColorStop(0, '#221447');
    bodyGrad.addColorStop(0.5, '#160B33');
    bodyGrad.addColorStop(1, '#100728');
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // Glowing electric blue or pink rim
    ctx.lineWidth = 3;
    ctx.strokeStyle = glowHex;
    ctx.stroke();

    // Crisp bright laser core stripe along center
    ctx.strokeStyle = coreTint;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (wall.w >= wall.h) {
      ctx.moveTo(-hw + 10, 0);
      ctx.lineTo(hw - 10, 0);
    } else {
      ctx.moveTo(0, -hh + 10);
      ctx.lineTo(0, hh - 10);
    }
    ctx.stroke();

    ctx.restore();
    return;
  }

  // Soft cast drop shadow onto turf
  ctx.save();
  ctx.translate(4, 6);
  drawRoundedRectPath(ctx, -hw, -hh, wall.w, wall.h, radius);
  ctx.fillStyle = 'rgba(20, 48, 28, 0.28)';
  ctx.fill();
  ctx.restore();

  // Base wood body
  drawRoundedRectPath(ctx, -hw, -hh, wall.w, wall.h, radius);
  const woodGrad = ctx.createLinearGradient(0, -hh, 0, hh);
  if (wall.kind === 'border') {
    woodGrad.addColorStop(0, '#D98A4E');
    woodGrad.addColorStop(0.5, '#BA6B32');
    woodGrad.addColorStop(1, '#964E1E');
  } else {
    woodGrad.addColorStop(0, '#E39A58');
    woodGrad.addColorStop(0.5, '#C47335');
    woodGrad.addColorStop(1, '#9B511F');
  }
  ctx.fillStyle = woodGrad;
  ctx.fill();

  // Top highlight lip
  ctx.save();
  drawRoundedRectPath(ctx, -hw + 2, -hh + 2, wall.w - 4, wall.h - 4, Math.max(2, radius - 2));
  ctx.clip();
  ctx.fillStyle = 'rgba(255, 232, 195, 0.28)';
  ctx.fillRect(-hw, -hh, wall.w, Math.min(5, wall.h * 0.3));

  // Subtle wood grain lines
  ctx.strokeStyle = 'rgba(92, 43, 15, 0.16)';
  ctx.lineWidth = 1.5;
  const isHorizontal = wall.w >= wall.h;
  if (isHorizontal) {
    ctx.beginPath();
    ctx.moveTo(-hw + 12, -2);
    ctx.lineTo(hw - 12, -2);
    ctx.moveTo(-hw + 26, 3);
    ctx.lineTo(hw - 20, 3);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(-2, -hh + 12);
    ctx.lineTo(-2, hh - 12);
    ctx.moveTo(3, -hh + 24);
    ctx.lineTo(3, hh - 18);
    ctx.stroke();
  }
  ctx.restore();

  // Crisp cartoon dark wood outline
  drawRoundedRectPath(ctx, -hw, -hh, wall.w, wall.h, radius);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#522810';
  ctx.stroke();

  // Brass corner rivets on interior timber obstacles
  if (wall.kind === 'wood' && Math.max(wall.w, wall.h) > 60) {
    ctx.fillStyle = '#FCD34D';
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 1.2;
    const isH = wall.w >= wall.h;
    const offsets = isH
      ? [
          { x: -hw + 11, y: 0 },
          { x: hw - 11, y: 0 },
        ]
      : [
          { x: 0, y: -hh + 11 },
          { x: 0, y: hh - 11 },
        ];
    for (const o of offsets) {
      ctx.beginPath();
      ctx.arc(o.x, o.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawMovingGates(
  ctx: CanvasRenderingContext2D,
  level: LevelDefinition,
  elapsedTime: number
): void {
  const gates = level.gates;
  if (!gates || gates.length === 0) return;

  for (const gate of gates) {
    const gs = evaluateGateState(gate, elapsedTime);
    const color = gate.color ?? '#38BDF8';
    const isPink = color.toLowerCase().includes('f43f') || color.toLowerCase().includes('ec48');
    const softHalo = isPink ? 'rgba(244, 63, 142, 0.24)' : 'rgba(56, 189, 248, 0.24)';
    const midHalo = isPink ? 'rgba(244, 63, 142, 0.45)' : 'rgba(56, 189, 248, 0.45)';
    const doorTop = gate.closedY - gate.h / 2 - 2;
    const doorBottom = gate.closedY + gate.h / 2 + 2;

    ctx.save();
    // Subtle laser emitter floor track across the closed doorway so timing window is crystal clear
    ctx.strokeStyle = softHalo;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(gate.closedX, doorTop);
    ctx.lineTo(gate.closedX, doorBottom);
    ctx.stroke();

    ctx.strokeStyle = midHalo;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(gate.closedX, doorTop + 4);
    ctx.lineTo(gate.closedX, doorBottom - 4);
    ctx.stroke();
    ctx.setLineDash([]);

    // Clip sliding neon energy gate strictly inside the doorway opening so it smoothly retracts into the fixed housing
    ctx.save();
    ctx.beginPath();
    ctx.rect(gate.closedX - 30, doorTop, 60, doorBottom - doorTop);
    ctx.clip();

    const gx = gs.x - gate.w / 2;
    const gy = gs.y - gate.h / 2;
    const radius = Math.min(6, gate.w * 0.45);

    // Lightweight 2D layered glow around sliding barrier
    drawRoundedRectPath(ctx, gx - 5, gy - 3, gate.w + 10, gate.h + 6, radius + 3);
    ctx.fillStyle = softHalo;
    ctx.fill();

    drawRoundedRectPath(ctx, gx - 2, gy - 1, gate.w + 4, gate.h + 2, radius + 1);
    ctx.fillStyle = midHalo;
    ctx.fill();

    // Solid glowing neon gate bar
    drawRoundedRectPath(ctx, gx, gy, gate.w, gate.h, radius);
    ctx.fillStyle = '#140A2E';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    ctx.stroke();

    // Bright white-tinted neon energy core line inside gate
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(gs.x, gy + 8);
    ctx.lineTo(gs.x, gy + gate.h - 8);
    ctx.stroke();

    // Pulsing energy node dots along gate
    const pulse = (Math.sin(elapsedTime * 7) + 1) * 0.5;
    ctx.fillStyle = color;
    for (let dy = -gate.h * 0.34; dy <= gate.h * 0.34; dy += gate.h * 0.34) {
      ctx.beginPath();
      ctx.arc(gs.x, gs.y + dy, 2.4 + pulse * 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Doorway emitter caps on the fixed barrier edges
    for (const capY of [doorTop, doorBottom]) {
      drawRoundedRectPath(ctx, gate.closedX - 13, capY - 4, 26, 8, 3);
      ctx.fillStyle = '#1E1142';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.stroke();
    }

    ctx.restore();
  }
}

function drawForceZones(
  ctx: CanvasRenderingContext2D,
  level: LevelDefinition,
  elapsedTime: number
): void {
  const zones = level.forceZones;
  if (!zones || zones.length === 0) return;

  for (const zone of zones) {
    const isAttract = zone.kind === 'attract';
    const primary = isAttract ? '#38BDF8' : '#FB7185';
    const ringRgb = isAttract ? '56, 189, 248' : '244, 63, 94';

    ctx.save();
    ctx.translate(zone.x, zone.y);

    // Soft radial energy field fill
    const fieldGrad = ctx.createRadialGradient(0, 0, 6, 0, 0, zone.radius);
    if (isAttract) {
      fieldGrad.addColorStop(0, 'rgba(56, 189, 248, 0.38)');
      fieldGrad.addColorStop(0.55, 'rgba(56, 189, 248, 0.16)');
      fieldGrad.addColorStop(1, 'rgba(56, 189, 248, 0.03)');
    } else {
      fieldGrad.addColorStop(0, 'rgba(244, 63, 94, 0.42)');
      fieldGrad.addColorStop(0.55, 'rgba(244, 63, 94, 0.17)');
      fieldGrad.addColorStop(1, 'rgba(244, 63, 94, 0.03)');
    }
    ctx.beginPath();
    ctx.arc(0, 0, zone.radius, 0, Math.PI * 2);
    ctx.fillStyle = fieldGrad;
    ctx.fill();

    // Animated concentric force ripples (contracting inward for attract, expanding outward for repel)
    for (let k = 0; k < 3; k++) {
      const phase = (elapsedTime * 0.55 + k / 3) % 1;
      const frac = isAttract ? 1 - phase : phase;
      const r = 14 + frac * (zone.radius - 16);
      const alpha = Math.sin(phase * Math.PI) * 0.55;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${ringRgb}, ${alpha.toFixed(3)})`;
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }

    // Outer dashed boundary ring
    ctx.save();
    ctx.rotate((isAttract ? 1 : -1) * elapsedTime * 0.35);
    ctx.beginPath();
    ctx.arc(0, 0, zone.radius, 0, Math.PI * 2);
    ctx.strokeStyle = primary;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([10, 8]);
    ctx.stroke();
    ctx.restore();

    // Four cardinal directional chevron cues (pointing inward for blue attract, outward for red repel)
    const chevronRadius = zone.radius * 0.62;
    ctx.strokeStyle = `rgba(${ringRgb}, 0.85)`;
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      ctx.save();
      ctx.rotate(a);
      ctx.translate(chevronRadius, 0);
      const dir = isAttract ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(-dir * 5, -6);
      ctx.lineTo(dir * 5, 0);
      ctx.lineTo(-dir * 5, 6);
      ctx.stroke();
      ctx.restore();
    }

    // Core emitter node
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#140A2E';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = primary;
    ctx.stroke();

    // Clear core polarity glyph: inward dot-ring for blue attract, outward X/burst for red repel
    ctx.beginPath();
    ctx.arc(0, 0, 4.2, 0, Math.PI * 2);
    ctx.fillStyle = isAttract ? '#BAE6FD' : '#FECDD3';
    ctx.fill();

    ctx.restore();
  }
}

function drawPortals(
  ctx: CanvasRenderingContext2D,
  level: LevelDefinition,
  elapsedTime: number
): void {
  const portals = level.portals;
  if (!portals || portals.length === 0) return;

  for (const pair of portals) {
    const primary = pair.color ?? '#38BDF8';
    const accent = pair.accentColor ?? '#C084FC';
    const endpoints = [
      { pt: pair.a, ringColor: primary, innerColor: accent, spinDir: 1 },
      { pt: pair.b, ringColor: accent, innerColor: primary, spinDir: -1 },
    ];

    for (const ep of endpoints) {
      const { x, y, radius } = ep.pt;
      const pulse = (Math.sin(elapsedTime * 4.2) + 1) * 0.5;

      ctx.save();
      ctx.translate(x, y);

      // Lightweight outer 2D glow halo
      ctx.beginPath();
      ctx.arc(0, 0, radius + 11 + pulse * 3, 0, Math.PI * 2);
      ctx.fillStyle =
        ep.ringColor === '#38BDF8'
          ? `rgba(56, 189, 248, ${0.14 + pulse * 0.08})`
          : `rgba(192, 132, 252, ${0.16 + pulse * 0.08})`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, 0, radius + 5, 0, Math.PI * 2);
      ctx.fillStyle =
        ep.ringColor === '#38BDF8'
          ? 'rgba(56, 189, 248, 0.28)'
          : 'rgba(244, 63, 142, 0.28)';
      ctx.fill();

      // Cosmic swirling vortex body
      const coreGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, radius);
      coreGrad.addColorStop(0, '#FFFFFF');
      coreGrad.addColorStop(0.28, ep.innerColor);
      coreGrad.addColorStop(0.7, '#1B0E3E');
      coreGrad.addColorStop(1, '#090418');
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.fill();

      // Rotating inner dashed swirl arcs
      ctx.save();
      ctx.rotate(elapsedTime * 2.6 * ep.spinDir);
      ctx.strokeStyle = ep.innerColor;
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const a0 = (i * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.62, a0, a0 + 1.15);
        ctx.stroke();
      }
      ctx.restore();

      // Bright crisp outer portal ring
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = ep.ringColor;
      ctx.stroke();

      // Secondary rotating outer energy dashes
      ctx.save();
      ctx.rotate(-elapsedTime * 1.8 * ep.spinDir);
      ctx.beginPath();
      ctx.arc(0, 0, radius + 3.5, 0, Math.PI * 2);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([7, 9]);
      ctx.stroke();
      ctx.restore();

      ctx.restore();
    }
  }
}

function drawBumper(
  ctx: CanvasRenderingContext2D,
  bumper: Bumper,
  pulse: number,
  isNeon = false
): void {
  const scale = 1 + pulse * 0.18;
  ctx.save();
  ctx.translate(bumper.x, bumper.y);
  ctx.scale(scale, scale);

  if (isNeon) {
    // Lightweight neon halo for bumpers on futuristic courses
    ctx.beginPath();
    ctx.arc(0, 0, bumper.radius + 7, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(244, 63, 142, 0.22)';
    ctx.fill();
  } else {
    // Drop shadow
    ctx.beginPath();
    ctx.arc(3, 5, bumper.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 45, 25, 0.28)';
    ctx.fill();
  }

  // Outer rubber cushion
  ctx.beginPath();
  ctx.arc(0, 0, bumper.radius, 0, Math.PI * 2);
  ctx.fillStyle = bumper.color;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = isNeon ? '#FFFFFF' : '#522011';
  ctx.stroke();

  // Inner bright band
  ctx.beginPath();
  ctx.arc(0, 0, bumper.radius * 0.62, 0, Math.PI * 2);
  ctx.fillStyle = bumper.accentColor;
  ctx.fill();

  // Center cap
  ctx.beginPath();
  ctx.arc(0, 0, bumper.radius * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Cartoon glossy highlight arc
  ctx.beginPath();
  ctx.arc(-bumper.radius * 0.25, -bumper.radius * 0.28, bumper.radius * 0.24, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.fill();

  ctx.restore();
}

function drawRotatingObstacle(
  ctx: CanvasRenderingContext2D,
  rotator: RotatingObstacle,
  angle: number
): void {
  ctx.save();
  ctx.translate(rotator.cx, rotator.cy);

  // Subtle sweep track ring on turf so players clearly read the danger radius!
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, rotator.length / 2, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.stroke();
  ctx.restore();

  // Draw each rotating wooden paddle blade
  for (let b = 0; b < rotator.blades; b++) {
    const bladeAngle = angle + (b * Math.PI) / rotator.blades;
    ctx.save();
    ctx.rotate(bladeAngle);

    const hw = rotator.length / 2;
    const hh = rotator.thickness / 2;

    // Blade shadow
    ctx.save();
    ctx.translate(4, 6);
    drawRoundedRectPath(ctx, -hw, -hh, rotator.length, rotator.thickness, 9);
    ctx.fillStyle = 'rgba(15, 45, 25, 0.26)';
    ctx.fill();
    ctx.restore();

    // Main bright painted windmill paddle
    drawRoundedRectPath(ctx, -hw, -hh, rotator.length, rotator.thickness, 9);
    const bladeGrad = ctx.createLinearGradient(0, -hh, 0, hh);
    bladeGrad.addColorStop(0, '#F59E0B');
    bladeGrad.addColorStop(0.5, '#D97706');
    bladeGrad.addColorStop(1, '#B45309');
    ctx.fillStyle = bladeGrad;
    ctx.fill();

    // Cheerful cream stripe tips for high-visibility motion reading
    ctx.save();
    drawRoundedRectPath(ctx, -hw, -hh, rotator.length, rotator.thickness, 9);
    ctx.clip();
    ctx.fillStyle = '#FEF3C7';
    ctx.fillRect(-hw + 14, -hh, 16, rotator.thickness);
    ctx.fillRect(hw - 30, -hh, 16, rotator.thickness);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(-hw, -hh, rotator.length, 5);
    ctx.restore();

    drawRoundedRectPath(ctx, -hw, -hh, rotator.length, rotator.thickness, 9);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#522810';
    ctx.stroke();

    ctx.restore();
  }

  // Center windmill hub cap
  ctx.beginPath();
  ctx.arc(3, 5, rotator.hubRadius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 45, 25, 0.28)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, rotator.hubRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#EF4444';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#522011';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, rotator.hubRadius * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = '#FDE047';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#78350F';
  ctx.stroke();

  ctx.restore();
}

function drawAimOverlay(
  ctx: CanvasRenderingContext2D,
  sim: SimState,
  level: LevelDefinition,
  aim: AimVisualState
): void {
  if (!aim.active || sim.ball.isMoving || sim.ball.holed) return;

  const shot = computeShotFromDrag(aim.anchor, aim.current);
  const bx = sim.ball.x;
  const by = sim.ball.y;

  // Color shifts smoothly from mint-green -> sunny gold -> fiery coral by power
  let powerColor = '#34D399';
  if (shot.power > 0.72) {
    powerColor = '#FF595E';
  } else if (shot.power > 0.38) {
    powerColor = '#FBBF24';
  }

  ctx.save();

  // Draw pull-back slingshot line behind the ball
  const pullDx = aim.current.x - aim.anchor.x;
  const pullDy = aim.current.y - aim.anchor.y;
  const pullDist = Math.hypot(pullDx, pullDy);
  const clampedPull = Math.min(pullDist, 130);
  if (pullDist > 2) {
    const px = bx + (pullDx / pullDist) * clampedPull;
    const py = by + (pullDy / pullDist) * clampedPull;

    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(px, py);
    ctx.strokeStyle = shot.valid ? 'rgba(255, 255, 255, 0.75)' : 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Pull handle knob
    ctx.beginPath();
    ctx.arc(px, py, shot.valid ? 8 : 6, 0, Math.PI * 2);
    ctx.fillStyle = shot.valid ? powerColor : '#94A3B8';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#2C1810';
    ctx.stroke();
  }

  if (!shot.valid) {
    // Subtle ring indicating cancel zone
    ctx.beginPath();
    ctx.arc(bx, by, 20, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Predicted dotted trajectory with wall/gate bounce
  const pathPoints = predictAimPath(
    sim.ball,
    shot.vx,
    shot.vy,
    level,
    sim.rotatorAngles,
    28,
    sim.elapsedTime
  );
  for (let i = 1; i < pathPoints.length; i++) {
    const t = i / pathPoints.length;
    const pt = pathPoints[i];
    const dotRadius = Math.max(2.6, 5.4 * (1 - t * 0.55));
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, dotRadius, 0, Math.PI * 2);
    ctx.fillStyle = i === 1 ? powerColor : `rgba(255, 255, 255, ${0.95 - t * 0.65})`;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = `rgba(30, 41, 59, ${0.55 - t * 0.35})`;
    ctx.stroke();
  }

  // Power gauge arc around the ball
  const angle = Math.atan2(shot.aimDir.y, shot.aimDir.x);
  const arrowLen = 28 + shot.power * 52;
  const tipX = bx + shot.aimDir.x * arrowLen;
  const tipY = by + shot.aimDir.y * arrowLen;

  ctx.beginPath();
  ctx.moveTo(bx + shot.aimDir.x * 16, by + shot.aimDir.y * 16);
  ctx.lineTo(tipX, tipY);
  ctx.strokeStyle = '#2C1810';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(bx + shot.aimDir.x * 16, by + shot.aimDir.y * 16);
  ctx.lineTo(tipX, tipY);
  ctx.strokeStyle = powerColor;
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Arrowhead chevron
  ctx.save();
  ctx.translate(tipX, tipY);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-7, -7);
  ctx.lineTo(-4, 0);
  ctx.lineTo(-7, 7);
  ctx.closePath();
  ctx.fillStyle = powerColor;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#2C1810';
  ctx.stroke();
  ctx.restore();

  // Compact power percentage callout near the pull knob (clamped inside world bounds)
  const pct = Math.round(shot.power * 100);
  ctx.font = '700 13px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const labelX = Math.max(36, Math.min(level.worldWidth - 36, bx - shot.aimDir.x * 36));
  const labelY = Math.max(24, Math.min(level.worldHeight - 24, by - shot.aimDir.y * 36 - 18));
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#2C1810';
  ctx.strokeText(`${pct}%`, labelX, labelY);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`${pct}%`, labelX, labelY);

  ctx.restore();
}

function drawBall(ctx: CanvasRenderingContext2D, sim: SimState, time: number): void {
  const { ball } = sim;
  if (ball.sinkProgress >= 1) return;

  const sinkScale = ball.holed ? Math.max(0.05, 1 - ball.sinkProgress * 0.92) : 1;
  const alpha = ball.holed ? Math.max(0, 1 - ball.sinkProgress * 0.9) : 1;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(ball.x, ball.y);

  // Subtle ready pulse ring when stationary so player immediately sees the ball is interactive
  if (!ball.isMoving && !ball.holed) {
    const pulse = (Math.sin(time * 3.8) + 1) * 0.5;
    ctx.beginPath();
    ctx.arc(0, 0, ball.radius + 5 + pulse * 4, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.42 - pulse * 0.22})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Ground shadow
  if (!ball.holed) {
    ctx.beginPath();
    ctx.ellipse(2.5, 4.5, ball.radius * 0.95, ball.radius * 0.85, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 45, 25, 0.34)';
    ctx.fill();
  }

  ctx.rotate(ball.stretchAngle);
  ctx.scale(ball.scaleX * sinkScale, ball.scaleY * sinkScale);
  ctx.rotate(-ball.stretchAngle);

  // Crisp shaded white golf ball
  const r = ball.radius;
  const ballGrad = ctx.createRadialGradient(-r * 0.32, -r * 0.35, 1.5, 0, 0, r);
  ballGrad.addColorStop(0, '#FFFFFF');
  ballGrad.addColorStop(0.68, '#F1F5F9');
  ballGrad.addColorStop(1, '#CBD5E1');
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = ballGrad;
  ctx.fill();

  // Cartoon crisp dark outline
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#1E293B';
  ctx.stroke();

  // Subtle rolling dimple dots synced to rollDistance
  const spinOffset = (ball.rollDistance * 0.14) % (Math.PI * 2);
  ctx.fillStyle = 'rgba(148, 163, 184, 0.55)';
  const dX = Math.cos(spinOffset) * 3.5;
  const dY = Math.sin(spinOffset) * 3.5;
  ctx.beginPath();
  ctx.arc(dX, dY, 1.4, 0, Math.PI * 2);
  ctx.arc(dX - 4, dY + 2.5, 1.2, 0, Math.PI * 2);
  ctx.arc(dX + 3, dY + 3.5, 1.1, 0, Math.PI * 2);
  ctx.fill();

  // Specular highlight dot
  ctx.beginPath();
  ctx.arc(-r * 0.32, -r * 0.34, 2.8, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.fill();

  ctx.restore();
}

function drawParticlesAndTrail(ctx: CanvasRenderingContext2D, pool: ParticlePool): void {
  // Ball trail dots
  for (let i = 0; i < pool.trail.length; i++) {
    const pt = pool.trail[i];
    if (pt.alpha <= 0.01) continue;
    const t = 1 - i / pool.trail.length;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 3 + t * 5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${pt.alpha * 0.45 * t})`;
    ctx.fill();
  }

  // Particles
  for (let i = 0; i < pool.items.length; i++) {
    const p = pool.items[i];
    if (!p.active) continue;
    const alpha = Math.max(0, p.life / p.maxLife);

    ctx.save();
    ctx.globalAlpha = alpha;
    if (p.shape === 'ring') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3.5 * alpha;
      ctx.stroke();
    } else if (p.shape === 'confetti') {
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size * 0.32, p.size, p.size * 0.64);
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.4 + alpha * 0.6), 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
    ctx.restore();
  }
}

export interface StaticLayerCache {
  canvas: HTMLCanvasElement;
  key: string;
}

function drawStaticCourseLayer(
  ctx: CanvasRenderingContext2D,
  transform: ViewportTransform,
  level: LevelDefinition
): void {
  const theme = level.theme ?? 'resort';
  const grad = ctx.createLinearGradient(0, 0, transform.width, transform.height);
  if (theme === 'neon') {
    grad.addColorStop(0, '#0B061E');
    grad.addColorStop(0.5, '#150A35');
    grad.addColorStop(1, '#0D0624');
  } else if (theme === 'garden') {
    grad.addColorStop(0, '#54C068');
    grad.addColorStop(0.55, '#3FA656');
    grad.addColorStop(1, '#2E8B44');
  } else if (theme === 'beach') {
    grad.addColorStop(0, '#22C7D6');
    grad.addColorStop(0.5, '#15A8BC');
    grad.addColorStop(1, '#0C87A0');
  } else {
    grad.addColorStop(0, '#19B5C4');
    grad.addColorStop(0.5, '#139DB0');
    grad.addColorStop(1, '#0E859A');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, transform.width, transform.height);

  // Subtle decorative background pattern matched to theme
  ctx.save();
  if (theme === 'neon') {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < transform.width; x += 48) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, transform.height);
    }
    for (let y = 0; y < transform.height; y += 48) {
      ctx.moveTo(0, y);
      ctx.lineTo(transform.width, y);
    }
    ctx.stroke();
  } else {
    ctx.strokeStyle =
      theme === 'garden' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const spacing = 96;
    for (let y = 20; y < transform.height + 20; y += spacing) {
      const rowShift = (Math.floor(y / spacing) % 2) * 90;
      for (let x = -20; x < transform.width + 40; x += 180) {
        const sx = x + rowShift;
        if (theme === 'garden') {
          ctx.moveTo(sx, y);
          ctx.lineTo(sx - 5, y - 9);
          ctx.moveTo(sx + 6, y);
          ctx.lineTo(sx + 10, y - 10);
        } else {
          ctx.moveTo(sx, y);
          ctx.quadraticCurveTo(sx + 26, y - 5, sx + 52, y);
        }
      }
    }
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.translate(transform.offsetX, transform.offsetY);
  ctx.scale(transform.scale, transform.scale);

  // Courtyard / beach island / neon cabinet deck
  drawGardenIsland(ctx, level, 0);

  // Surrounding props (foliage, palms, umbrellas, flowers, stones)
  for (const prop of level.decor) {
    drawDecorProp(ctx, prop, 0);
  }

  // Mowed putting turf & tee mat
  drawTurf(ctx, level);

  // Sand trap patches on turf
  drawSandHazards(ctx, level);

  // Wooden or neon outer borders & interior walls
  for (const wall of level.walls) {
    drawWoodenWall(ctx, wall, level.theme);
  }

  ctx.restore();
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  transform: ViewportTransform,
  level: LevelDefinition,
  sim: SimState,
  particles: ParticlePool,
  aim: AimVisualState,
  shakeX: number,
  shakeY: number,
  dpr = 1,
  staticCache?: StaticLayerCache,
  splashCallout?: SplashCallout | null
): void {
  if (staticCache) {
    const cacheKey = `${level.id}:${Math.round(transform.width)}:${Math.round(transform.height)}:${dpr}`;
    if (staticCache.key !== cacheKey) {
      staticCache.key = cacheKey;
      staticCache.canvas.width = Math.max(1, Math.round(transform.width * dpr));
      staticCache.canvas.height = Math.max(1, Math.round(transform.height * dpr));
      const sctx = staticCache.canvas.getContext('2d');
      if (sctx) {
        sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawStaticCourseLayer(sctx, transform, level);
      }
    }
    if (shakeX !== 0 || shakeY !== 0) {
      ctx.fillStyle =
        level.theme === 'neon'
          ? '#0D0624'
          : level.theme === 'garden'
          ? '#2E8B44'
          : '#0E859A';
      ctx.fillRect(0, 0, transform.width, transform.height);
    }
    ctx.drawImage(
      staticCache.canvas,
      0,
      0,
      staticCache.canvas.width,
      staticCache.canvas.height,
      shakeX,
      shakeY,
      transform.width,
      transform.height
    );
  } else {
    drawBackdrop(ctx, transform.width, transform.height, sim.elapsedTime);
    ctx.save();
    ctx.translate(transform.offsetX + shakeX, transform.offsetY + shakeY);
    ctx.scale(transform.scale, transform.scale);
    drawGardenIsland(ctx, level, sim.elapsedTime);
    for (const prop of level.decor) {
      drawDecorProp(ctx, prop, sim.elapsedTime);
    }
    drawTurf(ctx, level);
    drawSandHazards(ctx, level);
    for (const wall of level.walls) {
      drawWoodenWall(ctx, wall, level.theme);
    }
    ctx.restore();
  }

  ctx.save();
  ctx.translate(transform.offsetX + shakeX, transform.offsetY + shakeY);
  ctx.scale(transform.scale, transform.scale);

  // Shimmering water hazards
  drawWaterHazards(ctx, level, sim.elapsedTime);

  // Attract (blue) & repel (red) neon force zones
  drawForceZones(ctx, level, sim.elapsedTime);

  // Connected glowing teleportation portals
  drawPortals(ctx, level, sim.elapsedTime);

  // Cup & fluttering flag
  drawHoleAndFlag(ctx, level, sim.ball.x, sim.ball.y, sim.elapsedTime);

  // Bouncy bumpers
  const isNeon = level.theme === 'neon';
  for (const bumper of level.bumpers) {
    drawBumper(ctx, bumper, sim.bumperPulse[bumper.id] || 0, isNeon);
  }

  // Rotating windmill blades
  for (let i = 0; i < level.rotators.length; i++) {
    drawRotatingObstacle(ctx, level.rotators[i], sim.rotatorAngles[i]);
  }

  // Periodically opening & closing neon gates
  drawMovingGates(ctx, level, sim.elapsedTime);

  // Aiming slingshot & bounce preview
  drawAimOverlay(ctx, sim, level, aim);

  // Speed trail & particles
  drawParticlesAndTrail(ctx, particles);

  // Golf ball
  drawBall(ctx, sim, sim.elapsedTime);

  // Water penalty floating callout
  drawSplashCallout(ctx, splashCallout);

  ctx.restore();
}

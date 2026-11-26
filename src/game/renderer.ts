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
  text?: string;
  fillColor?: string;
  strokeColor?: string;
  scale?: number;
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

  // Outer halo (foam on water themes, soft sunlit grass border on garden theme, powdery frost on frost theme)
  drawRoundedRectPath(
    ctx,
    rx - 10 - foamPulse,
    ry - 10 - foamPulse,
    rw + 20 + foamPulse * 2,
    rh + 20 + foamPulse * 2,
    54
  );
  ctx.fillStyle =
    theme === 'candy'
      ? 'rgba(255, 241, 246, 0.52)'
      : theme === 'frost'
      ? 'rgba(224, 242, 254, 0.36)'
      : theme === 'garden'
      ? 'rgba(255, 250, 224, 0.28)'
      : theme === 'beach'
      ? 'rgba(255, 251, 235, 0.42)'
      : 'rgba(224, 251, 252, 0.34)';
  ctx.fill();

  // Island drop shadow
  drawRoundedRectPath(ctx, rx + 4, ry + 12, rw, rh, 44);
  ctx.fillStyle =
    theme === 'candy'
      ? 'rgba(124, 45, 76, 0.24)'
      : theme === 'frost'
      ? 'rgba(15, 42, 74, 0.34)'
      : theme === 'garden'
      ? 'rgba(20, 68, 32, 0.28)'
      : 'rgba(9, 66, 82, 0.32)';
  ctx.fill();

  // Deck fill tuned per theme
  drawRoundedRectPath(ctx, rx, ry, rw, rh, 44);
  const sandGrad = ctx.createLinearGradient(rx, ry, rx, ry + rh);
  if (theme === 'candy') {
    if (level.turfStyle === 'chocolate') {
      // Warm vanilla-wafer candy factory floor framing the chocolate pathways
      sandGrad.addColorStop(0, '#FFF8EB');
      sandGrad.addColorStop(0.55, '#FDE8C8');
      sandGrad.addColorStop(1, '#F2CFA1');
    } else {
      // Soft strawberry-cream frosting deck for Sugar Rush
      sandGrad.addColorStop(0, '#FFF5F9');
      sandGrad.addColorStop(0.55, '#FCE4F0');
      sandGrad.addColorStop(1, '#F8CBE1');
    }
  } else if (theme === 'frost') {
    sandGrad.addColorStop(0, '#F7FCFF');
    sandGrad.addColorStop(0.55, '#E3F2FD');
    sandGrad.addColorStop(1, '#C9E3F8');
  } else if (theme === 'beach') {
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
    theme === 'candy'
      ? level.turfStyle === 'chocolate'
        ? '#9A5124'
        : '#DB2777'
      : theme === 'frost'
      ? '#7AA7CC'
      : theme === 'beach'
      ? '#CE8D38'
      : theme === 'garden'
      ? '#B9A06B'
      : '#C99B53';
  ctx.stroke();

  // Subtle patio stone seams (resort/garden), warm beach sand contours (beach), or soft snowdrifts (frost)
  ctx.save();
  drawRoundedRectPath(ctx, rx + 4, ry + 4, rw - 8, rh - 8, 40);
  ctx.clip();
  if (theme === 'frost') {
    ctx.strokeStyle = 'rgba(125, 179, 218, 0.26)';
    ctx.lineWidth = 2.2;
    for (let y = ry + 36; y < ry + rh; y += 56) {
      ctx.beginPath();
      ctx.moveTo(rx, y);
      ctx.quadraticCurveTo(rx + rw * 0.3, y - 12, rx + rw * 0.65, y + 7);
      ctx.quadraticCurveTo(rx + rw * 0.86, y + 14, rx + rw, y - 4);
      ctx.stroke();
    }

    // Winding decorative frozen river meandering across the snowy resort plateau
    ctx.save();
    const traceRiverPath = () => {
      ctx.beginPath();
      ctx.moveTo(rx - 18, ry + rh * 0.19);
      ctx.bezierCurveTo(
        rx + rw * 0.24,
        ry + rh * 0.06,
        rx + rw * 0.34,
        ry + rh * 0.42,
        rx + rw * 0.52,
        ry + rh * 0.54
      );
      ctx.bezierCurveTo(
        rx + rw * 0.68,
        ry + rh * 0.65,
        rx + rw * 0.78,
        ry + rh * 0.96,
        rx + rw + 18,
        ry + rh * 0.83
      );
    };

    // Outer powdery snowbank bevel along the frozen river
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    traceRiverPath();
    ctx.strokeStyle = 'rgba(125, 195, 240, 0.48)';
    ctx.lineWidth = 48;
    ctx.stroke();

    // Main crystalline frozen river ice channel
    const riverGrad = ctx.createLinearGradient(rx, ry, rx + rw, ry + rh);
    riverGrad.addColorStop(0, '#BAE6FD');
    riverGrad.addColorStop(0.45, '#7DD3FC');
    riverGrad.addColorStop(1, '#38BDF8');
    traceRiverPath();
    ctx.strokeStyle = riverGrad;
    ctx.lineWidth = 36;
    ctx.stroke();

    // Inner bright glacier sheen highlight along the river center
    traceRiverPath();
    ctx.strokeStyle = 'rgba(240, 249, 255, 0.55)';
    ctx.lineWidth = 10;
    ctx.stroke();

    // Subtle crisp frozen river edge cracks & icy glint dashes
    traceRiverPath();
    ctx.setLineDash([18, 28]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Delicate snow sparkle dots across the snowbanks
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    for (let i = 0; i < 26; i++) {
      const sx = rx + ((i * 97 + 41) % (rw - 24)) + 12;
      const sy = ry + ((i * 61 + 29) % (rh - 24)) + 12;
      ctx.beginPath();
      ctx.arc(sx, sy, (i % 3) + 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (theme === 'candy') {
    // Subtle pastel candy-factory wafer tiles & scattered sugar sprinkles on deck
    ctx.strokeStyle =
      level.turfStyle === 'chocolate'
        ? 'rgba(154, 81, 36, 0.12)'
        : 'rgba(219, 39, 119, 0.1)';
    ctx.lineWidth = 1.6;
    for (let x = rx + 56; x < rx + rw; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, ry);
      ctx.lineTo(x, ry + rh);
      ctx.stroke();
    }
    for (let y = ry + 56; y < ry + rh; y += 64) {
      ctx.beginPath();
      ctx.moveTo(rx, y);
      ctx.lineTo(rx + rw, y);
      ctx.stroke();
    }

    const sprinkleColors = ['#EC4899', '#34D399', '#FACC15', '#38BDF8', '#A855F7'];
    for (let i = 0; i < 36; i++) {
      const sx = rx + ((i * 89 + 37) % (rw - 36)) + 18;
      const sy = ry + ((i * 53 + 23) % (rh - 36)) + 18;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(((i * 37) % 180) * (Math.PI / 180));
      ctx.fillStyle = sprinkleColors[i % sprinkleColors.length];
      ctx.globalAlpha = 0.55;
      drawRoundedRectPath(ctx, -4.5, -1.8, 9, 3.6, 1.8);
      ctx.fill();
      ctx.restore();
    }
  } else if (theme === 'beach') {
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
  } else if (prop.kind === 'snow-pine') {
    // Cast cool snow shadow
    ctx.fillStyle = 'rgba(30, 64, 108, 0.18)';
    ctx.beginPath();
    ctx.arc(5, 7, 25, 0, Math.PI * 2);
    ctx.fill();

    // Two layered scalloped snow-dusted evergreen tiers
    const drawTier = (radius: number, fill: string, stroke: string, points: number, rot: number) => {
      ctx.beginPath();
      for (let i = 0; i < points * 2; i++) {
        const a = rot + (i * Math.PI) / points;
        const r = i % 2 === 0 ? radius : radius * 0.62;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = stroke;
      ctx.stroke();
    };

    drawTier(25, '#1D5E52', '#0F3D36', 8, 0.2);
    drawTier(19, '#2A7F6E', '#134E4A', 8, 0.6);
    // Frosted snow-capped crown resting on the pine tips
    drawTier(12.5, '#F0F9FF', '#7DD3FC', 6, 0.35);
    ctx.beginPath();
    ctx.arc(-1, -1, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
  } else if (prop.kind === 'crystal') {
    // Ground frost shadow
    ctx.fillStyle = 'rgba(14, 116, 144, 0.22)';
    ctx.beginPath();
    ctx.ellipse(3, 6, 18, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    const shards = [
      { angle: -0.55, len: 21, w: 9, fill: '#38BDF8', hi: '#E0F2FE' },
      { angle: 0.42, len: 19, w: 8.5, fill: '#0EA5E9', hi: '#BAE6FD' },
      { angle: 0.0, len: 24, w: 10, fill: '#7DD3FC', hi: '#FFFFFF' },
    ];
    for (const s of shards) {
      ctx.save();
      ctx.rotate(s.angle);
      ctx.beginPath();
      ctx.moveTo(0, -s.len * 0.68);
      ctx.lineTo(s.w * 0.55, 0);
      ctx.lineTo(0, s.len * 0.45);
      ctx.lineTo(-s.w * 0.55, 0);
      ctx.closePath();
      ctx.fillStyle = s.fill;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#0C4A6E';
      ctx.stroke();

      // Facet highlight half
      ctx.beginPath();
      ctx.moveTo(0, -s.len * 0.62);
      ctx.lineTo(0, s.len * 0.35);
      ctx.lineTo(-s.w * 0.44, 0);
      ctx.closePath();
      ctx.fillStyle = s.hi;
      ctx.globalAlpha = 0.65;
      ctx.fill();
      ctx.restore();
    }
  } else if (prop.kind === 'snowman') {
    // Soft winter shadow
    ctx.fillStyle = 'rgba(30, 64, 108, 0.18)';
    ctx.beginPath();
    ctx.ellipse(4, 6, 19, 17, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stick arms
    ctx.strokeStyle = '#6B3E1E';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-13, 2);
    ctx.lineTo(-24, -4);
    ctx.moveTo(13, 2);
    ctx.lineTo(24, -3);
    ctx.stroke();

    // Lower snow body
    ctx.beginPath();
    ctx.arc(0, 2, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#F0F9FF';
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#3B6A94';
    ctx.stroke();

    // Cheerful coral winter scarf collar
    ctx.beginPath();
    ctx.arc(0, -2, 11.5, 0, Math.PI * 2);
    ctx.fillStyle = '#FF595E';
    ctx.fill();
    ctx.strokeStyle = '#7F1D1D';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Scarf tail
    ctx.beginPath();
    ctx.moveTo(7, 4);
    ctx.lineTo(15, 13);
    ctx.lineTo(9, 15);
    ctx.lineTo(3, 7);
    ctx.closePath();
    ctx.fillStyle = '#FF595E';
    ctx.fill();
    ctx.stroke();

    // Snowman head
    ctx.beginPath();
    ctx.arc(0, -4, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#3B6A94';
    ctx.stroke();

    // Carrot nose + coal eyes
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(3, -18);
    ctx.lineTo(-3, -11);
    ctx.closePath();
    ctx.fillStyle = '#F97316';
    ctx.fill();

    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.arc(-3.5, -7, 1.5, 0, Math.PI * 2);
    ctx.arc(3.5, -7, 1.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (prop.kind === 'frost-rock') {
    ctx.fillStyle = 'rgba(30, 58, 95, 0.2)';
    ctx.beginPath();
    ctx.ellipse(3, 5, 18, 12, 0.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#7D9AB5';
    ctx.beginPath();
    ctx.ellipse(0, 0, 17, 11.5, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#335270';
    ctx.stroke();

    // Powdery snow cap on top of stone
    ctx.fillStyle = '#F0F9FF';
    ctx.beginPath();
    ctx.ellipse(-2, -3, 11, 5.5, 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (prop.kind === 'lollipop') {
    const mainColor = prop.color || '#EC4899';
    // Soft pastel shadow
    ctx.fillStyle = 'rgba(124, 45, 76, 0.18)';
    ctx.beginPath();
    ctx.ellipse(5, 8, 22, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Crisp white lollipop stick angled slightly downward
    ctx.strokeStyle = '#9D7A62';
    ctx.lineWidth = 7.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(-10, 26);
    ctx.stroke();
    ctx.strokeStyle = '#FFFDF9';
    ctx.lineWidth = 4.6;
    ctx.stroke();

    // Giant candy lollipop head
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fillStyle = mainColor;
    ctx.fill();
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = '#6B1839';
    ctx.stroke();

    // Cream candy spiral swirl
    ctx.strokeStyle = '#FFFDF5';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let t = 0; t <= 16; t += 0.35) {
      const r = t * 0.96;
      const a = t * 0.72;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (t === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Glossy candy wrapper sheen
    ctx.beginPath();
    ctx.arc(-6.5, -7, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.52)';
    ctx.fill();
  } else if (prop.kind === 'gumdrop') {
    const color = prop.color || '#34D399';
    ctx.fillStyle = 'rgba(92, 43, 15, 0.18)';
    ctx.beginPath();
    ctx.ellipse(3, 6, 17, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rounded sugar-dusted gumdrop dome
    ctx.beginPath();
    ctx.arc(0, 0, 15.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = '#522810';
    ctx.stroke();

    // Sugar crystal dots
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    const dots = [
      [-6, -5],
      [4, -7],
      [7, 2],
      [-4, 5],
      [1, 1],
    ];
    for (const [dx, dy] of dots) {
      ctx.beginPath();
      ctx.arc(dx, dy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (prop.kind === 'jellybean') {
    // Cluster of 3 colorful glossy jellybeans
    const beans = [
      { x: -10, y: 2, rot: -0.45, fill: '#EC4899' },
      { x: 9, y: 4, rot: 0.55, fill: '#FACC15' },
      { x: 0, y: -7, rot: 0.1, fill: '#34D399' },
    ];
    for (const b of beans) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.fillStyle = 'rgba(82, 40, 16, 0.18)';
      ctx.beginPath();
      ctx.ellipse(2, 3, 10, 6.2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 6.2, 0, 0, Math.PI * 2);
      ctx.fillStyle = b.fill;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#522810';
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(-2.5, -2.2, 4.2, 1.8, -0.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.restore();
}

function drawTurf(ctx: CanvasRenderingContext2D, level: LevelDefinition): void {
  const isNeon = level.theme === 'neon';
  const isFrost = level.theme === 'frost';
  const isCandy = level.theme === 'candy';
  const isChocolate = isCandy && level.turfStyle === 'chocolate';

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
    ctx.fillStyle = isNeon
      ? '#26124D'
      : isFrost
      ? '#5594B4'
      : isChocolate
      ? '#7C4426'
      : isCandy
      ? '#3ED49C'
      : '#38B85C';
    ctx.fill();

    // Clip stripes & lane markings inside turf polygon
    ctx.clip();

    const stripeWidth = 42;
    ctx.fillStyle = isNeon
      ? '#1E0E3E'
      : isFrost
      ? '#4A86A6'
      : isChocolate
      ? '#6B381E'
      : isCandy
      ? '#32BE8A'
      : '#2FA752';
    for (let x = 0; x < level.worldWidth + stripeWidth; x += stripeWidth * 2) {
      ctx.fillRect(x, 0, stripeWidth, level.worldHeight);
    }

    // Soft inner shadow along turf polygon edges for recessed depth (while polygon path is active)
    ctx.strokeStyle = isNeon
      ? 'rgba(9, 4, 24, 0.55)'
      : isFrost
      ? 'rgba(20, 56, 86, 0.34)'
      : isChocolate
      ? 'rgba(42, 18, 8, 0.42)'
      : isCandy
      ? 'rgba(13, 94, 68, 0.25)'
      : 'rgba(13, 74, 34, 0.28)';
    ctx.lineWidth = 14;
    ctx.stroke();

    if (isChocolate) {
      // Subtle molded chocolate bar highlights & caramel runway sheen inside the narrow final putting chute
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.14)';
      ctx.lineWidth = 2;
      for (let y = 140; y < 420; y += 54) {
        ctx.beginPath();
        ctx.moveTo(90, y);
        ctx.lineTo(590, y);
        ctx.stroke();
      }

      if (level.id === 18) {
        // Creamy caramel-frosting guide lane highlighting the narrow final putting area
        ctx.save();
        ctx.fillStyle = 'rgba(253, 230, 138, 0.12)';
        ctx.fillRect(618, 226, 192, 88);
        ctx.strokeStyle = 'rgba(253, 224, 71, 0.46)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.moveTo(626, 270);
        ctx.lineTo(732, 270);
        ctx.stroke();
        ctx.restore();
      }
    } else if (isCandy) {
      // Delicate pastel frosting shimmer specks on mint candy fairway
      ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
      for (let x = 108; x < level.worldWidth - 90; x += 46) {
        for (let y = 118; y < level.worldHeight - 90; y += 44) {
          const ox = ((x + y) % 15) - 7;
          ctx.beginPath();
          ctx.arc(x + ox, y, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    if (isFrost) {
      // Subtle matte snow-grain stipple on normal winter turf so it reads distinctly matte vs glossy ice
      ctx.fillStyle = 'rgba(240, 249, 255, 0.14)';
      for (let x = 104; x < level.worldWidth - 90; x += 38) {
        for (let y = 96; y < level.worldHeight - 80; y += 34) {
          const ox = ((x + y) % 13) - 6;
          ctx.beginPath();
          ctx.arc(x + ox, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

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
  ctx.fillStyle = isNeon
    ? '#160B33'
    : isFrost
    ? '#356E8E'
    : isChocolate
    ? '#4E2613'
    : isCandy
    ? '#DB2777'
    : '#258D44';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = isNeon
    ? '#38BDF8'
    : isFrost
    ? '#BAE6FD'
    : isChocolate
    ? '#FBBF24'
    : isCandy
    ? '#FFF1F2'
    : '#7CE696';
  ctx.stroke();

  // Small tee markers
  ctx.fillStyle = isNeon
    ? '#F43F8E'
    : isFrost
    ? '#E0F2FE'
    : isCandy
    ? '#FDE047'
    : '#FFFFFF';
  ctx.strokeStyle = isNeon
    ? '#FDF2F8'
    : isFrost
    ? '#0C4A6E'
    : isCandy
    ? '#6B1839'
    : '#1E5B31';
  ctx.lineWidth = 2;
  for (const dy of [-22, 22]) {
    ctx.beginPath();
    ctx.arc(level.tee.x - 10, level.tee.y + dy, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Subtle tee dot
  ctx.fillStyle = isNeon
    ? 'rgba(56, 189, 248, 0.7)'
    : isFrost
    ? 'rgba(224, 242, 254, 0.78)'
    : isCandy
    ? 'rgba(255, 245, 248, 0.75)'
    : 'rgba(255, 255, 255, 0.5)';
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

function drawIceHazards(ctx: CanvasRenderingContext2D, level: LevelDefinition): void {
  const hazards = level.hazards;
  if (!hazards) return;
  const iceZones = hazards.filter((z) => z.kind === 'ice');
  if (iceZones.length === 0) return;

  // Clip all ice sheets cleanly to the playable turf polygon(s) so angled/curved sheets never bleed outside walls
  ctx.save();
  ctx.beginPath();
  for (const poly of level.turfPolygons) {
    if (poly.points.length < 3) continue;
    ctx.moveTo(poly.points[0].x, poly.points[0].y);
    for (let i = 1; i < poly.points.length; i++) {
      ctx.lineTo(poly.points[i].x, poly.points[i].y);
    }
    ctx.closePath();
  }
  ctx.clip();

  for (const zone of iceZones) {
    ctx.save();
    ctx.translate(zone.x, zone.y);
    if (zone.angle) {
      ctx.rotate(zone.angle);
    }

    const localZone: SurfaceZone = { ...zone, x: 0, y: 0, angle: 0 };

    // Bright glossy glacier-ice fill — unmistakably slick vs matte frosty blue turf
    traceHazardPath(ctx, localZone);
    const iceGrad = ctx.createLinearGradient(
      -zone.w * 0.45,
      -zone.h * 0.45,
      zone.w * 0.45,
      zone.h * 0.45
    );
    iceGrad.addColorStop(0, '#E8FBFF');
    iceGrad.addColorStop(0.45, '#BCEEFF');
    iceGrad.addColorStop(1, '#84D9FA');
    ctx.fillStyle = iceGrad;
    ctx.fill();

    // Diagonal glass sheen ribbons & delicate crystalline ice facets clipped inside sheet
    ctx.save();
    traceHazardPath(ctx, localZone);
    ctx.clip();

    // Glossy diagonal specular stripes
    ctx.fillStyle = 'rgba(255, 255, 255, 0.44)';
    const diagSpan = Math.max(zone.w, zone.h) + 80;
    for (let offset = -diagSpan; offset <= diagSpan; offset += 48) {
      ctx.beginPath();
      ctx.moveTo(offset - 12, -zone.h);
      ctx.lineTo(offset + 4, -zone.h);
      ctx.lineTo(offset - 38, zone.h);
      ctx.lineTo(offset - 54, zone.h);
      ctx.closePath();
      ctx.fill();
    }

    // Subtle frosty inner rim glow
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 6;
    traceHazardPath(ctx, localZone);
    ctx.stroke();

    // Subtle stylized ice-crystal crack glints
    ctx.strokeStyle = 'rgba(14, 116, 144, 0.18)';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-zone.w * 0.28, -zone.h * 0.12);
    ctx.lineTo(-zone.w * 0.14, -zone.h * 0.24);
    ctx.lineTo(-zone.w * 0.04, -zone.h * 0.16);
    ctx.moveTo(zone.w * 0.12, zone.h * 0.16);
    ctx.lineTo(zone.w * 0.26, zone.h * 0.04);
    ctx.stroke();
    ctx.restore();

    // Crisp cartoon glacier border separating slippery ice from normal ground
    traceHazardPath(ctx, localZone);
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = '#0284C7';
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore();
}

function drawConveyors(
  ctx: CanvasRenderingContext2D,
  level: LevelDefinition,
  elapsedTime: number
): void {
  const conveyors = level.conveyors;
  if (!conveyors || conveyors.length === 0) return;

  for (const belt of conveyors) {
    const dirLen = Math.hypot(belt.dirX, belt.dirY);
    if (dirLen < 1e-4) continue;
    const ux = belt.dirX / dirLen;
    const uy = belt.dirY / dirLen;
    const moveAngle = Math.atan2(uy, ux);

    // Align belt local +X axis with movement direction so slats & chevrons always scroll toward +X
    const verticalOriented = Math.abs(uy) > Math.abs(ux);
    const beltLen = verticalOriented ? belt.h : belt.w;
    const beltWid = verticalOriented ? belt.w : belt.h;
    const halfL = beltLen / 2;
    const halfW = beltWid / 2;

    ctx.save();
    ctx.translate(belt.x, belt.y);
    ctx.rotate(moveAngle);

    // Soft industrial recess shadow under belt
    drawRoundedRectPath(ctx, -halfL - 2, -halfW - 2, beltLen + 4, beltWid + 4, 10);
    ctx.fillStyle = 'rgba(30, 12, 6, 0.35)';
    ctx.fill();

    // Metallic brass/caramel side rails along belt edges
    drawRoundedRectPath(ctx, -halfL, -halfW, beltLen, beltWid, 8);
    ctx.fillStyle = '#3B1E13';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#F59E0B';
    ctx.stroke();

    // Side guard trim bars with bolts
    ctx.fillStyle = '#D97706';
    ctx.fillRect(-halfL + 6, -halfW, beltLen - 12, 5.5);
    ctx.fillRect(-halfL + 6, halfW - 5.5, beltLen - 12, 5.5);

    // Clipped dark espresso rubber conveyor track with scrolling slats & bright yellow directional arrows
    const innerTop = -halfW + 6;
    const innerH = beltWid - 12;
    ctx.save();
    drawRoundedRectPath(ctx, -halfL + 5, innerTop, beltLen - 10, innerH, 5);
    ctx.clip();

    // Belt rubber base
    ctx.fillStyle = '#2B160F';
    ctx.fillRect(-halfL, innerTop, beltLen, innerH);

    // Scrolling conveyor belt treads/slats moving in +X (indicated belt direction)
    const slatSpacing = 22;
    const scrollOffset = ((elapsedTime * belt.beltSpeed) % slatSpacing + slatSpacing) % slatSpacing;
    ctx.fillStyle = '#47261A';
    for (let sx = -halfL - slatSpacing + scrollOffset; sx <= halfL + slatSpacing; sx += slatSpacing) {
      ctx.fillRect(sx, innerTop, 8, innerH);
    }

    // Subtle glossy strip along center of belt
    ctx.fillStyle = 'rgba(254, 240, 138, 0.08)';
    ctx.fillRect(-halfL, -innerH * 0.22, beltLen, innerH * 0.44);

    // Bold animated directional chevron arrows (>>>) pointing clearly toward +X
    const arrowSpacing = 36;
    const arrowOffset = ((elapsedTime * belt.beltSpeed) % arrowSpacing + arrowSpacing) % arrowSpacing;
    const chevHalfH = Math.min(14, innerH * 0.32);
    const chevDepth = 10;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let ax = -halfL - arrowSpacing + arrowOffset; ax <= halfL + arrowSpacing; ax += arrowSpacing) {
      // Dark outline for crisp contrast
      ctx.beginPath();
      ctx.moveTo(ax - chevDepth * 0.5, -chevHalfH);
      ctx.lineTo(ax + chevDepth * 0.6, 0);
      ctx.lineTo(ax - chevDepth * 0.5, chevHalfH);
      ctx.strokeStyle = '#3B1D0E';
      ctx.lineWidth = 7.5;
      ctx.stroke();

      // Bright sunny yellow directional chevron
      ctx.beginPath();
      ctx.moveTo(ax - chevDepth * 0.5, -chevHalfH);
      ctx.lineTo(ax + chevDepth * 0.6, 0);
      ctx.lineTo(ax - chevDepth * 0.5, chevHalfH);
      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Cream-white core glint
      ctx.beginPath();
      ctx.moveTo(ax - chevDepth * 0.35, -chevHalfH * 0.72);
      ctx.lineTo(ax + chevDepth * 0.42, 0);
      ctx.lineTo(ax - chevDepth * 0.35, chevHalfH * 0.72);
      ctx.strokeStyle = '#FFFDF5';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
    ctx.restore();

    // End rollers (entry & exit cylinders)
    for (const rx of [-halfL + 4, halfL - 4]) {
      drawRoundedRectPath(ctx, rx - 3.5, -halfW + 3, 7, beltWid - 6, 3.5);
      const rollerGrad = ctx.createLinearGradient(rx - 3.5, 0, rx + 3.5, 0);
      rollerGrad.addColorStop(0, '#92400E');
      rollerGrad.addColorStop(0.5, '#FCD34D');
      rollerGrad.addColorStop(1, '#78350F');
      ctx.fillStyle = rollerGrad;
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = '#3B1D0E';
      ctx.stroke();
    }

    ctx.restore();
  }
}

function drawIceSparkles(
  ctx: CanvasRenderingContext2D,
  level: LevelDefinition,
  time: number
): void {
  const hazards = level.hazards;
  if (!hazards) return;

  for (let zi = 0; zi < hazards.length; zi++) {
    const zone = hazards[zi];
    if (zone.kind !== 'ice') continue;

    // Three subtle animated 4-point icy sparkles per ice sheet
    const offsets = [
      [-0.26, -0.22],
      [0.24, 0.18],
      [0.02, -0.05],
    ];
    for (let k = 0; k < offsets.length; k++) {
      const phase = (Math.sin(time * 3.1 + zi * 2.1 + k * 2.4) + 1) * 0.5;
      if (phase < 0.25) continue;
      const alpha = (phase - 0.25) / 0.75;
      const [ox, oy] = offsets[k];
      let lx = zone.w * ox;
      let ly = zone.h * oy;
      if (zone.angle) {
        const c = Math.cos(zone.angle);
        const s = Math.sin(zone.angle);
        const rx = lx * c - ly * s;
        const ry = lx * s + ly * c;
        lx = rx;
        ly = ry;
      }
      const sx = zone.x + lx;
      const sy = zone.y + ly;
      const r = 3.5 + alpha * 3.8;

      ctx.save();
      ctx.translate(sx, sy);
      ctx.globalAlpha = alpha * 0.88;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.quadraticCurveTo(0, 0, 0, r);
      ctx.quadraticCurveTo(0, 0, -r, 0);
      ctx.quadraticCurveTo(0, 0, 0, -r);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}

function drawSnowParticles(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number
): void {
  ctx.save();
  for (let i = 0; i < 36; i++) {
    const seed = i * 137.5;
    const speedY = 22 + (i % 5) * 9;
    const driftX = 14 + (i % 4) * 5;
    const baseX = (seed * 7.3) % (width + 60);
    const baseY = (seed * 3.9) % (height + 40);
    const x = ((baseX + time * driftX + Math.sin(time * 1.1 + i) * 16) % (width + 40) + (width + 40)) % (width + 40) - 20;
    const y = (baseY + time * speedY) % (height + 30) - 15;
    const radius = 1.6 + (i % 3) * 1.15;
    const alpha = 0.42 + (i % 4) * 0.13;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
    ctx.fill();
  }
  ctx.restore();
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
  const popScale = progress < 0.16 ? 0.72 + (progress / 0.16) * 0.36 : 1.08 - Math.min(0.08, (progress - 0.16) * 0.25);
  const yOffset = -20 - progress * 34;
  const label = callout.text ?? 'SPLASH! +1';
  const fillColor = callout.fillColor ?? '#E0F2FE';
  const strokeColor = callout.strokeColor ?? '#0B4F6C';
  const fontSize = Math.round(18 * (callout.scale ?? 1));

  ctx.save();
  ctx.translate(callout.x, callout.y + yOffset);
  ctx.scale(popScale, popScale);
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.font = `700 ${fontSize}px "Fredoka", "Plus Jakarta Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 5.5;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = strokeColor;
  ctx.strokeText(label, 0, 0);
  ctx.fillStyle = fillColor;
  ctx.fillText(label, 0, 0);
  ctx.restore();
}

function drawThemeAmbience(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: LevelDefinition['theme'] = 'resort',
  time: number
): void {
  if (theme === 'frost') {
    drawSnowParticles(ctx, width, height, time);
    return;
  }

  ctx.save();
  if (theme === 'candy') {
    // Lightweight pastel candy sprinkles & sugar sparkles drifting gently around viewport margins
    const candyPalette = ['#EC4899', '#34D399', '#FACC15', '#38BDF8', '#FFFFFF'];
    for (let i = 0; i < 24; i++) {
      const seed = i * 113.7;
      const x =
        (((seed * 8.9 + time * (10 + (i % 4) * 3) + Math.sin(time * 1.1 + i) * 14) % (width + 40)) +
          (width + 40)) %
          (width + 40) -
        20;
      const y =
        (((seed * 4.7 + time * (12 + (i % 3) * 4)) % (height + 30)) + (height + 30)) %
          (height + 30) -
        15;
      const nx = x / Math.max(1, width);
      const ny = y / Math.max(1, height);
      if (nx > 0.13 && nx < 0.87 && ny > 0.14 && ny < 0.86) continue;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(time * (i % 2 === 0 ? 0.9 : -0.8) + i);
      ctx.globalAlpha = 0.58;
      ctx.fillStyle = candyPalette[i % candyPalette.length];
      if (i % 3 === 0) {
        ctx.beginPath();
        ctx.arc(0, 0, 2.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        drawRoundedRectPath(ctx, -4, -1.6, 8, 3.2, 1.6);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
    return;
  }

  if (theme === 'neon') {
    // Subtle pulsing neon grid star-beacons around the outer viewport perimeter
    for (let i = 0; i < 18; i++) {
      const seed = i * 97.3;
      const gx = Math.floor(((seed * 13.7) % Math.max(96, width - 48)) / 48) * 48;
      const gy = Math.floor(((seed * 7.1) % Math.max(96, height - 48)) / 48) * 48;
      // Keep central playfield clear; glow gently around margins
      const nx = gx / Math.max(1, width);
      const ny = gy / Math.max(1, height);
      if (nx > 0.14 && nx < 0.86 && ny > 0.15 && ny < 0.85) continue;

      const pulse = (Math.sin(time * 2.4 + i * 1.7) + 1) * 0.5;
      if (pulse < 0.2) continue;
      const alpha = (pulse - 0.2) * 0.55;
      const color = i % 2 === 0 ? `rgba(56, 189, 248, ${alpha.toFixed(2)})` : `rgba(244, 63, 142, ${alpha.toFixed(2)})`;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(gx, gy, 1.8 + pulse * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (theme === 'beach') {
    // Gentle drifting sea-breeze shimmer arcs along the outer ocean edges
    ctx.lineCap = 'round';
    for (let i = 0; i < 14; i++) {
      const seed = i * 83.1;
      const y = ((seed * 5.7) % Math.max(80, height - 30)) + 15;
      const ny = y / Math.max(1, height);
      const baseX = (seed * 11.3 + time * (10 + (i % 3) * 4)) % (width + 80) - 40;
      const nx = baseX / Math.max(1, width);
      if (nx > 0.11 && nx < 0.89 && ny > 0.12 && ny < 0.88) continue;

      const shimmer = (Math.sin(time * 2.2 + i * 1.4) + 1) * 0.5;
      ctx.strokeStyle = `rgba(224, 251, 252, ${(0.12 + shimmer * 0.2).toFixed(2)})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(baseX, y);
      ctx.quadraticCurveTo(baseX + 16, y - 3.5, baseX + 32, y);
      ctx.stroke();
    }
  } else {
    // Sunny Garden / Resort: warm drifting sunbeam pollen specks & gentle breeze motes around outer border
    for (let i = 0; i < 20; i++) {
      const seed = i * 119.7;
      const x =
        (((seed * 9.3 + time * (11 + (i % 4) * 3) + Math.sin(time * 1.2 + i) * 14) % (width + 40)) +
          (width + 40)) %
          (width + 40) -
        20;
      const y =
        (((seed * 5.1 + Math.sin(time * 0.9 + i * 1.3) * 18) % (height + 20)) + (height + 20)) %
          (height + 20) -
        10;
      const nx = x / Math.max(1, width);
      const ny = y / Math.max(1, height);
      if (nx > 0.13 && nx < 0.87 && ny > 0.14 && ny < 0.86) continue;

      const twinkle = (Math.sin(time * 2.1 + i * 2.2) + 1) * 0.5;
      const r = 1.6 + (i % 3) * 0.85;
      ctx.fillStyle =
        theme === 'garden' && i % 3 === 0
          ? `rgba(254, 240, 138, ${(0.28 + twinkle * 0.34).toFixed(2)})`
          : `rgba(255, 253, 240, ${(0.2 + twinkle * 0.28).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
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
  ctx.fillStyle = isNeon ? '#F43F8E' : level.theme === 'candy' ? '#EC4899' : '#FF4D4F';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = isNeon ? '#FBCFE8' : level.theme === 'candy' ? '#831843' : '#7F1D1D';
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

  if (wall.kind === 'frost-stone') {
    // Drop shadow
    ctx.save();
    ctx.translate(4, 6);
    drawRoundedRectPath(ctx, -hw, -hh, wall.w, wall.h, radius);
    ctx.fillStyle = 'rgba(15, 42, 74, 0.3)';
    ctx.fill();
    ctx.restore();

    // Chiseled alpine stone block
    drawRoundedRectPath(ctx, -hw, -hh, wall.w, wall.h, radius);
    const stoneGrad = ctx.createLinearGradient(0, -hh, 0, hh);
    stoneGrad.addColorStop(0, '#CBD5E1');
    stoneGrad.addColorStop(0.45, '#94A3B8');
    stoneGrad.addColorStop(1, '#64748B');
    ctx.fillStyle = stoneGrad;
    ctx.fill();

    // Snow-dusted top bevel & subtle rock chisel seams
    ctx.save();
    drawRoundedRectPath(ctx, -hw + 2, -hh + 2, wall.w - 4, wall.h - 4, Math.max(2, radius - 2));
    ctx.clip();
    ctx.fillStyle = '#F0F9FF';
    ctx.fillRect(-hw, -hh, wall.w, Math.min(6, wall.h * 0.32));

    ctx.strokeStyle = 'rgba(30, 58, 95, 0.24)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (wall.w >= wall.h) {
      ctx.moveTo(-hw * 0.3, -hh);
      ctx.lineTo(-hw * 0.2, hh);
      ctx.moveTo(hw * 0.32, -hh);
      ctx.lineTo(hw * 0.22, hh);
    } else {
      ctx.moveTo(-hw, -hh * 0.28);
      ctx.lineTo(hw, -hh * 0.16);
      ctx.moveTo(-hw, hh * 0.32);
      ctx.lineTo(hw, hh * 0.2);
    }
    ctx.stroke();
    ctx.restore();

    drawRoundedRectPath(ctx, -hw, -hh, wall.w, wall.h, radius);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#1E3A5F';
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (wall.kind === 'crystal') {
    // Translucent icy glow halo
    drawRoundedRectPath(ctx, -hw - 3, -hh - 3, wall.w + 6, wall.h + 6, radius + 2);
    ctx.fillStyle = 'rgba(125, 211, 252, 0.35)';
    ctx.fill();

    // Faceted glacier crystal obstacle
    drawRoundedRectPath(ctx, -hw, -hh, wall.w, wall.h, radius);
    const crysGrad = ctx.createLinearGradient(-hw, -hh, hw, hh);
    crysGrad.addColorStop(0, '#E0F7FF');
    crysGrad.addColorStop(0.45, '#5DD3FC');
    crysGrad.addColorStop(1, '#0284C7');
    ctx.fillStyle = crysGrad;
    ctx.fill();

    // Geometric crystal facets inside
    ctx.save();
    drawRoundedRectPath(ctx, -hw + 2, -hh + 2, wall.w - 4, wall.h - 4, Math.max(2, radius - 2));
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.moveTo(-hw, -hh);
    ctx.lineTo(hw * 0.4, -hh);
    ctx.lineTo(-hw * 0.2, hh);
    ctx.lineTo(-hw, hh);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-hw * 0.7, -hh * 0.5);
    ctx.lineTo(0, 0);
    ctx.lineTo(hw * 0.7, hh * 0.45);
    ctx.moveTo(0, 0);
    ctx.lineTo(hw * 0.5, -hh * 0.6);
    ctx.stroke();
    ctx.restore();

    drawRoundedRectPath(ctx, -hw, -hh, wall.w, wall.h, radius);
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = '#0C4A6E';
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (wall.kind === 'candy-cane') {
    // Soft cast shadow
    ctx.save();
    ctx.translate(4, 6);
    drawRoundedRectPath(ctx, -hw, -hh, wall.w, wall.h, radius);
    ctx.fillStyle = 'rgba(82, 24, 48, 0.28)';
    ctx.fill();
    ctx.restore();

    // Glossy peppermint-white candy cane base
    drawRoundedRectPath(ctx, -hw, -hh, wall.w, wall.h, radius);
    ctx.fillStyle = '#FFFDF9';
    ctx.fill();

    // Crisp red-and-pink diagonal barber-pole candy stripes clipped inside barrier
    ctx.save();
    drawRoundedRectPath(ctx, -hw + 1, -hh + 1, wall.w - 2, wall.h - 2, Math.max(2, radius - 1));
    ctx.clip();

    const span = wall.w + wall.h + 40;
    const stripePeriod = 26;
    const stripeW = 12;
    ctx.fillStyle = '#EF4444';
    for (let s = -span; s <= span; s += stripePeriod) {
      ctx.beginPath();
      ctx.moveTo(s, -hh - 6);
      ctx.lineTo(s + stripeW, -hh - 6);
      ctx.lineTo(s + stripeW - wall.h - 12, hh + 6);
      ctx.lineTo(s - wall.h - 12, hh + 6);
      ctx.closePath();
      ctx.fill();
    }

    // Glossy sugar glaze highlight band
    ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
    if (wall.w >= wall.h) {
      ctx.fillRect(-hw, -hh, wall.w, Math.min(5.5, wall.h * 0.3));
    } else {
      ctx.fillRect(-hw, -hh, Math.min(5.5, wall.w * 0.3), wall.h);
    }
    ctx.restore();

    drawRoundedRectPath(ctx, -hw, -hh, wall.w, wall.h, radius);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#7F1D1D';
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (wall.kind === 'jellybean') {
    const capsuleRadius = Math.min(hw, hh);
    // Soft shadow
    ctx.save();
    ctx.translate(4, 6);
    drawRoundedRectPath(ctx, -hw, -hh, wall.w, wall.h, capsuleRadius);
    ctx.fillStyle = 'rgba(82, 24, 48, 0.28)';
    ctx.fill();
    ctx.restore();

    // Deterministic playful jellybean flavor palette by wall id
    const hash = wall.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const flavors: [string, string, string][] = [
      ['#F472B6', '#EC4899', '#9D174D'], // Strawberry
      ['#FDE047', '#F59E0B', '#92400E'], // Lemon
      ['#6EE7B7', '#10B981', '#065F46'], // Mint
      ['#C084FC', '#9333EA', '#581C87'], // Grape
    ];
    const [hi, mid, rim] = flavors[hash % flavors.length];

    drawRoundedRectPath(ctx, -hw, -hh, wall.w, wall.h, capsuleRadius);
    const jbGrad = ctx.createLinearGradient(-hw, -hh, hw, hh);
    jbGrad.addColorStop(0, hi);
    jbGrad.addColorStop(0.55, mid);
    jbGrad.addColorStop(1, rim);
    ctx.fillStyle = jbGrad;
    ctx.fill();

    // Specular glossy bean highlight
    ctx.save();
    drawRoundedRectPath(ctx, -hw + 2, -hh + 2, wall.w - 4, wall.h - 4, Math.max(2, capsuleRadius - 2));
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.48)';
    if (wall.w >= wall.h) {
      drawRoundedRectPath(ctx, -hw + 7, -hh + 3.5, wall.w - 14, Math.max(4, wall.h * 0.24), 4);
    } else {
      drawRoundedRectPath(ctx, -hw + 3.5, -hh + 7, Math.max(4, wall.w * 0.24), wall.h - 14, 4);
    }
    ctx.fill();
    ctx.restore();

    drawRoundedRectPath(ctx, -hw, -hh, wall.w, wall.h, capsuleRadius);
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = '#522810';
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Soft cast drop shadow onto turf
  ctx.save();
  ctx.translate(4, 6);
  drawRoundedRectPath(ctx, -hw, -hh, wall.w, wall.h, radius);
  ctx.fillStyle = theme === 'frost' ? 'rgba(15, 42, 74, 0.28)' : 'rgba(20, 48, 28, 0.28)';
  ctx.fill();
  ctx.restore();

  // Base wood body
  drawRoundedRectPath(ctx, -hw, -hh, wall.w, wall.h, radius);
  const woodGrad = ctx.createLinearGradient(0, -hh, 0, hh);
  if (theme === 'frost') {
    // Elegant warm alpine chalet cedar borders with frosted edge highlights
    woodGrad.addColorStop(0, '#C9824D');
    woodGrad.addColorStop(0.5, '#A15A2C');
    woodGrad.addColorStop(1, '#7A3E1A');
  } else if (wall.kind === 'border') {
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

  // Top highlight lip (delicate powdery frost dusting on Frost Falls borders)
  ctx.save();
  drawRoundedRectPath(ctx, -hw + 2, -hh + 2, wall.w - 4, wall.h - 4, Math.max(2, radius - 2));
  ctx.clip();
  ctx.fillStyle =
    theme === 'frost' ? 'rgba(240, 249, 255, 0.45)' : 'rgba(255, 232, 195, 0.28)';
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
  ctx.strokeStyle = theme === 'frost' ? '#43200D' : '#522810';
  ctx.stroke();

  // Brass corner rivets on interior timber obstacles
  if (wall.kind === 'wood' && Math.max(wall.w, wall.h) > 60) {
    ctx.fillStyle = theme === 'frost' ? '#E0F2FE' : '#FCD34D';
    ctx.strokeStyle = theme === 'frost' ? '#1E3A5F' : '#78350F';
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

  if (bumper.style === 'snowball') {
    // Cool winter drop shadow
    ctx.beginPath();
    ctx.arc(4, 6, bumper.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 42, 74, 0.28)';
    ctx.fill();

    // Soft icy frost ring halo on impact pulse
    if (pulse > 0.05) {
      ctx.beginPath();
      ctx.arc(0, 0, bumper.radius + 5 + pulse * 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(186, 230, 253, ${(pulse * 0.5).toFixed(2)})`;
      ctx.fill();
    }

    // Packed cartoon snowball body
    const snowGrad = ctx.createRadialGradient(
      -bumper.radius * 0.3,
      -bumper.radius * 0.32,
      bumper.radius * 0.15,
      0,
      0,
      bumper.radius
    );
    snowGrad.addColorStop(0, '#FFFFFF');
    snowGrad.addColorStop(0.58, '#E6F5FF');
    snowGrad.addColorStop(1, '#93C5FD');
    ctx.beginPath();
    ctx.arc(0, 0, bumper.radius, 0, Math.PI * 2);
    ctx.fillStyle = snowGrad;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#1E3A5F';
    ctx.stroke();

    // Inner bouncy icy-blue cushion ring
    ctx.beginPath();
    ctx.arc(0, 0, bumper.radius * 0.66, 0, Math.PI * 2);
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2.6;
    ctx.setLineDash([7, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Stylized packed snow texture dimples & top specular sheen
    ctx.fillStyle = 'rgba(147, 197, 253, 0.48)';
    ctx.beginPath();
    ctx.arc(bumper.radius * 0.26, bumper.radius * 0.24, bumper.radius * 0.14, 0, Math.PI * 2);
    ctx.arc(-bumper.radius * 0.12, bumper.radius * 0.34, bumper.radius * 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(-bumper.radius * 0.28, -bumper.radius * 0.3, bumper.radius * 0.26, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();

    ctx.restore();
    return;
  }

  if (bumper.style === 'candy') {
    // Candy factory drop shadow
    ctx.beginPath();
    ctx.arc(4, 6, bumper.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(92, 24, 52, 0.28)';
    ctx.fill();

    // Juicy pastel pulse halo on bounce
    if (pulse > 0.05) {
      ctx.beginPath();
      ctx.arc(0, 0, bumper.radius + 6 + pulse * 5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(251, 207, 232, ${(pulse * 0.58).toFixed(2)})`;
      ctx.fill();
    }

    // Creamy peppermint candy base
    ctx.beginPath();
    ctx.arc(0, 0, bumper.radius, 0, Math.PI * 2);
    ctx.fillStyle = bumper.accentColor || '#FFFDF5';
    ctx.fill();

    // 6-segment curved peppermint pinwheel wedges clipped inside bumper
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, bumper.radius - 2, 0, Math.PI * 2);
    ctx.clip();
    const wedges = 6;
    for (let i = 0; i < wedges; i++) {
      if (i % 2 !== 0) continue;
      const a0 = (i / wedges) * Math.PI * 2;
      const a1 = ((i + 1) / wedges) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, bumper.radius, a0, a1);
      ctx.closePath();
      ctx.fillStyle = bumper.color;
      ctx.fill();
    }
    ctx.restore();

    // Outer crisp candy glaze border
    ctx.beginPath();
    ctx.arc(0, 0, bumper.radius, 0, Math.PI * 2);
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = '#6B1839';
    ctx.stroke();

    // Center glossy sugar button
    ctx.beginPath();
    ctx.arc(0, 0, bumper.radius * 0.34, 0, Math.PI * 2);
    ctx.fillStyle = bumper.color;
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#FFFDF5';
    ctx.stroke();

    // Specular candy sheen dot
    ctx.beginPath();
    ctx.arc(-bumper.radius * 0.28, -bumper.radius * 0.3, bumper.radius * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.fill();

    ctx.restore();
    return;
  }

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
  angle: number,
  theme: LevelDefinition['theme'] = 'resort'
): void {
  const isFrost = theme === 'frost';
  ctx.save();
  ctx.translate(rotator.cx, rotator.cy);

  // Subtle sweep track ring on turf so players clearly read the danger radius!
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, rotator.length / 2, 0, Math.PI * 2);
  ctx.strokeStyle = isFrost ? 'rgba(12, 74, 110, 0.28)' : 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.stroke();
  ctx.restore();

  // Draw each rotating paddle blade
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
    ctx.fillStyle = isFrost ? 'rgba(15, 42, 74, 0.28)' : 'rgba(15, 45, 25, 0.26)';
    ctx.fill();
    ctx.restore();

    // Main bright painted windmill paddle (frosty glacier-blue or warm amber wood)
    drawRoundedRectPath(ctx, -hw, -hh, rotator.length, rotator.thickness, 9);
    const bladeGrad = ctx.createLinearGradient(0, -hh, 0, hh);
    if (isFrost) {
      bladeGrad.addColorStop(0, '#7DD3FC');
      bladeGrad.addColorStop(0.5, '#0EA5E9');
      bladeGrad.addColorStop(1, '#0369A1');
    } else {
      bladeGrad.addColorStop(0, '#F59E0B');
      bladeGrad.addColorStop(0.5, '#D97706');
      bladeGrad.addColorStop(1, '#B45309');
    }
    ctx.fillStyle = bladeGrad;
    ctx.fill();

    // High-visibility stripe tips for motion reading
    ctx.save();
    drawRoundedRectPath(ctx, -hw, -hh, rotator.length, rotator.thickness, 9);
    ctx.clip();
    ctx.fillStyle = isFrost ? '#F0F9FF' : '#FEF3C7';
    ctx.fillRect(-hw + 14, -hh, 16, rotator.thickness);
    ctx.fillRect(hw - 30, -hh, 16, rotator.thickness);
    ctx.fillStyle = 'rgba(255,255,255,0.34)';
    ctx.fillRect(-hw, -hh, rotator.length, 5);
    ctx.restore();

    drawRoundedRectPath(ctx, -hw, -hh, rotator.length, rotator.thickness, 9);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = isFrost ? '#0C4A6E' : '#522810';
    ctx.stroke();

    ctx.restore();
  }

  // Center windmill hub cap
  ctx.beginPath();
  ctx.arc(3, 5, rotator.hubRadius, 0, Math.PI * 2);
  ctx.fillStyle = isFrost ? 'rgba(15, 42, 74, 0.3)' : 'rgba(15, 45, 25, 0.28)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, rotator.hubRadius, 0, Math.PI * 2);
  ctx.fillStyle = isFrost ? '#0284C7' : '#EF4444';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = isFrost ? '#0C4A6E' : '#522011';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, rotator.hubRadius * 0.48, 0, Math.PI * 2);
  ctx.fillStyle = isFrost ? '#E0F7FF' : '#FDE047';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = isFrost ? '#0369A1' : '#78350F';
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

  // Pull-back slingshot tether behind the ball
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
    ctx.strokeStyle = shot.valid ? 'rgba(44, 24, 16, 0.42)' : 'rgba(44, 24, 16, 0.22)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.setLineDash([6, 7]);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(px, py);
    ctx.strokeStyle = shot.valid ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.setLineDash([6, 7]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Pull handle knob with crisp highlight
    ctx.beginPath();
    ctx.arc(px, py, shot.valid ? 8.5 : 6, 0, Math.PI * 2);
    ctx.fillStyle = shot.valid ? powerColor : '#94A3B8';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#2C1810';
    ctx.stroke();
    if (shot.valid) {
      ctx.beginPath();
      ctx.arc(px - 2.2, py - 2.2, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
      ctx.fill();
    }
  }

  if (!shot.valid) {
    // Subtle ring indicating cancel zone
    ctx.beginPath();
    ctx.arc(bx, by, 21, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Radial power gauge arc around the ball (fills smoothly 0 -> 100%)
  const aimAngle = Math.atan2(shot.aimDir.y, shot.aimDir.x);
  const gaugeRadius = sim.ball.radius + 10.5;
  const arcSpan = Math.PI * 1.45;
  const startAngle = aimAngle + Math.PI - arcSpan / 2;
  const fillAngle = startAngle + arcSpan * shot.power;

  // Backing track
  ctx.beginPath();
  ctx.arc(bx, by, gaugeRadius, startAngle, startAngle + arcSpan);
  ctx.strokeStyle = 'rgba(24, 16, 12, 0.55)';
  ctx.lineWidth = 6.5;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Active power arc
  ctx.beginPath();
  ctx.arc(bx, by, gaugeRadius, startAngle, fillAngle);
  ctx.strokeStyle = powerColor;
  ctx.lineWidth = 3.8;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Predicted dotted trajectory with wall/gate bounce & clear bounce marker
  const pathPoints = predictAimPath(
    sim.ball,
    shot.vx,
    shot.vy,
    level,
    sim.rotatorAngles,
    30,
    sim.elapsedTime
  );

  // Subtle dashed guide thread connecting predicted dots
  if (pathPoints.length > 2) {
    ctx.beginPath();
    ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
    for (let i = 1; i < pathPoints.length; i++) {
      ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  let bounceIndex = -1;
  for (let i = 1; i < pathPoints.length - 1; i++) {
    const d1x = pathPoints[i].x - pathPoints[i - 1].x;
    const d1y = pathPoints[i].y - pathPoints[i - 1].y;
    const d2x = pathPoints[i + 1].x - pathPoints[i].x;
    const d2y = pathPoints[i + 1].y - pathPoints[i].y;
    const l1 = Math.hypot(d1x, d1y);
    const l2 = Math.hypot(d2x, d2y);
    if (l1 > 0.5 && l2 > 0.5) {
      const dot = (d1x * d2x + d1y * d2y) / (l1 * l2);
      if (dot < 0.72) {
        bounceIndex = i;
        break;
      }
    }
  }

  for (let i = 1; i < pathPoints.length; i++) {
    const t = i / pathPoints.length;
    const pt = pathPoints[i];
    const dotRadius = Math.max(2.4, 5.6 * (1 - t * 0.54));

    if (i === bounceIndex) {
      // Crisp bounce reflection ring marker
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 7.5, 0, Math.PI * 2);
      ctx.strokeStyle = '#2C1810';
      ctx.lineWidth = 3.5;
      ctx.stroke();
      ctx.strokeStyle = powerColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, dotRadius, 0, Math.PI * 2);
    ctx.fillStyle =
      i === 1 || i === bounceIndex
        ? powerColor
        : `rgba(255, 255, 255, ${(0.96 - t * 0.62).toFixed(2)})`;
    ctx.fill();
    ctx.lineWidth = 1.7;
    ctx.strokeStyle = `rgba(30, 20, 14, ${(0.68 - t * 0.42).toFixed(2)})`;
    ctx.stroke();
  }

  // Aiming direction arrow with dual-stroke arcade styling
  const arrowStart = 17;
  const arrowLen = 30 + shot.power * 54;
  const sx = bx + shot.aimDir.x * arrowStart;
  const sy = by + shot.aimDir.y * arrowStart;
  const tipX = bx + shot.aimDir.x * arrowLen;
  const tipY = by + shot.aimDir.y * arrowLen;

  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(tipX, tipY);
  ctx.strokeStyle = '#2C1810';
  ctx.lineWidth = 8.5;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(tipX, tipY);
  ctx.strokeStyle = powerColor;
  ctx.lineWidth = 4.6;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Subtle white center highlight stripe along arrow shaft
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(tipX, tipY);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Crisp arrowhead chevron
  ctx.save();
  ctx.translate(tipX, tipY);
  ctx.rotate(aimAngle);
  ctx.beginPath();
  ctx.moveTo(8.5, 0);
  ctx.lineTo(-7.5, -7.8);
  ctx.lineTo(-4, 0);
  ctx.lineTo(-7.5, 7.8);
  ctx.closePath();
  ctx.fillStyle = powerColor;
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#2C1810';
  ctx.stroke();
  ctx.restore();

  // Clean power percentage indicator positioned smartly opposite the aim direction
  const pct = Math.round(shot.power * 100);
  ctx.font = '800 13px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const labelX = Math.max(40, Math.min(level.worldWidth - 40, bx - shot.aimDir.x * 40));
  const labelY = Math.max(24, Math.min(level.worldHeight - 24, by - shot.aimDir.y * 40 - 16));
  ctx.lineWidth = 4.5;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#2C1810';
  ctx.strokeText(`${pct}%`, labelX, labelY);
  ctx.fillStyle = powerColor;
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

function drawParticlesAndTrail(
  ctx: CanvasRenderingContext2D,
  pool: ParticlePool,
  theme: LevelDefinition['theme'] = 'resort'
): void {
  const trailRgb =
    theme === 'neon'
      ? '125, 211, 252'
      : theme === 'frost'
      ? '224, 247, 255'
      : '255, 255, 255';

  // Smooth tapered fading ribbon trail behind the rolling ball
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < pool.trail.length - 1; i++) {
    const pt = pool.trail[i];
    const next = pool.trail[i + 1];
    if (pt.alpha <= 0.015 || next.alpha <= 0.015) continue;
    // Skip ribbon segment across portal teleports
    if (Math.hypot(pt.x - next.x, pt.y - next.y) > 90) continue;
    const t = 1 - i / pool.trail.length;
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    ctx.lineTo(next.x, next.y);
    ctx.strokeStyle = `rgba(${trailRgb}, ${(pt.alpha * 0.44 * t).toFixed(3)})`;
    ctx.lineWidth = Math.max(1.8, pt.radius * 1.45 * t);
    ctx.stroke();
  }

  // Subtle fading trail core dots
  for (let i = 0; i < pool.trail.length; i++) {
    const pt = pool.trail[i];
    if (pt.alpha <= 0.02) continue;
    const t = 1 - i / pool.trail.length;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, Math.max(1.5, pt.radius * 0.58 * t), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${(pt.alpha * 0.34 * t).toFixed(3)})`;
    ctx.fill();
  }
  ctx.restore();

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
      ctx.lineWidth = Math.max(1.2, 3.6 * alpha);
      ctx.stroke();
    } else if (p.shape === 'confetti') {
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size * 0.32, p.size, p.size * 0.64);
    } else if (p.shape === 'sparkle') {
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation * 0.4);
      const r = p.size * (0.45 + alpha * 0.65);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.quadraticCurveTo(0, 0, 0, r);
      ctx.quadraticCurveTo(0, 0, -r, 0);
      ctx.quadraticCurveTo(0, 0, 0, -r);
      ctx.closePath();
      ctx.fill();
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
  if (theme === 'candy') {
    grad.addColorStop(0, '#F9B4D2');
    grad.addColorStop(0.5, '#FDE6B5');
    grad.addColorStop(1, '#B9F3DC');
  } else if (theme === 'neon') {
    grad.addColorStop(0, '#0B061E');
    grad.addColorStop(0.5, '#150A35');
    grad.addColorStop(1, '#0D0624');
  } else if (theme === 'frost') {
    grad.addColorStop(0, '#2F6DA3');
    grad.addColorStop(0.5, '#205688');
    grad.addColorStop(1, '#16406B');
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
  if (theme === 'candy') {
    // Soft pastel polka dots across the candy-factory backdrop
    ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
    const step = 64;
    for (let y = 24; y < transform.height + 20; y += step) {
      const shift = (Math.floor(y / step) % 2) * 32;
      for (let x = 16; x < transform.width + 20; x += step) {
        ctx.beginPath();
        ctx.arc(x + shift, y, 5.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (theme === 'neon') {
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
  } else if (theme === 'frost') {
    // Crisp winter alpine wind-swept glacier ribbons
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.14)';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const spacing = 84;
    for (let y = 24; y < transform.height + 20; y += spacing) {
      const rowShift = (Math.floor(y / spacing) % 2) * 86;
      for (let x = -20; x < transform.width + 40; x += 172) {
        const sx = x + rowShift;
        ctx.moveTo(sx, y);
        ctx.quadraticCurveTo(sx + 32, y - 6, sx + 64, y - 2);
      }
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

  // Courtyard / beach island / neon cabinet deck / snowbank resort plateau
  drawGardenIsland(ctx, level, 0);

  // Surrounding props (foliage, palms, umbrellas, flowers, stones, winter pines, snowmen, crystals)
  for (const prop of level.decor) {
    drawDecorProp(ctx, prop, 0);
  }

  // Mowed putting turf & tee mat
  drawTurf(ctx, level);

  // Glossy ice sheets on Frost Falls courses (clipped neatly inside turf polygons)
  drawIceHazards(ctx, level);

  // Sand trap patches on turf
  drawSandHazards(ctx, level);

  // Wooden, frosted stone, crystal, or neon outer borders & interior walls
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
        level.theme === 'candy'
          ? '#F9B4D2'
          : level.theme === 'neon'
          ? '#0D0624'
          : level.theme === 'frost'
          ? '#16406B'
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
    drawIceHazards(ctx, level);
    drawSandHazards(ctx, level);
    for (const wall of level.walls) {
      drawWoodenWall(ctx, wall, level.theme);
    }
    ctx.restore();
  }

  ctx.save();
  ctx.translate(transform.offsetX + shakeX, transform.offsetY + shakeY);
  ctx.scale(transform.scale, transform.scale);

  // Animated icy sparkles on Frost Falls glacier sheets
  if (level.theme === 'frost') {
    drawIceSparkles(ctx, level, sim.elapsedTime);
  }

  // Animated moving conveyor belts with clear directional arrows
  drawConveyors(ctx, level, sim.elapsedTime);

  // Shimmering water hazards
  drawWaterHazards(ctx, level, sim.elapsedTime);

  // Attract (blue) & repel (red) neon force zones
  drawForceZones(ctx, level, sim.elapsedTime);

  // Connected glowing teleportation portals
  drawPortals(ctx, level, sim.elapsedTime);

  // Cup & fluttering flag
  drawHoleAndFlag(ctx, level, sim.ball.x, sim.ball.y, sim.elapsedTime);

  // Bouncy bumpers (classic, neon, or snowball)
  const isNeon = level.theme === 'neon';
  for (const bumper of level.bumpers) {
    drawBumper(ctx, bumper, sim.bumperPulse[bumper.id] || 0, isNeon);
  }

  // Rotating windmill / frost-spinner blades
  for (let i = 0; i < level.rotators.length; i++) {
    drawRotatingObstacle(ctx, level.rotators[i], sim.rotatorAngles[i], level.theme);
  }

  // Periodically opening & closing neon gates
  drawMovingGates(ctx, level, sim.elapsedTime);

  // Aiming slingshot & bounce preview
  drawAimOverlay(ctx, sim, level, aim);

  // Speed trail & particles
  drawParticlesAndTrail(ctx, particles, level.theme);

  // Golf ball
  drawBall(ctx, sim, sim.elapsedTime);

  // Water penalty / Birdie / Eagle / Hole-in-One floating callout
  drawSplashCallout(ctx, splashCallout);

  ctx.restore();

  // Subtle lightweight ambient theme animations around viewport (snow, sun motes, beach shimmer, neon beacons)
  drawThemeAmbience(ctx, transform.width, transform.height, level.theme, sim.elapsedTime);
}

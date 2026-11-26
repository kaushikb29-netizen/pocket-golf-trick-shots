import { LevelDefinition, RectWall, Vec2 } from './types';

export const WORLD_WIDTH = 900;
export const WORLD_HEIGHT = 540;
export const BALL_RADIUS = 12;
export const HOLE_RADIUS = 20;

const BORDER_T = 22;

/**
 * Generate a smooth curved barrier built from tightly overlapping angled OBB segments.
 * Preserves rock-solid collision physics with zero corner leaks while rendering as a curved rail.
 */
function makeArcBarrier(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  segments: number,
  thickness: number,
  prefix: string,
  kind: RectWall['kind'] = 'candy-cane'
): RectWall[] {
  const walls: RectWall[] = [];
  const step = (endAngle - startAngle) / segments;
  for (let i = 0; i < segments; i++) {
    const a0 = startAngle + i * step;
    const a1 = a0 + step;
    const x0 = cx + Math.cos(a0) * radius;
    const y0 = cy + Math.sin(a0) * radius;
    const x1 = cx + Math.cos(a1) * radius;
    const y1 = cy + Math.sin(a1) * radius;
    const len = Math.hypot(x1 - x0, y1 - y0);
    walls.push({
      id: `${prefix}-arc-${i}`,
      x: (x0 + x1) / 2,
      y: (y0 + y1) / 2,
      w: len + thickness * 0.45,
      h: thickness,
      angle: Math.atan2(y1 - y0, x1 - x0),
      kind,
    });
  }
  return walls;
}

function makeBoxBorders(
  left: number,
  top: number,
  right: number,
  bottom: number,
  prefix: string
): RectWall[] {
  const width = right - left;
  const height = bottom - top;
  return [
    {
      id: `${prefix}-top`,
      x: left + width / 2,
      y: top - BORDER_T / 2,
      w: width + BORDER_T * 2,
      h: BORDER_T,
      angle: 0,
      kind: 'border',
    },
    {
      id: `${prefix}-bottom`,
      x: left + width / 2,
      y: bottom + BORDER_T / 2,
      w: width + BORDER_T * 2,
      h: BORDER_T,
      angle: 0,
      kind: 'border',
    },
    {
      id: `${prefix}-left`,
      x: left - BORDER_T / 2,
      y: top + height / 2,
      w: BORDER_T,
      h: height,
      angle: 0,
      kind: 'border',
    },
    {
      id: `${prefix}-right`,
      x: right + BORDER_T / 2,
      y: top + height / 2,
      w: BORDER_T,
      h: height,
      angle: 0,
      kind: 'border',
    },
  ];
}

/**
 * Generate watertight outer wooden border walls tightly hugging any clockwise polygon.
 * Convex corners extend outward to seal joints; concave corners stop flush to prevent inward protrusion.
 */
function makePolygonBorders(
  points: Vec2[],
  prefix: string,
  kind: RectWall['kind'] = 'border'
): RectWall[] {
  const n = points.length;
  const walls: RectWall[] = [];

  for (let i = 0; i < n; i++) {
    const pPrev = points[(i - 1 + n) % n];
    const p0 = points[i];
    const p1 = points[(i + 1) % n];
    const pNext = points[(i + 2) % n];

    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) continue;

    const ux = dx / len;
    const uy = dy / len;
    // Outward normal for clockwise polygon in Y-down screen coordinates
    const nx = uy;
    const ny = -ux;

    const prevDx = p0.x - pPrev.x;
    const prevDy = p0.y - pPrev.y;
    const nextDx = pNext.x - p1.x;
    const nextDy = pNext.y - p1.y;

    const crossStart = prevDx * dy - prevDy * dx;
    const crossEnd = dx * nextDy - dy * nextDx;

    const extStart = crossStart > 0 ? BORDER_T * 0.56 : 0;
    const extEnd = crossEnd > 0 ? BORDER_T * 0.56 : 0;

    const cx = (p0.x + p1.x) / 2 + ux * ((extEnd - extStart) / 2) + nx * (BORDER_T / 2);
    const cy = (p0.y + p1.y) / 2 + uy * ((extEnd - extStart) / 2) + ny * (BORDER_T / 2);

    walls.push({
      id: `${prefix}-poly-${i}`,
      x: cx,
      y: cy,
      w: len + extStart + extEnd,
      h: BORDER_T,
      angle: Math.atan2(dy, dx),
      kind,
    });
  }

  return walls;
}

export const LEVELS: LevelDefinition[] = [
  // ===========================================================================
  // LEVEL 1: Simple Straight Putting Course
  // ===========================================================================
  {
    id: 1,
    name: 'Sunny Straightaway',
    subtitle: 'Line up your putt and sink it smooth',
    par: 2,
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    tee: { x: 200, y: 270 },
    hole: { x: 700, y: 270 },
    holeRadius: HOLE_RADIUS,
    turfPolygons: [
      {
        points: [
          { x: 110, y: 155 },
          { x: 790, y: 155 },
          { x: 790, y: 385 },
          { x: 110, y: 385 },
        ],
      },
    ],
    walls: [
      ...makeBoxBorders(110, 155, 790, 385, 'l1'),
      // Friendly 45-degree chamfered corner rails at the hole end for lively rebounds
      {
        id: 'l1-corner-tr',
        x: 768,
        y: 177,
        w: 72,
        h: 18,
        angle: Math.PI / 4,
        kind: 'wood',
      },
      {
        id: 'l1-corner-br',
        x: 768,
        y: 363,
        w: 72,
        h: 18,
        angle: -Math.PI / 4,
        kind: 'wood',
      },
    ],
    bumpers: [],
    rotators: [],
    decor: [
      { kind: 'palm', x: 64, y: 84, scale: 1.05, rotation: 0.2 },
      { kind: 'palm', x: 840, y: 92, scale: 0.95, rotation: -0.4 },
      { kind: 'bush', x: 170, y: 78, scale: 0.9 },
      { kind: 'flower', x: 310, y: 82, scale: 1, color: '#FF6B6B' },
      { kind: 'flower', x: 615, y: 80, scale: 0.95, color: '#FFD93D' },
      { kind: 'umbrella', x: 752, y: 468, scale: 1.05, color: '#FF6B4A' },
      { kind: 'bush', x: 118, y: 468, scale: 1.1 },
      { kind: 'flower', x: 245, y: 466, scale: 1, color: '#FFD93D' },
      { kind: 'stone', x: 450, y: 466, scale: 1 },
      { kind: 'bush', x: 845, y: 446, scale: 0.9 },
    ],
  },

  // ===========================================================================
  // LEVEL 2: Walls, Deflectors & Ricochet Obstacles
  // ===========================================================================
  {
    id: 2,
    name: 'Timber Ricochet',
    subtitle: 'Bank around the walls and bouncy pegs',
    par: 3,
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    tee: { x: 165, y: 375 },
    hole: { x: 735, y: 165 },
    holeRadius: HOLE_RADIUS,
    turfPolygons: [
      {
        points: [
          { x: 95, y: 95 },
          { x: 805, y: 95 },
          { x: 805, y: 445 },
          { x: 95, y: 445 },
        ],
      },
    ],
    walls: [
      ...makeBoxBorders(95, 95, 805, 445, 'l2'),
      // First wooden divider coming down from top — forces shot low or via upper gap
      {
        id: 'l2-wall-1',
        x: 335,
        y: 235,
        w: 22,
        h: 240,
        angle: 0,
        kind: 'wood',
      },
      // Second wooden divider coming up from bottom — creates S-bend trick lane
      {
        id: 'l2-wall-2',
        x: 565,
        y: 315,
        w: 22,
        h: 235,
        angle: 0,
        kind: 'wood',
      },
      // Angled trick-shot bank wall at top-left corner
      {
        id: 'l2-angle-tl',
        x: 132,
        y: 132,
        w: 96,
        h: 18,
        angle: -Math.PI / 4,
        kind: 'wood',
      },
      // Angled bank wall at bottom-right corner
      {
        id: 'l2-angle-br',
        x: 768,
        y: 408,
        w: 96,
        h: 18,
        angle: -Math.PI / 4,
        kind: 'wood',
      },
    ],
    bumpers: [
      {
        id: 'l2-bumper-1',
        x: 450,
        y: 270,
        radius: 26,
        restitution: 1.15,
        color: '#FF6B4A',
        accentColor: '#FFE066',
      },
      {
        id: 'l2-bumper-2',
        x: 685,
        y: 285,
        radius: 20,
        restitution: 1.1,
        color: '#FF9F1C',
        accentColor: '#FFF3B0',
      },
    ],
    rotators: [],
    decor: [
      { kind: 'palm', x: 46, y: 74, scale: 0.95, rotation: 0.35 },
      { kind: 'palm', x: 856, y: 472, scale: 1.0, rotation: -0.25 },
      { kind: 'umbrella', x: 852, y: 72, scale: 0.92, color: '#38BDF8' },
      { kind: 'bush', x: 46, y: 462, scale: 0.95 },
      { kind: 'flower', x: 44, y: 270, scale: 0.95, color: '#FF6B6B' },
      { kind: 'flower', x: 858, y: 265, scale: 0.95, color: '#FFD93D' },
      { kind: 'stone', x: 250, y: 495, scale: 0.9 },
      { kind: 'stone', x: 645, y: 44, scale: 0.9 },
    ],
  },

  // ===========================================================================
  // LEVEL 3: Rotating Windmill Obstacle
  // ===========================================================================
  {
    id: 3,
    name: 'Windmill Mill',
    subtitle: 'Time your shot past the spinning wooden blades',
    par: 3,
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    tee: { x: 165, y: 270 },
    hole: { x: 745, y: 270 },
    holeRadius: HOLE_RADIUS,
    turfPolygons: [
      {
        points: [
          { x: 95, y: 110 },
          { x: 805, y: 110 },
          { x: 805, y: 430 },
          { x: 95, y: 430 },
        ],
      },
    ],
    walls: [
      ...makeBoxBorders(95, 110, 805, 430, 'l3'),
      // Side guide rails funneling toward the rotating centerpiece while leaving bank channels
      {
        id: 'l3-pinch-top',
        x: 325,
        y: 165,
        w: 22,
        h: 95,
        angle: 0,
        kind: 'wood',
      },
      {
        id: 'l3-pinch-bottom',
        x: 325,
        y: 375,
        w: 22,
        h: 95,
        angle: 0,
        kind: 'wood',
      },
      // Angled bank walls on the hole end
      {
        id: 'l3-angle-tr',
        x: 768,
        y: 147,
        w: 94,
        h: 18,
        angle: Math.PI / 4,
        kind: 'wood',
      },
      {
        id: 'l3-angle-br',
        x: 768,
        y: 393,
        w: 94,
        h: 18,
        angle: -Math.PI / 4,
        kind: 'wood',
      },
    ],
    bumpers: [
      {
        id: 'l3-bumper-top',
        x: 615,
        y: 175,
        radius: 19,
        restitution: 1.1,
        color: '#FF6B4A',
        accentColor: '#FFE066',
      },
      {
        id: 'l3-bumper-bot',
        x: 615,
        y: 365,
        radius: 19,
        restitution: 1.1,
        color: '#FF6B4A',
        accentColor: '#FFE066',
      },
    ],
    rotators: [
      {
        id: 'l3-windmill',
        cx: 470,
        cy: 270,
        length: 218,
        thickness: 22,
        blades: 2,
        initialAngle: Math.PI / 4,
        angularVelocity: 1.15,
        hubRadius: 22,
      },
    ],
    decor: [
      { kind: 'palm', x: 52, y: 80, scale: 1.0, rotation: 0.15 },
      { kind: 'palm', x: 852, y: 82, scale: 0.95, rotation: -0.35 },
      { kind: 'umbrella', x: 58, y: 468, scale: 1.0, color: '#FACC15' },
      { kind: 'bush', x: 848, y: 462, scale: 1.05 },
      { kind: 'flower', x: 260, y: 58, scale: 0.95, color: '#FF6B6B' },
      { kind: 'flower', x: 650, y: 58, scale: 0.95, color: '#FFD93D' },
      { kind: 'flower', x: 455, y: 486, scale: 1.0, color: '#FB7185' },
      { kind: 'stone', x: 290, y: 488, scale: 0.95 },
      { kind: 'stone', x: 640, y: 486, scale: 0.95 },
    ],
  },

  // ===========================================================================
  // LEVEL 4: Zigzag Garden (Sunny Garden, Easy–Medium, Par 3)
  // ===========================================================================
  {
    id: 4,
    name: 'Zigzag Garden',
    subtitle: 'Bank cleanly through the winding garden barriers',
    par: 3,
    theme: 'garden',
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    tee: { x: 160, y: 372 },
    hole: { x: 740, y: 365 },
    holeRadius: HOLE_RADIUS,
    turfPolygons: [
      {
        points: [
          { x: 95, y: 95 },
          { x: 805, y: 95 },
          { x: 805, y: 445 },
          { x: 95, y: 445 },
        ],
      },
    ],
    walls: [
      ...makeBoxBorders(95, 95, 805, 445, 'l4'),
      // Winding wooden zigzag barriers (each leaves a generous ~120px lane)
      {
        id: 'l4-zig-1',
        x: 280,
        y: 330,
        w: 22,
        h: 228,
        angle: 0,
        kind: 'wood',
      },
      {
        id: 'l4-zig-2',
        x: 455,
        y: 210,
        w: 22,
        h: 228,
        angle: 0,
        kind: 'wood',
      },
      {
        id: 'l4-zig-3',
        x: 625,
        y: 330,
        w: 22,
        h: 228,
        angle: 0,
        kind: 'wood',
      },
      // Angled 45-degree ricochet bank bumpers at key corners
      {
        id: 'l4-angle-tl',
        x: 132,
        y: 132,
        w: 92,
        h: 18,
        angle: -Math.PI / 4,
        kind: 'wood',
      },
      {
        id: 'l4-angle-tm',
        x: 416,
        y: 130,
        w: 84,
        h: 18,
        angle: Math.PI / 4,
        kind: 'wood',
      },
      {
        id: 'l4-angle-bm',
        x: 586,
        y: 410,
        w: 84,
        h: 18,
        angle: -Math.PI / 4,
        kind: 'wood',
      },
      {
        id: 'l4-angle-tr',
        x: 768,
        y: 132,
        w: 92,
        h: 18,
        angle: Math.PI / 4,
        kind: 'wood',
      },
    ],
    bumpers: [
      {
        id: 'l4-bumper-1',
        x: 368,
        y: 360,
        radius: 19,
        restitution: 1.12,
        color: '#FF6B4A',
        accentColor: '#FFE066',
      },
      {
        id: 'l4-bumper-2',
        x: 540,
        y: 185,
        radius: 19,
        restitution: 1.12,
        color: '#FF9F1C',
        accentColor: '#FFF3B0',
      },
    ],
    rotators: [],
    hazards: [],
    decor: [
      { kind: 'bush', x: 50, y: 80, scale: 1.05 },
      { kind: 'bush', x: 850, y: 84, scale: 1.05 },
      { kind: 'bush', x: 52, y: 458, scale: 1.0 },
      { kind: 'bush', x: 848, y: 462, scale: 1.05 },
      { kind: 'flower', x: 220, y: 50, scale: 1.05, color: '#FF6B6B' },
      { kind: 'flower', x: 455, y: 48, scale: 1.0, color: '#FFD93D' },
      { kind: 'flower', x: 690, y: 50, scale: 1.05, color: '#FB7185' },
      { kind: 'flower', x: 250, y: 492, scale: 1.0, color: '#A78BFA' },
      { kind: 'flower', x: 645, y: 492, scale: 1.0, color: '#FFD93D' },
      { kind: 'stone', x: 450, y: 494, scale: 1.0 },
      { kind: 'flower', x: 48, y: 270, scale: 0.95, color: '#FFD93D' },
      { kind: 'flower', x: 854, y: 270, scale: 0.95, color: '#FF6B6B' },
    ],
  },

  // ===========================================================================
  // LEVEL 5: Sandy Shortcut (Tropical Beach, Medium, Par 3)
  // ===========================================================================
  {
    id: 5,
    name: 'Sandy Shortcut',
    subtitle: 'Take the smooth upper bend or brave the sandy shortcut',
    par: 3,
    theme: 'beach',
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    tee: { x: 165, y: 330 },
    hole: { x: 735, y: 330 },
    holeRadius: HOLE_RADIUS,
    turfPolygons: [
      {
        points: [
          { x: 95, y: 95 },
          { x: 805, y: 95 },
          { x: 805, y: 445 },
          { x: 95, y: 445 },
        ],
      },
    ],
    walls: [
      ...makeBoxBorders(95, 95, 805, 445, 'l5'),
      // Central timber ridge dividing the longer upper safe route from the shorter sandy route
      {
        id: 'l5-divider',
        x: 450,
        y: 232,
        w: 290,
        h: 22,
        angle: 0,
        kind: 'wood',
      },
      // Friendly angled corner rails guiding the longer safe upper route
      {
        id: 'l5-angle-tl',
        x: 132,
        y: 132,
        w: 96,
        h: 18,
        angle: -Math.PI / 4,
        kind: 'wood',
      },
      {
        id: 'l5-angle-tr',
        x: 768,
        y: 132,
        w: 96,
        h: 18,
        angle: Math.PI / 4,
        kind: 'wood',
      },
    ],
    bumpers: [],
    rotators: [],
    hazards: [
      // Two clearly visible beach sand bunkers spanning the direct lower shortcut
      {
        id: 'l5-sand-1',
        kind: 'sand',
        shape: 'ellipse',
        x: 375,
        y: 336,
        w: 156,
        h: 138,
      },
      {
        id: 'l5-sand-2',
        kind: 'sand',
        shape: 'ellipse',
        x: 545,
        y: 356,
        w: 146,
        h: 134,
      },
    ],
    decor: [
      { kind: 'palm', x: 52, y: 76, scale: 1.05, rotation: 0.25 },
      { kind: 'palm', x: 848, y: 78, scale: 1.0, rotation: -0.35 },
      { kind: 'palm', x: 850, y: 462, scale: 0.92, rotation: 0.4 },
      { kind: 'umbrella', x: 58, y: 462, scale: 1.02, color: '#FF6B4A' },
      { kind: 'umbrella', x: 450, y: 492, scale: 0.88, color: '#38BDF8' },
      { kind: 'flower', x: 255, y: 48, scale: 0.95, color: '#FFD93D' },
      { kind: 'flower', x: 645, y: 48, scale: 0.95, color: '#FF6B6B' },
      { kind: 'stone', x: 225, y: 492, scale: 0.9 },
      { kind: 'stone', x: 680, y: 492, scale: 0.9 },
    ],
  },

  // ===========================================================================
  // LEVEL 6: Island Hop (Tropical Beach, Medium, Par 4)
  // ===========================================================================
  {
    id: 6,
    name: 'Island Hop',
    subtitle: 'Pick the upper or lower causeway and avoid the lagoon',
    par: 4,
    theme: 'beach',
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    tee: { x: 165, y: 270 },
    hole: { x: 740, y: 270 },
    holeRadius: HOLE_RADIUS,
    turfPolygons: [
      {
        points: [
          { x: 95, y: 95 },
          { x: 805, y: 95 },
          { x: 805, y: 445 },
          { x: 95, y: 445 },
        ],
      },
    ],
    walls: [
      ...makeBoxBorders(95, 95, 805, 445, 'l6'),
      // Angled corner banks helping players steer around either safe island pathway
      {
        id: 'l6-angle-tr',
        x: 768,
        y: 132,
        w: 92,
        h: 18,
        angle: Math.PI / 4,
        kind: 'wood',
      },
      {
        id: 'l6-angle-bl',
        x: 132,
        y: 408,
        w: 92,
        h: 18,
        angle: Math.PI / 4,
        kind: 'wood',
      },
      // Small wooden guard bumper on the right island side to aid ricochets toward the cup
      {
        id: 'l6-angle-br',
        x: 768,
        y: 408,
        w: 76,
        h: 18,
        angle: -Math.PI / 4,
        kind: 'wood',
      },
    ],
    bumpers: [
      {
        id: 'l6-bumper-top',
        x: 615,
        y: 128,
        radius: 16,
        restitution: 1.08,
        color: '#FF6B4A',
        accentColor: '#FFE066',
      },
      {
        id: 'l6-bumper-bot',
        x: 295,
        y: 414,
        radius: 16,
        restitution: 1.08,
        color: '#FF9F1C',
        accentColor: '#FFF3B0',
      },
    ],
    rotators: [],
    hazards: [
      // Central sparkling water lagoon splitting the course into upper & lower safe pathways
      {
        id: 'l6-water-center',
        kind: 'water',
        shape: 'rect',
        x: 450,
        y: 270,
        w: 204,
        h: 122,
        radius: 26,
      },
      // Top-left water cove (leaves generous ~88px diagonal entry to the 115px upper path)
      {
        id: 'l6-water-tl',
        kind: 'water',
        shape: 'rect',
        x: 230,
        y: 124,
        w: 96,
        h: 54,
        radius: 18,
      },
      // Bottom-right water cove (leaves generous ~88px diagonal exit from the 115px lower path)
      {
        id: 'l6-water-br',
        kind: 'water',
        shape: 'rect',
        x: 668,
        y: 416,
        w: 96,
        h: 54,
        radius: 18,
      },
    ],
    decor: [
      { kind: 'palm', x: 50, y: 80, scale: 1.05, rotation: 0.15 },
      { kind: 'palm', x: 850, y: 80, scale: 1.0, rotation: -0.3 },
      { kind: 'palm', x: 52, y: 462, scale: 0.95, rotation: 0.5 },
      { kind: 'umbrella', x: 846, y: 460, scale: 1.0, color: '#FACC15' },
      { kind: 'umbrella', x: 450, y: 48, scale: 0.86, color: '#FF6B4A' },
      { kind: 'flower', x: 265, y: 492, scale: 0.95, color: '#FFD93D' },
      { kind: 'flower', x: 635, y: 492, scale: 0.95, color: '#FB7185' },
      { kind: 'stone', x: 450, y: 494, scale: 0.95 },
    ],
  },

  // ===========================================================================
  // LEVEL 7: Palm Pinball (Tropical Trouble, Medium, Par 4)
  // ===========================================================================
  {
    id: 7,
    name: 'Palm Pinball',
    subtitle: 'Ricochet through the tropical bumper cluster to reach the cup',
    par: 4,
    theme: 'beach',
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    tee: { x: 158, y: 270 },
    hole: { x: 744, y: 270 },
    holeRadius: HOLE_RADIUS,
    turfPolygons: [
      {
        points: [
          { x: 95, y: 95 },
          { x: 805, y: 95 },
          { x: 805, y: 445 },
          { x: 95, y: 445 },
        ],
      },
    ],
    walls: [
      ...makeBoxBorders(95, 95, 805, 445, 'l7'),
      // Angled wooden pinball flippers / bank barriers framing the arena
      {
        id: 'l7-angle-tl',
        x: 132,
        y: 132,
        w: 92,
        h: 18,
        angle: -Math.PI / 4,
        kind: 'wood',
      },
      {
        id: 'l7-angle-bl',
        x: 132,
        y: 408,
        w: 92,
        h: 18,
        angle: Math.PI / 4,
        kind: 'wood',
      },
      {
        id: 'l7-funnel-top',
        x: 300,
        y: 130,
        w: 108,
        h: 18,
        angle: 0.32,
        kind: 'wood',
      },
      {
        id: 'l7-funnel-bot',
        x: 300,
        y: 410,
        w: 108,
        h: 18,
        angle: -0.32,
        kind: 'wood',
      },
      {
        id: 'l7-angle-tr',
        x: 768,
        y: 132,
        w: 94,
        h: 18,
        angle: Math.PI / 4,
        kind: 'wood',
      },
      {
        id: 'l7-angle-br',
        x: 768,
        y: 408,
        w: 94,
        h: 18,
        angle: -Math.PI / 4,
        kind: 'wood',
      },
    ],
    bumpers: [
      {
        id: 'l7-bumper-lead',
        x: 372,
        y: 270,
        radius: 25,
        restitution: 1.18,
        color: '#FF595E',
        accentColor: '#FFE066',
      },
      {
        id: 'l7-bumper-mid-top',
        x: 472,
        y: 182,
        radius: 22,
        restitution: 1.16,
        color: '#FF9F1C',
        accentColor: '#FFF3B0',
      },
      {
        id: 'l7-bumper-mid-bot',
        x: 472,
        y: 358,
        radius: 22,
        restitution: 1.16,
        color: '#FF9F1C',
        accentColor: '#FFF3B0',
      },
      {
        id: 'l7-bumper-rear-top',
        x: 572,
        y: 228,
        radius: 20,
        restitution: 1.15,
        color: '#FF6B4A',
        accentColor: '#FFE066',
      },
      {
        id: 'l7-bumper-rear-bot',
        x: 572,
        y: 312,
        radius: 20,
        restitution: 1.15,
        color: '#FF6B4A',
        accentColor: '#FFE066',
      },
    ],
    rotators: [],
    hazards: [],
    decor: [
      { kind: 'palm', x: 50, y: 76, scale: 1.08, rotation: 0.2 },
      { kind: 'palm', x: 850, y: 76, scale: 1.05, rotation: -0.3 },
      { kind: 'palm', x: 52, y: 462, scale: 1.02, rotation: 0.45 },
      { kind: 'palm', x: 848, y: 462, scale: 1.0, rotation: -0.45 },
      { kind: 'umbrella', x: 265, y: 48, scale: 0.9, color: '#FF6B4A' },
      { kind: 'umbrella', x: 635, y: 492, scale: 0.9, color: '#38BDF8' },
      { kind: 'flower', x: 450, y: 48, scale: 1.0, color: '#FFD93D' },
      { kind: 'flower', x: 640, y: 48, scale: 0.95, color: '#FB7185' },
      { kind: 'flower', x: 255, y: 492, scale: 0.95, color: '#FF6B6B' },
      { kind: 'stone', x: 450, y: 492, scale: 0.95 },
    ],
  },

  // ===========================================================================
  // LEVEL 8: Windy Beach (Tropical Trouble, Medium–Hard, Par 4)
  // ===========================================================================
  {
    id: 8,
    name: 'Windy Beach',
    subtitle: 'Thread the central passage between twin spinning windmills',
    par: 4,
    theme: 'beach',
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    tee: { x: 152, y: 270 },
    hole: { x: 748, y: 270 },
    holeRadius: HOLE_RADIUS,
    turfPolygons: [
      {
        points: [
          { x: 95, y: 95 },
          { x: 805, y: 95 },
          { x: 805, y: 445 },
          { x: 95, y: 445 },
        ],
      },
    ],
    walls: [
      ...makeBoxBorders(95, 95, 805, 445, 'l8'),
      // Narrow central passage wooden guide walls (leaves clean 134px central gap y=203..337)
      {
        id: 'l8-passage-top',
        x: 450,
        y: 149,
        w: 24,
        h: 108,
        angle: 0,
        kind: 'wood',
      },
      {
        id: 'l8-passage-bot',
        x: 450,
        y: 391,
        w: 24,
        h: 108,
        angle: 0,
        kind: 'wood',
      },
      // Final putting section wooden guard rails framing the green
      {
        id: 'l8-green-top',
        x: 668,
        y: 138,
        w: 20,
        h: 84,
        angle: 0,
        kind: 'wood',
      },
      {
        id: 'l8-green-bot',
        x: 668,
        y: 402,
        w: 20,
        h: 84,
        angle: 0,
        kind: 'wood',
      },
      // Angled corner rails on the putting green back corners
      {
        id: 'l8-angle-tr',
        x: 770,
        y: 130,
        w: 84,
        h: 18,
        angle: Math.PI / 4,
        kind: 'wood',
      },
      {
        id: 'l8-angle-br',
        x: 770,
        y: 410,
        w: 84,
        h: 18,
        angle: -Math.PI / 4,
        kind: 'wood',
      },
    ],
    bumpers: [],
    rotators: [
      {
        id: 'l8-windmill-left',
        cx: 318,
        cy: 270,
        length: 168,
        thickness: 20,
        blades: 1,
        initialAngle: 0.35,
        angularVelocity: 0.82,
        hubRadius: 17,
      },
      {
        id: 'l8-windmill-right',
        cx: 576,
        cy: 270,
        length: 168,
        thickness: 20,
        blades: 1,
        initialAngle: Math.PI / 2 + 0.35,
        angularVelocity: -0.78,
        hubRadius: 17,
      },
    ],
    hazards: [
      // Decorative sandy beach patches tucked into the outer corners
      {
        id: 'l8-sand-tl',
        kind: 'sand',
        shape: 'ellipse',
        x: 200,
        y: 145,
        w: 112,
        h: 70,
      },
      {
        id: 'l8-sand-bl',
        kind: 'sand',
        shape: 'ellipse',
        x: 200,
        y: 395,
        w: 112,
        h: 70,
      },
    ],
    decor: [
      { kind: 'palm', x: 52, y: 78, scale: 1.05, rotation: 0.1 },
      { kind: 'palm', x: 850, y: 462, scale: 1.02, rotation: -0.35 },
      { kind: 'umbrella', x: 846, y: 76, scale: 0.96, color: '#FACC15' },
      { kind: 'umbrella', x: 56, y: 460, scale: 0.98, color: '#FF6B4A' },
      { kind: 'flower', x: 265, y: 48, scale: 0.95, color: '#FF6B6B' },
      { kind: 'flower', x: 635, y: 48, scale: 0.95, color: '#FFD93D' },
      { kind: 'bush', x: 450, y: 48, scale: 0.88 },
      { kind: 'flower', x: 450, y: 492, scale: 1.0, color: '#FB7185' },
      { kind: 'stone', x: 265, y: 492, scale: 0.95 },
      { kind: 'stone', x: 635, y: 492, scale: 0.95 },
    ],
  },

  // ===========================================================================
  // LEVEL 9: Laser Lanes (Neon Nights, Hard, Par 4)
  // ===========================================================================
  {
    id: 9,
    name: 'Laser Lanes',
    subtitle: 'Time your shots past the pulsing neon gates',
    par: 4,
    theme: 'neon',
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    tee: { x: 154, y: 270 },
    hole: { x: 748, y: 270 },
    holeRadius: HOLE_RADIUS,
    turfPolygons: [
      {
        points: [
          { x: 95, y: 95 },
          { x: 805, y: 95 },
          { x: 805, y: 445 },
          { x: 95, y: 445 },
        ],
      },
    ],
    walls: [
      ...makeBoxBorders(95, 95, 805, 445, 'l9'),
      // Checkpoint 1 fixed neon rectangular housings framing Moving Gate 1 (y = 202..338)
      {
        id: 'l9-gate1-top',
        x: 342,
        y: 148,
        w: 24,
        h: 106,
        angle: 0,
        kind: 'wood',
      },
      {
        id: 'l9-gate1-bot',
        x: 342,
        y: 392,
        w: 24,
        h: 106,
        angle: 0,
        kind: 'wood',
      },
      // Center fixed rectangular divider creating upper & lower laser lanes
      {
        id: 'l9-mid-block',
        x: 478,
        y: 270,
        w: 26,
        h: 122,
        angle: 0,
        kind: 'wood',
      },
      // Checkpoint 2 fixed neon rectangular housings framing Moving Gate 2 (y = 202..338)
      {
        id: 'l9-gate2-top',
        x: 614,
        y: 148,
        w: 24,
        h: 106,
        angle: 0,
        kind: 'wood',
      },
      {
        id: 'l9-gate2-bot',
        x: 614,
        y: 392,
        w: 24,
        h: 106,
        angle: 0,
        kind: 'wood',
      },
    ],
    bumpers: [],
    rotators: [],
    gates: [
      {
        id: 'l9-gate-1',
        closedX: 342,
        closedY: 270,
        openX: 342,
        openY: 136,
        w: 18,
        h: 132,
        period: 4.2,
        phaseOffset: 0,
        color: '#38BDF8',
      },
      {
        id: 'l9-gate-2',
        closedX: 614,
        closedY: 270,
        openX: 614,
        openY: 404,
        w: 18,
        h: 132,
        period: 4.2,
        phaseOffset: Math.PI * 0.7,
        color: '#F43F8E',
      },
    ],
    hazards: [],
    decor: [],
  },

  // ===========================================================================
  // LEVEL 10: Teleport Trick (Neon Nights, Par 4)
  // ===========================================================================
  {
    id: 10,
    name: 'Teleport Trick',
    subtitle: 'Warp across the sealed neon divider through the linked portals',
    par: 4,
    theme: 'neon',
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    tee: { x: 162, y: 342 },
    hole: { x: 734, y: 196 },
    holeRadius: HOLE_RADIUS,
    turfPolygons: [
      {
        points: [
          { x: 95, y: 95 },
          { x: 805, y: 95 },
          { x: 805, y: 445 },
          { x: 95, y: 445 },
        ],
      },
    ],
    walls: [
      ...makeBoxBorders(95, 95, 805, 445, 'l10'),
      // Full-height central neon divider sealing Chamber 1 from Chamber 2
      {
        id: 'l10-mid-divider',
        x: 450,
        y: 270,
        w: 24,
        h: 350,
        angle: 0,
        kind: 'wood',
      },
      // Chamber 1 barrier guiding players around the upper bend or corner bank into Portal A
      {
        id: 'l10-left-block',
        x: 286,
        y: 294,
        w: 22,
        h: 174,
        angle: 0,
        kind: 'wood',
      },
      // Chamber 2 barrier creating an upper sprint or lower angled-bank shot to the cup
      {
        id: 'l10-right-mid-block',
        x: 636,
        y: 252,
        w: 22,
        h: 144,
        angle: 0,
        kind: 'wood',
      },
      // Angled neon corner banks for trick-shot ricochets
      {
        id: 'l10-angle-tl',
        x: 132,
        y: 132,
        w: 88,
        h: 18,
        angle: -Math.PI / 4,
        kind: 'wood',
      },
      {
        id: 'l10-angle-tm',
        x: 410,
        y: 130,
        w: 78,
        h: 18,
        angle: Math.PI / 4,
        kind: 'wood',
      },
      {
        id: 'l10-angle-tr',
        x: 768,
        y: 132,
        w: 88,
        h: 18,
        angle: Math.PI / 4,
        kind: 'wood',
      },
      {
        id: 'l10-angle-br',
        x: 768,
        y: 408,
        w: 88,
        h: 18,
        angle: -Math.PI / 4,
        kind: 'wood',
      },
    ],
    bumpers: [],
    rotators: [],
    portals: [
      {
        id: 'l10-portal-main',
        a: { x: 362, y: 186, radius: 22 },
        b: { x: 526, y: 354, radius: 22 },
        color: '#38BDF8',
        accentColor: '#C084FC',
      },
    ],
    hazards: [],
    decor: [],
  },

  // ===========================================================================
  // LEVEL 11: Gravity Bump (Neon Nights, Par 4)
  // ===========================================================================
  {
    id: 11,
    name: 'Gravity Bump',
    subtitle: 'Ride the blue pull field and steer around the red repulsor',
    par: 4,
    theme: 'neon',
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    tee: { x: 156, y: 270 },
    hole: { x: 746, y: 270 },
    holeRadius: HOLE_RADIUS,
    turfPolygons: [
      {
        points: [
          { x: 95, y: 95 },
          { x: 805, y: 95 },
          { x: 805, y: 445 },
          { x: 95, y: 445 },
        ],
      },
    ],
    walls: [
      ...makeBoxBorders(95, 95, 805, 445, 'l11'),
      // Central neon monolith separating the upper attract lane and lower repel lane
      {
        id: 'l11-mid-wall',
        x: 450,
        y: 278,
        w: 24,
        h: 146,
        angle: 0,
        kind: 'wood',
      },
      // Fixed upper-right guard barrier encouraging a curved exit out of the blue zone
      {
        id: 'l11-upper-guard',
        x: 592,
        y: 150,
        w: 22,
        h: 110,
        angle: 0,
        kind: 'wood',
      },
      // Fixed lower-left guard barrier framing the red repel route
      {
        id: 'l11-lower-guard',
        x: 306,
        y: 392,
        w: 22,
        h: 106,
        angle: 0,
        kind: 'wood',
      },
      // Angled back-corner bank rails
      {
        id: 'l11-angle-tr',
        x: 768,
        y: 132,
        w: 86,
        h: 18,
        angle: Math.PI / 4,
        kind: 'wood',
      },
      {
        id: 'l11-angle-br',
        x: 768,
        y: 408,
        w: 86,
        h: 18,
        angle: -Math.PI / 4,
        kind: 'wood',
      },
    ],
    bumpers: [],
    rotators: [],
    forceZones: [
      {
        id: 'l11-attract-blue',
        kind: 'attract',
        x: 342,
        y: 196,
        radius: 92,
        strength: 340,
      },
      {
        id: 'l11-repel-red',
        kind: 'repel',
        x: 552,
        y: 336,
        radius: 92,
        strength: 360,
      },
    ],
    hazards: [],
    decor: [],
  },

  // ===========================================================================
  // LEVEL 12: Ultimate Trick Shot (Neon Nights, Par 5)
  // ===========================================================================
  {
    id: 12,
    name: 'Ultimate Trick Shot',
    subtitle: 'Master bumpers, portals, and the laser gate to claim the trophy',
    par: 5,
    theme: 'neon',
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    tee: { x: 148, y: 366 },
    hole: { x: 750, y: 270 },
    holeRadius: HOLE_RADIUS,
    turfPolygons: [
      {
        points: [
          { x: 95, y: 95 },
          { x: 805, y: 95 },
          { x: 805, y: 445 },
          { x: 95, y: 445 },
        ],
      },
    ],
    walls: [
      ...makeBoxBorders(95, 95, 805, 445, 'l12'),
      // Angled barriers offering bank lines to Portal A or through the bumper cluster
      {
        id: 'l12-angle-tl',
        x: 132,
        y: 132,
        w: 86,
        h: 18,
        angle: -Math.PI / 4,
        kind: 'wood',
      },
      {
        id: 'l12-angle-mid',
        x: 346,
        y: 134,
        w: 94,
        h: 18,
        angle: 0.35,
        kind: 'wood',
      },
      {
        id: 'l12-angle-bot',
        x: 508,
        y: 408,
        w: 92,
        h: 18,
        angle: -Math.PI / 4,
        kind: 'wood',
      },
      // Moving gate fixed housings at x = 574 (open doorway y = 209..331)
      {
        id: 'l12-gate-top',
        x: 574,
        y: 152,
        w: 24,
        h: 114,
        angle: 0,
        kind: 'wood',
      },
      {
        id: 'l12-gate-bot',
        x: 574,
        y: 388,
        w: 24,
        h: 114,
        angle: 0,
        kind: 'wood',
      },
      // Final narrow putting section rails leading directly to the glowing cup
      {
        id: 'l12-chute-top',
        x: 695,
        y: 206,
        w: 216,
        h: 20,
        angle: 0,
        kind: 'wood',
      },
      {
        id: 'l12-chute-bot',
        x: 695,
        y: 334,
        w: 216,
        h: 20,
        angle: 0,
        kind: 'wood',
      },
    ],
    bumpers: [
      {
        id: 'l12-bumper-1',
        x: 314,
        y: 344,
        radius: 20,
        restitution: 1.15,
        color: '#38BDF8',
        accentColor: '#BAE6FD',
      },
      {
        id: 'l12-bumper-2',
        x: 394,
        y: 242,
        radius: 21,
        restitution: 1.15,
        color: '#F43F8E',
        accentColor: '#FBCFE8',
      },
      {
        id: 'l12-bumper-3',
        x: 452,
        y: 352,
        radius: 20,
        restitution: 1.15,
        color: '#A855F7',
        accentColor: '#E9D5FF',
      },
    ],
    rotators: [],
    gates: [
      {
        id: 'l12-gate-1',
        closedX: 574,
        closedY: 270,
        openX: 574,
        openY: 146,
        w: 18,
        h: 120,
        period: 4.0,
        phaseOffset: 0,
        color: '#38BDF8',
      },
    ],
    portals: [
      {
        id: 'l12-portal-shortcut',
        a: { x: 238, y: 162, radius: 21 },
        b: { x: 512, y: 162, radius: 21 },
        color: '#38BDF8',
        accentColor: '#F43F8E',
      },
    ],
    hazards: [],
    decor: [],
  },

  // ===========================================================================
  // LEVEL 13: Frozen Straightaway (Frost Falls, Par 3)
  // ===========================================================================
  {
    id: 13,
    name: 'Frozen Straightaway',
    subtitle: 'Glide across slippery glacier ice around the snowy bend',
    par: 3,
    theme: 'frost',
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    tee: { x: 162, y: 332 },
    hole: { x: 734, y: 212 },
    holeRadius: HOLE_RADIUS,
    turfPolygons: [
      {
        points: [
          { x: 95, y: 250 },
          { x: 365, y: 250 },
          { x: 475, y: 130 },
          { x: 805, y: 130 },
          { x: 805, y: 295 },
          { x: 535, y: 295 },
          { x: 425, y: 415 },
          { x: 95, y: 415 },
        ],
      },
    ],
    walls: [
      ...makePolygonBorders(
        [
          { x: 95, y: 250 },
          { x: 365, y: 250 },
          { x: 475, y: 130 },
          { x: 805, y: 130 },
          { x: 805, y: 295 },
          { x: 535, y: 295 },
          { x: 425, y: 415 },
          { x: 95, y: 415 },
        ],
        'l13'
      ),
      // Frosted stone angled guide deflectors along the winding bend
      {
        id: 'l13-stone-low',
        x: 388,
        y: 386,
        w: 72,
        h: 18,
        angle: -0.45,
        kind: 'frost-stone',
      },
      {
        id: 'l13-stone-high',
        x: 512,
        y: 158,
        w: 72,
        h: 18,
        angle: -0.45,
        kind: 'frost-stone',
      },
      // Friendly wooden corner banks behind the cup
      {
        id: 'l13-angle-tr',
        x: 780,
        y: 155,
        w: 64,
        h: 16,
        angle: Math.PI / 4,
        kind: 'wood',
      },
      {
        id: 'l13-angle-br',
        x: 780,
        y: 270,
        w: 64,
        h: 16,
        angle: -Math.PI / 4,
        kind: 'wood',
      },
    ],
    bumpers: [],
    rotators: [],
    hazards: [
      // Three cleanly spaced glistening ice sheets introducing smooth low-friction glide
      {
        id: 'l13-ice-1',
        kind: 'ice',
        shape: 'rect',
        x: 294,
        y: 332,
        w: 120,
        h: 112,
        radius: 22,
      },
      {
        id: 'l13-ice-2',
        kind: 'ice',
        shape: 'rect',
        x: 450,
        y: 272,
        w: 132,
        h: 88,
        radius: 22,
        angle: -0.82,
      },
      {
        id: 'l13-ice-3',
        kind: 'ice',
        shape: 'rect',
        x: 604,
        y: 212,
        w: 116,
        h: 112,
        radius: 22,
      },
    ],
    decor: [
      { kind: 'snow-pine', x: 108, y: 122, scale: 1.1 },
      { kind: 'snow-pine', x: 238, y: 138, scale: 0.92 },
      { kind: 'snowman', x: 324, y: 154, scale: 1.0 },
      { kind: 'crystal', x: 176, y: 184, scale: 1.0 },
      { kind: 'crystal', x: 645, y: 378, scale: 1.1 },
      { kind: 'snow-pine', x: 752, y: 396, scale: 1.08 },
      { kind: 'snow-pine', x: 562, y: 432, scale: 0.95 },
      { kind: 'frost-rock', x: 678, y: 448, scale: 1.0 },
      { kind: 'frost-rock', x: 452, y: 68, scale: 0.92 },
      { kind: 'crystal', x: 842, y: 88, scale: 0.9 },
      { kind: 'snow-pine', x: 848, y: 368, scale: 0.85 },
      { kind: 'frost-rock', x: 150, y: 468, scale: 0.95 },
    ],
  },

  // ===========================================================================
  // LEVEL 14: Snowball Ricochet (Frost Falls, Par 4)
  // ===========================================================================
  {
    id: 14,
    name: 'Snowball Ricochet',
    subtitle: 'Bank around the sweeping snow arch off giant snowball bumpers',
    par: 4,
    theme: 'frost',
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    tee: { x: 188, y: 386 },
    hole: { x: 706, y: 386 },
    holeRadius: HOLE_RADIUS,
    turfPolygons: [
      {
        points: [
          { x: 95, y: 250 },
          { x: 185, y: 110 },
          { x: 360, y: 82 },
          { x: 540, y: 82 },
          { x: 715, y: 110 },
          { x: 805, y: 250 },
          { x: 805, y: 442 },
          { x: 595, y: 442 },
          { x: 560, y: 268 },
          { x: 340, y: 268 },
          { x: 305, y: 442 },
          { x: 95, y: 442 },
        ],
      },
    ],
    walls: [
      ...makePolygonBorders(
        [
          { x: 95, y: 250 },
          { x: 185, y: 110 },
          { x: 360, y: 82 },
          { x: 540, y: 82 },
          { x: 715, y: 110 },
          { x: 805, y: 250 },
          { x: 805, y: 442 },
          { x: 595, y: 442 },
          { x: 560, y: 268 },
          { x: 340, y: 268 },
          { x: 305, y: 442 },
          { x: 95, y: 442 },
        ],
        'l14'
      ),
      // Angled wooden barriers crafted for calculated ricochets around the arch
      {
        id: 'l14-wood-tee',
        x: 266,
        y: 332,
        w: 68,
        h: 16,
        angle: 0.56,
        kind: 'wood',
      },
      {
        id: 'l14-wood-top-l',
        x: 346,
        y: 120,
        w: 76,
        h: 16,
        angle: -0.26,
        kind: 'wood',
      },
      {
        id: 'l14-wood-top-r',
        x: 554,
        y: 120,
        w: 76,
        h: 16,
        angle: 0.26,
        kind: 'wood',
      },
      {
        id: 'l14-chute-guard',
        x: 786,
        y: 318,
        w: 38,
        h: 64,
        angle: 0,
        kind: 'frost-stone',
      },
      {
        id: 'l14-wood-br',
        x: 766,
        y: 404,
        w: 76,
        h: 16,
        angle: -Math.PI / 4,
        kind: 'wood',
      },
    ],
    bumpers: [
      {
        id: 'l14-snow-1',
        x: 254,
        y: 196,
        radius: 32,
        restitution: 1.22,
        color: '#E0F2FE',
        accentColor: '#BAE6FD',
        style: 'snowball',
      },
      {
        id: 'l14-snow-2',
        x: 450,
        y: 152,
        radius: 34,
        restitution: 1.24,
        color: '#E0F2FE',
        accentColor: '#BAE6FD',
        style: 'snowball',
      },
      {
        id: 'l14-snow-3',
        x: 646,
        y: 196,
        radius: 32,
        restitution: 1.22,
        color: '#E0F2FE',
        accentColor: '#BAE6FD',
        style: 'snowball',
      },
      {
        id: 'l14-snow-4',
        x: 654,
        y: 324,
        radius: 24,
        restitution: 1.16,
        color: '#E0F2FE',
        accentColor: '#BAE6FD',
        style: 'snowball',
      },
    ],
    rotators: [],
    hazards: [
      // Two glossy curved-arch ice panels rewarding crisp ricochets
      {
        id: 'l14-ice-left',
        kind: 'ice',
        shape: 'rect',
        x: 346,
        y: 192,
        w: 112,
        h: 92,
        radius: 24,
        angle: -0.18,
      },
      {
        id: 'l14-ice-right',
        kind: 'ice',
        shape: 'rect',
        x: 554,
        y: 192,
        w: 112,
        h: 92,
        radius: 24,
        angle: 0.18,
      },
    ],
    decor: [
      // Cozy winter courtyard nestled right inside the sweeping horseshoe arch
      { kind: 'snowman', x: 450, y: 368, scale: 1.18 },
      { kind: 'snow-pine', x: 374, y: 346, scale: 0.96 },
      { kind: 'snow-pine', x: 526, y: 346, scale: 0.96 },
      { kind: 'crystal', x: 390, y: 424, scale: 0.95 },
      { kind: 'crystal', x: 512, y: 424, scale: 0.95 },
      { kind: 'frost-rock', x: 450, y: 444, scale: 0.9 },
      // Outer alpine resort accents
      { kind: 'snow-pine', x: 66, y: 102, scale: 1.02 },
      { kind: 'snow-pine', x: 834, y: 102, scale: 1.02 },
      { kind: 'crystal', x: 64, y: 184, scale: 0.85 },
      { kind: 'crystal', x: 836, y: 184, scale: 0.85 },
      { kind: 'frost-rock', x: 240, y: 52, scale: 0.85 },
      { kind: 'frost-rock', x: 660, y: 52, scale: 0.85 },
    ],
  },

  // ===========================================================================
  // LEVEL 15: Crystal Crossing (Frost Falls, Par 4)
  // ===========================================================================
  {
    id: 15,
    name: 'Crystal Crossing',
    subtitle: 'Pick upper or lower routes across alternating snow and ice',
    par: 4,
    theme: 'frost',
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    tee: { x: 158, y: 270 },
    hole: { x: 742, y: 270 },
    holeRadius: HOLE_RADIUS,
    turfPolygons: [
      {
        points: [
          { x: 155, y: 88 },
          { x: 745, y: 88 },
          { x: 812, y: 165 },
          { x: 812, y: 375 },
          { x: 745, y: 452 },
          { x: 155, y: 452 },
          { x: 88, y: 375 },
          { x: 88, y: 165 },
        ],
      },
    ],
    walls: [
      ...makePolygonBorders(
        [
          { x: 155, y: 88 },
          { x: 745, y: 88 },
          { x: 812, y: 165 },
          { x: 812, y: 375 },
          { x: 745, y: 452 },
          { x: 155, y: 452 },
          { x: 88, y: 375 },
          { x: 88, y: 165 },
        ],
        'l15'
      ),
      // Central crystal ridge splitting the maze into distinct Upper and Lower routes
      {
        id: 'l15-core-crystal',
        x: 450,
        y: 270,
        w: 132,
        h: 34,
        angle: 0,
        kind: 'crystal',
      },
      // Upper route maze baffles (frosted stone + faceted diamond crystal)
      {
        id: 'l15-upper-stone-1',
        x: 294,
        y: 134,
        w: 24,
        h: 92,
        angle: 0,
        kind: 'frost-stone',
      },
      {
        id: 'l15-upper-crystal',
        x: 450,
        y: 192,
        w: 38,
        h: 38,
        angle: Math.PI / 4,
        kind: 'crystal',
      },
      {
        id: 'l15-upper-stone-2',
        x: 598,
        y: 132,
        w: 24,
        h: 88,
        angle: 0,
        kind: 'frost-stone',
      },
      // Lower route staggered maze baffles (frosted stone + faceted crystal + bank shard)
      {
        id: 'l15-lower-stone-1',
        x: 342,
        y: 404,
        w: 24,
        h: 92,
        angle: 0,
        kind: 'frost-stone',
      },
      {
        id: 'l15-lower-crystal',
        x: 528,
        y: 332,
        w: 38,
        h: 38,
        angle: Math.PI / 4,
        kind: 'crystal',
      },
      {
        id: 'l15-lower-bank',
        x: 648,
        y: 400,
        w: 72,
        h: 20,
        angle: -Math.PI / 4,
        kind: 'crystal',
      },
      // Upper-left wooden bank helper
      {
        id: 'l15-upper-bank',
        x: 204,
        y: 134,
        w: 62,
        h: 16,
        angle: -Math.PI / 4,
        kind: 'wood',
      },
    ],
    bumpers: [],
    rotators: [],
    hazards: [
      // Alternating icy & normal snow-turf stretches along BOTH Upper and Lower routes
      {
        id: 'l15-ice-u1',
        kind: 'ice',
        shape: 'rect',
        x: 368,
        y: 158,
        w: 102,
        h: 112,
        radius: 20,
      },
      {
        id: 'l15-ice-u2',
        kind: 'ice',
        shape: 'rect',
        x: 536,
        y: 174,
        w: 88,
        h: 112,
        radius: 20,
      },
      {
        id: 'l15-ice-l1',
        kind: 'ice',
        shape: 'rect',
        x: 266,
        y: 356,
        w: 102,
        h: 110,
        radius: 20,
      },
      {
        id: 'l15-ice-l2',
        kind: 'ice',
        shape: 'rect',
        x: 454,
        y: 400,
        w: 120,
        h: 76,
        radius: 20,
      },
    ],
    decor: [
      { kind: 'snow-pine', x: 64, y: 84, scale: 1.05 },
      { kind: 'snow-pine', x: 836, y: 84, scale: 1.05 },
      { kind: 'snow-pine', x: 64, y: 454, scale: 1.02 },
      { kind: 'snow-pine', x: 836, y: 454, scale: 1.02 },
      { kind: 'crystal', x: 450, y: 46, scale: 0.92 },
      { kind: 'crystal', x: 450, y: 494, scale: 0.92 },
      { kind: 'frost-rock', x: 260, y: 48, scale: 0.85 },
      { kind: 'frost-rock', x: 640, y: 48, scale: 0.85 },
      { kind: 'frost-rock', x: 260, y: 492, scale: 0.85 },
      { kind: 'snowman', x: 648, y: 492, scale: 0.82 },
    ],
  },

  // ===========================================================================
  // LEVEL 16: Blizzard Finale (Frost Falls, Par 5)
  // ===========================================================================
  {
    id: 16,
    name: 'Blizzard Finale',
    subtitle: 'Conquer ice sheets, snowball bumpers, and the frost spinner',
    par: 5,
    theme: 'frost',
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    tee: { x: 146, y: 356 },
    hole: { x: 750, y: 270 },
    holeRadius: HOLE_RADIUS,
    turfPolygons: [
      {
        points: [
          { x: 90, y: 108 },
          { x: 555, y: 108 },
          { x: 625, y: 168 },
          { x: 810, y: 168 },
          { x: 810, y: 372 },
          { x: 625, y: 372 },
          { x: 555, y: 432 },
          { x: 90, y: 432 },
        ],
      },
    ],
    walls: [
      ...makePolygonBorders(
        [
          { x: 90, y: 108 },
          { x: 555, y: 108 },
          { x: 625, y: 168 },
          { x: 810, y: 168 },
          { x: 810, y: 372 },
          { x: 625, y: 372 },
          { x: 555, y: 432 },
          { x: 90, y: 432 },
        ],
        'l16'
      ),
      // Entry wooden corner bank at top-left
      {
        id: 'l16-wood-tl',
        x: 126,
        y: 144,
        w: 74,
        h: 16,
        angle: -Math.PI / 4,
        kind: 'wood',
      },
      // Final approach frosted stone guard pillars (clean 108px central putting fairway)
      {
        id: 'l16-gate-top',
        x: 656,
        y: 192,
        w: 22,
        h: 48,
        angle: 0,
        kind: 'frost-stone',
      },
      {
        id: 'l16-gate-bot',
        x: 656,
        y: 348,
        w: 22,
        h: 48,
        angle: 0,
        kind: 'frost-stone',
      },
      // Back corner wooden ricochet rails framing the finale green
      {
        id: 'l16-wood-tr',
        x: 784,
        y: 194,
        w: 62,
        h: 16,
        angle: Math.PI / 4,
        kind: 'wood',
      },
      {
        id: 'l16-wood-br',
        x: 784,
        y: 346,
        w: 62,
        h: 16,
        angle: -Math.PI / 4,
        kind: 'wood',
      },
    ],
    bumpers: [
      {
        id: 'l16-snow-1',
        x: 244,
        y: 272,
        radius: 24,
        restitution: 1.16,
        color: '#E0F2FE',
        accentColor: '#BAE6FD',
        style: 'snowball',
      },
      {
        id: 'l16-snow-2',
        x: 326,
        y: 174,
        radius: 23,
        restitution: 1.16,
        color: '#E0F2FE',
        accentColor: '#BAE6FD',
        style: 'snowball',
      },
      {
        id: 'l16-snow-3',
        x: 326,
        y: 364,
        radius: 23,
        restitution: 1.16,
        color: '#E0F2FE',
        accentColor: '#BAE6FD',
        style: 'snowball',
      },
    ],
    rotators: [
      {
        id: 'l16-frost-spinner',
        cx: 474,
        cy: 270,
        length: 184,
        thickness: 20,
        blades: 1,
        initialAngle: 0.4,
        angularVelocity: 0.92,
        hubRadius: 18,
      },
    ],
    hazards: [
      // Western icy glide zone around the snowball triangle
      {
        id: 'l16-ice-1',
        kind: 'ice',
        shape: 'rect',
        x: 280,
        y: 222,
        w: 150,
        h: 164,
        radius: 26,
      },
      // Central blizzard rink beneath the rotating frost spinner
      {
        id: 'l16-ice-2',
        kind: 'ice',
        shape: 'rect',
        x: 474,
        y: 270,
        w: 144,
        h: 246,
        radius: 28,
      },
      // Final approach ice threshold ending safely before the frosted stone pillars
      {
        id: 'l16-ice-3',
        kind: 'ice',
        shape: 'rect',
        x: 614,
        y: 270,
        w: 50,
        h: 112,
        radius: 18,
      },
    ],
    decor: [
      { kind: 'snow-pine', x: 660, y: 88, scale: 1.08 },
      { kind: 'snow-pine', x: 778, y: 92, scale: 1.0 },
      { kind: 'crystal', x: 718, y: 112, scale: 0.98 },
      { kind: 'snowman', x: 664, y: 446, scale: 1.05 },
      { kind: 'snow-pine', x: 778, y: 444, scale: 1.06 },
      { kind: 'crystal', x: 724, y: 432, scale: 0.95 },
      { kind: 'snow-pine', x: 182, y: 54, scale: 0.88 },
      { kind: 'crystal', x: 372, y: 56, scale: 0.9 },
      { kind: 'frost-rock', x: 475, y: 56, scale: 0.88 },
      { kind: 'frost-rock', x: 242, y: 484, scale: 0.9 },
      { kind: 'crystal', x: 448, y: 484, scale: 0.92 },
    ],
  },

  // ===========================================================================
  // LEVEL 17: Sugar Rush (Candy Factory, Par 3)
  // ===========================================================================
  {
    id: 17,
    name: 'Sugar Rush',
    subtitle: 'Weave past giant candy bumpers and jellybean walls to the sweet green',
    par: 3,
    theme: 'candy',
    turfStyle: 'default',
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    tee: { x: 154, y: 234 },
    hole: { x: 744, y: 318 },
    holeRadius: HOLE_RADIUS,
    turfPolygons: [
      {
        points: [
          { x: 90, y: 112 },
          { x: 540, y: 112 },
          { x: 605, y: 182 },
          { x: 810, y: 182 },
          { x: 810, y: 424 },
          { x: 365, y: 424 },
          { x: 300, y: 356 },
          { x: 90, y: 356 },
        ],
      },
    ],
    walls: [
      ...makePolygonBorders(
        [
          { x: 90, y: 112 },
          { x: 540, y: 112 },
          { x: 605, y: 182 },
          { x: 810, y: 182 },
          { x: 810, y: 424 },
          { x: 365, y: 424 },
          { x: 300, y: 356 },
          { x: 90, y: 356 },
        ],
        'l17',
        'candy-cane'
      ),
      // Angled candy-cane bank surface at top-left tee bend
      {
        id: 'l17-angle-tl',
        x: 120,
        y: 142,
        w: 66,
        h: 18,
        angle: -Math.PI / 4,
        kind: 'candy-cane',
      },
      // Playful angled jellybean bumper wall along upper mid-lane
      {
        id: 'l17-jb-top',
        x: 416,
        y: 138,
        w: 68,
        h: 20,
        angle: 0.24,
        kind: 'jellybean',
      },
      // Colorful jellybean obstacle splitting upper/lower approach to the green
      {
        id: 'l17-jb-mid',
        x: 618,
        y: 266,
        w: 24,
        h: 76,
        angle: 0,
        kind: 'jellybean',
      },
      // Angled bounce rails framing the sweet green behind the cup
      {
        id: 'l17-angle-tr',
        x: 782,
        y: 210,
        w: 62,
        h: 18,
        angle: Math.PI / 4,
        kind: 'candy-cane',
      },
      {
        id: 'l17-angle-br',
        x: 782,
        y: 396,
        w: 62,
        h: 18,
        angle: -Math.PI / 4,
        kind: 'candy-cane',
      },
    ],
    bumpers: [
      {
        id: 'l17-candy-1',
        x: 316,
        y: 184,
        radius: 26,
        restitution: 1.18,
        color: '#EC4899',
        accentColor: '#FFFDF5',
        style: 'candy',
      },
      {
        id: 'l17-candy-2',
        x: 358,
        y: 322,
        radius: 27,
        restitution: 1.18,
        color: '#FACC15',
        accentColor: '#FFFDF5',
        style: 'candy',
      },
      {
        id: 'l17-candy-3',
        x: 492,
        y: 214,
        radius: 28,
        restitution: 1.18,
        color: '#14B8A6',
        accentColor: '#FFFDF5',
        style: 'candy',
      },
      {
        id: 'l17-candy-4',
        x: 526,
        y: 348,
        radius: 25,
        restitution: 1.18,
        color: '#F97316',
        accentColor: '#FFFDF5',
        style: 'candy',
      },
    ],
    rotators: [],
    hazards: [],
    decor: [
      { kind: 'lollipop', x: 676, y: 110, scale: 1.08, color: '#EC4899' },
      { kind: 'lollipop', x: 784, y: 108, scale: 0.96, color: '#38BDF8' },
      { kind: 'gumdrop', x: 730, y: 122, scale: 0.92, color: '#FACC15' },
      { kind: 'lollipop', x: 144, y: 432, scale: 1.05, color: '#14B8A6' },
      { kind: 'lollipop', x: 248, y: 444, scale: 0.94, color: '#F97316' },
      { kind: 'jellybean', x: 196, y: 438, scale: 0.95 },
      { kind: 'gumdrop', x: 316, y: 60, scale: 0.88, color: '#EC4899' },
      { kind: 'jellybean', x: 468, y: 58, scale: 0.9 },
      { kind: 'gumdrop', x: 486, y: 480, scale: 0.9, color: '#34D399' },
      { kind: 'jellybean', x: 684, y: 478, scale: 0.92 },
    ],
  },

  // ===========================================================================
  // LEVEL 18: Chocolate Conveyor (Candy Factory, Par 4)
  // ===========================================================================
  {
    id: 18,
    name: 'Chocolate Conveyor',
    subtitle: 'Ride two moving conveyor belts into the narrow chocolate putting chute',
    par: 4,
    theme: 'candy',
    turfStyle: 'chocolate',
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    tee: { x: 178, y: 386 },
    hole: { x: 760, y: 270 },
    holeRadius: HOLE_RADIUS,
    turfPolygons: [
      {
        points: [
          { x: 90, y: 104 },
          { x: 580, y: 104 },
          { x: 618, y: 222 },
          { x: 814, y: 222 },
          { x: 814, y: 318 },
          { x: 618, y: 318 },
          { x: 580, y: 436 },
          { x: 90, y: 436 },
        ],
      },
    ],
    walls: [
      ...makePolygonBorders(
        [
          { x: 90, y: 104 },
          { x: 580, y: 104 },
          { x: 618, y: 222 },
          { x: 814, y: 222 },
          { x: 814, y: 318 },
          { x: 618, y: 318 },
          { x: 580, y: 436 },
          { x: 90, y: 436 },
        ],
        'l18',
        'candy-cane'
      ),
      // Left candy-cane divider separating tee/elevator lane from center chocolate chamber
      {
        id: 'l18-cane-1',
        x: 266,
        y: 326,
        w: 22,
        h: 220,
        angle: 0,
        kind: 'candy-cane',
      },
      // Right candy-cane divider funneling players onto the lower rightward conveyor
      {
        id: 'l18-cane-2',
        x: 438,
        y: 208,
        w: 22,
        h: 208,
        angle: 0,
        kind: 'candy-cane',
      },
      // Center jellybean baffle for clean ricochet angles
      {
        id: 'l18-jb-center',
        x: 352,
        y: 214,
        w: 24,
        h: 64,
        angle: 0.22,
        kind: 'jellybean',
      },
      // Top-left angled candy-cane corner bank guiding fast Conveyor 1 exits rightward
      {
        id: 'l18-angle-tl',
        x: 116,
        y: 130,
        w: 58,
        h: 16,
        angle: -Math.PI / 4,
        kind: 'candy-cane',
      },
    ],
    bumpers: [],
    rotators: [],
    conveyors: [
      // Conveyor Belt 1: Left upward belt carrying ball cleanly into open upper chocolate apron
      {
        id: 'l18-belt-1',
        x: 178,
        y: 254,
        w: 72,
        h: 136,
        dirX: 0,
        dirY: -1,
        strength: 230,
        beltSpeed: 68,
        targetSpeed: 165,
      },
      // Conveyor Belt 2: Lower rightward belt gliding ball toward the narrow final putting chute
      {
        id: 'l18-belt-2',
        x: 426,
        y: 374,
        w: 172,
        h: 72,
        dirX: 1,
        dirY: 0,
        strength: 230,
        beltSpeed: 68,
        targetSpeed: 165,
      },
    ],
    hazards: [],
    decor: [
      { kind: 'lollipop', x: 678, y: 122, scale: 1.06, color: '#EC4899' },
      { kind: 'lollipop', x: 786, y: 120, scale: 0.96, color: '#FACC15' },
      { kind: 'gumdrop', x: 732, y: 146, scale: 0.9, color: '#34D399' },
      { kind: 'lollipop', x: 678, y: 416, scale: 1.02, color: '#38BDF8' },
      { kind: 'lollipop', x: 786, y: 418, scale: 0.95, color: '#F97316' },
      { kind: 'jellybean', x: 732, y: 400, scale: 0.94 },
      { kind: 'gumdrop', x: 248, y: 56, scale: 0.86, color: '#EC4899' },
      { kind: 'jellybean', x: 438, y: 56, scale: 0.88 },
      { kind: 'gumdrop', x: 268, y: 484, scale: 0.88, color: '#FACC15' },
      { kind: 'jellybean', x: 472, y: 484, scale: 0.88 },
    ],
  },

  // ===========================================================================
  // LEVEL 19: Jellybean Junction (Candy Factory, Par 4)
  // ===========================================================================
  {
    id: 19,
    name: 'Jellybean Junction',
    subtitle: 'Pick your route around sticky jelly pools, giant jellybeans & curved candy rails',
    par: 4,
    theme: 'candy',
    turfStyle: 'default',
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    tee: { x: 158, y: 270 },
    hole: { x: 742, y: 270 },
    holeRadius: HOLE_RADIUS,
    turfPolygons: [
      {
        points: [
          { x: 96, y: 170 },
          { x: 162, y: 102 },
          { x: 738, y: 102 },
          { x: 804, y: 170 },
          { x: 804, y: 370 },
          { x: 738, y: 438 },
          { x: 162, y: 438 },
          { x: 96, y: 370 },
        ],
      },
    ],
    walls: [
      ...makePolygonBorders(
        [
          { x: 96, y: 170 },
          { x: 162, y: 102 },
          { x: 738, y: 102 },
          { x: 804, y: 170 },
          { x: 804, y: 370 },
          { x: 738, y: 438 },
          { x: 162, y: 438 },
          { x: 96, y: 370 },
        ],
        'l19',
        'candy-cane'
      ),
      // Sweeping curved candy-cane splitter nose dividing upper & lower routes
      ...makeArcBarrier(386, 270, 56, Math.PI * 0.68, Math.PI * 1.32, 4, 18, 'l19-split', 'candy-cane'),
      // Sweeping curved candy-cane outer bank guiding upper-route shots smoothly toward the cup
      ...makeArcBarrier(684, 206, 90, -Math.PI * 0.46, -Math.PI * 0.04, 4, 18, 'l19-curve-tr', 'candy-cane'),
      // Sweeping curved candy-cane outer bank framing the lower-left bend
      ...makeArcBarrier(216, 334, 90, Math.PI * 0.54, Math.PI * 0.96, 4, 18, 'l19-curve-bl', 'candy-cane'),
      // Giant central junction jellybean island separating the two routes
      {
        id: 'l19-jb-core',
        x: 462,
        y: 270,
        w: 158,
        h: 42,
        angle: 0,
        kind: 'jellybean',
      },
      // Giant angled jellybean obstacle guarding the upper-route exit
      {
        id: 'l19-jb-upper-exit',
        x: 598,
        y: 166,
        w: 28,
        h: 64,
        angle: -0.22,
        kind: 'jellybean',
      },
      // Giant angled jellybean obstacle in the lower technical route
      {
        id: 'l19-jb-lower-1',
        x: 344,
        y: 382,
        w: 72,
        h: 28,
        angle: -0.28,
        kind: 'jellybean',
      },
      // Giant vertical jellybean obstacle guarding the lower-right approach to the green
      {
        id: 'l19-jb-lower-2',
        x: 618,
        y: 350,
        w: 28,
        h: 68,
        angle: 0.16,
        kind: 'jellybean',
      },
    ],
    bumpers: [],
    rotators: [],
    hazards: [
      // Sticky raspberry jelly zone along the shorter upper route
      {
        id: 'l19-jelly-upper',
        kind: 'jelly',
        shape: 'ellipse',
        x: 466,
        y: 168,
        w: 148,
        h: 76,
      },
      // Sticky grape jelly puddle hugging the outer lower bend
      {
        id: 'l19-jelly-lower',
        kind: 'jelly',
        shape: 'ellipse',
        x: 522,
        y: 392,
        w: 122,
        h: 64,
      },
    ],
    decor: [
      { kind: 'lollipop', x: 90, y: 98, scale: 1.06, color: '#EC4899' },
      { kind: 'gumdrop', x: 146, y: 64, scale: 0.88, color: '#FACC15' },
      { kind: 'jellybean', x: 316, y: 56, scale: 0.94 },
      { kind: 'gumdrop', x: 486, y: 58, scale: 0.9, color: '#38BDF8' },
      { kind: 'lollipop', x: 814, y: 98, scale: 1.04, color: '#14B8A6' },
      { kind: 'gumdrop', x: 752, y: 64, scale: 0.88, color: '#F97316' },
      { kind: 'lollipop', x: 92, y: 442, scale: 1.02, color: '#FACC15' },
      { kind: 'jellybean', x: 282, y: 482, scale: 0.94 },
      { kind: 'gumdrop', x: 462, y: 482, scale: 0.92, color: '#EC4899' },
      { kind: 'jellybean', x: 628, y: 482, scale: 0.92 },
      { kind: 'lollipop', x: 812, y: 442, scale: 1.05, color: '#38BDF8' },
    ],
  },

  // ===========================================================================
  // LEVEL 20: Candy Chaos (Candy Factory Finale, Par 5)
  // ===========================================================================
  {
    id: 20,
    name: 'Candy Chaos',
    subtitle: 'Master conveyors, candy bumpers, sticky jelly & the rotating cane to win Candy Factory',
    par: 5,
    theme: 'candy',
    turfStyle: 'chocolate',
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    tee: { x: 144, y: 270 },
    hole: { x: 768, y: 268 },
    holeRadius: HOLE_RADIUS,
    turfPolygons: [
      {
        points: [
          { x: 86, y: 100 },
          { x: 612, y: 100 },
          { x: 648, y: 218 },
          { x: 816, y: 218 },
          { x: 816, y: 318 },
          { x: 648, y: 318 },
          { x: 612, y: 440 },
          { x: 86, y: 440 },
        ],
      },
    ],
    walls: [
      ...makePolygonBorders(
        [
          { x: 86, y: 100 },
          { x: 612, y: 100 },
          { x: 648, y: 218 },
          { x: 816, y: 218 },
          { x: 816, y: 318 },
          { x: 648, y: 318 },
          { x: 612, y: 440 },
          { x: 86, y: 440 },
        ],
        'l20',
        'candy-cane'
      ),
      // Angled candy-cane bank rails in left corners
      {
        id: 'l20-angle-tl',
        x: 114,
        y: 128,
        w: 62,
        h: 18,
        angle: -Math.PI / 4,
        kind: 'candy-cane',
      },
      {
        id: 'l20-angle-bl',
        x: 114,
        y: 412,
        w: 62,
        h: 18,
        angle: Math.PI / 4,
        kind: 'candy-cane',
      },
      // Angled jellybean bank rail steering upper conveyor exits toward the final chute
      {
        id: 'l20-angle-tr',
        x: 588,
        y: 136,
        w: 64,
        h: 20,
        angle: Math.PI / 4,
        kind: 'jellybean',
      },
      // Narrow precision entrance cheeks framing the challenging final putting section (62px clean gate)
      {
        id: 'l20-chute-top',
        x: 676,
        y: 226,
        w: 34,
        h: 14,
        angle: 0.24,
        kind: 'candy-cane',
      },
      {
        id: 'l20-chute-bot',
        x: 676,
        y: 310,
        w: 34,
        h: 14,
        angle: -0.24,
        kind: 'candy-cane',
      },
      // Back corner angled reflectors behind the cup
      {
        id: 'l20-back-tr',
        x: 796,
        y: 236,
        w: 36,
        h: 14,
        angle: Math.PI / 4,
        kind: 'candy-cane',
      },
      {
        id: 'l20-back-br',
        x: 796,
        y: 300,
        w: 36,
        h: 14,
        angle: -Math.PI / 4,
        kind: 'candy-cane',
      },
    ],
    bumpers: [
      {
        id: 'l20-candy-1',
        x: 248,
        y: 184,
        radius: 24,
        restitution: 1.18,
        color: '#EC4899',
        accentColor: '#FFFDF5',
        style: 'candy',
      },
      {
        id: 'l20-candy-2',
        x: 344,
        y: 274,
        radius: 25,
        restitution: 1.18,
        color: '#FACC15',
        accentColor: '#FFFDF5',
        style: 'candy',
      },
      {
        id: 'l20-candy-3',
        x: 456,
        y: 368,
        radius: 24,
        restitution: 1.18,
        color: '#14B8A6',
        accentColor: '#FFFDF5',
        style: 'candy',
      },
    ],
    rotators: [
      // Slowly rotating candy-cane obstacle guarding the entrance to the final putting chute
      {
        id: 'l20-spinner',
        cx: 568,
        cy: 268,
        length: 112,
        thickness: 18,
        blades: 1,
        initialAngle: 0.45,
        angularVelocity: 0.68,
        hubRadius: 15,
      },
    ],
    conveyors: [
      // Conveyor Belt 1: Lower-left boost belt launching right into mid-course open floor
      {
        id: 'l20-belt-1',
        x: 256,
        y: 382,
        w: 144,
        h: 64,
        dirX: 1,
        dirY: 0,
        strength: 230,
        beltSpeed: 70,
        targetSpeed: 165,
      },
      // Conveyor Belt 2: Upper-center belt feeding shots toward the angled bank & final chute
      {
        id: 'l20-belt-2',
        x: 432,
        y: 152,
        w: 140,
        h: 62,
        dirX: 1,
        dirY: 0,
        strength: 225,
        beltSpeed: 68,
        targetSpeed: 160,
      },
    ],
    hazards: [
      // Sticky raspberry jelly zone between tee & central bumper
      {
        id: 'l20-jelly-1',
        kind: 'jelly',
        shape: 'ellipse',
        x: 254,
        y: 282,
        w: 86,
        h: 54,
      },
      // Sticky grape jelly zone catching overshot lower-right approaches
      {
        id: 'l20-jelly-2',
        kind: 'jelly',
        shape: 'ellipse',
        x: 566,
        y: 386,
        w: 96,
        h: 54,
      },
    ],
    decor: [
      { kind: 'lollipop', x: 696, y: 120, scale: 1.08, color: '#EC4899' },
      { kind: 'lollipop', x: 794, y: 122, scale: 0.96, color: '#FACC15' },
      { kind: 'gumdrop', x: 744, y: 148, scale: 0.92, color: '#34D399' },
      { kind: 'lollipop', x: 696, y: 416, scale: 1.04, color: '#38BDF8' },
      { kind: 'lollipop', x: 794, y: 418, scale: 0.96, color: '#F97316' },
      { kind: 'jellybean', x: 744, y: 398, scale: 0.94 },
      { kind: 'gumdrop', x: 244, y: 54, scale: 0.88, color: '#EC4899' },
      { kind: 'jellybean', x: 432, y: 54, scale: 0.9 },
      { kind: 'gumdrop', x: 264, y: 486, scale: 0.88, color: '#FACC15' },
      { kind: 'jellybean', x: 468, y: 486, scale: 0.9 },
    ],
  },

  // =========================================================================
  // HOLE 21: GEAR GARDEN (World 6 — Clockwork Carnival, Par 4)
  // Colourful mechanical course with interlocking rotating brass gears and
  // brass obstacles framing a rhythmic carnival fairway.
  // =========================================================================
  {
    id: 21,
    name: 'Gear Garden',
    subtitle: 'Weave through counter-rotating brass gears and carnival rails',
    par: 4,
    worldWidth: 900,
    worldHeight: 540,
    theme: 'clockwork',
    tee: { x: 148, y: 270 },
    hole: { x: 748, y: 270 },
    holeRadius: 17,
    turfPolygons: [
      {
        points: [
          { x: 90, y: 102 },
          { x: 810, y: 102 },
          { x: 810, y: 438 },
          { x: 90, y: 438 },
        ],
      },
    ],
    walls: [
      // Outer brass carnival frame
      { id: 'l21-top', x: 450, y: 91, w: 742, h: 22, angle: 0, kind: 'brass' },
      { id: 'l21-bot', x: 450, y: 449, w: 742, h: 22, angle: 0, kind: 'brass' },
      { id: 'l21-left', x: 79, y: 270, w: 22, h: 358, angle: 0, kind: 'brass' },
      { id: 'l21-right', x: 821, y: 270, w: 22, h: 358, angle: 0, kind: 'brass' },
      // Chamfered carnival-stripe corner bank rails
      { id: 'l21-ctl', x: 116, y: 128, w: 72, h: 18, angle: -Math.PI / 4, kind: 'carnival-stripe' },
      { id: 'l21-cbl', x: 116, y: 412, w: 72, h: 18, angle: Math.PI / 4, kind: 'carnival-stripe' },
      { id: 'l21-ctr', x: 784, y: 128, w: 72, h: 18, angle: Math.PI / 4, kind: 'carnival-stripe' },
      { id: 'l21-cbr', x: 784, y: 412, w: 72, h: 18, angle: -Math.PI / 4, kind: 'carnival-stripe' },
      // Alternating brass baffles weaving around the three rotating gears
      { id: 'l21-baffle-1', x: 276, y: 372, w: 22, h: 124, angle: 0, kind: 'brass' },
      { id: 'l21-baffle-2', x: 450, y: 158, w: 22, h: 112, angle: 0, kind: 'brass' },
      { id: 'l21-baffle-3', x: 624, y: 372, w: 22, h: 124, angle: 0, kind: 'brass' },
      // Angled brass accent reflectors near tee & approach
      { id: 'l21-deflect-1', x: 204, y: 164, w: 54, h: 16, angle: -0.45, kind: 'brass' },
      { id: 'l21-deflect-2', x: 696, y: 376, w: 54, h: 16, angle: -0.45, kind: 'brass' },
    ],
    bumpers: [],
    rotators: [
      {
        id: 'l21-gear-1',
        cx: 306,
        cy: 206,
        length: 112,
        thickness: 16,
        blades: 2,
        initialAngle: 0.25,
        angularVelocity: 0.78,
        hubRadius: 17,
        style: 'gear',
      },
      {
        id: 'l21-gear-2',
        cx: 450,
        cy: 326,
        length: 116,
        thickness: 16,
        blades: 2,
        initialAngle: 0.7,
        angularVelocity: -0.84,
        hubRadius: 18,
        style: 'gear',
      },
      {
        id: 'l21-gear-3',
        cx: 594,
        cy: 206,
        length: 112,
        thickness: 16,
        blades: 2,
        initialAngle: 0.15,
        angularVelocity: 0.78,
        hubRadius: 17,
        style: 'gear',
      },
    ],
    decor: [
      { kind: 'carnival-tent', x: 96, y: 50, scale: 0.88, color: '#DC2626' },
      { kind: 'gear-prop', x: 256, y: 50, scale: 0.94, color: '#D97706' },
      { kind: 'clock-dial', x: 450, y: 50, scale: 0.86 },
      { kind: 'gear-prop', x: 644, y: 50, scale: 0.94, color: '#F59E0B' },
      { kind: 'carnival-tent', x: 804, y: 50, scale: 0.88, color: '#2563EB' },
      { kind: 'balloon', x: 146, y: 492, scale: 0.9, color: '#EF4444' },
      { kind: 'gear-prop', x: 344, y: 490, scale: 0.92, color: '#D97706' },
      { kind: 'gear-prop', x: 556, y: 490, scale: 0.92, color: '#F59E0B' },
      { kind: 'balloon', x: 754, y: 492, scale: 0.9, color: '#FACC15' },
    ],
  },

  // =========================================================================
  // HOLE 22: SPRING SHOT (World 6 — Clockwork Carnival, Par 4)
  // Introduces spring-powered bumpers that launch the ball across a divided
  // brass carnival arena in exciting pinball-style trick trajectories.
  // =========================================================================
  {
    id: 22,
    name: 'Spring Shot',
    subtitle: 'Bounce off spring-powered launchers to soar over the brass divide',
    par: 4,
    worldWidth: 900,
    worldHeight: 540,
    theme: 'clockwork',
    tee: { x: 148, y: 376 },
    hole: { x: 746, y: 374 },
    holeRadius: 17,
    turfPolygons: [
      {
        points: [
          { x: 88, y: 100 },
          { x: 812, y: 100 },
          { x: 812, y: 440 },
          { x: 88, y: 440 },
        ],
      },
    ],
    walls: [
      // Outer brass frame
      { id: 'l22-top', x: 450, y: 89, w: 746, h: 22, angle: 0, kind: 'brass' },
      { id: 'l22-bot', x: 450, y: 451, w: 746, h: 22, angle: 0, kind: 'brass' },
      { id: 'l22-left', x: 77, y: 270, w: 22, h: 362, angle: 0, kind: 'brass' },
      { id: 'l22-right', x: 823, y: 270, w: 22, h: 362, angle: 0, kind: 'brass' },
      // Upper corner carnival-stripe reflectors
      { id: 'l22-ctl', x: 114, y: 126, w: 68, h: 18, angle: -Math.PI / 4, kind: 'carnival-stripe' },
      { id: 'l22-ctr', x: 786, y: 126, w: 68, h: 18, angle: Math.PI / 4, kind: 'carnival-stripe' },
      // Central brass spine separating tee bay from cup bay (112px upper bridge)
      { id: 'l22-spine', x: 450, y: 326, w: 26, h: 228, angle: 0, kind: 'brass' },
      // Left carnival shelf framing the vertical spring launch lane
      { id: 'l22-shelf-l', x: 136, y: 258, w: 94, h: 18, angle: 0, kind: 'carnival-stripe' },
      // Right angled brass deflector guiding upper-right spring shots toward the cup
      { id: 'l22-deflect-r', x: 602, y: 266, w: 96, h: 18, angle: -0.34, kind: 'brass' },
    ],
    bumpers: [
      // Spring 1: Launches tee shots straight up toward the upper bridge launcher
      {
        id: 'l22-spring-1',
        x: 284,
        y: 368,
        radius: 25,
        restitution: 1.25,
        color: '#DC2626',
        accentColor: '#FACC15',
        style: 'spring',
        launchSpeed: 470,
        launchDirX: -0.14,
        launchDirY: -0.99,
      },
      // Spring 2: Upper-left spring catapult launching cleanly across the bridge
      {
        id: 'l22-spring-2',
        x: 258,
        y: 152,
        radius: 25,
        restitution: 1.25,
        color: '#F59E0B',
        accentColor: '#FFFDF5',
        style: 'spring',
        launchSpeed: 520,
        launchDirX: 0.99,
        launchDirY: 0.12,
      },
      // Spring 3: Upper-right redirector blasting balls down toward the final green
      {
        id: 'l22-spring-3',
        x: 704,
        y: 156,
        radius: 25,
        restitution: 1.25,
        color: '#DC2626',
        accentColor: '#FACC15',
        style: 'spring',
        launchSpeed: 440,
        launchDirX: 0.16,
        launchDirY: 0.99,
      },
      // Spring 4: Lower-right pinball booster launching straight toward the cup
      {
        id: 'l22-spring-4',
        x: 546,
        y: 376,
        radius: 23,
        restitution: 1.22,
        color: '#0EA5E9',
        accentColor: '#FACC15',
        style: 'spring',
        launchSpeed: 400,
        launchDirX: 0.99,
        launchDirY: -0.04,
      },
    ],
    rotators: [],
    decor: [
      { kind: 'balloon', x: 112, y: 54, scale: 0.92, color: '#EF4444' },
      { kind: 'carnival-tent', x: 266, y: 48, scale: 0.88, color: '#DC2626' },
      { kind: 'gear-prop', x: 450, y: 50, scale: 0.96, color: '#F59E0B' },
      { kind: 'carnival-tent', x: 634, y: 48, scale: 0.88, color: '#2563EB' },
      { kind: 'balloon', x: 788, y: 54, scale: 0.92, color: '#38BDF8' },
      { kind: 'gear-prop', x: 196, y: 492, scale: 0.9, color: '#D97706' },
      { kind: 'clock-dial', x: 450, y: 492, scale: 0.84 },
      { kind: 'gear-prop', x: 704, y: 492, scale: 0.9, color: '#F59E0B' },
    ],
  },

  // =========================================================================
  // HOLE 23: CLOCK TOWER (World 6 — Clockwork Carnival, Par 5)
  // Mechanical clock-tower hall featuring two synchronized moving brass gates,
  // a giant sweeping ornate clock hand, and counter-spinning escapement gears.
  // =========================================================================
  {
    id: 23,
    name: 'Clock Tower',
    subtitle: 'Time your putts past sliding brass gates and the sweeping clock hand',
    par: 5,
    worldWidth: 900,
    worldHeight: 540,
    theme: 'clockwork',
    tee: { x: 142, y: 270 },
    hole: { x: 756, y: 270 },
    holeRadius: 17,
    turfPolygons: [
      {
        points: [
          { x: 86, y: 102 },
          { x: 814, y: 102 },
          { x: 814, y: 438 },
          { x: 86, y: 438 },
        ],
      },
    ],
    walls: [
      // Outer brass tower walls
      { id: 'l23-top', x: 450, y: 91, w: 748, h: 22, angle: 0, kind: 'brass' },
      { id: 'l23-bot', x: 450, y: 449, w: 748, h: 22, angle: 0, kind: 'brass' },
      { id: 'l23-left', x: 75, y: 270, w: 22, h: 358, angle: 0, kind: 'brass' },
      { id: 'l23-right', x: 825, y: 270, w: 22, h: 358, angle: 0, kind: 'brass' },
      // Angled carnival-stripe bay corners
      { id: 'l23-ctl', x: 112, y: 128, w: 66, h: 16, angle: -Math.PI / 4, kind: 'carnival-stripe' },
      { id: 'l23-cbl', x: 112, y: 412, w: 66, h: 16, angle: Math.PI / 4, kind: 'carnival-stripe' },
      { id: 'l23-ctr', x: 788, y: 128, w: 66, h: 16, angle: Math.PI / 4, kind: 'carnival-stripe' },
      { id: 'l23-cbr', x: 788, y: 412, w: 66, h: 16, angle: -Math.PI / 4, kind: 'carnival-stripe' },
      // First brass gate bulkhead (136px central doorway at y = 202..338)
      { id: 'l23-bulk1-top', x: 286, y: 152, w: 24, h: 100, angle: 0, kind: 'brass' },
      { id: 'l23-bulk1-bot', x: 286, y: 388, w: 24, h: 100, angle: 0, kind: 'brass' },
      // Second brass gate bulkhead (136px central doorway at y = 202..338)
      { id: 'l23-bulk2-top', x: 612, y: 152, w: 24, h: 100, angle: 0, kind: 'brass' },
      { id: 'l23-bulk2-bot', x: 612, y: 388, w: 24, h: 100, angle: 0, kind: 'brass' },
    ],
    bumpers: [],
    gates: [
      {
        id: 'l23-gate-1',
        closedX: 286,
        closedY: 270,
        openX: 286,
        openY: 144,
        w: 20,
        h: 120,
        period: 4.4,
        phaseOffset: 0,
        color: '#F59E0B',
      },
      {
        id: 'l23-gate-2',
        closedX: 612,
        closedY: 270,
        openX: 612,
        openY: 396,
        w: 20,
        h: 120,
        period: 4.8,
        phaseOffset: Math.PI,
        color: '#DC2626',
      },
    ],
    rotators: [
      // Giant ornate gilded clock-tower hand centered over the inlaid brass clock dial
      {
        id: 'l23-clock-hand',
        cx: 448,
        cy: 270,
        length: 196,
        thickness: 18,
        blades: 1,
        initialAngle: 0.4,
        angularVelocity: 0.7,
        hubRadius: 18,
        style: 'clock-hand',
      },
      // Counter-spinning brass escapement gears flanking the clock chamber
      {
        id: 'l23-gear-ur',
        cx: 544,
        cy: 162,
        length: 72,
        thickness: 14,
        blades: 2,
        initialAngle: 0.2,
        angularVelocity: -1.12,
        hubRadius: 13,
        style: 'gear',
      },
      {
        id: 'l23-gear-ll',
        cx: 358,
        cy: 378,
        length: 72,
        thickness: 14,
        blades: 2,
        initialAngle: 0.55,
        angularVelocity: -1.12,
        hubRadius: 13,
        style: 'gear',
      },
    ],
    decor: [
      { kind: 'clock-dial', x: 142, y: 50, scale: 0.88 },
      { kind: 'gear-prop', x: 320, y: 50, scale: 0.92, color: '#D97706' },
      { kind: 'carnival-tent', x: 450, y: 48, scale: 0.9, color: '#DC2626' },
      { kind: 'gear-prop', x: 580, y: 50, scale: 0.92, color: '#F59E0B' },
      { kind: 'clock-dial', x: 758, y: 50, scale: 0.88 },
      { kind: 'balloon', x: 158, y: 492, scale: 0.9, color: '#FACC15' },
      { kind: 'gear-prop', x: 450, y: 492, scale: 0.96, color: '#D97706' },
      { kind: 'balloon', x: 742, y: 492, scale: 0.9, color: '#EF4444' },
    ],
  },

  // =========================================================================
  // HOLE 24: THE GRAND FINALE (World 6 — Clockwork Carnival, Par 5)
  // The ultimate championship course uniting rotating brass gears, directional
  // spring launchers, a timed mechanical gate, and a gilded precision runway.
  // =========================================================================
  {
    id: 24,
    name: 'The Grand Finale',
    subtitle: 'Conquer gears, spring bumpers, the brass gate & gilded chute for the crown',
    par: 5,
    worldWidth: 900,
    worldHeight: 540,
    theme: 'clockwork',
    tee: { x: 136, y: 374 },
    hole: { x: 772, y: 270 },
    holeRadius: 17,
    turfPolygons: [
      {
        points: [
          { x: 84, y: 98 },
          { x: 620, y: 98 },
          { x: 620, y: 218 },
          { x: 818, y: 218 },
          { x: 818, y: 322 },
          { x: 620, y: 322 },
          { x: 620, y: 442 },
          { x: 84, y: 442 },
        ],
      },
    ],
    walls: [
      // Main grand carnival arena perimeter
      { id: 'l24-top', x: 352, y: 87, w: 558, h: 22, angle: 0, kind: 'brass' },
      { id: 'l24-bot', x: 352, y: 453, w: 558, h: 22, angle: 0, kind: 'brass' },
      { id: 'l24-left', x: 73, y: 270, w: 22, h: 366, angle: 0, kind: 'brass' },
      // Stepped brass transitions into the gilded championship chute
      { id: 'l24-step-top', x: 631, y: 152, w: 22, h: 132, angle: 0, kind: 'brass' },
      { id: 'l24-step-bot', x: 631, y: 388, w: 22, h: 132, angle: 0, kind: 'brass' },
      // Gilded final championship chute perimeter
      { id: 'l24-chute-top-wall', x: 724, y: 207, w: 208, h: 22, angle: 0, kind: 'brass' },
      { id: 'l24-chute-bot-wall', x: 724, y: 333, w: 208, h: 22, angle: 0, kind: 'brass' },
      { id: 'l24-chute-end', x: 829, y: 270, w: 22, h: 148, angle: 0, kind: 'brass' },
      // Carnival-stripe corner banks inside main arena
      { id: 'l24-ctl', x: 110, y: 124, w: 64, h: 16, angle: -Math.PI / 4, kind: 'carnival-stripe' },
      { id: 'l24-ctr', x: 594, y: 124, w: 62, h: 16, angle: Math.PI / 4, kind: 'carnival-stripe' },
      // Lower brass baffle separating tee spring zone from right gear pit
      { id: 'l24-baffle-bot', x: 318, y: 384, w: 20, h: 114, angle: 0, kind: 'brass' },
      // Timed gate bulkhead guarding the approach to the championship runway
      { id: 'l24-gate-post-top', x: 556, y: 150, w: 22, h: 104, angle: 0, kind: 'brass' },
      { id: 'l24-gate-post-bot', x: 556, y: 390, w: 22, h: 104, angle: 0, kind: 'brass' },
      // Precision carnival-stripe entrance cheeks framing the final gilded runway (64px gate)
      { id: 'l24-cheek-top', x: 668, y: 228, w: 34, h: 14, angle: 0.22, kind: 'carnival-stripe' },
      { id: 'l24-cheek-bot', x: 668, y: 312, w: 34, h: 14, angle: -0.22, kind: 'carnival-stripe' },
      // Angled brass back-corner reflectors behind the championship cup
      { id: 'l24-back-tr', x: 800, y: 236, w: 36, h: 14, angle: Math.PI / 4, kind: 'brass' },
      { id: 'l24-back-br', x: 800, y: 304, w: 36, h: 14, angle: -Math.PI / 4, kind: 'brass' },
    ],
    bumpers: [
      // Spring 1: Launches tee shots upward past the first brass gear
      {
        id: 'l24-spring-1',
        x: 232,
        y: 372,
        radius: 23,
        restitution: 1.24,
        color: '#DC2626',
        accentColor: '#FACC15',
        style: 'spring',
        launchSpeed: 455,
        launchDirX: 0.32,
        launchDirY: -0.95,
      },
      // Spring 2: Upper-center redirector launching diagonally toward the moving gate
      {
        id: 'l24-spring-2',
        x: 418,
        y: 150,
        radius: 23,
        restitution: 1.24,
        color: '#F59E0B',
        accentColor: '#FFFDF5',
        style: 'spring',
        launchSpeed: 440,
        launchDirX: 0.86,
        launchDirY: 0.51,
      },
    ],
    gates: [
      {
        id: 'l24-gate-1',
        closedX: 556,
        closedY: 270,
        openX: 556,
        openY: 146,
        w: 20,
        h: 118,
        period: 4.2,
        phaseOffset: 0.8,
        color: '#F59E0B',
      },
    ],
    rotators: [
      {
        id: 'l24-gear-1',
        cx: 242,
        cy: 196,
        length: 102,
        thickness: 15,
        blades: 2,
        initialAngle: 0.3,
        angularVelocity: 0.82,
        hubRadius: 16,
        style: 'gear',
      },
      {
        id: 'l24-gear-2',
        cx: 432,
        cy: 336,
        length: 104,
        thickness: 15,
        blades: 2,
        initialAngle: 0.8,
        angularVelocity: -0.88,
        hubRadius: 16,
        style: 'gear',
      },
    ],
    decor: [
      { kind: 'carnival-tent', x: 702, y: 122, scale: 1.04, color: '#DC2626' },
      { kind: 'clock-dial', x: 794, y: 126, scale: 0.94 },
      { kind: 'balloon', x: 752, y: 158, scale: 0.86, color: '#FACC15' },
      { kind: 'carnival-tent', x: 702, y: 414, scale: 1.04, color: '#2563EB' },
      { kind: 'gear-prop', x: 794, y: 416, scale: 1.0, color: '#F59E0B' },
      { kind: 'balloon', x: 752, y: 394, scale: 0.86, color: '#EF4444' },
      { kind: 'gear-prop', x: 220, y: 50, scale: 0.92, color: '#D97706' },
      { kind: 'clock-dial', x: 432, y: 50, scale: 0.84 },
      { kind: 'balloon', x: 240, y: 492, scale: 0.88, color: '#38BDF8' },
      { kind: 'gear-prop', x: 452, y: 492, scale: 0.92, color: '#F59E0B' },
    ],
  },
];


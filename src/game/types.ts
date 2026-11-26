export interface Vec2 {
  x: number;
  y: number;
}

export interface RectWall {
  id: string;
  /** Center X in world coordinates */
  x: number;
  /** Center Y in world coordinates */
  y: number;
  /** Full width */
  w: number;
  /** Full height */
  h: number;
  /** Rotation in radians */
  angle: number;
  /** Visual style */
  kind?:
    | 'border'
    | 'wood'
    | 'bumper-wall'
    | 'frost-stone'
    | 'crystal'
    | 'candy-cane'
    | 'jellybean'
    | 'brass'
    | 'carnival-stripe';
}

export interface Bumper {
  id: string;
  x: number;
  y: number;
  radius: number;
  restitution: number;
  color: string;
  accentColor: string;
  style?: 'classic' | 'snowball' | 'candy' | 'spring';
  /** Minimum launch speed for spring-powered bumpers */
  launchSpeed?: number;
  /** Optional directional launch unit vector X for directional spring launchers */
  launchDirX?: number;
  /** Optional directional launch unit vector Y for directional spring launchers */
  launchDirY?: number;
}

export interface RotatingObstacle {
  id: string;
  /** Pivot center X */
  cx: number;
  /** Pivot center Y */
  cy: number;
  /** Full blade length (tip to tip) */
  length: number;
  /** Blade thickness */
  thickness: number;
  /** Number of evenly spaced bars (1 = single bar spanning length, 2 = cross/plus) */
  blades: number;
  /** Initial angle in radians */
  initialAngle: number;
  /** Angular speed in radians per second */
  angularVelocity: number;
  /** Visual hub radius */
  hubRadius: number;
  /** Visual mechanism style */
  style?: 'default' | 'gear' | 'clock-hand';
}

export interface TurfZone {
  /** Polygon vertices in world coordinates (for rendering the mowed green shape) */
  points: Vec2[];
}

export interface DecorProp {
  kind:
    | 'bush'
    | 'flower'
    | 'palm'
    | 'stone'
    | 'umbrella'
    | 'snow-pine'
    | 'crystal'
    | 'snowman'
    | 'frost-rock'
    | 'lollipop'
    | 'jellybean'
    | 'gumdrop'
    | 'gear-prop'
    | 'carnival-tent'
    | 'clock-dial'
    | 'balloon';
  x: number;
  y: number;
  scale: number;
  rotation?: number;
  color?: string;
}

export interface SurfaceZone {
  id: string;
  kind: 'sand' | 'water' | 'ice' | 'jelly';
  shape: 'rect' | 'ellipse';
  /** Center X */
  x: number;
  /** Center Y */
  y: number;
  /** Full width (or horizontal diameter for ellipse) */
  w: number;
  /** Full height (or vertical diameter for ellipse) */
  h: number;
  /** Optional corner radius for rounded rect */
  radius?: number;
  /** Optional rotation in radians */
  angle?: number;
}

export interface MovingGate {
  id: string;
  /** Center X when closed */
  closedX: number;
  /** Center Y when closed */
  closedY: number;
  /** Center X when open */
  openX: number;
  /** Center Y when open */
  openY: number;
  /** Full width */
  w: number;
  /** Full height */
  h: number;
  /** Full cycle period in seconds */
  period: number;
  /** Phase offset in radians */
  phaseOffset: number;
  /** Accent color */
  color?: string;
}

export interface PortalEndpoint {
  x: number;
  y: number;
  radius: number;
}

export interface PortalPair {
  id: string;
  a: PortalEndpoint;
  b: PortalEndpoint;
  color?: string;
  accentColor?: string;
}

export interface ForceZone {
  id: string;
  kind: 'attract' | 'repel';
  x: number;
  y: number;
  radius: number;
  /** Peak acceleration in world px/s^2 */
  strength: number;
}

export interface ConveyorBelt {
  id: string;
  /** Center X in world coordinates */
  x: number;
  /** Center Y in world coordinates */
  y: number;
  /** Full width */
  w: number;
  /** Full height */
  h: number;
  /** Optional rotation in radians */
  angle?: number;
  /** Unit direction X of belt movement */
  dirX: number;
  /** Unit direction Y of belt movement */
  dirY: number;
  /** Acceleration in world px/s^2 applied while the ball is on the belt */
  strength: number;
  /** Visual belt animation speed in world px/s */
  beltSpeed: number;
  /** Target cruise speed along belt direction before tapering push */
  targetSpeed?: number;
}

export type LevelTheme = 'resort' | 'garden' | 'beach' | 'neon' | 'frost' | 'candy' | 'clockwork';

export interface LevelDefinition {
  id: number;
  name: string;
  subtitle: string;
  par: number;
  theme?: LevelTheme;
  /** Optional surface palette variant (e.g. 'chocolate' for Hole 18 & 20) */
  turfStyle?: 'default' | 'chocolate';
  worldWidth: number;
  worldHeight: number;
  tee: Vec2;
  hole: Vec2;
  holeRadius: number;
  /** Main turf polygon(s) */
  turfPolygons: TurfZone[];
  /** Static walls (outer wooden borders + interior walls + angled deflectors) */
  walls: RectWall[];
  /** Circular bouncy bumpers */
  bumpers: Bumper[];
  /** Rotating obstacles */
  rotators: RotatingObstacle[];
  /** Periodically opening/closing moving gates */
  gates?: MovingGate[];
  /** Connected glowing teleportation portal pairs */
  portals?: PortalPair[];
  /** Circular attract (blue) and repel (red) force zones */
  forceZones?: ForceZone[];
  /** Moving conveyor belts that gently push the ball in an indicated direction */
  conveyors?: ConveyorBelt[];
  /** Optional sand traps, water hazards, slippery ice & sticky jelly surfaces */
  hazards?: SurfaceZone[];
  /** Surrounding courtyard decorations */
  decor: DecorProp[];
}

export interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isMoving: boolean;
  /** Last safe resting position for water hazard recovery */
  lastSafePos: Vec2;
  /** Cooldown timer in seconds preventing instant portal bounce-back loops */
  teleportCooldown: number;
  /** 0 = normal on turf, >0 = sinking progress into cup (0..1) */
  sinkProgress: number;
  holed: boolean;
  /** Squash & stretch visual deformation */
  scaleX: number;
  scaleY: number;
  stretchAngle: number;
  /** Spin visual phase for dimple shine */
  rollDistance: number;
}

export interface CollisionEvent {
  type:
    | 'wall'
    | 'bumper'
    | 'rotator'
    | 'gate'
    | 'portal'
    | 'hole_lip'
    | 'hole_sink'
    | 'water_hazard'
    | 'jelly_splash';
  x: number;
  y: number;
  nx: number;
  ny: number;
  impactSpeed: number;
  id?: string;
  exitX?: number;
  exitY?: number;
}

export interface SimState {
  ball: BallState;
  rotatorAngles: number[];
  elapsedTime: number;
  bumperPulse: Record<string, number>;
  jellySplashCooldown?: number;
}

export type GamePhase =
  | 'title'
  | 'course_select'
  | 'settings'
  | 'playing'
  | 'paused'
  | 'level_clear'
  | 'out_of_strokes'
  | 'victory';

export interface AudioPreferences {
  soundEnabled: boolean;
  musicEnabled: boolean;
}

export interface ScoreLabelInfo {
  title: string;
  detail: string;
  stars: 1 | 2 | 3;
  tone: 'gold' | 'emerald' | 'sky' | 'coral';
  isLastChance?: boolean;
}

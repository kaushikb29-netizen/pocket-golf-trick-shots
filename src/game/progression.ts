import { LEVELS } from './levels';
import { calculateStars } from './physics';
import type { AudioPreferences, LevelTheme } from './types';

export type WorldId =
  | 'sunny-garden'
  | 'tropical-trouble'
  | 'neon-nights'
  | 'frost-falls'
  | 'candy-factory'
  | 'clockwork-carnival';

export type WorldVisualTheme = LevelTheme | 'candy' | 'clockwork';

export interface CourseWorld {
  id: WorldId;
  worldNumber: number;
  name: string;
  tagline: string;
  theme: WorldVisualTheme;
  holeIds: [number, number, number, number];
  comingSoon: boolean;
  accentHex: string;
  surfaceHex: string;
  borderHex: string;
  badgeBgHex: string;
  badgeTextHex: string;
}

export const COURSE_WORLDS: CourseWorld[] = [
  {
    id: 'sunny-garden',
    worldNumber: 1,
    name: 'Sunny Garden',
    tagline: 'Crisp fairways, wooden banks & windmill timing',
    theme: 'garden',
    holeIds: [1, 2, 3, 4],
    comingSoon: false,
    accentHex: '#2FA752',
    surfaceHex: '#ECFDF3',
    borderHex: '#1F6F38',
    badgeBgHex: '#DCFCE7',
    badgeTextHex: '#166534',
  },
  {
    id: 'tropical-trouble',
    worldNumber: 2,
    name: 'Tropical Trouble',
    tagline: 'Sandy traps, lagoon hops & palm pinball bumpers',
    theme: 'beach',
    holeIds: [5, 6, 7, 8],
    comingSoon: false,
    accentHex: '#0EA5B7',
    surfaceHex: '#ECFEFF',
    borderHex: '#0E7490',
    badgeBgHex: '#CFFAFE',
    badgeTextHex: '#155E75',
  },
  {
    id: 'neon-nights',
    worldNumber: 3,
    name: 'Neon Nights',
    tagline: 'Laser gates, linked portals & gravity fields',
    theme: 'neon',
    holeIds: [9, 10, 11, 12],
    comingSoon: false,
    accentHex: '#9333EA',
    surfaceHex: '#F5F3FF',
    borderHex: '#6D28D9',
    badgeBgHex: '#EDE9FE',
    badgeTextHex: '#5B21B6',
  },
  {
    id: 'frost-falls',
    worldNumber: 4,
    name: 'Frost Falls',
    tagline: 'Slippery glacier ice, snowballs & crystal mazes',
    theme: 'frost',
    holeIds: [13, 14, 15, 16],
    comingSoon: false,
    accentHex: '#0284C7',
    surfaceHex: '#EFF9FF',
    borderHex: '#0C4A6E',
    badgeBgHex: '#E0F2FE',
    badgeTextHex: '#075985',
  },
  {
    id: 'candy-factory',
    worldNumber: 5,
    name: 'Candy Factory',
    tagline: 'Peppermint bumpers, chocolate belts & candy-cane chutes',
    theme: 'candy',
    holeIds: [17, 18, 19, 20],
    comingSoon: false,
    accentHex: '#EC4899',
    surfaceHex: '#FDF2F8',
    borderHex: '#9D174D',
    badgeBgHex: '#FCE7F3',
    badgeTextHex: '#9D174D',
  },
  {
    id: 'clockwork-carnival',
    worldNumber: 6,
    name: 'Clockwork Carnival',
    tagline: 'Spinning brass gears, spring launchers & clock-tower gates',
    theme: 'clockwork',
    holeIds: [21, 22, 23, 24],
    comingSoon: false,
    accentHex: '#D97706',
    surfaceHex: '#FFFBEB',
    borderHex: '#92400E',
    badgeBgHex: '#FEF3C7',
    badgeTextHex: '#92400E',
  },
];

export const PLAYABLE_WORLDS: CourseWorld[] = COURSE_WORLDS.filter((w) => !w.comingSoon);

export interface HoleProgressRecord {
  bestStrokes: number;
  stars: 1 | 2 | 3;
}

export interface ProgressStore {
  version: 2;
  holes: Record<number, HoleProgressRecord>;
  completedHoles: number[];
  unlockedWorlds: WorldId[];
  lastUnlockedHole: number;
  lastPlayedHole: number;
  totalStars: number;
  bestFullCourseTotal: number | null;
  audio: AudioPreferences;
}

export type WorldCompletionStatus = 'coming_soon' | 'not_started' | 'in_progress' | 'completed';

export interface WorldProgressStats {
  completedCount: number;
  totalHoles: number;
  implementedHoles: number;
  earnedStars: number;
  maxStars: number;
  totalPar: number | null;
  bestWorldStrokes: number | null;
  status: WorldCompletionStatus;
}

export interface OverallProgressStats {
  completedHoles: number;
  totalHoles: number;
  earnedStars: number;
  maxStars: number;
  totalBestStrokes: number;
  completedPar: number;
  completedWorlds: number;
  playableWorlds: number;
  totalWorlds: number;
}

export interface WorldCompletionSummary {
  world: CourseWorld;
  totalStrokes: number;
  totalPar: number;
  earnedStars: number;
  maxStars: number;
  nextWorld: CourseWorld | null;
  isNextWorldPlayable: boolean;
}

export const PROGRESS_STORAGE_KEY = 'pocket-golf-trick-shots-progress-v1';
export const LEGACY_BEST_SCORE_KEY = 'pocket-golf-trick-shots-best-16';

export const DEFAULT_AUDIO_PREFS: AudioPreferences = {
  soundEnabled: true,
  musicEnabled: true,
};

export function isHoleImplemented(holeId: number): boolean {
  return Number.isInteger(holeId) && holeId >= 1 && holeId <= LEVELS.length;
}

function clampPlayableHole(holeId: number): number {
  if (!Number.isFinite(holeId)) return 1;
  return Math.min(LEVELS.length, Math.max(1, Math.round(holeId)));
}

const VALID_WORLD_IDS = new Set<WorldId>(COURSE_WORLDS.map((w) => w.id));

export function getNextWorld(worldId: WorldId): CourseWorld | null {
  const idx = COURSE_WORLDS.findIndex((w) => w.id === worldId);
  if (idx < 0 || idx >= COURSE_WORLDS.length - 1) return null;
  return COURSE_WORLDS[idx + 1] ?? null;
}

export function isFinalHoleOfWorld(holeId: number): boolean {
  return COURSE_WORLDS.some((w) => w.holeIds[w.holeIds.length - 1] === holeId);
}

function isWorldPlayable(world: CourseWorld): boolean {
  return !world.comingSoon && world.holeIds.some((id) => isHoleImplemented(id));
}

function reconcileDerivedFields(
  holes: Record<number, HoleProgressRecord>,
  storedLastUnlocked: number | null,
  storedLastPlayed: number | null,
  bestFullCourseTotal: number | null,
  audio: AudioPreferences,
  storedUnlockedWorlds: WorldId[] = []
): ProgressStore {
  const completedHoles = Object.keys(holes)
    .map((k) => Number.parseInt(k, 10))
    .filter((id) => isHoleImplemented(id))
    .sort((a, b) => a - b);

  const completedSet = new Set<number>(completedHoles);

  let totalStars = 0;
  for (const id of completedHoles) {
    const rec = holes[id];
    if (rec) {
      totalStars += rec.stars;
    }
  }

  // World 1 is always unlocked; preserve any already-unlocked playable worlds (never relock!)
  const unlockedWorldSet = new Set<WorldId>(['sunny-garden']);
  for (const wid of storedUnlockedWorlds) {
    if (VALID_WORLD_IDS.has(wid)) {
      const w = COURSE_WORLDS.find((item) => item.id === wid);
      if (w && isWorldPlayable(w)) {
        unlockedWorldSet.add(wid);
      }
    }
  }

  // Derive unlocked worlds from completed worlds and legacy progress saves
  for (let i = 0; i < COURSE_WORLDS.length; i++) {
    const world = COURSE_WORLDS[i];
    if (!isWorldPlayable(world)) continue;

    // If any hole in this world is already completed or unlocked via legacy save, keep world unlocked
    if (
      world.holeIds.some((id) => completedSet.has(id)) ||
      (storedLastUnlocked !== null && storedLastUnlocked >= world.holeIds[0])
    ) {
      unlockedWorldSet.add(world.id);
    }

    // Completing all four holes of a world unlocks the next implemented world (never World 7)
    const allFourCompleted = world.holeIds.every((id) => completedSet.has(id));
    if (allFourCompleted) {
      const next = COURSE_WORLDS[i + 1];
      if (next && isWorldPlayable(next)) {
        unlockedWorldSet.add(next.id);
      }
    }
  }

  const unlockedWorlds = COURSE_WORLDS.filter((w) => unlockedWorldSet.has(w.id)).map((w) => w.id);

  // Derive highest unlocked hole while respecting world boundaries
  let highestUnlocked = Math.min(LEVELS.length, Math.max(1, storedLastUnlocked ?? 1));
  for (const world of COURSE_WORLDS) {
    if (!unlockedWorldSet.has(world.id)) continue;
    // First hole of any unlocked world is unlocked
    if (isHoleImplemented(world.holeIds[0])) {
      highestUnlocked = Math.max(highestUnlocked, world.holeIds[0]);
    }
    // Within an unlocked world, clearing hole N unlocks hole N+1 inside the same world
    for (let j = 0; j < world.holeIds.length - 1; j++) {
      const hid = world.holeIds[j];
      const nextInWorld = world.holeIds[j + 1];
      if (completedSet.has(hid) && isHoleImplemented(nextInWorld)) {
        highestUnlocked = Math.max(highestUnlocked, nextInWorld);
      }
    }
  }

  const lastUnlockedHole = Math.min(LEVELS.length, Math.max(1, highestUnlocked));
  const lastPlayedHole =
    storedLastPlayed !== null
      ? Math.min(lastUnlockedHole, clampPlayableHole(storedLastPlayed))
      : lastUnlockedHole;

  return {
    version: 2,
    holes,
    completedHoles,
    unlockedWorlds,
    lastUnlockedHole,
    lastPlayedHole,
    totalStars,
    bestFullCourseTotal,
    audio,
  };
}

export function createEmptyProgress(
  bestFullCourseTotal: number | null = null,
  audio: AudioPreferences = { ...DEFAULT_AUDIO_PREFS }
): ProgressStore {
  return reconcileDerivedFields({}, 1, 1, bestFullCourseTotal, audio, ['sunny-garden']);
}

export function getWorldById(worldId: WorldId): CourseWorld {
  return COURSE_WORLDS.find((w) => w.id === worldId) ?? COURSE_WORLDS[0];
}

export function getWorldForLevelId(levelId: number): CourseWorld {
  return (
    COURSE_WORLDS.find((world) => world.holeIds.includes(levelId)) ?? COURSE_WORLDS[0]
  );
}

export function isWorldUnlocked(progress: ProgressStore, world: CourseWorld): boolean {
  if (!isWorldPlayable(world)) return false;
  if (world.id === 'sunny-garden') return true;
  if (progress.unlockedWorlds.includes(world.id)) return true;
  return world.holeIds.some((holeId) => Boolean(progress.holes[holeId]));
}

export function isHoleUnlocked(progress: ProgressStore, holeId: number): boolean {
  if (!isHoleImplemented(holeId)) return false;
  if (holeId === 1) return true;
  if (progress.holes[holeId]) return true;
  const world = getWorldForLevelId(holeId);
  if (!isWorldUnlocked(progress, world)) return false;
  if (holeId === world.holeIds[0]) return true;
  return holeId <= progress.lastUnlockedHole || Boolean(progress.holes[holeId - 1]);
}

export function recordLastPlayedHole(
  progress: ProgressStore,
  holeId: number
): ProgressStore {
  if (!isHoleImplemented(holeId)) return progress;
  const safeHole = clampPlayableHole(holeId);
  if (progress.lastPlayedHole === safeHole) return progress;
  return {
    ...progress,
    lastPlayedHole: safeHole,
  };
}

export function recordHoleCompletion(
  progress: ProgressStore,
  levelId: number,
  strokes: number,
  par: number
): {
  progress: ProgressStore;
  stars: 1 | 2 | 3;
  isNewBest: boolean;
  previousBest: number | null;
  completedWorld: CourseWorld | null;
  newlyUnlockedWorld: CourseWorld | null;
} {
  const safeStrokes = Math.max(1, Math.round(strokes));
  const rawStars = calculateStars(safeStrokes, par, true);
  const earnedStars = (rawStars === 0 ? 1 : rawStars) as 1 | 2 | 3;
  const existing = progress.holes[levelId];
  const previousBest = existing ? existing.bestStrokes : null;
  const isNewBest = previousBest === null || safeStrokes < previousBest;

  const updatedRecord: HoleProgressRecord = {
    bestStrokes: existing ? Math.min(existing.bestStrokes, safeStrokes) : safeStrokes,
    stars: existing
      ? (Math.max(existing.stars, earnedStars) as 1 | 2 | 3)
      : earnedStars,
  };

  const nextHoles: Record<number, HoleProgressRecord> = {
    ...progress.holes,
    [levelId]: updatedRecord,
  };

  const currentWorld = getWorldForLevelId(levelId);
  const isWorldEndHole = currentWorld.holeIds[currentWorld.holeIds.length - 1] === levelId;
  const allFourWorldHolesCleared = currentWorld.holeIds.every((id) => Boolean(nextHoles[id]));
  const nextWorld = getNextWorld(currentWorld.id);

  const prevUnlockedWorlds = new Set<WorldId>(progress.unlockedWorlds);
  const nextUnlockedWorlds = new Set<WorldId>(progress.unlockedWorlds);

  // Unlock next world ONLY when all four holes of the current world are completed
  // and the player has successfully completed the world's final hole.
  let newlyUnlockedWorld: CourseWorld | null = null;
  if (isWorldEndHole && allFourWorldHolesCleared && nextWorld && isWorldPlayable(nextWorld)) {
    if (!prevUnlockedWorlds.has(nextWorld.id)) {
      newlyUnlockedWorld = nextWorld;
    }
    nextUnlockedWorlds.add(nextWorld.id);
  }

  // Advance lastUnlockedHole within the same world, or into next world once unlocked
  let candidateLastUnlocked = progress.lastUnlockedHole;
  if (!isWorldEndHole) {
    candidateLastUnlocked = Math.max(candidateLastUnlocked, Math.min(LEVELS.length, levelId + 1));
  } else if (nextWorld && nextUnlockedWorlds.has(nextWorld.id)) {
    candidateLastUnlocked = Math.max(candidateLastUnlocked, nextWorld.holeIds[0]);
  }

  const nextProgress = reconcileDerivedFields(
    nextHoles,
    candidateLastUnlocked,
    clampPlayableHole(levelId),
    progress.bestFullCourseTotal,
    progress.audio,
    Array.from(nextUnlockedWorlds)
  );

  return {
    progress: nextProgress,
    stars: earnedStars,
    isNewBest,
    previousBest,
    completedWorld: isWorldEndHole ? currentWorld : null,
    newlyUnlockedWorld,
  };
}

export function recordFullCourseBest(
  progress: ProgressStore,
  totalStrokes: number
): { progress: ProgressStore; isNewBest: boolean } {
  const safeTotal = Math.max(1, Math.round(totalStrokes));
  const isNewBest =
    progress.bestFullCourseTotal === null || safeTotal < progress.bestFullCourseTotal;
  if (!isNewBest) {
    return { progress, isNewBest: false };
  }
  return {
    progress: {
      ...progress,
      bestFullCourseTotal: safeTotal,
    },
    isNewBest: true,
  };
}

export function updateAudioPreferences(
  progress: ProgressStore,
  patch: Partial<AudioPreferences>
): ProgressStore {
  return {
    ...progress,
    audio: {
      soundEnabled: patch.soundEnabled ?? progress.audio.soundEnabled,
      musicEnabled: patch.musicEnabled ?? progress.audio.musicEnabled,
    },
  };
}

export function resetSavedProgress(
  progress: ProgressStore,
  preserveAudio = true
): ProgressStore {
  const audio = preserveAudio ? { ...progress.audio } : { ...DEFAULT_AUDIO_PREFS };
  return createEmptyProgress(null, audio);
}

export function getWorldStats(
  progress: ProgressStore,
  world: CourseWorld
): WorldProgressStats {
  const totalHoles = world.holeIds.length;

  if (world.comingSoon) {
    return {
      completedCount: 0,
      totalHoles,
      implementedHoles: 0,
      earnedStars: 0,
      maxStars: totalHoles * 3,
      totalPar: null,
      bestWorldStrokes: null,
      status: 'coming_soon',
    };
  }

  let completedCount = 0;
  let implementedHoles = 0;
  let earnedStars = 0;
  let totalPar = 0;
  let bestSum = 0;

  for (const holeId of world.holeIds) {
    const level = LEVELS.find((l) => l.id === holeId);
    if (level) {
      implementedHoles += 1;
      totalPar += level.par;
    }
    const rec = progress.holes[holeId];
    if (rec && level) {
      completedCount += 1;
      earnedStars += rec.stars;
      bestSum += rec.bestStrokes;
    }
  }

  const status: WorldCompletionStatus =
    implementedHoles === 0
      ? 'coming_soon'
      : completedCount === 0
      ? 'not_started'
      : completedCount >= implementedHoles
      ? 'completed'
      : 'in_progress';

  const maxStars = implementedHoles > 0 ? implementedHoles * 3 : totalHoles * 3;

  return {
    completedCount,
    totalHoles,
    implementedHoles,
    earnedStars,
    maxStars,
    totalPar: implementedHoles > 0 ? totalPar : null,
    bestWorldStrokes: implementedHoles > 0 && completedCount === implementedHoles ? bestSum : null,
    status,
  };
}

export function getWorldCompletionSummary(
  progress: ProgressStore,
  world: CourseWorld,
  sessionHoleStrokes: number[] = []
): WorldCompletionSummary {
  let totalStrokes = 0;
  let totalPar = 0;
  let earnedStars = 0;

  for (const holeId of world.holeIds) {
    const level = LEVELS.find((l) => l.id === holeId);
    if (!level) continue;
    totalPar += level.par;
    const sessionScore = sessionHoleStrokes[holeId - 1] ?? 0;
    const saved = progress.holes[holeId];
    if (sessionScore > 0) {
      totalStrokes += sessionScore;
      const runStars = calculateStars(sessionScore, level.par, true);
      earnedStars += Math.max(saved?.stars ?? 0, runStars === 0 ? 1 : runStars);
    } else if (saved) {
      totalStrokes += saved.bestStrokes;
      earnedStars += saved.stars;
    }
  }

  const nextWorld = getNextWorld(world.id);
  const isNextWorldPlayable = Boolean(nextWorld && isWorldPlayable(nextWorld));

  return {
    world,
    totalStrokes,
    totalPar,
    earnedStars,
    maxStars: world.holeIds.length * 3,
    nextWorld,
    isNextWorldPlayable,
  };
}

export function getOverallProgressStats(progress: ProgressStore): OverallProgressStats {
  let completedHoles = 0;
  let earnedStars = 0;
  let totalBestStrokes = 0;
  let completedPar = 0;
  let completedWorlds = 0;

  for (const world of PLAYABLE_WORLDS) {
    const stats = getWorldStats(progress, world);
    completedHoles += stats.completedCount;
    earnedStars += stats.earnedStars;
    if (stats.status === 'completed') completedWorlds += 1;

    for (const holeId of world.holeIds) {
      const rec = progress.holes[holeId];
      const level = LEVELS.find((l) => l.id === holeId);
      if (rec && level) {
        totalBestStrokes += rec.bestStrokes;
        completedPar += level.par;
      }
    }
  }

  return {
    completedHoles,
    totalHoles: LEVELS.length,
    earnedStars,
    maxStars: LEVELS.length * 3,
    totalBestStrokes,
    completedPar,
    completedWorlds,
    playableWorlds: PLAYABLE_WORLDS.length,
    totalWorlds: COURSE_WORLDS.length,
  };
}

export function deserializeProgress(
  rawProgressJson: string | null,
  legacyBestRaw: string | null = null
): ProgressStore {
  let legacyBest: number | null = null;
  if (legacyBestRaw) {
    const parsedLegacy = Number.parseInt(legacyBestRaw, 10);
    if (Number.isFinite(parsedLegacy) && parsedLegacy > 0) {
      legacyBest = parsedLegacy;
    }
  }

  if (!rawProgressJson) {
    return createEmptyProgress(legacyBest);
  }

  try {
    const parsed = JSON.parse(rawProgressJson) as Partial<ProgressStore> & {
      audio?: Partial<AudioPreferences>;
    };
    const cleanHoles: Record<number, HoleProgressRecord> = {};
    if (parsed && typeof parsed.holes === 'object' && parsed.holes !== null) {
      for (const [key, value] of Object.entries(parsed.holes)) {
        const id = Number.parseInt(key, 10);
        if (!isHoleImplemented(id)) continue;
        if (!value || typeof value !== 'object') continue;
        const rec = value as Partial<HoleProgressRecord>;
        const bestStrokes =
          typeof rec.bestStrokes === 'number' &&
          Number.isFinite(rec.bestStrokes) &&
          rec.bestStrokes >= 1
            ? Math.round(rec.bestStrokes)
            : null;
        const storedStars =
          rec.stars === 1 || rec.stars === 2 || rec.stars === 3 ? rec.stars : null;
        if (bestStrokes !== null && storedStars !== null) {
          // Preserve existing star rating and upgrade if current rules award higher stars for bestStrokes
          const level = LEVELS[id - 1];
          const computedStars = level ? calculateStars(bestStrokes, level.par, true) : storedStars;
          const finalStars = Math.max(storedStars, computedStars === 0 ? 1 : computedStars) as
            | 1
            | 2
            | 3;
          cleanHoles[id] = { bestStrokes, stars: finalStars };
        }
      }
    }

    const storedBest =
      typeof parsed?.bestFullCourseTotal === 'number' &&
      Number.isFinite(parsed.bestFullCourseTotal) &&
      parsed.bestFullCourseTotal > 0
        ? Math.round(parsed.bestFullCourseTotal)
        : null;

    let mergedBest = storedBest;
    if (legacyBest !== null && (mergedBest === null || legacyBest < mergedBest)) {
      mergedBest = legacyBest;
    }

    const storedLastUnlocked =
      typeof parsed?.lastUnlockedHole === 'number' &&
      Number.isFinite(parsed.lastUnlockedHole) &&
      parsed.lastUnlockedHole >= 1
        ? clampPlayableHole(parsed.lastUnlockedHole)
        : null;

    const storedLastPlayed =
      typeof parsed?.lastPlayedHole === 'number' &&
      Number.isFinite(parsed.lastPlayedHole) &&
      parsed.lastPlayedHole >= 1
        ? clampPlayableHole(parsed.lastPlayedHole)
        : null;

    const audio: AudioPreferences = {
      soundEnabled:
        typeof parsed?.audio?.soundEnabled === 'boolean'
          ? parsed.audio.soundEnabled
          : DEFAULT_AUDIO_PREFS.soundEnabled,
      musicEnabled:
        typeof parsed?.audio?.musicEnabled === 'boolean'
          ? parsed.audio.musicEnabled
          : DEFAULT_AUDIO_PREFS.musicEnabled,
    };

    const storedUnlockedWorlds: WorldId[] = Array.isArray(parsed?.unlockedWorlds)
      ? parsed.unlockedWorlds.filter(
          (wid): wid is WorldId => typeof wid === 'string' && VALID_WORLD_IDS.has(wid as WorldId)
        )
      : [];

    return reconcileDerivedFields(
      cleanHoles,
      storedLastUnlocked,
      storedLastPlayed,
      mergedBest,
      audio,
      storedUnlockedWorlds
    );
  } catch {
    return createEmptyProgress(legacyBest);
  }
}

export function loadProgressFromStorage(): ProgressStore {
  if (typeof window === 'undefined') return createEmptyProgress();
  try {
    const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    const legacyBest = window.localStorage.getItem(LEGACY_BEST_SCORE_KEY);
    return deserializeProgress(raw, legacyBest);
  } catch {
    return createEmptyProgress();
  }
}

export function saveProgressToStorage(progress: ProgressStore): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    if (progress.bestFullCourseTotal !== null) {
      window.localStorage.setItem(LEGACY_BEST_SCORE_KEY, String(progress.bestFullCourseTotal));
    } else {
      window.localStorage.removeItem(LEGACY_BEST_SCORE_KEY);
    }
  } catch {
    // Ignore storage unavailability (e.g. private browsing quota)
  }
}

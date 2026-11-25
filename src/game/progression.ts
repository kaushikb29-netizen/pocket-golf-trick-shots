import { LEVELS } from './levels';
import { getScoreLabel } from './physics';
import type { LevelTheme } from './types';

export interface CourseWorld {
  id: 'sunny-garden' | 'tropical-trouble' | 'neon-nights' | 'frost-falls';
  name: string;
  tagline: string;
  theme: LevelTheme;
  holeIds: number[];
  accentHex: string;
  surfaceHex: string;
  borderHex: string;
}

export const COURSE_WORLDS: CourseWorld[] = [
  {
    id: 'sunny-garden',
    name: 'Sunny Garden',
    tagline: 'Crisp fairways, wooden banks & windmill timing',
    theme: 'garden',
    holeIds: [1, 2, 3, 4],
    accentHex: '#2FA752',
    surfaceHex: '#ECFDF3',
    borderHex: '#1F6F38',
  },
  {
    id: 'tropical-trouble',
    name: 'Tropical Trouble',
    tagline: 'Sandy traps, lagoon hops & palm pinball bumpers',
    theme: 'beach',
    holeIds: [5, 6, 7, 8],
    accentHex: '#0EA5B7',
    surfaceHex: '#ECFEFF',
    borderHex: '#0E7490',
  },
  {
    id: 'neon-nights',
    name: 'Neon Nights',
    tagline: 'Laser gates, linked portals & gravity fields',
    theme: 'neon',
    holeIds: [9, 10, 11, 12],
    accentHex: '#A855F7',
    surfaceHex: '#F5F3FF',
    borderHex: '#6D28D9',
  },
  {
    id: 'frost-falls',
    name: 'Frost Falls',
    tagline: 'Slippery glacier ice, snowballs & crystal mazes',
    theme: 'frost',
    holeIds: [13, 14, 15, 16],
    accentHex: '#0284C7',
    surfaceHex: '#EFF9FF',
    borderHex: '#0C4A6E',
  },
];

export interface HoleProgressRecord {
  bestStrokes: number;
  stars: 1 | 2 | 3;
}

export interface ProgressStore {
  version: 1;
  holes: Record<number, HoleProgressRecord>;
  bestFullCourseTotal: number | null;
}

export type WorldCompletionStatus = 'not_started' | 'in_progress' | 'completed';

export interface WorldProgressStats {
  completedCount: number;
  totalHoles: number;
  earnedStars: number;
  maxStars: number;
  totalPar: number;
  bestWorldStrokes: number | null;
  status: WorldCompletionStatus;
}

export interface OverallProgressStats {
  completedHoles: number;
  totalHoles: number;
  earnedStars: number;
  maxStars: number;
  completedWorlds: number;
  totalWorlds: number;
}

export const PROGRESS_STORAGE_KEY = 'pocket-golf-trick-shots-progress-v1';
export const LEGACY_BEST_SCORE_KEY = 'pocket-golf-trick-shots-best-16';

export function createEmptyProgress(bestFullCourseTotal: number | null = null): ProgressStore {
  return {
    version: 1,
    holes: {},
    bestFullCourseTotal,
  };
}

export function getWorldForLevelId(levelId: number): CourseWorld {
  return (
    COURSE_WORLDS.find((world) => world.holeIds.includes(levelId)) ?? COURSE_WORLDS[0]
  );
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
} {
  const safeStrokes = Math.max(1, Math.round(strokes));
  const scoreInfo = getScoreLabel(safeStrokes, par);
  const earnedStars = scoreInfo.stars;
  const existing = progress.holes[levelId];
  const previousBest = existing ? existing.bestStrokes : null;
  const isNewBest = previousBest === null || safeStrokes < previousBest;

  const updatedRecord: HoleProgressRecord = {
    bestStrokes: existing ? Math.min(existing.bestStrokes, safeStrokes) : safeStrokes,
    stars: existing
      ? (Math.max(existing.stars, earnedStars) as 1 | 2 | 3)
      : earnedStars,
  };

  return {
    progress: {
      ...progress,
      holes: {
        ...progress.holes,
        [levelId]: updatedRecord,
      },
    },
    stars: earnedStars,
    isNewBest,
    previousBest,
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

export function getWorldStats(
  progress: ProgressStore,
  world: CourseWorld
): WorldProgressStats {
  let completedCount = 0;
  let earnedStars = 0;
  let totalPar = 0;
  let bestSum = 0;

  for (const holeId of world.holeIds) {
    const level = LEVELS.find((l) => l.id === holeId);
    if (level) totalPar += level.par;
    const rec = progress.holes[holeId];
    if (rec) {
      completedCount += 1;
      earnedStars += rec.stars;
      bestSum += rec.bestStrokes;
    }
  }

  const totalHoles = world.holeIds.length;
  const status: WorldCompletionStatus =
    completedCount === 0
      ? 'not_started'
      : completedCount >= totalHoles
      ? 'completed'
      : 'in_progress';

  return {
    completedCount,
    totalHoles,
    earnedStars,
    maxStars: totalHoles * 3,
    totalPar,
    bestWorldStrokes: completedCount === totalHoles ? bestSum : null,
    status,
  };
}

export function getOverallProgressStats(progress: ProgressStore): OverallProgressStats {
  let completedHoles = 0;
  let earnedStars = 0;
  let completedWorlds = 0;

  for (const world of COURSE_WORLDS) {
    const stats = getWorldStats(progress, world);
    completedHoles += stats.completedCount;
    earnedStars += stats.earnedStars;
    if (stats.status === 'completed') completedWorlds += 1;
  }

  return {
    completedHoles,
    totalHoles: LEVELS.length,
    earnedStars,
    maxStars: LEVELS.length * 3,
    completedWorlds,
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
    const parsed = JSON.parse(rawProgressJson) as Partial<ProgressStore>;
    const cleanHoles: Record<number, HoleProgressRecord> = {};
    if (parsed && typeof parsed.holes === 'object' && parsed.holes !== null) {
      for (const [key, value] of Object.entries(parsed.holes)) {
        const id = Number.parseInt(key, 10);
        if (!Number.isFinite(id) || id < 1 || id > LEVELS.length) continue;
        if (!value || typeof value !== 'object') continue;
        const rec = value as Partial<HoleProgressRecord>;
        const bestStrokes =
          typeof rec.bestStrokes === 'number' && Number.isFinite(rec.bestStrokes) && rec.bestStrokes >= 1
            ? Math.round(rec.bestStrokes)
            : null;
        const stars =
          rec.stars === 1 || rec.stars === 2 || rec.stars === 3 ? rec.stars : null;
        if (bestStrokes !== null && stars !== null) {
          cleanHoles[id] = { bestStrokes, stars };
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

    return {
      version: 1,
      holes: cleanHoles,
      bestFullCourseTotal: mergedBest,
    };
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
    }
  } catch {
    // Ignore storage unavailability (e.g. private browsing quota)
  }
}

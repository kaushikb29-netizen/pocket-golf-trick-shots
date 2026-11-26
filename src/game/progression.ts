import { LEVELS } from './levels';
import { calculateStars } from './physics';
import type { AudioPreferences, LevelTheme } from './types';

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
  version: 2;
  holes: Record<number, HoleProgressRecord>;
  completedHoles: number[];
  lastUnlockedHole: number;
  totalStars: number;
  bestFullCourseTotal: number | null;
  audio: AudioPreferences;
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

export const DEFAULT_AUDIO_PREFS: AudioPreferences = {
  soundEnabled: true,
  musicEnabled: true,
};

function reconcileDerivedFields(
  holes: Record<number, HoleProgressRecord>,
  storedLastUnlocked: number | null,
  bestFullCourseTotal: number | null,
  audio: AudioPreferences
): ProgressStore {
  const completedHoles = Object.keys(holes)
    .map((k) => Number.parseInt(k, 10))
    .filter((id) => Number.isFinite(id) && id >= 1 && id <= LEVELS.length)
    .sort((a, b) => a - b);

  let totalStars = 0;
  let maxCompleted = 0;
  for (const id of completedHoles) {
    const rec = holes[id];
    if (rec) {
      totalStars += rec.stars;
      if (id > maxCompleted) maxCompleted = id;
    }
  }

  const derivedUnlocked = Math.min(LEVELS.length, Math.max(1, maxCompleted + 1));
  const lastUnlockedHole = Math.min(
    LEVELS.length,
    Math.max(1, derivedUnlocked, storedLastUnlocked ?? 1)
  );

  return {
    version: 2,
    holes,
    completedHoles,
    lastUnlockedHole,
    totalStars,
    bestFullCourseTotal,
    audio,
  };
}

export function createEmptyProgress(
  bestFullCourseTotal: number | null = null,
  audio: AudioPreferences = { ...DEFAULT_AUDIO_PREFS }
): ProgressStore {
  return reconcileDerivedFields({}, 1, bestFullCourseTotal, audio);
}

export function getWorldForLevelId(levelId: number): CourseWorld {
  return (
    COURSE_WORLDS.find((world) => world.holeIds.includes(levelId)) ?? COURSE_WORLDS[0]
  );
}

export function isHoleUnlocked(progress: ProgressStore, holeId: number): boolean {
  if (holeId <= 1) return true;
  if (holeId > LEVELS.length) return false;
  return holeId <= progress.lastUnlockedHole || Boolean(progress.holes[holeId]);
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
  const nextUnlocked = Math.min(LEVELS.length, Math.max(progress.lastUnlockedHole, levelId + 1));

  return {
    progress: reconcileDerivedFields(
      nextHoles,
      nextUnlocked,
      progress.bestFullCourseTotal,
      progress.audio
    ),
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
    const parsed = JSON.parse(rawProgressJson) as Partial<ProgressStore> & {
      audio?: Partial<AudioPreferences>;
    };
    const cleanHoles: Record<number, HoleProgressRecord> = {};
    if (parsed && typeof parsed.holes === 'object' && parsed.holes !== null) {
      for (const [key, value] of Object.entries(parsed.holes)) {
        const id = Number.parseInt(key, 10);
        if (!Number.isFinite(id) || id < 1 || id > LEVELS.length) continue;
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
        ? Math.min(LEVELS.length, Math.round(parsed.lastUnlockedHole))
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

    return reconcileDerivedFields(cleanHoles, storedLastUnlocked, mergedBest, audio);
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

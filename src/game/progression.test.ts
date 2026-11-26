import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from './levels';
import { calculateStars, getMaxStrokes, getScoreLabel, isLastChanceSave } from './physics';
import {
  COURSE_WORLDS,
  createEmptyProgress,
  deserializeProgress,
  getOverallProgressStats,
  getWorldForLevelId,
  getWorldStats,
  isHoleUnlocked,
  recordFullCourseBest,
  recordHoleCompletion,
  resetSavedProgress,
  updateAudioPreferences,
} from './progression';

test('getMaxStrokes and calculateStars follow Par + 3 limit and 3/2/1/0 star rules', () => {
  assert.equal(getMaxStrokes(2), 5);
  assert.equal(getMaxStrokes(3), 6);
  assert.equal(getMaxStrokes(4), 7);
  assert.equal(getMaxStrokes(5), 8);

  // 3 stars: at or below par
  assert.equal(calculateStars(1, 2, true), 3);
  assert.equal(calculateStars(2, 2, true), 3);
  assert.equal(calculateStars(3, 3, true), 3);
  assert.equal(calculateStars(2, 4, true), 3);
  assert.equal(calculateStars(4, 4, true), 3);

  // 2 stars: par + 1
  assert.equal(calculateStars(3, 2, true), 2);
  assert.equal(calculateStars(4, 3, true), 2);
  assert.equal(calculateStars(5, 4, true), 2);

  // 1 star: par + 2 or par + 3
  assert.equal(calculateStars(4, 2, true), 1);
  assert.equal(calculateStars(5, 2, true), 1);
  assert.equal(calculateStars(6, 3, true), 1);
  assert.equal(calculateStars(8, 5, true), 1);

  // 0 stars: fail to complete or exceed Par + 3
  assert.equal(calculateStars(5, 2, false), 0);
  assert.equal(calculateStars(6, 2, true), 0);

  // Last Chance Save detection on final stroke (Par + 3)
  assert.equal(isLastChanceSave(5, 2), true);
  assert.equal(isLastChanceSave(6, 3), true);
  assert.equal(isLastChanceSave(7, 4), true);
  assert.equal(isLastChanceSave(8, 5), true);
  assert.equal(isLastChanceSave(5, 3), false);

  const clutch = getScoreLabel(7, 4);
  assert.equal(clutch.title, 'LAST CHANCE SAVE!');
  assert.equal(clutch.stars, 1);
  assert.equal(clutch.isLastChance, true);
});

test('COURSE_WORLDS maps all 16 holes cleanly with zero duplicates or gaps', () => {
  const mappedIds = COURSE_WORLDS.flatMap((w) => w.holeIds);
  assert.equal(mappedIds.length, LEVELS.length);
  assert.deepEqual(
    mappedIds,
    LEVELS.map((l) => l.id)
  );
  assert.equal(getWorldForLevelId(1).id, 'sunny-garden');
  assert.equal(getWorldForLevelId(6).id, 'tropical-trouble');
  assert.equal(getWorldForLevelId(11).id, 'neon-nights');
  assert.equal(getWorldForLevelId(16).id, 'frost-falls');
});

test('recordHoleCompletion saves best strokes, unlocks next hole, and never downgrades records', () => {
  let store = createEmptyProgress();
  assert.equal(store.lastUnlockedHole, 1);
  assert.equal(isHoleUnlocked(store, 1), true);
  assert.equal(isHoleUnlocked(store, 2), false);

  // Complete Hole 1 in 3 strokes (Par 2 -> +1 Bogey -> 2 stars) -> unlocks Hole 2
  const first = recordHoleCompletion(store, 1, 3, 2);
  store = first.progress;
  assert.equal(first.isNewBest, true);
  assert.equal(first.stars, 2);
  assert.deepEqual(store.holes[1], { bestStrokes: 3, stars: 2 });
  assert.equal(store.lastUnlockedHole, 2);
  assert.deepEqual(store.completedHoles, [1]);
  assert.equal(store.totalStars, 2);
  assert.equal(isHoleUnlocked(store, 2), true);
  assert.equal(isHoleUnlocked(store, 3), false);

  // Improvement: Par on Hole 1 (Par 2 -> 2 strokes -> 3 stars)
  const second = recordHoleCompletion(store, 1, 2, 2);
  store = second.progress;
  assert.equal(second.isNewBest, true);
  assert.equal(second.stars, 3);
  assert.deepEqual(store.holes[1], { bestStrokes: 2, stars: 3 });
  assert.equal(store.totalStars, 3);

  // Worse later attempt (5 strokes, Last Chance Save -> 1 star) preserves bestStrokes=2 and stars=3
  const third = recordHoleCompletion(store, 1, 5, 2);
  store = third.progress;
  assert.equal(third.isNewBest, false);
  assert.equal(third.stars, 1);
  assert.deepEqual(store.holes[1], { bestStrokes: 2, stars: 3 });
  assert.equal(store.totalStars, 3);
});

test('getWorldStats and getOverallProgressStats compute stars and completion states accurately', () => {
  let store = createEmptyProgress();
  const frostWorld = COURSE_WORLDS[3];

  assert.equal(getWorldStats(store, frostWorld).status, 'not_started');
  assert.equal(getWorldStats(store, frostWorld).earnedStars, 0);

  // Clear 2 of 4 Frost Falls holes: H13 Par 3 in 2 (3 stars), H14 Par 4 in 4 (Par -> 3 stars)
  store = recordHoleCompletion(store, 13, 2, 3).progress;
  store = recordHoleCompletion(store, 14, 4, 4).progress;
  const mid = getWorldStats(store, frostWorld);
  assert.equal(mid.status, 'in_progress');
  assert.equal(mid.completedCount, 2);
  assert.equal(mid.earnedStars, 6);
  assert.equal(mid.maxStars, 12);
  assert.equal(mid.bestWorldStrokes, null);

  // Clear remaining 2 Frost Falls holes: H15 Par 4 in 5 (Bogey -> 2 stars), H16 Par 5 in 8 (Last Chance -> 1 star)
  store = recordHoleCompletion(store, 15, 5, 4).progress;
  store = recordHoleCompletion(store, 16, 8, 5).progress;
  const done = getWorldStats(store, frostWorld);
  assert.equal(done.status, 'completed');
  assert.equal(done.completedCount, 4);
  assert.equal(done.earnedStars, 9);
  assert.equal(done.bestWorldStrokes, 19);
  assert.equal(store.lastUnlockedHole, 16);

  const overall = getOverallProgressStats(store);
  assert.equal(overall.completedHoles, 4);
  assert.equal(overall.totalHoles, 16);
  assert.equal(overall.earnedStars, 9);
  assert.equal(overall.maxStars, 48);
  assert.equal(overall.completedWorlds, 1);
});

test('deserializeProgress preserves legacy saves, audio preferences, and resetSavedProgress clears cleanly', () => {
  // Legacy best-16 only, no progress JSON yet
  const migrated = deserializeProgress(null, '54');
  assert.equal(migrated.bestFullCourseTotal, 54);
  assert.deepEqual(migrated.holes, {});
  assert.equal(migrated.lastUnlockedHole, 1);

  // Corrupt JSON falls back cleanly while preserving legacy best
  const fallback = deserializeProgress('{not-valid-json', '52');
  assert.equal(fallback.bestFullCourseTotal, 52);

  // Legacy v1 JSON (without lastUnlockedHole or audio) preserves holes, derives unlock, upgrades Par to 3 stars
  const v1Json = JSON.stringify({
    version: 1,
    holes: { 1: { bestStrokes: 2, stars: 2 }, 2: { bestStrokes: 4, stars: 2 } },
    bestFullCourseTotal: 60,
  });
  const upgraded = deserializeProgress(v1Json, '55');
  assert.equal(upgraded.bestFullCourseTotal, 55);
  assert.deepEqual(upgraded.holes[1], { bestStrokes: 2, stars: 3 }); // Par 2 in 2 strokes -> 3 stars!
  assert.deepEqual(upgraded.holes[2], { bestStrokes: 4, stars: 2 }); // Par 3 in 4 strokes -> 2 stars!
  assert.equal(upgraded.lastUnlockedHole, 3);
  assert.deepEqual(upgraded.completedHoles, [1, 2]);
  assert.equal(upgraded.totalStars, 5);
  assert.deepEqual(upgraded.audio, { soundEnabled: true, musicEnabled: true });

  // Audio preference updates + resetSavedProgress preserves audio prefs while wiping holes
  let store = updateAudioPreferences(upgraded, { musicEnabled: false });
  store = recordFullCourseBest(store, 50).progress;
  const roundTripped = deserializeProgress(JSON.stringify(store));
  assert.equal(roundTripped.audio.musicEnabled, false);
  assert.equal(roundTripped.audio.soundEnabled, true);

  const wiped = resetSavedProgress(roundTripped, true);
  assert.deepEqual(wiped.holes, {});
  assert.deepEqual(wiped.completedHoles, []);
  assert.equal(wiped.lastUnlockedHole, 1);
  assert.equal(wiped.totalStars, 0);
  assert.equal(wiped.bestFullCourseTotal, null);
  assert.equal(wiped.audio.musicEnabled, false);
});

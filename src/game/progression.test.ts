import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from './levels';
import { calculateStars, getMaxStrokes, getScoreLabel, isLastChanceSave } from './physics';
import {
  COURSE_WORLDS,
  PLAYABLE_WORLDS,
  createEmptyProgress,
  deserializeProgress,
  getOverallProgressStats,
  getWorldById,
  getWorldForLevelId,
  getWorldStats,
  isHoleImplemented,
  isHoleUnlocked,
  isWorldUnlocked,
  recordFullCourseBest,
  recordHoleCompletion,
  recordLastPlayedHole,
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

test('COURSE_WORLDS defines 6 themed worlds (5 playable covering Holes 1-18 + Holes 19-24 Coming Soon)', () => {
  assert.equal(COURSE_WORLDS.length, 6);
  assert.equal(PLAYABLE_WORLDS.length, 5);
  assert.equal(LEVELS.length, 18);

  const implementedInPlayableWorlds = PLAYABLE_WORLDS.flatMap((w) => w.holeIds).filter((id) =>
    isHoleImplemented(id)
  );
  assert.equal(implementedInPlayableWorlds.length, LEVELS.length);
  assert.deepEqual(
    implementedInPlayableWorlds,
    LEVELS.map((l) => l.id)
  );

  const allMappedIds = COURSE_WORLDS.flatMap((w) => w.holeIds);
  assert.equal(allMappedIds.length, 24);
  assert.deepEqual(allMappedIds, Array.from({ length: 24 }, (_, i) => i + 1));

  assert.equal(getWorldForLevelId(1).id, 'sunny-garden');
  assert.equal(getWorldForLevelId(6).id, 'tropical-trouble');
  assert.equal(getWorldForLevelId(11).id, 'neon-nights');
  assert.equal(getWorldForLevelId(16).id, 'frost-falls');
  assert.equal(getWorldForLevelId(17).id, 'candy-factory');
  assert.equal(getWorldForLevelId(18).id, 'candy-factory');
  assert.equal(getWorldForLevelId(24).id, 'clockwork-carnival');

  const candy = getWorldById('candy-factory');
  const carnival = getWorldById('clockwork-carnival');
  assert.equal(candy.comingSoon, false);
  assert.equal(carnival.comingSoon, true);
  assert.equal(isHoleImplemented(16), true);
  assert.equal(isHoleImplemented(17), true);
  assert.equal(isHoleImplemented(18), true);
  assert.equal(isHoleImplemented(19), false);
  assert.equal(isHoleImplemented(20), false);
  assert.equal(isHoleImplemented(24), false);
});

test('recordHoleCompletion saves best strokes, unlocks next implemented hole, tracks lastPlayedHole, and never unlocks Coming Soon worlds', () => {
  let store = createEmptyProgress();
  assert.equal(store.lastUnlockedHole, 1);
  assert.equal(store.lastPlayedHole, 1);
  assert.equal(isHoleUnlocked(store, 1), true);
  assert.equal(isHoleUnlocked(store, 2), false);
  assert.equal(isWorldUnlocked(store, getWorldById('sunny-garden')), true);
  assert.equal(isWorldUnlocked(store, getWorldById('tropical-trouble')), false);
  assert.equal(isWorldUnlocked(store, getWorldById('candy-factory')), false);
  assert.equal(isWorldUnlocked(store, getWorldById('clockwork-carnival')), false);

  // Complete Hole 1 in 3 strokes (Par 2 -> +1 Bogey -> 2 stars) -> unlocks Hole 2
  const first = recordHoleCompletion(store, 1, 3, 2);
  store = first.progress;
  assert.equal(first.isNewBest, true);
  assert.equal(first.stars, 2);
  assert.deepEqual(store.holes[1], { bestStrokes: 3, stars: 2 });
  assert.equal(store.lastUnlockedHole, 2);
  assert.equal(store.lastPlayedHole, 1);
  assert.deepEqual(store.completedHoles, [1]);
  assert.equal(store.totalStars, 2);
  assert.equal(isHoleUnlocked(store, 2), true);
  assert.equal(isHoleUnlocked(store, 3), false);

  // Selecting Hole 2 updates lastPlayedHole
  store = recordLastPlayedHole(store, 2);
  assert.equal(store.lastPlayedHole, 2);

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

  // Completing Hole 16 unlocks Hole 17 & Candy Factory; completing Hole 18 caps at 18 and never unlocks Holes 19-24
  store = recordHoleCompletion(store, 16, 5, 5).progress;
  assert.equal(store.lastUnlockedHole, 17);
  assert.equal(isHoleUnlocked(store, 17), true);
  assert.equal(isHoleUnlocked(store, 18), false);
  assert.equal(isWorldUnlocked(store, getWorldById('candy-factory')), true);
  assert.equal(isWorldUnlocked(store, getWorldById('clockwork-carnival')), false);

  store = recordHoleCompletion(store, 17, 3, 3).progress;
  assert.equal(store.lastUnlockedHole, 18);
  assert.equal(isHoleUnlocked(store, 18), true);

  store = recordHoleCompletion(store, 18, 4, 4).progress;
  assert.equal(store.lastUnlockedHole, 18);
  assert.equal(isHoleUnlocked(store, 19), false);
  assert.equal(isHoleUnlocked(store, 20), false);
  assert.equal(isWorldUnlocked(store, getWorldById('clockwork-carnival')), false);
});

test('getWorldStats and getOverallProgressStats handle playable, partially implemented, and Coming Soon worlds accurately', () => {
  let store = createEmptyProgress();
  const frostWorld = getWorldById('frost-falls');
  const candyWorld = getWorldById('candy-factory');
  const carnivalWorld = getWorldById('clockwork-carnival');

  assert.equal(getWorldStats(store, frostWorld).status, 'not_started');
  assert.equal(getWorldStats(store, frostWorld).earnedStars, 0);

  const candyStats = getWorldStats(store, candyWorld);
  assert.equal(candyStats.status, 'not_started');
  assert.equal(candyStats.implementedHoles, 2);
  assert.equal(candyStats.totalHoles, 4);
  assert.equal(candyStats.maxStars, 6);
  assert.equal(candyStats.totalPar, 7);

  const carnivalStats = getWorldStats(store, carnivalWorld);
  assert.equal(carnivalStats.status, 'coming_soon');
  assert.equal(carnivalStats.implementedHoles, 0);
  assert.equal(carnivalStats.totalHoles, 4);
  assert.equal(carnivalStats.totalPar, null);

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
  assert.equal(store.lastUnlockedHole, 17);

  const overall = getOverallProgressStats(store);
  assert.equal(overall.completedHoles, 4);
  assert.equal(overall.totalHoles, 18);
  assert.equal(overall.earnedStars, 9);
  assert.equal(overall.maxStars, 54);
  assert.equal(overall.completedWorlds, 1);
  assert.equal(overall.playableWorlds, 5);
  assert.equal(overall.totalWorlds, 6);
});

test('deserializeProgress preserves legacy saves, audio preferences, lastPlayedHole, and resetSavedProgress clears cleanly', () => {
  // Legacy best-16 only, no progress JSON yet
  const migrated = deserializeProgress(null, '54');
  assert.equal(migrated.bestFullCourseTotal, 54);
  assert.deepEqual(migrated.holes, {});
  assert.equal(migrated.lastUnlockedHole, 1);
  assert.equal(migrated.lastPlayedHole, 1);

  // Corrupt JSON falls back cleanly while preserving legacy best
  const fallback = deserializeProgress('{not-valid-json', '52');
  assert.equal(fallback.bestFullCourseTotal, 52);

  // Legacy v1 JSON (without lastUnlockedHole, lastPlayedHole, or audio) preserves holes, derives unlock, upgrades Par to 3 stars
  const v1Json = JSON.stringify({
    version: 1,
    holes: { 1: { bestStrokes: 2, stars: 2 }, 2: { bestStrokes: 4, stars: 2 } },
    bestFullCourseTotal: 60,
  });
  const upgraded = deserializeProgress(v1Json, '55');
  assert.equal(upgraded.bestFullCourseTotal, 55);
  assert.deepEqual(upgraded.holes[1], { bestStrokes: 2, stars: 3 });
  assert.deepEqual(upgraded.holes[2], { bestStrokes: 4, stars: 2 });
  assert.equal(upgraded.lastUnlockedHole, 3);
  assert.equal(upgraded.lastPlayedHole, 3);
  assert.deepEqual(upgraded.completedHoles, [1, 2]);
  assert.equal(upgraded.totalStars, 5);
  assert.deepEqual(upgraded.audio, { soundEnabled: true, musicEnabled: true });

  // Audio preference updates + lastPlayedHole round-trip + resetSavedProgress preserves audio prefs while wiping holes
  let store = updateAudioPreferences(upgraded, { musicEnabled: false });
  store = recordLastPlayedHole(store, 2);
  store = recordFullCourseBest(store, 50).progress;
  const roundTripped = deserializeProgress(JSON.stringify(store));
  assert.equal(roundTripped.audio.musicEnabled, false);
  assert.equal(roundTripped.audio.soundEnabled, true);
  assert.equal(roundTripped.lastPlayedHole, 2);

  const wiped = resetSavedProgress(roundTripped, true);
  assert.deepEqual(wiped.holes, {});
  assert.deepEqual(wiped.completedHoles, []);
  assert.equal(wiped.lastUnlockedHole, 1);
  assert.equal(wiped.lastPlayedHole, 1);
  assert.equal(wiped.totalStars, 0);
  assert.equal(wiped.bestFullCourseTotal, null);
  assert.equal(wiped.audio.musicEnabled, false);
});

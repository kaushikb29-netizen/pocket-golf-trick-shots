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

test('COURSE_WORLDS defines 6 playable themed worlds covering all 24 implemented holes (Holes 1-24)', () => {
  assert.equal(COURSE_WORLDS.length, 6);
  assert.equal(PLAYABLE_WORLDS.length, 6);
  assert.equal(LEVELS.length, 24);

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
  assert.equal(getWorldForLevelId(20).id, 'candy-factory');
  assert.equal(getWorldForLevelId(21).id, 'clockwork-carnival');
  assert.equal(getWorldForLevelId(24).id, 'clockwork-carnival');

  const candy = getWorldById('candy-factory');
  const carnival = getWorldById('clockwork-carnival');
  assert.equal(candy.comingSoon, false);
  assert.equal(carnival.comingSoon, false);
  assert.equal(isHoleImplemented(20), true);
  assert.equal(isHoleImplemented(21), true);
  assert.equal(isHoleImplemented(22), true);
  assert.equal(isHoleImplemented(23), true);
  assert.equal(isHoleImplemented(24), true);
  assert.equal(isHoleImplemented(25), false);
});

test('recordHoleCompletion saves best strokes, unlocks sequentially through Hole 24, and never unlocks beyond Hole 24', () => {
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

  // Completing Hole 20 unlocks Hole 21 and World 6 Clockwork Carnival
  store = recordHoleCompletion(store, 20, 5, 5).progress;
  assert.equal(store.lastUnlockedHole, 21);
  assert.equal(isHoleUnlocked(store, 21), true);
  assert.equal(isHoleUnlocked(store, 22), false);
  assert.equal(isWorldUnlocked(store, getWorldById('clockwork-carnival')), true);

  store = recordHoleCompletion(store, 21, 4, 4).progress;
  assert.equal(store.lastUnlockedHole, 22);
  assert.equal(isHoleUnlocked(store, 22), true);

  store = recordHoleCompletion(store, 22, 4, 4).progress;
  assert.equal(store.lastUnlockedHole, 23);
  assert.equal(isHoleUnlocked(store, 23), true);

  store = recordHoleCompletion(store, 23, 5, 5).progress;
  assert.equal(store.lastUnlockedHole, 24);
  assert.equal(isHoleUnlocked(store, 24), true);

  // Completing Hole 24 caps at 24 and never unlocks Hole 25
  store = recordHoleCompletion(store, 24, 5, 5).progress;
  assert.equal(store.lastUnlockedHole, 24);
  assert.equal(isHoleUnlocked(store, 25), false);
});

test('getWorldStats and getOverallProgressStats report all 6 worlds (24 holes, 72 max stars) accurately', () => {
  let store = createEmptyProgress();
  const frostWorld = getWorldById('frost-falls');
  const candyWorld = getWorldById('candy-factory');
  const carnivalWorld = getWorldById('clockwork-carnival');

  assert.equal(getWorldStats(store, frostWorld).status, 'not_started');
  assert.equal(getWorldStats(store, frostWorld).earnedStars, 0);

  const candyStats = getWorldStats(store, candyWorld);
  assert.equal(candyStats.status, 'not_started');
  assert.equal(candyStats.implementedHoles, 4);
  assert.equal(candyStats.totalHoles, 4);
  assert.equal(candyStats.maxStars, 12);
  assert.equal(candyStats.totalPar, 16);

  const carnivalStats = getWorldStats(store, carnivalWorld);
  assert.equal(carnivalStats.status, 'not_started');
  assert.equal(carnivalStats.implementedHoles, 4);
  assert.equal(carnivalStats.totalHoles, 4);
  assert.equal(carnivalStats.maxStars, 12);
  assert.equal(carnivalStats.totalPar, 18);

  // Clear all 4 Clockwork Carnival holes: H21 Par 4 in 3 (3★), H22 Par 4 in 4 (3★), H23 Par 5 in 6 (2★), H24 Par 5 in 8 (1★)
  store = recordHoleCompletion(store, 21, 3, 4).progress;
  store = recordHoleCompletion(store, 22, 4, 4).progress;
  const mid = getWorldStats(store, carnivalWorld);
  assert.equal(mid.status, 'in_progress');
  assert.equal(mid.completedCount, 2);
  assert.equal(mid.earnedStars, 6);
  assert.equal(mid.maxStars, 12);
  assert.equal(mid.bestWorldStrokes, null);

  store = recordHoleCompletion(store, 23, 6, 5).progress;
  store = recordHoleCompletion(store, 24, 8, 5).progress;
  const done = getWorldStats(store, carnivalWorld);
  assert.equal(done.status, 'completed');
  assert.equal(done.completedCount, 4);
  assert.equal(done.earnedStars, 9);
  assert.equal(done.bestWorldStrokes, 21);
  assert.equal(store.lastUnlockedHole, 24);

  const overall = getOverallProgressStats(store);
  assert.equal(overall.completedHoles, 4);
  assert.equal(overall.totalHoles, 24);
  assert.equal(overall.earnedStars, 9);
  assert.equal(overall.maxStars, 72);
  assert.equal(overall.completedWorlds, 1);
  assert.equal(overall.playableWorlds, 6);
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

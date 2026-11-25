import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from './levels';
import {
  COURSE_WORLDS,
  createEmptyProgress,
  deserializeProgress,
  getOverallProgressStats,
  getWorldForLevelId,
  getWorldStats,
  recordFullCourseBest,
  recordHoleCompletion,
} from './progression';

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

test('recordHoleCompletion saves best strokes and never downgrades stars or best score', () => {
  let store = createEmptyProgress();

  // Initial Bogey on Hole 2 (Par 3 -> 4 strokes, 2 stars)
  const first = recordHoleCompletion(store, 2, 4, 3);
  store = first.progress;
  assert.equal(first.isNewBest, true);
  assert.equal(first.stars, 2);
  assert.deepEqual(store.holes[2], { bestStrokes: 4, stars: 2 });

  // Improvement: Birdie on Hole 2 (Par 3 -> 2 strokes, 3 stars)
  const second = recordHoleCompletion(store, 2, 2, 3);
  store = second.progress;
  assert.equal(second.isNewBest, true);
  assert.equal(second.stars, 3);
  assert.deepEqual(store.holes[2], { bestStrokes: 2, stars: 3 });

  // Worse later attempt (6 strokes, 1 star) preserves bestStrokes=2 and stars=3
  const third = recordHoleCompletion(store, 2, 6, 3);
  store = third.progress;
  assert.equal(third.isNewBest, false);
  assert.equal(third.stars, 1);
  assert.deepEqual(store.holes[2], { bestStrokes: 2, stars: 3 });
});

test('getWorldStats and getOverallProgressStats compute stars and completion states accurately', () => {
  let store = createEmptyProgress();
  const frostWorld = COURSE_WORLDS[3];

  assert.equal(getWorldStats(store, frostWorld).status, 'not_started');
  assert.equal(getWorldStats(store, frostWorld).earnedStars, 0);

  // Clear 2 of 4 Frost Falls holes
  store = recordHoleCompletion(store, 13, 2, 3).progress; // 3 stars
  store = recordHoleCompletion(store, 14, 4, 4).progress; // 2 stars
  const mid = getWorldStats(store, frostWorld);
  assert.equal(mid.status, 'in_progress');
  assert.equal(mid.completedCount, 2);
  assert.equal(mid.earnedStars, 5);
  assert.equal(mid.maxStars, 12);
  assert.equal(mid.bestWorldStrokes, null);

  // Clear remaining 2 Frost Falls holes
  store = recordHoleCompletion(store, 15, 3, 4).progress; // 3 stars
  store = recordHoleCompletion(store, 16, 4, 5).progress; // 3 stars
  const done = getWorldStats(store, frostWorld);
  assert.equal(done.status, 'completed');
  assert.equal(done.completedCount, 4);
  assert.equal(done.earnedStars, 11);
  assert.equal(done.bestWorldStrokes, 13);

  const overall = getOverallProgressStats(store);
  assert.equal(overall.completedHoles, 4);
  assert.equal(overall.totalHoles, 16);
  assert.equal(overall.earnedStars, 11);
  assert.equal(overall.maxStars, 48);
  assert.equal(overall.completedWorlds, 1);
});

test('deserializeProgress preserves legacy bestTotal and safely ignores corrupt storage', () => {
  // Legacy best-16 only, no new progress JSON yet
  const migrated = deserializeProgress(null, '54');
  assert.equal(migrated.bestFullCourseTotal, 54);
  assert.deepEqual(migrated.holes, {});

  // Corrupt JSON falls back cleanly while preserving legacy best
  const fallback = deserializeProgress('{not-valid-json', '52');
  assert.equal(fallback.bestFullCourseTotal, 52);

  // Round-trip valid JSON merged with better legacy score
  let store = createEmptyProgress(60);
  store = recordHoleCompletion(store, 1, 1, 2).progress;
  store = recordFullCourseBest(store, 57).progress;
  const restored = deserializeProgress(JSON.stringify(store), '55');
  assert.equal(restored.bestFullCourseTotal, 55);
  assert.deepEqual(restored.holes[1], { bestStrokes: 1, stars: 3 });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from './levels';
import {
  computeShotFromDrag,
  createInitialSimState,
  evaluateGateState,
  formatParDelta,
  getScoreLabel,
  launchBall,
  predictAimPath,
  stepSimulation,
} from './physics';

test('computeShotFromDrag aims opposite to drag vector and cancels tiny drags', () => {
  const tiny = computeShotFromDrag({ x: 200, y: 270 }, { x: 204, y: 270 });
  assert.equal(tiny.valid, false);
  assert.equal(tiny.power, 0);

  // Dragging left (-100, 0) should shoot right (+vx, 0)
  const valid = computeShotFromDrag({ x: 200, y: 270 }, { x: 100, y: 270 });
  assert.equal(valid.valid, true);
  assert.ok(valid.vx > 0, 'expected positive vx when dragging left');
  assert.equal(Math.abs(valid.vy) < 1e-6, true);
  assert.ok(valid.power > 0.4 && valid.power < 0.7);
});

test('Level 1 straight shot rolls smoothly, decelerates, and sinks into the hole', () => {
  const level1 = LEVELS[0];
  const sim = createInitialSimState(level1);
  // Shoot straight right toward the hole (distance 500px)
  launchBall(sim.ball, 720, 0);

  let sank = false;
  for (let i = 0; i < 300; i++) {
    const events = stepSimulation(sim, level1, 1 / 60);
    if (events.some((e) => e.type === 'hole_sink')) {
      sank = true;
      break;
    }
  }

  assert.equal(sank, true, 'ball should sink into Level 1 hole on a straight medium-firm shot');
  assert.equal(sim.ball.holed, true);
});

test('ball settles naturally to zero velocity on gentle shot without drifting forever', () => {
  const level1 = LEVELS[0];
  const sim = createInitialSimState(level1);
  launchBall(sim.ball, 180, 0);

  for (let i = 0; i < 240; i++) {
    stepSimulation(sim, level1, 1 / 60);
  }

  assert.equal(sim.ball.isMoving, false);
  assert.equal(sim.ball.vx, 0);
  assert.equal(sim.ball.vy, 0);
  assert.ok(sim.ball.x > level1.tee.x + 50, 'ball should have traveled forward before stopping');
});

test('high-speed shot bounces off walls without tunneling outside course bounds', () => {
  const level1 = LEVELS[0];
  const sim = createInitialSimState(level1);
  // Shoot fast diagonally upward into top wooden rail
  launchBall(sim.ball, 400, -960);

  let bounced = false;
  let reflectedDownward = false;
  for (let i = 0; i < 120; i++) {
    const events = stepSimulation(sim, level1, 1 / 60);
    if (events.some((e) => e.type === 'wall')) {
      if (!bounced && sim.ball.vy > 0) {
        reflectedDownward = true;
      }
      bounced = true;
    }
    assert.ok(sim.ball.y >= 155, `ball tunneled past top wall: y=${sim.ball.y}`);
    assert.ok(sim.ball.y <= 385, `ball tunneled past bottom wall: y=${sim.ball.y}`);
    assert.ok(sim.ball.x >= 110, `ball tunneled past left wall: x=${sim.ball.x}`);
    assert.ok(sim.ball.x <= 790, `ball tunneled past right wall: x=${sim.ball.x}`);
  }

  assert.equal(bounced, true, 'expected at least one wall collision');
  assert.equal(reflectedDownward, true, 'ball should reflect downward after hitting top rail');
});

test('Level 2 bumper rebounds ball with bouncy impulse', () => {
  const level2 = LEVELS[1];
  const sim = createInitialSimState(level2);
  const bumper = level2.bumpers[0];

  // Place ball directly left of bumper and shoot right into it
  sim.ball.x = bumper.x - bumper.radius - 40;
  sim.ball.y = bumper.y;
  launchBall(sim.ball, 320, 0);

  let hitBumper = false;
  for (let i = 0; i < 30; i++) {
    const events = stepSimulation(sim, level2, 1 / 60);
    if (events.some((e) => e.type === 'bumper')) {
      hitBumper = true;
      break;
    }
  }

  assert.equal(hitBumper, true, 'expected bumper collision event');
  assert.ok(sim.ball.vx < -100, 'ball should rebound strongly leftward off bumper');
});

test('Level 3 rotating obstacle spins over time and bats a ball in its sweep path', () => {
  const level3 = LEVELS[2];
  const sim = createInitialSimState(level3);
  const initialAngle = sim.rotatorAngles[0];
  const rotator = level3.rotators[0];

  // Place a stationary ball within the sweep path of the rotating blades
  sim.ball.x = rotator.cx + 70;
  sim.ball.y = rotator.cy;
  sim.ball.isMoving = false;

  let hitByRotator = false;
  for (let i = 0; i < 180; i++) {
    const events = stepSimulation(sim, level3, 1 / 60);
    if (events.some((e) => e.type === 'rotator')) {
      hitByRotator = true;
      break;
    }
  }

  assert.ok(sim.rotatorAngles[0] > initialAngle + 0.2, 'rotating obstacle must advance angle');
  assert.equal(hitByRotator, true, 'rotating blade should strike and launch ball in its path');
  assert.equal(sim.ball.isMoving, true);
});

test('predictAimPath generates trajectory points and scoring labels match golf rules', () => {
  const level1 = LEVELS[0];
  const sim = createInitialSimState(level1);
  const pts = predictAimPath(sim.ball, 500, -180, level1, sim.rotatorAngles);
  assert.ok(pts.length >= 6, 'aim prediction should return multiple guide points');

  assert.equal(getScoreLabel(1, 2).title, 'HOLE IN ONE!');
  assert.equal(getScoreLabel(2, 3).title, 'BIRDIE!');
  assert.equal(getScoreLabel(3, 3).title, 'NICE PAR!');
  assert.equal(getScoreLabel(4, 3).title, 'BOGEY');
  assert.equal(formatParDelta(8, 8), 'Even Par');
  assert.equal(formatParDelta(6, 8), '-2 Under Par');
  assert.equal(formatParDelta(10, 8), '+2 Over Par');
});

test('course sequence contains 12 holes with expected names and pars', () => {
  assert.equal(LEVELS.length, 12);
  assert.deepEqual(
    LEVELS.map((l) => [l.id, l.name, l.par]),
    [
      [1, 'Sunny Straightaway', 2],
      [2, 'Timber Ricochet', 3],
      [3, 'Windmill Mill', 3],
      [4, 'Zigzag Garden', 3],
      [5, 'Sandy Shortcut', 3],
      [6, 'Island Hop', 4],
      [7, 'Palm Pinball', 4],
      [8, 'Windy Beach', 4],
      [9, 'Laser Lanes', 4],
      [10, 'Teleport Trick', 4],
      [11, 'Gravity Bump', 4],
      [12, 'Ultimate Trick Shot', 5],
    ]
  );
  const totalPar = LEVELS.reduce((sum, l) => sum + l.par, 0);
  assert.equal(totalPar, 43);
});

test('Hole 4 Zigzag Garden angled corner bumper deflects vertical shot cleanly into corridor', () => {
  const level4 = LEVELS[3];
  const sim = createInitialSimState(level4);
  // Shoot straight up toward the top-left 45-degree corner bank wall
  launchBall(sim.ball, 0, -760);

  let bankedRight = false;
  for (let i = 0; i < 90; i++) {
    stepSimulation(sim, level4, 1 / 60);
    if (sim.ball.vx > 200) {
      bankedRight = true;
      break;
    }
  }
  assert.equal(bankedRight, true, 'top-left angled bumper should ricochet shot rightward down the zigzag');
});

test('Hole 5 Sandy Shortcut sand patches slow ball significantly faster than normal turf', () => {
  const level5 = LEVELS[4];
  // Compare travel distance of identical speed shot on normal green vs rolling across sand patches
  const simSand = createInitialSimState(level5);
  launchBall(simSand.ball, 540, 0); // rolls directly across sand patch 1 & 2

  const simClear = createInitialSimState(level5);
  simClear.ball.x = 165;
  simClear.ball.y = 145; // upper clear green lane (no sand)
  launchBall(simClear.ball, 540, 0);

  for (let i = 0; i < 240; i++) {
    stepSimulation(simSand, level5, 1 / 60);
    stepSimulation(simClear, level5, 1 / 60);
  }

  const sandTravel = simSand.ball.x - 165;
  const clearTravel = simClear.ball.x - 165;
  assert.ok(
    sandTravel < clearTravel * 0.72,
    `expected sand to slow ball noticeably (sandTravel=${sandTravel.toFixed(1)}, clearTravel=${clearTravel.toFixed(1)})`
  );
});

test('Hole 6 Island Hop water hazard returns ball to lastSafePos and emits water_hazard penalty event', () => {
  const level6 = LEVELS[5];
  const sim = createInitialSimState(level6);
  // First move ball safely onto a new resting spot (220, 270)
  sim.ball.x = 220;
  sim.ball.y = 270;
  // Shoot straight right into the central water lagoon (x = 348..552, y = 209..331)
  launchBall(sim.ball, 520, 0);

  let waterEventCount = 0;
  for (let i = 0; i < 90; i++) {
    const events = stepSimulation(sim, level6, 1 / 60);
    for (const ev of events) {
      if (ev.type === 'water_hazard') {
        waterEventCount++;
      }
    }
    if (waterEventCount > 0) break;
  }

  assert.equal(waterEventCount, 1, 'expected exactly one water_hazard event');
  assert.equal(sim.ball.isMoving, false, 'ball should stop upon returning from water');
  assert.equal(sim.ball.x, 220, 'ball should return to last safe X position');
  assert.equal(sim.ball.y, 270, 'ball should return to last safe Y position');
});

test('Hole 6 Island Hop both upper and lower safe pathways can reach the right island without hitting water', () => {
  const level6 = LEVELS[5];

  // Upper pathway test: start at (335, 150) and roll cleanly across top safe bridge to right island (650+)
  const simUpper = createInitialSimState(level6);
  simUpper.ball.x = 335;
  simUpper.ball.y = 155;
  launchBall(simUpper.ball, 500, 0);
  let upperHitWater = false;
  for (let i = 0; i < 120; i++) {
    const events = stepSimulation(simUpper, level6, 1 / 60);
    if (events.some((e) => e.type === 'water_hazard')) upperHitWater = true;
  }
  assert.equal(upperHitWater, false, 'upper safe pathway should stay dry');
  assert.ok(simUpper.ball.x > 600, `upper pathway should reach right island (x=${simUpper.ball.x})`);

  // Lower pathway test: start at (260, 385) and roll cleanly across bottom safe bridge toward right side
  const simLower = createInitialSimState(level6);
  simLower.ball.x = 260;
  simLower.ball.y = 385;
  launchBall(simLower.ball, 420, -45);
  let lowerHitWater = false;
  for (let i = 0; i < 120; i++) {
    const events = stepSimulation(simLower, level6, 1 / 60);
    if (events.some((e) => e.type === 'water_hazard')) lowerHitWater = true;
  }
  assert.equal(lowerHitWater, false, 'lower safe pathway should stay dry');
  assert.ok(simLower.ball.x > 540, `lower pathway should reach right island (x=${simLower.ball.x})`);
});

test('Hole 7 Palm Pinball rebounds ball off circular bumpers and allows reaching the rear cup', () => {
  const level7 = LEVELS[6];
  assert.equal(level7.bumpers.length, 5, 'Hole 7 should feature 5 circular bumpers');

  // Straight shot from tee hits the lead bumper at (372, 270) and rebounds
  const simBumper = createInitialSimState(level7);
  launchBall(simBumper.ball, 560, 0);
  let hitBumper = false;
  for (let i = 0; i < 60; i++) {
    const events = stepSimulation(simBumper, level7, 1 / 60);
    if (events.some((e) => e.type === 'bumper')) {
      hitBumper = true;
      break;
    }
  }
  assert.equal(hitBumper, true, 'straight tee shot should bounce off lead pinball bumper');
  assert.ok(simBumper.ball.vx < -100, 'ball should rebound strongly leftward off lead bumper');

  // Practical path around bumper cluster reaches the rear green and can sink into the hole
  const simSink = createInitialSimState(level7);
  simSink.ball.x = 640;
  simSink.ball.y = 270;
  launchBall(simSink.ball, 210, 0);
  let sank = false;
  for (let i = 0; i < 180; i++) {
    const events = stepSimulation(simSink, level7, 1 / 60);
    if (events.some((e) => e.type === 'hole_sink')) {
      sank = true;
      break;
    }
  }
  assert.equal(sank, true, 'ball behind the bumper cluster should roll cleanly into Hole 7 cup');
});

test('Hole 8 Windy Beach has twin counter-rotating windmills and a navigable central passage', () => {
  const level8 = LEVELS[7];
  assert.equal(level8.rotators.length, 2, 'Hole 8 should have two rotating windmills');
  assert.ok(
    level8.rotators[0].angularVelocity * level8.rotators[1].angularVelocity < 0,
    'twin windmills should counter-rotate smoothly'
  );

  // Verify windmills physically strike/deflect a ball in their sweep path
  const simHit = createInitialSimState(level8);
  const w0 = level8.rotators[0];
  simHit.ball.x = w0.cx + 55;
  simHit.ball.y = w0.cy;
  let struck = false;
  for (let i = 0; i < 240; i++) {
    const events = stepSimulation(simHit, level8, 1 / 60);
    if (events.some((e) => e.type === 'rotator')) {
      struck = true;
      break;
    }
  }
  assert.equal(struck, true, 'windmill blade should physically block/deflect a ball in its sweep');

  // Verify Stage 1: timed shot from tee lane passes Windmill 1 into the central safe passage (x = 403..491)
  const simStage1 = createInitialSimState(level8);
  simStage1.ball.x = 180;
  simStage1.ball.y = 228;
  simStage1.rotatorAngles[0] = 0; // horizontal blade clears y = 228
  launchBall(simStage1.ball, 420, 0);
  for (let i = 0; i < 120; i++) {
    stepSimulation(simStage1, level8, 1 / 60);
  }
  assert.ok(
    simStage1.ball.x > 410 && simStage1.ball.x < 500,
    `timed Stage 1 shot should reach the central passage safe pocket (x=${simStage1.ball.x.toFixed(1)})`
  );

  // Verify Stage 2: timed shot from central passage passes Windmill 2 cleanly into the final putting section (x > 670)
  const simStage2 = createInitialSimState(level8);
  simStage2.ball.x = 450;
  simStage2.ball.y = 228;
  simStage2.rotatorAngles[1] = 0.2; // rotating counter-clockwise toward horizontal as ball passes
  launchBall(simStage2.ball, 520, 0);
  for (let i = 0; i < 150; i++) {
    stepSimulation(simStage2, level8, 1 / 60);
  }
  assert.ok(
    simStage2.ball.x > 670,
    `timed Stage 2 shot should pass Windmill 2 into the final putting section (x=${simStage2.ball.x.toFixed(1)})`
  );
});

test('Hole 9 Laser Lanes moving gates cycle cleanly, bounce ball when closed, and let ball pass when open', () => {
  const level9 = LEVELS[8];
  assert.equal(level9.theme, 'neon');
  assert.equal(level9.gates?.length, 2, 'Hole 9 should have two moving gates');

  const gate1 = level9.gates![0];
  // Find a closed time (openAmount === 0) and an open time (openAmount === 1) across one full period
  let closedTime = -1;
  let openTime = -1;
  for (let t = 0; t <= gate1.period; t += 0.05) {
    const st = evaluateGateState(gate1, t);
    if (closedTime < 0 && st.openAmount === 0) closedTime = t;
    if (openTime < 0 && st.openAmount === 1) openTime = t;
  }
  assert.ok(closedTime >= 0, 'gate 1 must have a fully closed phase');
  assert.ok(openTime >= 0, 'gate 1 must have a fully open phase');

  // Shooting into closed Gate 1 should bounce the ball back safely without destroying it
  const simClosed = createInitialSimState(level9);
  simClosed.elapsedTime = closedTime;
  simClosed.ball.x = 270;
  simClosed.ball.y = 270;
  launchBall(simClosed.ball, 420, 0);
  let hitGate = false;
  for (let i = 0; i < 40; i++) {
    const events = stepSimulation(simClosed, level9, 1 / 60);
    if (events.some((e) => e.type === 'gate')) {
      hitGate = true;
      break;
    }
  }
  assert.equal(hitGate, true, 'closed moving gate should emit gate collision event');
  assert.ok(simClosed.ball.vx < -50, 'closed moving gate should bounce the ball backward');
  assert.equal(simClosed.ball.holed, false, 'ball should remain intact after bouncing off gate');

  // Shooting when Gate 1 is open should glide straight through x = 342
  const simOpen = createInitialSimState(level9);
  simOpen.elapsedTime = openTime;
  simOpen.ball.x = 270;
  simOpen.ball.y = 270;
  launchBall(simOpen.ball, 540, 0);
  let hitGateWhenOpen = false;
  for (let i = 0; i < 24; i++) {
    const events = stepSimulation(simOpen, level9, 1 / 60);
    if (events.some((e) => e.type === 'gate')) hitGateWhenOpen = true;
  }
  assert.equal(hitGateWhenOpen, false, 'open gate should not block the ball');
  assert.ok(
    simOpen.ball.x > 365,
    `ball should pass cleanly past open gate at x=342 (x=${simOpen.ball.x.toFixed(1)})`
  );
});

test('Hole 10 Teleport Trick warps ball between linked portals with cooldown preventing loops', () => {
  const level10 = LEVELS[9];
  assert.equal(level10.theme, 'neon');
  assert.equal(level10.portals?.length, 1, 'Hole 10 should have a connected portal pair');

  const pair = level10.portals![0];
  const sim = createInitialSimState(level10);
  // Position ball just left of Portal A and launch rightward into Portal A
  sim.ball.x = pair.a.x - 45;
  sim.ball.y = pair.a.y;
  launchBall(sim.ball, 360, 0);

  let portalEvents = 0;
  for (let i = 0; i < 30; i++) {
    const events = stepSimulation(sim, level10, 1 / 60);
    for (const ev of events) {
      if (ev.type === 'portal') portalEvents++;
    }
  }

  assert.equal(portalEvents, 1, 'cooldown must prevent instant repeat teleportation loops');
  assert.ok(
    sim.ball.x > pair.b.x + 15,
    `ball should emerge from Portal B continuing rightward (x=${sim.ball.x.toFixed(1)}, exitX=${pair.b.x})`
  );
  assert.ok(sim.ball.vx > 100, 'ball should preserve reasonable forward speed and direction after warping');
});

test('Hole 11 Gravity Bump blue zone attracts ball and red zone repels ball controllably', () => {
  const level11 = LEVELS[10];
  assert.equal(level11.theme, 'neon');
  assert.equal(level11.forceZones?.length, 2, 'Hole 11 should have blue attract and red repel zones');

  const blue = level11.forceZones!.find((z) => z.kind === 'attract')!;
  const red = level11.forceZones!.find((z) => z.kind === 'repel')!;
  assert.ok(blue && red, 'both attract and repel zones must exist');

  // Pass below blue zone center moving horizontally right -> blue attract should pull ball upward (vy < 0)
  const simAttract = createInitialSimState(level11);
  simAttract.ball.x = blue.x - 60;
  simAttract.ball.y = blue.y + 42;
  launchBall(simAttract.ball, 420, 0);
  for (let i = 0; i < 15; i++) {
    stepSimulation(simAttract, level11, 1 / 60);
  }
  assert.ok(
    simAttract.ball.vy < -15,
    `blue attract zone should pull ball upward toward its center (vy=${simAttract.ball.vy.toFixed(1)})`
  );

  // Pass above red zone center moving horizontally right -> red repel should push ball upward/away (vy < 0)
  const simRepel = createInitialSimState(level11);
  simRepel.ball.x = red.x - 60;
  simRepel.ball.y = red.y - 42;
  launchBall(simRepel.ball, 420, 0);
  for (let i = 0; i < 15; i++) {
    stepSimulation(simRepel, level11, 1 / 60);
  }
  assert.ok(
    simRepel.ball.vy < -15,
    `red repel zone should push ball away from its center (vy=${simRepel.ball.vy.toFixed(1)})`
  );
});

test('Hole 12 Ultimate Trick Shot integrates 3 bumpers, linked portals, moving gate, and narrow putting chute', () => {
  const level12 = LEVELS[11];
  assert.equal(level12.theme, 'neon');
  assert.equal(level12.par, 5);
  assert.equal(level12.bumpers.length, 3, 'Hole 12 must include 3 circular bumpers');
  assert.equal(level12.portals?.length, 1, 'Hole 12 must include 1 pair of teleportation portals');
  assert.equal(level12.gates?.length, 1, 'Hole 12 must include 1 moving gate');

  // Verify final narrow putting chute leads cleanly from open gate into the cup
  const gate = level12.gates![0];
  let openTime = 0;
  for (let t = 0; t <= gate.period; t += 0.05) {
    if (evaluateGateState(gate, t).openAmount === 1) {
      openTime = t;
      break;
    }
  }

  const simFinish = createInitialSimState(level12);
  simFinish.elapsedTime = openTime;
  simFinish.ball.x = 530;
  simFinish.ball.y = 270;
  launchBall(simFinish.ball, 370, 0);
  let sank = false;
  for (let i = 0; i < 240; i++) {
    const events = stepSimulation(simFinish, level12, 1 / 60);
    if (events.some((e) => e.type === 'hole_sink')) {
      sank = true;
      break;
    }
  }
  assert.equal(sank, true, 'timed shot through open gate should glide down the narrow putting section and sink');
});

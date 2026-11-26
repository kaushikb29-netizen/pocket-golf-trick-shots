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
  assert.equal(getScoreLabel(1, 2).stars, 3);
  assert.equal(getScoreLabel(2, 3).title, 'BIRDIE!');
  assert.equal(getScoreLabel(2, 3).stars, 3);
  assert.equal(getScoreLabel(3, 3).title, 'NICE PAR!');
  assert.equal(getScoreLabel(3, 3).stars, 3);
  assert.equal(getScoreLabel(4, 3).title, 'BOGEY');
  assert.equal(getScoreLabel(4, 3).stars, 2);
  assert.equal(getScoreLabel(6, 3).title, 'LAST CHANCE SAVE!');
  assert.equal(getScoreLabel(6, 3).stars, 1);
  assert.equal(formatParDelta(8, 8), 'Even Par');
  assert.equal(formatParDelta(6, 8), '-2 Under Par');
  assert.equal(formatParDelta(10, 8), '+2 Over Par');
});

test('course sequence contains 24 holes with expected names and pars', () => {
  assert.equal(LEVELS.length, 24);
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
      [13, 'Frozen Straightaway', 3],
      [14, 'Snowball Ricochet', 4],
      [15, 'Crystal Crossing', 4],
      [16, 'Blizzard Finale', 5],
      [17, 'Sugar Rush', 3],
      [18, 'Chocolate Conveyor', 4],
      [19, 'Jellybean Junction', 4],
      [20, 'Candy Chaos', 5],
      [21, 'Gear Garden', 4],
      [22, 'Spring Shot', 4],
      [23, 'Clock Tower', 5],
      [24, 'The Grand Finale', 5],
    ]
  );
  const totalPar = LEVELS.reduce((sum, l) => sum + l.par, 0);
  assert.equal(totalPar, 93);
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

test('Hole 13 Frozen Straightaway ice reduces friction, restores normal friction off ice, and allows sinking the cup', () => {
  const level13 = LEVELS[12];
  assert.equal(level13.theme, 'frost');
  assert.equal(level13.par, 3);

  // Compare identical moderate shot on normal ground (Level 1) vs across ice (Level 13)
  const level1 = LEVELS[0];
  const simNormal = createInitialSimState(level1);
  launchBall(simNormal.ball, 210, 0);

  const simIce = createInitialSimState(level13);
  simIce.ball.x = 248; // directly entering l13-ice-1
  simIce.ball.y = 332;
  launchBall(simIce.ball, 210, 0);

  for (let i = 0; i < 120; i++) {
    stepSimulation(simNormal, level1, 1 / 60);
    stepSimulation(simIce, level13, 1 / 60);
  }

  const normalDist = simNormal.ball.x - level1.tee.x;
  const iceDist = simIce.ball.x - 248;
  assert.ok(
    iceDist > normalDist * 1.25,
    `ball on ice should glide farther than normal ground (iceDist=${iceDist.toFixed(1)}, normalDist=${normalDist.toFixed(1)})`
  );

  // Verify ball settles naturally and sinks into Hole 13 cup on final approach
  const simPutt = createInitialSimState(level13);
  simPutt.ball.x = 620;
  simPutt.ball.y = 212;
  launchBall(simPutt.ball, 210, 0);
  let sank = false;
  for (let i = 0; i < 240; i++) {
    const events = stepSimulation(simPutt, level13, 1 / 60);
    if (events.some((e) => e.type === 'hole_sink')) {
      sank = true;
      break;
    }
  }
  assert.equal(sank, true, 'ball leaving upper ice sheet onto normal green should slow smoothly and sink into Hole 13');
});

test('Hole 14 Snowball Ricochet rebounds off large snowball bumpers and sinks on right arch leg', () => {
  const level14 = LEVELS[13];
  assert.equal(level14.theme, 'frost');
  assert.equal(level14.par, 4);
  assert.ok(level14.bumpers.length >= 4, 'Hole 14 should include multiple large snowball bumpers');
  assert.equal(level14.bumpers[0].style, 'snowball');

  // Aim diagonally from tee into left snowball bumper l14-snow-1 at (254, 196)
  const simBumper = createInitialSimState(level14);
  launchBall(simBumper.ball, 200, -560);
  let hitSnowball = false;
  for (let i = 0; i < 80; i++) {
    const events = stepSimulation(simBumper, level14, 1 / 60);
    if (events.some((e) => e.type === 'bumper')) {
      hitSnowball = true;
      break;
    }
  }
  assert.equal(hitSnowball, true, 'tee shot should ricochet off circular snowball bumper');

  // Approach from right arch down into the hole at (706, 386)
  const simFinish = createInitialSimState(level14);
  simFinish.ball.x = 716;
  simFinish.ball.y = 270;
  launchBall(simFinish.ball, -20, 230);
  let sank = false;
  for (let i = 0; i < 240; i++) {
    const events = stepSimulation(simFinish, level14, 1 / 60);
    if (events.some((e) => e.type === 'hole_sink')) {
      sank = true;
      break;
    }
  }
  assert.equal(sank, true, 'approach down right leg of curved course should sink into Hole 14 cup');
});

test('Hole 15 Crystal Crossing offers navigable upper and lower maze routes across alternating ice and normal turf', () => {
  const level15 = LEVELS[14];
  assert.equal(level15.theme, 'frost');
  assert.equal(level15.par, 4);
  assert.ok(
    (level15.hazards?.filter((h) => h.kind === 'ice').length ?? 0) >= 4,
    'Hole 15 should have multiple alternating icy patches'
  );

  // Upper route glide above crystal pillar (y = 128) cleanly traverses past x = 520 before exit baffle
  const simUpper = createInitialSimState(level15);
  simUpper.ball.x = 340;
  simUpper.ball.y = 128;
  launchBall(simUpper.ball, 300, 0);
  let upperMaxX = simUpper.ball.x;
  for (let i = 0; i < 120; i++) {
    stepSimulation(simUpper, level15, 1 / 60);
    if (simUpper.ball.x > upperMaxX) upperMaxX = simUpper.ball.x;
  }
  assert.ok(
    upperMaxX > 520,
    `upper maze route should glide cleanly past crystal pillar (maxX=${upperMaxX.toFixed(1)})`
  );

  // Upper route exit corridor below l15-upper-stone-2 (y = 216) cleanly clears into the green
  const simUpperExit = createInitialSimState(level15);
  simUpperExit.ball.x = 500;
  simUpperExit.ball.y = 216;
  launchBall(simUpperExit.ball, 320, 0);
  for (let i = 0; i < 120; i++) {
    stepSimulation(simUpperExit, level15, 1 / 60);
  }
  assert.ok(
    simUpperExit.ball.x > 640,
    `upper exit corridor should pass cleanly beneath exit baffle (x=${simUpperExit.ball.x.toFixed(1)})`
  );

  // Lower route glide below lower crystal pillar (y = 398) cleanly traverses toward exit bank
  const simLower = createInitialSimState(level15);
  simLower.ball.x = 385;
  simLower.ball.y = 398;
  launchBall(simLower.ball, 380, 0);
  for (let i = 0; i < 120; i++) {
    stepSimulation(simLower, level15, 1 / 60);
  }
  assert.ok(
    simLower.ball.x > 560,
    `lower maze route should glide cleanly past lower crystal obstacle (x=${simLower.ball.x.toFixed(1)})`
  );
});

test('Hole 16 Blizzard Finale combines ice sheets, snowball bumpers, rotating obstacle, and fair final approach', () => {
  const level16 = LEVELS[15];
  assert.equal(level16.theme, 'frost');
  assert.equal(level16.par, 5);
  assert.equal(level16.bumpers.length, 3, 'Hole 16 should feature 3 snowball bumpers');
  assert.equal(level16.rotators.length, 1, 'Hole 16 should feature 1 rotating obstacle');
  assert.ok(
    (level16.hazards?.filter((h) => h.kind === 'ice').length ?? 0) >= 3,
    'Hole 16 should feature icy surfaces'
  );

  // Verify rotating frost spinner physically strikes a ball in its sweep
  const simRot = createInitialSimState(level16);
  const rot = level16.rotators[0];
  simRot.ball.x = rot.cx + 52;
  simRot.ball.y = rot.cy;
  let struck = false;
  for (let i = 0; i < 240; i++) {
    const events = stepSimulation(simRot, level16, 1 / 60);
    if (events.some((e) => e.type === 'rotator')) {
      struck = true;
      break;
    }
  }
  assert.equal(struck, true, 'Hole 16 rotating obstacle must physically block/deflect the ball');

  // Verify fair final approach through the frosted stone gate into the finale cup
  const simApproach = createInitialSimState(level16);
  simApproach.ball.x = 585;
  simApproach.ball.y = 270;
  launchBall(simApproach.ball, 250, 0);
  let sank = false;
  for (let i = 0; i < 240; i++) {
    const events = stepSimulation(simApproach, level16, 1 / 60);
    if (events.some((e) => e.type === 'hole_sink')) {
      sank = true;
      break;
    }
  }
  assert.equal(sank, true, 'final approach through frosted stone pillars should glide fairly into Hole 16 cup');
});

test('Hole 17 Sugar Rush rebounds off large candy bumpers and offers a clean navigable path to the cup', () => {
  const level17 = LEVELS[16];
  assert.equal(level17.theme, 'candy');
  assert.equal(level17.par, 3);
  assert.equal(level17.bumpers.length, 4, 'Hole 17 should feature 4 large circular candy bumpers');
  assert.equal(level17.bumpers[0].style, 'candy');

  // Verify candy bumper collision bounces ball cleanly using existing bumper collision system
  const simBumper = createInitialSimState(level17);
  const candy1 = level17.bumpers[0];
  const dx = candy1.x - simBumper.ball.x;
  const dy = candy1.y - simBumper.ball.y;
  const len = Math.hypot(dx, dy);
  launchBall(simBumper.ball, (dx / len) * 520, (dy / len) * 520);

  let hitCandyBumper = false;
  for (let i = 0; i < 60; i++) {
    const events = stepSimulation(simBumper, level17, 1 / 60);
    if (events.some((e) => e.type === 'bumper')) {
      hitCandyBumper = true;
      break;
    }
  }
  assert.equal(hitCandyBumper, true, 'shot aimed at candy bumper must rebound via bumper collision');

  // Verify practical tee shot threads between candy bumpers into the approach zone (x > 460)
  const simDrive = createInitialSimState(level17);
  launchBall(simDrive.ball, 560, 76);
  for (let i = 0; i < 180; i++) {
    stepSimulation(simDrive, level17, 1 / 60);
  }
  assert.ok(
    simDrive.ball.x > 460,
    `tee drive should navigate into the candy fairway past the first bumpers (x=${simDrive.ball.x.toFixed(1)})`
  );

  // Verify approach shot past jellybean obstacle sinks cleanly into Hole 17 cup (744, 318)
  const simPutt = createInitialSimState(level17);
  simPutt.ball.x = 585;
  simPutt.ball.y = 342;
  const pdx = level17.hole.x - simPutt.ball.x;
  const pdy = level17.hole.y - simPutt.ball.y;
  const plen = Math.hypot(pdx, pdy);
  launchBall(simPutt.ball, (pdx / plen) * 280, (pdy / plen) * 280);
  let sank = false;
  for (let i = 0; i < 240; i++) {
    const events = stepSimulation(simPutt, level17, 1 / 60);
    if (events.some((e) => e.type === 'hole_sink')) {
      sank = true;
      break;
    }
  }
  assert.equal(sank, true, 'clean approach shot past jellybean obstacle should sink into Hole 17 cup');
});

test('Hole 18 Chocolate Conveyor belts steer ball in indicated direction, never trap ball, and narrow chute sinks cleanly', () => {
  const level18 = LEVELS[17];
  assert.equal(level18.theme, 'candy');
  assert.equal(level18.turfStyle, 'chocolate');
  assert.equal(level18.par, 4);
  assert.equal(level18.conveyors?.length, 2, 'Hole 18 must feature two moving conveyor belts');

  const [belt1, belt2] = level18.conveyors!;

  // Belt 1 moves UP (dirY < 0): placing a resting ball on Belt 1 must move it northward off the belt and settle cleanly
  const simBelt1 = createInitialSimState(level18);
  simBelt1.ball.x = belt1.x;
  simBelt1.ball.y = belt1.y + 30;
  simBelt1.ball.isMoving = false;

  for (let i = 0; i < 20; i++) {
    stepSimulation(simBelt1, level18, 1 / 60);
  }
  assert.ok(
    simBelt1.ball.vy < -25,
    `Belt 1 should accelerate ball upward in indicated direction (vy=${simBelt1.ball.vy.toFixed(1)})`
  );

  for (let i = 0; i < 260; i++) {
    stepSimulation(simBelt1, level18, 1 / 60);
  }
  assert.equal(
    simBelt1.ball.isMoving,
    false,
    'ball exiting Belt 1 must settle cleanly on open upper chocolate turf without being trapped'
  );
  assert.ok(
    simBelt1.ball.y < belt1.y - belt1.h / 2,
    `ball should exit north of Belt 1 (y=${simBelt1.ball.y.toFixed(1)}, exitY=${belt1.y - belt1.h / 2})`
  );

  // Belt 2 moves RIGHT (dirX > 0): placing a resting ball on Belt 2 must carry it eastward off the belt and settle cleanly
  const simBelt2 = createInitialSimState(level18);
  simBelt2.ball.x = belt2.x - 40;
  simBelt2.ball.y = belt2.y;
  simBelt2.ball.isMoving = false;

  for (let i = 0; i < 20; i++) {
    stepSimulation(simBelt2, level18, 1 / 60);
  }
  assert.ok(
    simBelt2.ball.vx > 25,
    `Belt 2 should accelerate ball rightward in indicated direction (vx=${simBelt2.ball.vx.toFixed(1)})`
  );

  for (let i = 0; i < 260; i++) {
    stepSimulation(simBelt2, level18, 1 / 60);
  }
  assert.equal(
    simBelt2.ball.isMoving,
    false,
    'ball exiting Belt 2 must settle cleanly on open right chocolate apron without being trapped'
  );
  assert.ok(
    simBelt2.ball.x > belt2.x + belt2.w / 2,
    `ball should exit east of Belt 2 (x=${simBelt2.ball.x.toFixed(1)}, exitX=${belt2.x + belt2.w / 2})`
  );

  // Narrow final putting chute (x = 618..814, y = 222..318) leads straight into Hole 18 cup (760, 270)
  const simChute = createInitialSimState(level18);
  simChute.ball.x = 620;
  simChute.ball.y = 270;
  launchBall(simChute.ball, 250, 0);
  let sank = false;
  for (let i = 0; i < 240; i++) {
    const events = stepSimulation(simChute, level18, 1 / 60);
    if (events.some((e) => e.type === 'hole_sink')) {
      sank = true;
      break;
    }
  }
  assert.equal(sank, true, 'straight putt down the narrow chocolate putting area should sink into Hole 18 cup');
});

test('Hole 19 Jellybean Junction sticky jelly slows ball with splash, never traps it, and offers two navigable routes', () => {
  const level19 = LEVELS[18];
  assert.equal(level19.theme, 'candy');
  assert.equal(level19.par, 4);
  const jellyZones = (level19.hazards ?? []).filter((h) => h.kind === 'jelly');
  assert.equal(jellyZones.length, 2, 'Hole 19 must feature sticky jelly zones');

  // Compare identical speed shot rolling into sticky jelly vs normal mint turf
  const simJelly = createInitialSimState(level19);
  simJelly.ball.x = 392;
  simJelly.ball.y = 168; // rolls straight across upper sticky jelly (466, 168)
  launchBall(simJelly.ball, 420, 0);

  const simNormal = createInitialSimState(level19);
  simNormal.ball.x = 392;
  simNormal.ball.y = 322; // clear mint lane below central jellybean
  launchBall(simNormal.ball, 420, 0);

  let jellySplashes = 0;
  for (let i = 0; i < 200; i++) {
    const evs = stepSimulation(simJelly, level19, 1 / 60);
    if (evs.some((e) => e.type === 'jelly_splash')) {
      jellySplashes++;
    }
    stepSimulation(simNormal, level19, 1 / 60);
  }
  const jellyTravel = simJelly.ball.x - 392;
  const normalTravel = simNormal.ball.x - 392;
  assert.ok(jellySplashes >= 1, 'rolling through sticky jelly should emit jelly_splash feedback');
  assert.ok(
    jellyTravel < normalTravel * 0.72,
    `sticky jelly should slow ball noticeably vs normal turf (jelly=${jellyTravel.toFixed(1)}, normal=${normalTravel.toFixed(1)})`
  );
  assert.equal(simJelly.ball.isMoving, false, 'ball must settle cleanly in sticky jelly');

  // Verify ball resting dead-center inside sticky jelly can always launch cleanly out (never permanently stuck!)
  const simEscape = createInitialSimState(level19);
  simEscape.ball.x = 466;
  simEscape.ball.y = 168;
  simEscape.ball.isMoving = false;
  launchBall(simEscape.ball, 650, 240);
  for (let i = 0; i < 150; i++) {
    stepSimulation(simEscape, level19, 1 / 60);
  }
  assert.equal(simEscape.ball.isMoving, false, 'escaped ball must settle cleanly');
  assert.ok(
    simEscape.ball.x > 545,
    `ball resting in sticky jelly must always escape cleanly with a firm shot (x=${simEscape.ball.x.toFixed(1)}, y=${simEscape.ball.y.toFixed(1)})`
  );

  // Verify approach shot into Hole 19 cup (742, 270) sinks cleanly
  const simPutt = createInitialSimState(level19);
  simPutt.ball.x = 660;
  simPutt.ball.y = 270;
  launchBall(simPutt.ball, 210, 0);
  let sank = false;
  for (let i = 0; i < 180; i++) {
    const evs = stepSimulation(simPutt, level19, 1 / 60);
    if (evs.some((e) => e.type === 'hole_sink')) {
      sank = true;
      break;
    }
  }
  assert.equal(sank, true, 'approach shot should sink cleanly into Hole 19 cup');
});

test('Hole 20 Candy Chaos integrates 2 conveyors, 3 candy bumpers, sticky jelly, rotating cane, and solvable final chute', () => {
  const level20 = LEVELS[19];
  assert.equal(level20.theme, 'candy');
  assert.equal(level20.par, 5);
  assert.equal(level20.conveyors?.length, 2, 'Hole 20 must feature two conveyor belts');
  assert.equal(level20.bumpers.length, 3, 'Hole 20 must feature three circular candy bumpers');
  assert.equal(level20.rotators.length, 1, 'Hole 20 must feature one slowly rotating candy-cane obstacle');
  const jellyZones = (level20.hazards ?? []).filter((h) => h.kind === 'jelly');
  assert.equal(jellyZones.length, 2, 'Hole 20 must feature sticky jelly zones');

  // Verify both conveyor belts accelerate resting balls rightward and exit onto open floor without trapping
  for (const belt of level20.conveyors!) {
    const simBelt = createInitialSimState(level20);
    simBelt.ball.x = belt.x - 30;
    simBelt.ball.y = belt.y;
    simBelt.ball.isMoving = false;
    for (let i = 0; i < 240; i++) {
      stepSimulation(simBelt, level20, 1 / 60);
    }
    assert.equal(simBelt.ball.isMoving, false, `${belt.id} must settle cleanly without trapping ball`);
    assert.ok(
      simBelt.ball.x > belt.x + belt.w / 2,
      `${belt.id} must carry ball cleanly off right exit (x=${simBelt.ball.x.toFixed(1)})`
    );
  }

  // Verify rotating candy-cane spins slowly and cleanly
  const simRot = createInitialSimState(level20);
  const startAngle = simRot.rotatorAngles[0];
  for (let i = 0; i < 60; i++) {
    stepSimulation(simRot, level20, 1 / 60);
  }
  assert.ok(
    Math.abs(simRot.rotatorAngles[0] - startAngle) > 0.5 &&
      Math.abs(simRot.rotatorAngles[0] - startAngle) < 1.0,
    'Hole 20 candy-cane obstacle should rotate at a smooth readable pace'
  );

  // Verify candy bumper collision bounces ball cleanly
  const simBumper = createInitialSimState(level20);
  const b1 = level20.bumpers[0];
  const dx = b1.x - simBumper.ball.x;
  const dy = b1.y - simBumper.ball.y;
  const len = Math.hypot(dx, dy);
  launchBall(simBumper.ball, (dx / len) * 520, (dy / len) * 520);
  let hitCandy = false;
  for (let i = 0; i < 60; i++) {
    const evs = stepSimulation(simBumper, level20, 1 / 60);
    if (evs.some((e) => e.type === 'bumper')) {
      hitCandy = true;
      break;
    }
  }
  assert.equal(hitCandy, true, 'Hole 20 candy bumpers must rebound shots cleanly');

  // Verify challenging final putting chute sinks cleanly into Hole 20 cup (768, 268)
  const simFinal = createInitialSimState(level20);
  simFinal.ball.x = 640;
  simFinal.ball.y = 268;
  launchBall(simFinal.ball, 240, 0);
  let sank = false;
  for (let i = 0; i < 200; i++) {
    const evs = stepSimulation(simFinal, level20, 1 / 60);
    if (evs.some((e) => e.type === 'hole_sink')) {
      sank = true;
      break;
    }
  }
  assert.equal(sank, true, 'straight precision putt through final gate should sink into Hole 20 cup');
});

test('Hole 21 Gear Garden counter-rotating brass gears deflect ball cleanly and final approach sinks into cup', () => {
  const level21 = LEVELS[20];
  assert.equal(level21.theme, 'clockwork');
  assert.equal(level21.par, 4);
  assert.equal(level21.rotators.length, 3, 'Hole 21 must feature 3 rotating brass gears');
  assert.equal(level21.rotators.every((r) => r.style === 'gear'), true);

  // Verify counter-rotating gear strikes a ball placed inside its tooth sweep
  const simGear = createInitialSimState(level21);
  const g1 = level21.rotators[0];
  simGear.ball.x = g1.cx + 38;
  simGear.ball.y = g1.cy;
  let struck = false;
  for (let i = 0; i < 180; i++) {
    const evs = stepSimulation(simGear, level21, 1 / 60);
    if (evs.some((e) => e.type === 'rotator')) {
      struck = true;
      break;
    }
  }
  assert.equal(struck, true, 'rotating brass gear must physically collide with and deflect ball');

  // Verify clean approach past Gear 3 into Hole 21 cup (748, 270)
  const simPutt = createInitialSimState(level21);
  simPutt.ball.x = 672;
  simPutt.ball.y = 270;
  launchBall(simPutt.ball, 210, 0);
  let sank = false;
  for (let i = 0; i < 180; i++) {
    const evs = stepSimulation(simPutt, level21, 1 / 60);
    if (evs.some((e) => e.type === 'hole_sink')) {
      sank = true;
      break;
    }
  }
  assert.equal(sank, true, 'approach shot should sink cleanly into Hole 21 cup');
});

test('Hole 22 Spring Shot spring bumpers launch ball strongly along intended directions without tunneling', () => {
  const level22 = LEVELS[21];
  assert.equal(level22.theme, 'clockwork');
  assert.equal(level22.par, 4);
  assert.equal(level22.bumpers.length, 4, 'Hole 22 must feature 4 spring-powered bumpers');
  assert.equal(level22.bumpers.every((b) => b.style === 'spring'), true);

  // Tee shot straight right hits Spring 1 (284, 368) and launches strongly upward toward upper lane
  const sim = createInitialSimState(level22);
  launchBall(sim.ball, 360, -20);
  let hitSpring = false;
  let maxUpwardVy = 0;
  for (let i = 0; i < 180; i++) {
    const evs = stepSimulation(sim, level22, 1 / 60);
    if (evs.some((e) => e.type === 'bumper')) {
      hitSpring = true;
    }
    if (sim.ball.vy < maxUpwardVy) {
      maxUpwardVy = sim.ball.vy;
    }
    // Ball must never tunnel outside outer brass arena (x: 88..812, y: 100..440)
    assert.ok(sim.ball.x >= 88 && sim.ball.x <= 812, `ball X escaped bounds: ${sim.ball.x}`);
    assert.ok(sim.ball.y >= 100 && sim.ball.y <= 440, `ball Y escaped bounds: ${sim.ball.y}`);
  }
  assert.equal(hitSpring, true, 'tee shot should trigger Spring 1 launch bumper');
  assert.ok(
    maxUpwardVy < -350,
    `Spring 1 must launch ball strongly upward (maxUpwardVy=${maxUpwardVy.toFixed(1)})`
  );

  // Lower-right Spring 4 (546, 376) redirects approaching balls rightward toward Hole 22 cup (746, 374)
  const simCup = createInitialSimState(level22);
  simCup.ball.x = 640;
  simCup.ball.y = 374;
  launchBall(simCup.ball, 240, 0);
  let sank = false;
  for (let i = 0; i < 180; i++) {
    const evs = stepSimulation(simCup, level22, 1 / 60);
    if (evs.some((e) => e.type === 'hole_sink')) {
      sank = true;
      break;
    }
  }
  assert.equal(sank, true, 'final putt on right green should sink cleanly into Hole 22 cup');
});

test('Hole 23 Clock Tower moving brass gates open/close cleanly, ornate clock hand sweeps, and cup sinks cleanly', () => {
  const level23 = LEVELS[22];
  assert.equal(level23.theme, 'clockwork');
  assert.equal(level23.par, 5);
  assert.equal(level23.gates?.length, 2, 'Hole 23 must feature 2 moving mechanical gates');
  assert.equal(level23.rotators.length, 3, 'Hole 23 must feature clock hand + 2 escapement gears');
  assert.equal(level23.rotators[0].style, 'clock-hand');

  // Verify both gates oscillate between closed (y=270) and fully open doorways
  const [gate1, gate2] = level23.gates!;
  let g1Closed = false;
  let g1Open = false;
  let g2Open = false;
  for (let t = 0; t <= 5.0; t += 0.1) {
    const s1 = evaluateGateState(gate1, t);
    const s2 = evaluateGateState(gate2, t);
    if (Math.abs(s1.y - gate1.closedY) < 2) g1Closed = true;
    if (Math.abs(s1.y - gate1.openY) < 2) g1Open = true;
    if (Math.abs(s2.y - gate2.openY) < 2) g2Open = true;
  }
  assert.equal(g1Closed, true, 'Gate 1 must fully close during cycle');
  assert.equal(g1Open, true, 'Gate 1 must fully open during cycle');
  assert.equal(g2Open, true, 'Gate 2 must fully open during cycle');

  // Verify ornate clock hand rotates smoothly and strikes balls in its sweep
  const simClock = createInitialSimState(level23);
  const hand = level23.rotators[0];
  simClock.ball.x = hand.cx + 76;
  simClock.ball.y = hand.cy;
  let hitHand = false;
  for (let i = 0; i < 300; i++) {
    const evs = stepSimulation(simClock, level23, 1 / 60);
    if (evs.some((e) => e.type === 'rotator')) {
      hitHand = true;
      break;
    }
  }
  assert.equal(hitHand, true, 'giant ornate clock hand must sweep and deflect balls in its arc');

  // Verify putt in final chamber sinks cleanly into Hole 23 cup (756, 270)
  const simFinal = createInitialSimState(level23);
  simFinal.ball.x = 668;
  simFinal.ball.y = 270;
  launchBall(simFinal.ball, 220, 0);
  let sank = false;
  for (let i = 0; i < 180; i++) {
    const evs = stepSimulation(simFinal, level23, 1 / 60);
    if (evs.some((e) => e.type === 'hole_sink')) {
      sank = true;
      break;
    }
  }
  assert.equal(sank, true, 'clean putt past Gate 2 should sink into Hole 23 cup');
});

test('Hole 24 The Grand Finale unites gears, spring launchers, timed gate, and solvable gilded championship chute', () => {
  const level24 = LEVELS[23];
  assert.equal(level24.theme, 'clockwork');
  assert.equal(level24.par, 5);
  assert.equal(level24.bumpers.length, 2, 'Hole 24 must feature 2 spring bumpers');
  assert.equal(level24.bumpers.every((b) => b.style === 'spring'), true);
  assert.equal(level24.rotators.length, 2, 'Hole 24 must feature 2 rotating brass gears');
  assert.equal(level24.rotators.every((r) => r.style === 'gear'), true);
  assert.equal(level24.gates?.length, 1, 'Hole 24 must feature a timed brass gate');

  // Verify tee shot into Spring 1 launches upward cleanly inside bounds
  const simSpring = createInitialSimState(level24);
  launchBall(simSpring.ball, 320, -10);
  let launched = false;
  for (let i = 0; i < 100; i++) {
    const evs = stepSimulation(simSpring, level24, 1 / 60);
    if (evs.some((e) => e.type === 'bumper')) {
      launched = true;
      break;
    }
  }
  assert.equal(launched, true, 'Hole 24 Spring 1 should catch and launch tee shot');
  assert.ok(simSpring.ball.vy < -320, 'Hole 24 Spring 1 should fire ball briskly upward');

  // Verify timed brass gate opens cleanly for approach into championship runway
  const gate = level24.gates![0];
  let opensCleanly = false;
  for (let t = 0; t <= 4.5; t += 0.1) {
    const st = evaluateGateState(gate, t);
    if (Math.abs(st.y - gate.openY) < 2) {
      opensCleanly = true;
      break;
    }
  }
  assert.equal(opensCleanly, true, 'Hole 24 brass gate must open fully to expose championship chute');

  // Verify precision putt down gilded championship chute sinks cleanly into Hole 24 cup (772, 270)
  const simFinale = createInitialSimState(level24);
  simFinale.ball.x = 632;
  simFinale.ball.y = 270;
  launchBall(simFinale.ball, 250, 0);
  let sank = false;
  for (let i = 0; i < 200; i++) {
    const evs = stepSimulation(simFinale, level24, 1 / 60);
    if (evs.some((e) => e.type === 'hole_sink')) {
      sank = true;
      break;
    }
  }
  assert.equal(sank, true, 'precision putt down the gilded championship runway must sink into Hole 24 cup');
});


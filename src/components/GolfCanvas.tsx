import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { CelebrationTier, golfAudio } from '../game/audio';
import { LEVELS } from '../game/levels';
import { ParticlePool } from '../game/particles';
import {
  computeShotFromDrag,
  createInitialSimState,
  getScoreLabel,
  isLastChanceSave,
  launchBall,
  stepSimulation,
} from '../game/physics';
import {
  AimVisualState,
  computeViewportTransform,
  renderFrame,
  screenToWorld,
  SplashCallout,
  StaticLayerCache,
  ViewportTransform,
} from '../game/renderer';
import { GamePhase, SimState } from '../game/types';

export interface GolfCanvasHandle {
  resetBallToTee: () => void;
}

interface GolfCanvasProps {
  levelIndex: number;
  phase: GamePhase;
  strokes: number;
  maxStrokes: number;
  onStroke: () => void;
  onWaterPenalty: () => void;
  onHoleSunk: () => void;
  onOutOfStrokes: () => void;
}

function resolveCelebrationTier(strokes: number, par: number): CelebrationTier {
  const safe = Math.max(1, strokes);
  if (safe === 1) return 'hole_in_one';
  if (isLastChanceSave(safe, par)) return 'last_chance';
  const diff = safe - par;
  if (diff <= -2) return 'eagle';
  if (diff === -1) return 'birdie';
  if (diff === 0) return 'par';
  return 'standard';
}

export const GolfCanvas = forwardRef<GolfCanvasHandle, GolfCanvasProps>(
  function GolfCanvas(
    {
      levelIndex,
      phase,
      strokes,
      maxStrokes,
      onStroke,
      onWaterPenalty,
      onHoleSunk,
      onOutOfStrokes,
    },
    ref
  ) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const levelIndexRef = useRef(levelIndex);
    const phaseRef = useRef<GamePhase>(phase);
    const strokesRef = useRef(strokes);
    const maxStrokesRef = useRef(maxStrokes);
    const onStrokeRef = useRef(onStroke);
    const onWaterPenaltyRef = useRef(onWaterPenalty);
    const onHoleSunkRef = useRef(onHoleSunk);
    const onOutOfStrokesRef = useRef(onOutOfStrokes);

    const simRef = useRef<SimState>(createInitialSimState(LEVELS[levelIndex]));
    const particlesRef = useRef<ParticlePool>(new ParticlePool());
    const aimRef = useRef<AimVisualState>({
      active: false,
      anchor: { x: 0, y: 0 },
      current: { x: 0, y: 0 },
    });
    const activePointerIdRef = useRef<number | null>(null);
    const transformRef = useRef<ViewportTransform>({
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      width: 900,
      height: 540,
    });
    const traumaRef = useRef(0);
    const sinkNotifiedRef = useRef(false);
    const sinkDelayTimerRef = useRef(0);
    const outOfStrokesNotifiedRef = useRef(false);
    const outOfStrokesTimerRef = useRef(0);
    const splashCalloutRef = useRef<SplashCallout | null>(null);

    onStrokeRef.current = onStroke;
    onWaterPenaltyRef.current = onWaterPenalty;
    onHoleSunkRef.current = onHoleSunk;
    onOutOfStrokesRef.current = onOutOfStrokes;
    phaseRef.current = phase;
    strokesRef.current = strokes;
    maxStrokesRef.current = maxStrokes;

    const syncCanvasDataAttributes = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const t = transformRef.current;
      const level = LEVELS[levelIndexRef.current];
      const ball = simRef.current.ball;
      const bx = Math.round(t.offsetX + ball.x * t.scale);
      const by = Math.round(t.offsetY + ball.y * t.scale);
      const hx = Math.round(t.offsetX + level.hole.x * t.scale);
      const hy = Math.round(t.offsetY + level.hole.y * t.scale);
      canvas.dataset.ballScreenX = String(bx);
      canvas.dataset.ballScreenY = String(by);
      canvas.dataset.holeScreenX = String(hx);
      canvas.dataset.holeScreenY = String(hy);
      canvas.dataset.moving = ball.isMoving ? 'true' : 'false';
      canvas.dataset.holed = ball.holed ? 'true' : 'false';
    };

    const resetSimulationForLevel = (idx: number) => {
      const lvl = LEVELS[idx] ?? LEVELS[0];
      simRef.current = createInitialSimState(lvl);
      particlesRef.current.clear();
      aimRef.current.active = false;
      activePointerIdRef.current = null;
      traumaRef.current = 0;
      sinkNotifiedRef.current = false;
      sinkDelayTimerRef.current = 0;
      outOfStrokesNotifiedRef.current = false;
      outOfStrokesTimerRef.current = 0;
      splashCalloutRef.current = null;
      syncCanvasDataAttributes();
    };

    useImperativeHandle(ref, () => ({
      resetBallToTee() {
        resetSimulationForLevel(levelIndexRef.current);
      },
    }));

    // Reset simulation when level changes
    useEffect(() => {
      levelIndexRef.current = levelIndex;
      resetSimulationForLevel(levelIndex);
    }, [levelIndex]);

    // Cancel drag if phase leaves playing
    useEffect(() => {
      if (phase !== 'playing') {
        aimRef.current.active = false;
        activePointerIdRef.current = null;
      }
    }, [phase]);

    // Mount isolated Canvas + RAF loop + ResizeObserver + Pointer handlers once
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const staticCache: StaticLayerCache = {
        canvas: document.createElement('canvas'),
        key: '',
      };
      let currentDpr = Math.min(window.devicePixelRatio || 1, 2);

      const updateCanvasSize = () => {
        const rect = canvas.getBoundingClientRect();
        const cssW = Math.max(1, rect.width);
        const cssH = Math.max(1, rect.height);
        currentDpr = Math.min(window.devicePixelRatio || 1, 2);

        const targetW = Math.round(cssW * currentDpr);
        const targetH = Math.round(cssH * currentDpr);
        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }
        ctx.setTransform(currentDpr, 0, 0, currentDpr, 0, 0);

        const level = LEVELS[levelIndexRef.current];
        transformRef.current = computeViewportTransform(
          cssW,
          cssH,
          level.worldWidth,
          level.worldHeight
        );
        syncCanvasDataAttributes();
      };

      updateCanvasSize();
      const resizeObserver = new ResizeObserver(updateCanvasSize);
      resizeObserver.observe(canvas);

      const cancelPointer = () => {
        aimRef.current.active = false;
        activePointerIdRef.current = null;
      };

      // Prevent accidental mobile Safari/Chrome scrolling or rubber-banding when dragging on canvas
      const preventTouchScroll = (e: TouchEvent) => {
        if (phaseRef.current === 'playing') {
          e.preventDefault();
        }
      };

      const handlePointerDown = (e: PointerEvent) => {
        if (phaseRef.current !== 'playing') return;
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        const sim = simRef.current;
        if (sim.ball.isMoving || sim.ball.holed) return;
        if (strokesRef.current >= maxStrokesRef.current || outOfStrokesNotifiedRef.current) return;
        if (activePointerIdRef.current !== null) return;

        if (e.pointerType !== 'mouse') {
          e.preventDefault();
        }

        const rect = canvas.getBoundingClientRect();
        const worldPt = screenToWorld(e.clientX, e.clientY, rect, transformRef.current);

        // Allow starting a drag near the ball or anywhere on the canvas so thumbs never obscure the ball
        activePointerIdRef.current = e.pointerId;
        aimRef.current = {
          active: true,
          anchor: worldPt,
          current: worldPt,
        };
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch {
          // Synthetic pointer events may not support capture
        }
      };

      const handlePointerMove = (e: PointerEvent) => {
        if (!aimRef.current.active) return;
        if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) {
          return;
        }
        const rect = canvas.getBoundingClientRect();
        aimRef.current.current = screenToWorld(e.clientX, e.clientY, rect, transformRef.current);
      };

      const handlePointerUp = (e: PointerEvent) => {
        if (!aimRef.current.active) return;
        if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) {
          return;
        }

        const rect = canvas.getBoundingClientRect();
        const releasePt = screenToWorld(e.clientX, e.clientY, rect, transformRef.current);
        const shot = computeShotFromDrag(aimRef.current.anchor, releasePt);

        aimRef.current.active = false;
        activePointerIdRef.current = null;
        try {
          if (canvas.hasPointerCapture(e.pointerId)) {
            canvas.releasePointerCapture(e.pointerId);
          }
        } catch {
          // Ignore if already released
        }

        if (phaseRef.current !== 'playing') return;
        if (strokesRef.current >= maxStrokesRef.current || outOfStrokesNotifiedRef.current) return;
        const sim = simRef.current;
        const level = LEVELS[levelIndexRef.current];
        if (shot.valid && !sim.ball.isMoving && !sim.ball.holed) {
          launchBall(sim.ball, shot.vx, shot.vy);
          golfAudio.playPutt(shot.power);
          particlesRef.current.emitPuttPuff(
            sim.ball.x,
            sim.ball.y,
            shot.aimDir.x,
            shot.aimDir.y,
            shot.power,
            level.theme
          );
          strokesRef.current += 1;
          outOfStrokesTimerRef.current = 0;
          syncCanvasDataAttributes();
          onStrokeRef.current();
        }
      };

      canvas.addEventListener('pointerdown', handlePointerDown);
      canvas.addEventListener('touchmove', preventTouchScroll, { passive: false });
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', cancelPointer);
      window.addEventListener('blur', cancelPointer);

      let rafId = 0;
      let lastTime = performance.now();
      let wasMoving = false;
      let staticOverlayRenderedKey = '';

      const loop = (now: number) => {
        const rawDt = (now - lastTime) / 1000;
        lastTime = now;
        const dt = Math.min(Math.max(rawDt, 0), 0.05);

        const level = LEVELS[levelIndexRef.current];
        const sim = simRef.current;
        const currentPhase = phaseRef.current;

        if (
          currentPhase === 'paused' ||
          currentPhase === 'course_select' ||
          currentPhase === 'settings' ||
          currentPhase === 'out_of_strokes'
        ) {
          const overlayKey = `${currentPhase}:${level.id}:${Math.round(transformRef.current.width)}:${Math.round(transformRef.current.height)}`;
          if (staticOverlayRenderedKey !== overlayKey) {
            staticOverlayRenderedKey = overlayKey;
            renderFrame(
              ctx,
              transformRef.current,
              level,
              sim,
              particlesRef.current,
              aimRef.current,
              0,
              0,
              currentDpr,
              staticCache,
              splashCalloutRef.current
            );
          }
          rafId = window.requestAnimationFrame(loop);
          return;
        }
        staticOverlayRenderedKey = '';

        if (currentPhase === 'playing' || currentPhase === 'level_clear' || currentPhase === 'victory') {
          const events = stepSimulation(sim, level, dt);
          for (const ev of events) {
            if (ev.type === 'wall') {
              golfAudio.playWoodBounce(ev.impactSpeed);
              particlesRef.current.emitWallSpark(
                ev.x,
                ev.y,
                ev.nx,
                ev.ny,
                ev.impactSpeed,
                level.theme
              );
              traumaRef.current = Math.min(1, traumaRef.current + (ev.impactSpeed / 900) * 0.34);
            } else if (ev.type === 'bumper') {
              const bObj = level.bumpers.find((b) => b.id === ev.id);
              if (bObj?.style === 'spring') {
                golfAudio.playSpringLaunch(ev.impactSpeed);
                particlesRef.current.emitSpringBurst(
                  ev.x,
                  ev.y,
                  bObj.launchDirX ?? ev.nx,
                  bObj.launchDirY ?? ev.ny
                );
                traumaRef.current = Math.min(1, traumaRef.current + 0.44);
              } else {
                golfAudio.playBumperBounce(ev.impactSpeed);
                particlesRef.current.emitBumperBurst(
                  ev.x,
                  ev.y,
                  bObj?.color ?? '#FF6B4A',
                  bObj?.style === 'candy'
                );
                traumaRef.current = Math.min(1, traumaRef.current + 0.36);
              }
            } else if (ev.type === 'jelly_splash') {
              golfAudio.playJellySplash(ev.impactSpeed);
              particlesRef.current.emitJellySplash(ev.x, ev.y, ev.impactSpeed);
            } else if (ev.type === 'rotator') {
              golfAudio.playWoodBounce(ev.impactSpeed * 1.15);
              particlesRef.current.emitWallSpark(
                ev.x,
                ev.y,
                ev.nx,
                ev.ny,
                ev.impactSpeed,
                level.theme
              );
              traumaRef.current = Math.min(1, traumaRef.current + 0.32);
            } else if (ev.type === 'gate') {
              golfAudio.playGateBounce(ev.impactSpeed);
              const gateObj = level.gates?.find((g) => g.id === ev.id);
              particlesRef.current.emitBumperBurst(ev.x, ev.y, gateObj?.color ?? '#38BDF8');
              traumaRef.current = Math.min(1, traumaRef.current + 0.28);
            } else if (ev.type === 'portal') {
              golfAudio.playPortalWarp();
              const portalObj = level.portals?.find((p) => p.id === ev.id);
              particlesRef.current.emitBumperBurst(ev.x, ev.y, portalObj?.color ?? '#38BDF8');
              if (ev.exitX !== undefined && ev.exitY !== undefined) {
                particlesRef.current.emitBumperBurst(
                  ev.exitX,
                  ev.exitY,
                  portalObj?.accentColor ?? '#C084FC'
                );
              }
              traumaRef.current = Math.min(1, traumaRef.current + 0.22);
            } else if (ev.type === 'water_hazard') {
              golfAudio.playWaterSplash();
              particlesRef.current.emitWaterSplash(ev.x, ev.y);
              traumaRef.current = Math.min(1, traumaRef.current + 0.3);
              splashCalloutRef.current = {
                x: ev.x,
                y: ev.y,
                life: 1.15,
                maxLife: 1.15,
                text: 'SPLASH! +1',
                fillColor: '#E0F2FE',
                strokeColor: '#0B4F6C',
              };
              strokesRef.current += 1;
              syncCanvasDataAttributes();
              onWaterPenaltyRef.current();
            } else if (ev.type === 'hole_sink') {
              const currentStrokes = Math.max(1, strokesRef.current);
              const tier = resolveCelebrationTier(currentStrokes, level.par);
              const scoreInfo = getScoreLabel(currentStrokes, level.par);
              golfAudio.playCupSink(tier);
              if (level.id === 24) {
                particlesRef.current.emitGrandChampionshipCelebration(ev.x, ev.y);
              } else if (level.id === 20) {
                particlesRef.current.emitCandyFinaleCelebration(ev.x, ev.y);
              } else {
                const particleTier = tier === 'last_chance' ? 'eagle' : tier;
                particlesRef.current.emitHoleCelebration(ev.x, ev.y, particleTier);
              }
              traumaRef.current = Math.min(
                1,
                traumaRef.current +
                  (level.id === 24
                    ? 0.52
                    : level.id === 20 || tier === 'hole_in_one' || tier === 'last_chance'
                    ? 0.42
                    : 0.26)
              );
              if (
                level.id === 24 ||
                level.id === 20 ||
                tier === 'hole_in_one' ||
                tier === 'eagle' ||
                tier === 'birdie' ||
                tier === 'last_chance'
              ) {
                splashCalloutRef.current = {
                  x: ev.x,
                  y: ev.y - 6,
                  life: level.id === 24 ? 1.65 : 1.45,
                  maxLife: level.id === 24 ? 1.65 : 1.45,
                  text:
                    level.id === 24
                      ? 'GRAND CHAMPION!'
                      : level.id === 20
                      ? 'SWEET FINALE!'
                      : scoreInfo.title,
                  fillColor:
                    level.id === 24
                      ? '#FDE047'
                      : level.id === 20
                      ? '#F9A8D4'
                      : tier === 'birdie'
                      ? '#A7F3D0'
                      : '#FDE047',
                  strokeColor:
                    level.id === 24 ? '#78350F' : level.id === 20 ? '#831843' : '#3B1D0E',
                  scale:
                    level.id === 24
                      ? 1.42
                      : level.id === 20 || tier === 'hole_in_one' || tier === 'last_chance'
                      ? 1.32
                      : 1.18,
                };
              }
              syncCanvasDataAttributes();
            }
          }

          if (splashCalloutRef.current) {
            splashCalloutRef.current.life -= dt;
            if (splashCalloutRef.current.life <= 0) {
              splashCalloutRef.current = null;
            }
          }

          if (sim.ball.holed && !sinkNotifiedRef.current && currentPhase === 'playing') {
            sinkDelayTimerRef.current += dt;
            if (sinkDelayTimerRef.current >= 0.62) {
              sinkNotifiedRef.current = true;
              onHoleSunkRef.current();
            }
          } else if (
            !sim.ball.holed &&
            !sim.ball.isMoving &&
            !outOfStrokesNotifiedRef.current &&
            currentPhase === 'playing' &&
            strokesRef.current >= maxStrokesRef.current
          ) {
            // Final stroke finished moving without entering the hole -> trigger Out of Strokes
            outOfStrokesTimerRef.current += dt;
            if (outOfStrokesTimerRef.current >= 0.42) {
              outOfStrokesNotifiedRef.current = true;
              golfAudio.playOutOfStrokes();
              onOutOfStrokesRef.current();
            }
          } else {
            outOfStrokesTimerRef.current = 0;
          }

          const speed = Math.hypot(sim.ball.vx, sim.ball.vy);
          particlesRef.current.update(dt, sim.ball.x, sim.ball.y, speed, sim.ball.holed);

          if (wasMoving && !sim.ball.isMoving) {
            syncCanvasDataAttributes();
          }
          wasMoving = sim.ball.isMoving;
        } else if (currentPhase === 'title') {
          // Keep background live and breathing on Title screen
          sim.elapsedTime += dt;
          for (let i = 0; i < level.rotators.length; i++) {
            sim.rotatorAngles[i] += level.rotators[i].angularVelocity * dt;
          }
        }

        // Decaying quadratic camera shake
        traumaRef.current = Math.max(0, traumaRef.current - dt * 2.8);
        const shakeAmt = traumaRef.current * traumaRef.current * 9;
        const shakeX = shakeAmt > 0.1 ? (Math.random() - 0.5) * 2 * shakeAmt : 0;
        const shakeY = shakeAmt > 0.1 ? (Math.random() - 0.5) * 2 * shakeAmt : 0;

        renderFrame(
          ctx,
          transformRef.current,
          level,
          sim,
          particlesRef.current,
          aimRef.current,
          shakeX,
          shakeY,
          currentDpr,
          staticCache,
          splashCalloutRef.current
        );

        rafId = window.requestAnimationFrame(loop);
      };

      rafId = window.requestAnimationFrame(loop);

      return () => {
        window.cancelAnimationFrame(rafId);
        resizeObserver.disconnect();
        canvas.removeEventListener('pointerdown', handlePointerDown);
        canvas.removeEventListener('touchmove', preventTouchScroll);
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', cancelPointer);
        window.removeEventListener('blur', cancelPointer);
      };
    }, []);

    return (
      <canvas
        ref={canvasRef}
        data-testid="golf-canvas"
        aria-label="Pocket Golf course canvas"
        className="fixed inset-0 h-full w-full block touch-none cursor-crosshair"
      />
    );
  }
);

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GolfCanvas, GolfCanvasHandle } from './components/GolfCanvas';
import { GameHud } from './components/GameHud';
import { LevelClearModal, PauseModal, VictoryModal } from './components/GameModals';
import { TitleScreen } from './components/TitleScreen';
import { golfAudio } from './game/audio';
import { LEVELS } from './game/levels';
import { GamePhase } from './game/types';

const BEST_SCORE_KEY = 'pocket-golf-trick-shots-best-12';

function readStoredBest(): number | null {
  try {
    const raw = window.localStorage.getItem(BEST_SCORE_KEY);
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredBest(score: number): void {
  try {
    window.localStorage.setItem(BEST_SCORE_KEY, String(score));
  } catch {
    // Ignore storage unavailability
  }
}

function parseInitialParams(): {
  initialPhase: GamePhase;
  startLevelIdx: number;
  previewScores: number[] | null;
} {
  if (typeof window === 'undefined') {
    return { initialPhase: 'title', startLevelIdx: 0, previewScores: null };
  }
  const params = new URLSearchParams(window.location.search);
  const previewVictory = params.get('preview') === 'victory';
  const autostart = params.get('autostart') === '1';
  const lvlParam = Number.parseInt(params.get('level') || (previewVictory ? String(LEVELS.length) : '1'), 10);
  const clampedIdx =
    Number.isFinite(lvlParam) && lvlParam >= 1 && lvlParam <= LEVELS.length
      ? lvlParam - 1
      : 0;
  return {
    initialPhase: previewVictory ? 'victory' : autostart ? 'playing' : 'title',
    startLevelIdx: clampedIdx,
    previewScores: previewVictory
      ? LEVELS.map((lvl, idx) => Math.max(1, lvl.par + (idx % 3 === 0 ? -1 : 0)))
      : null,
  };
}

export default function App() {
  const initialParams = useMemo(() => parseInitialParams(), []);
  const canvasHandleRef = useRef<GolfCanvasHandle | null>(null);

  const [phase, setPhase] = useState<GamePhase>(initialParams.initialPhase);
  const [levelIndex, setLevelIndex] = useState<number>(initialParams.startLevelIdx);
  const [strokes, setStrokes] = useState<number>(0);
  const [holeStrokes, setHoleStrokes] = useState<number[]>(() =>
    initialParams.previewScores ?? LEVELS.map(() => 0)
  );
  const [muted, setMuted] = useState<boolean>(false);
  const [bestTotal, setBestTotal] = useState<number | null>(() => readStoredBest());

  const totalPar = useMemo(
    () => LEVELS.reduce((acc, lvl) => acc + lvl.par, 0),
    []
  );

  const currentLevel = LEVELS[levelIndex] ?? LEVELS[0];

  // Mirror state machine onto document.body.dataset for reliable accessibility & verification
  useEffect(() => {
    const bodyState =
      phase === 'victory' || phase === 'level_clear' ? 'gameover' : phase;
    document.body.dataset.state = bodyState;
    document.body.dataset.phase = phase;
    document.body.dataset.level = String(currentLevel.id);
    document.body.dataset.strokes = String(strokes);
  }, [phase, currentLevel.id, strokes]);

  const handleStartCourse = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setLevelIndex(0);
    setStrokes(0);
    setHoleStrokes(LEVELS.map(() => 0));
    setPhase('playing');
    document.body.dataset.state = 'playing';
    canvasHandleRef.current?.resetBallToTee();
  }, []);

  const handleRestartHole = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setStrokes(0);
    setPhase('playing');
    canvasHandleRef.current?.resetBallToTee();
  }, []);

  const handleStroke = useCallback(() => {
    setStrokes((prev) => prev + 1);
  }, []);

  const handleHoleSunk = useCallback(() => {
    setStrokes((currentStrokes) => {
      const recordedStrokes = Math.max(1, currentStrokes);
      setHoleStrokes((prev) => {
        const next = [...prev];
        next[levelIndex] = recordedStrokes;

        if (levelIndex >= LEVELS.length - 1) {
          const total = next.reduce((sum, n) => sum + n, 0);
          setBestTotal((prevBest) => {
            if (prevBest === null || total < prevBest) {
              writeStoredBest(total);
              return total;
            }
            return prevBest;
          });
          golfAudio.playVictoryFanfare();
          setPhase('victory');
        } else {
          setPhase('level_clear');
        }
        return next;
      });
      return recordedStrokes;
    });
  }, [levelIndex]);

  const handleNextHole = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const nextIdx = Math.min(LEVELS.length - 1, levelIndex + 1);
    setLevelIndex(nextIdx);
    setStrokes(0);
    setPhase('playing');
  }, [levelIndex]);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      golfAudio.setMuted(next);
      return next;
    });
  }, []);

  const handleReturnToTitle = useCallback(() => {
    setLevelIndex(0);
    setStrokes(0);
    setPhase('title');
    canvasHandleRef.current?.resetBallToTee();
  }, []);

  // Keyboard bindings: Enter/Space on title/clear/victory, P/Escape pause, R restart, M mute
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();

      if (phase === 'title') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleStartCourse();
        }
        return;
      }

      if (phase === 'level_clear') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleNextHole();
        } else if (key === 'r') {
          e.preventDefault();
          handleRestartHole();
        }
        return;
      }

      if (phase === 'victory') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleStartCourse();
        }
        return;
      }

      if (key === 'm') {
        e.preventDefault();
        handleToggleMute();
        return;
      }

      if (key === 'p' || e.key === 'Escape') {
        e.preventDefault();
        setPhase((prev) => (prev === 'playing' ? 'paused' : 'playing'));
        return;
      }

      if (key === 'r' && phase === 'playing') {
        e.preventDefault();
        handleRestartHole();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    phase,
    handleStartCourse,
    handleNextHole,
    handleRestartHole,
    handleToggleMute,
  ]);

  return (
    <main className="relative h-screen w-screen overflow-hidden select-none">
      {/* Isolated Full-Viewport 2D Arcade Canvas */}
      <GolfCanvas
        ref={canvasHandleRef}
        levelIndex={levelIndex}
        phase={phase}
        onStroke={handleStroke}
        onWaterPenalty={handleStroke}
        onHoleSunk={handleHoleSunk}
      />

      {/* Title Screen */}
      {phase === 'title' && (
        <TitleScreen
          totalLevels={LEVELS.length}
          bestTotal={bestTotal}
          totalPar={totalPar}
          onStart={handleStartCourse}
        />
      )}

      {/* Active Playing HUD */}
      {phase !== 'title' && (
        <GameHud
          level={currentLevel}
          levelNumber={currentLevel.id}
          totalLevels={LEVELS.length}
          strokes={strokes}
          muted={muted}
          showFirstShotHint={phase === 'playing' && levelIndex === 0 && strokes === 0}
          onRestart={handleRestartHole}
          onToggleMute={handleToggleMute}
          onPause={() => setPhase('paused')}
        />
      )}

      {/* Pause Modal */}
      {phase === 'paused' && (
        <PauseModal
          levelNumber={currentLevel.id}
          levelName={currentLevel.name}
          onResume={() => setPhase('playing')}
          onRestart={handleRestartHole}
          onTitle={handleReturnToTitle}
        />
      )}

      {/* Hole Clear Celebration Modal */}
      {phase === 'level_clear' && (
        <LevelClearModal
          levelNumber={currentLevel.id}
          levelName={currentLevel.name}
          strokes={strokes}
          par={currentLevel.par}
          onNextHole={handleNextHole}
          onReplayHole={handleRestartHole}
        />
      )}

      {/* Final Course Victory Scorecard */}
      {phase === 'victory' && (
        <VictoryModal
          holeStrokes={holeStrokes}
          bestTotal={bestTotal}
          onPlayAgain={handleStartCourse}
          onTitle={handleReturnToTitle}
        />
      )}
    </main>
  );
}

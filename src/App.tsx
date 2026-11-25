import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CourseSelectModal } from './components/CourseSelectModal';
import { GolfCanvas, GolfCanvasHandle } from './components/GolfCanvas';
import { GameHud } from './components/GameHud';
import { LevelClearModal, PauseModal, VictoryModal } from './components/GameModals';
import { TitleScreen } from './components/TitleScreen';
import { useGithubAuth } from './hooks/useGithubAuth';
import { golfAudio } from './game/audio';
import { LEVELS } from './game/levels';
import {
  getOverallProgressStats,
  loadProgressFromStorage,
  ProgressStore,
  recordFullCourseBest,
  recordHoleCompletion,
  saveProgressToStorage,
} from './game/progression';
import { GamePhase } from './game/types';

function parseInitialParams(): {
  initialPhase: GamePhase;
  startLevelIdx: number;
  previewScores: number[] | null;
  previewStrokes: number;
} {
  if (typeof window === 'undefined') {
    return { initialPhase: 'title', startLevelIdx: 0, previewScores: null, previewStrokes: 0 };
  }
  const params = new URLSearchParams(window.location.search);
  const preview = params.get('preview');
  const view = params.get('view');
  const autostart = params.get('autostart') === '1';
  const lvlParam = Number.parseInt(
    params.get('level') || (preview === 'victory' ? String(LEVELS.length) : '1'),
    10
  );
  const clampedIdx =
    Number.isFinite(lvlParam) && lvlParam >= 1 && lvlParam <= LEVELS.length
      ? lvlParam - 1
      : 0;

  if (preview === 'victory') {
    return {
      initialPhase: 'victory',
      startLevelIdx: clampedIdx,
      previewScores: LEVELS.map((lvl, idx) => Math.max(1, lvl.par + (idx % 3 === 0 ? -1 : 0))),
      previewStrokes: 0,
    };
  }

  if (preview === 'clear') {
    return {
      initialPhase: 'level_clear',
      startLevelIdx: clampedIdx,
      previewScores: null,
      previewStrokes: 1,
    };
  }

  if (view === 'courses') {
    return {
      initialPhase: 'course_select',
      startLevelIdx: clampedIdx,
      previewScores: null,
      previewStrokes: 0,
    };
  }

  return {
    initialPhase: autostart ? 'playing' : 'title',
    startLevelIdx: clampedIdx,
    previewScores: null,
    previewStrokes: 0,
  };
}

export default function App() {
  const initialParams = useMemo(() => parseInitialParams(), []);
  const canvasHandleRef = useRef<GolfCanvasHandle | null>(null);

  const [phase, setPhase] = useState<GamePhase>(initialParams.initialPhase);
  const [courseReturnPhase, setCourseReturnPhase] = useState<'title' | 'paused'>('title');
  const [levelIndex, setLevelIndex] = useState<number>(initialParams.startLevelIdx);
  const [strokes, setStrokes] = useState<number>(initialParams.previewStrokes);
  const [holeStrokes, setHoleStrokes] = useState<number[]>(() =>
    initialParams.previewScores ?? LEVELS.map(() => 0)
  );
  const [muted, setMuted] = useState<boolean>(false);
  const [progress, setProgress] = useState<ProgressStore>(() => loadProgressFromStorage());
  const [lastClearNewBest, setLastClearNewBest] = useState<boolean>(false);
  const github = useGithubAuth();

  const totalPar = useMemo(
    () => LEVELS.reduce((acc, lvl) => acc + lvl.par, 0),
    []
  );
  const overallProgress = useMemo(
    () => getOverallProgressStats(progress),
    [progress]
  );

  const currentLevel = LEVELS[levelIndex] ?? LEVELS[0];
  const currentHoleRecord = progress.holes[currentLevel.id] ?? null;

  // Mirror state machine onto document.body.dataset for reliable accessibility & verification
  useEffect(() => {
    const bodyState =
      phase === 'victory' || phase === 'level_clear'
        ? 'gameover'
        : phase === 'course_select'
        ? 'title'
        : phase;
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
    setLastClearNewBest(false);
    setPhase('playing');
    document.body.dataset.state = 'playing';
    canvasHandleRef.current?.resetBallToTee();
  }, []);

  const handleSelectHole = useCallback((targetIndex: number) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const safeIdx = Math.max(0, Math.min(LEVELS.length - 1, targetIndex));
    setLevelIndex(safeIdx);
    setStrokes(0);
    setHoleStrokes(LEVELS.map(() => 0));
    setLastClearNewBest(false);
    setPhase('playing');
    document.body.dataset.state = 'playing';
    canvasHandleRef.current?.resetBallToTee();
  }, []);

  const handleOpenCoursesFromTitle = useCallback(() => {
    setCourseReturnPhase('title');
    setPhase('course_select');
  }, []);

  const handleOpenCoursesFromPause = useCallback(() => {
    setCourseReturnPhase('paused');
    setPhase('course_select');
  }, []);

  const handleCloseCourses = useCallback(() => {
    setPhase(courseReturnPhase);
  }, [courseReturnPhase]);

  const handleRestartHole = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setStrokes(0);
    setLastClearNewBest(false);
    setPhase('playing');
    canvasHandleRef.current?.resetBallToTee();
  }, []);

  const handleStroke = useCallback(() => {
    setStrokes((prev) => prev + 1);
  }, []);

  const strokesRef = useRef<number>(strokes);
  const holeStrokesRef = useRef<number[]>(holeStrokes);
  const progressRef = useRef<ProgressStore>(progress);
  strokesRef.current = strokes;
  holeStrokesRef.current = holeStrokes;
  progressRef.current = progress;

  const handleHoleSunk = useCallback(() => {
    const level = LEVELS[levelIndex] ?? LEVELS[0];
    const recordedStrokes = Math.max(1, strokesRef.current);

    const nextHoleStrokes = [...holeStrokesRef.current];
    nextHoleStrokes[levelIndex] = recordedStrokes;
    setHoleStrokes(nextHoleStrokes);
    setStrokes(recordedStrokes);

    const { progress: afterHole, isNewBest } = recordHoleCompletion(
      progressRef.current,
      level.id,
      recordedStrokes,
      level.par
    );
    setLastClearNewBest(isNewBest);

    let finalProgress = afterHole;
    if (levelIndex >= LEVELS.length - 1) {
      const completedFullTour = nextHoleStrokes.every((s) => s > 0);
      if (completedFullTour) {
        const total = nextHoleStrokes.reduce((sum, n) => sum + n, 0);
        const bestRes = recordFullCourseBest(afterHole, total);
        finalProgress = bestRes.progress;
      }
      saveProgressToStorage(finalProgress);
      setProgress(finalProgress);
      golfAudio.playVictoryFanfare();
      setPhase('victory');
    } else {
      saveProgressToStorage(finalProgress);
      setProgress(finalProgress);
      setPhase('level_clear');
    }
  }, [levelIndex]);

  const handleNextHole = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const nextIdx = Math.min(LEVELS.length - 1, levelIndex + 1);
    setLevelIndex(nextIdx);
    setStrokes(0);
    setLastClearNewBest(false);
    setPhase('playing');
  }, [levelIndex]);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      golfAudio.setMuted(next);
      if (!next) {
        golfAudio.playButtonClick();
      }
      return next;
    });
  }, []);

  const handleReturnToTitle = useCallback(() => {
    setLevelIndex(0);
    setStrokes(0);
    setLastClearNewBest(false);
    setPhase('title');
    canvasHandleRef.current?.resetBallToTee();
  }, []);

  // Keyboard bindings: Enter/Space on title/clear/victory, Escape on course_select, P/Escape pause, R restart, M mute
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

      if (phase === 'course_select') {
        if (e.key === 'Escape') {
          e.preventDefault();
          handleCloseCourses();
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
    handleCloseCourses,
    handleNextHole,
    handleRestartHole,
    handleToggleMute,
  ]);

  return (
    <main className="relative h-[100dvh] w-screen overflow-hidden select-none">
      {/* Isolated Full-Viewport 2D Arcade Canvas */}
      <GolfCanvas
        ref={canvasHandleRef}
        levelIndex={levelIndex}
        phase={phase}
        strokes={strokes}
        onStroke={handleStroke}
        onWaterPenalty={handleStroke}
        onHoleSunk={handleHoleSunk}
      />

      {/* Title Screen */}
      {phase === 'title' && (
        <TitleScreen
          totalLevels={LEVELS.length}
          bestTotal={progress.bestFullCourseTotal}
          totalPar={totalPar}
          earnedStars={overallProgress.earnedStars}
          maxStars={overallProgress.maxStars}
          completedHoles={overallProgress.completedHoles}
          githubUser={github.user}
          githubConnecting={github.connecting}
          githubError={github.error}
          githubCallbackUrlHint={github.callbackUrlHint}
          onConnectGithub={github.connect}
          onDisconnectGithub={github.disconnect}
          onDismissGithubError={github.clearError}
          onStart={handleStartCourse}
          onOpenCourses={handleOpenCoursesFromTitle}
        />
      )}

      {/* Illustrated 4-World Course Selection */}
      {phase === 'course_select' && (
        <CourseSelectModal
          progress={progress}
          onSelectHole={handleSelectHole}
          onClose={handleCloseCourses}
        />
      )}

      {/* Active Playing HUD */}
      {phase !== 'title' && phase !== 'course_select' && (
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
          onSelectCourse={handleOpenCoursesFromPause}
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
          bestStrokes={currentHoleRecord?.bestStrokes ?? null}
          isNewBest={lastClearNewBest}
          onNextHole={handleNextHole}
          onReplayHole={handleRestartHole}
        />
      )}

      {/* Final Course Victory Scorecard */}
      {phase === 'victory' && (
        <VictoryModal
          holeStrokes={holeStrokes}
          bestTotal={progress.bestFullCourseTotal}
          githubUser={github.user}
          githubConnecting={github.connecting}
          githubError={github.error}
          githubCallbackUrlHint={github.callbackUrlHint}
          onConnectGithub={github.connect}
          onShareScorecard={github.shareScorecard}
          onPlayAgain={handleStartCourse}
          onSelectCourse={handleOpenCoursesFromTitle}
          onTitle={handleReturnToTitle}
        />
      )}
    </main>
  );
}

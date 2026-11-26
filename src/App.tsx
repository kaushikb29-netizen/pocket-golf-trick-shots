import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CourseSelectModal } from './components/CourseSelectModal';
import { GolfCanvas, GolfCanvasHandle } from './components/GolfCanvas';
import { GameHud } from './components/GameHud';
import {
  LevelClearModal,
  OutOfStrokesModal,
  PauseModal,
  SettingsModal,
  VictoryModal,
} from './components/GameModals';
import { MobileInstallModal, OfflineIndicator } from './components/MobileInstallModal';
import { TitleScreen } from './components/TitleScreen';
import { useGithubAuth } from './hooks/useGithubAuth';
import { golfAudio } from './game/audio';
import { LEVELS } from './game/levels';
import { getMaxStrokes } from './game/physics';
import {
  COURSE_WORLDS,
  getOverallProgressStats,
  loadProgressFromStorage,
  ProgressStore,
  recordFullCourseBest,
  recordHoleCompletion,
  recordLastPlayedHole,
  resetSavedProgress,
  saveProgressToStorage,
  updateAudioPreferences,
  WorldId,
} from './game/progression';
import { GamePhase } from './game/types';

function parseInitialParams(): {
  initialPhase: GamePhase;
  startLevelIdx: number;
  previewScores: number[] | null;
  previewStrokes: number;
  openMobileModal: boolean;
  initialWorldId: WorldId | null;
} {
  if (typeof window === 'undefined') {
    return {
      initialPhase: 'title',
      startLevelIdx: 0,
      previewScores: null,
      previewStrokes: 0,
      openMobileModal: false,
      initialWorldId: null,
    };
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
  const lvl = LEVELS[clampedIdx] ?? LEVELS[0];
  const strokesParam = Number.parseInt(params.get('strokes') || '', 10);

  const worldParam = params.get('world');
  const matchedWorld = COURSE_WORLDS.find((w) => w.id === worldParam)?.id ?? null;

  if (preview === 'victory') {
    return {
      initialPhase: 'victory',
      startLevelIdx: clampedIdx,
      previewScores: LEVELS.map((l, idx) => Math.max(1, l.par + (idx % 3 === 0 ? -1 : 0))),
      previewStrokes: 0,
      openMobileModal: false,
      initialWorldId: null,
    };
  }

  if (preview === 'clear') {
    return {
      initialPhase: 'level_clear',
      startLevelIdx: clampedIdx,
      previewScores: null,
      previewStrokes: Number.isFinite(strokesParam) && strokesParam >= 1 ? strokesParam : 1,
      openMobileModal: false,
      initialWorldId: null,
    };
  }

  if (preview === 'last_chance') {
    return {
      initialPhase: 'level_clear',
      startLevelIdx: clampedIdx,
      previewScores: null,
      previewStrokes: getMaxStrokes(lvl.par),
      openMobileModal: false,
      initialWorldId: null,
    };
  }

  if (preview === 'out_of_strokes') {
    return {
      initialPhase: 'out_of_strokes',
      startLevelIdx: clampedIdx,
      previewScores: null,
      previewStrokes: getMaxStrokes(lvl.par),
      openMobileModal: false,
      initialWorldId: null,
    };
  }

  if (view === 'courses' || view === 'worlds' || view === 'world') {
    return {
      initialPhase: 'course_select',
      startLevelIdx: clampedIdx,
      previewScores: null,
      previewStrokes: 0,
      openMobileModal: false,
      initialWorldId: matchedWorld,
    };
  }

  if (view === 'settings') {
    return {
      initialPhase: 'settings',
      startLevelIdx: clampedIdx,
      previewScores: null,
      previewStrokes: 0,
      openMobileModal: false,
      initialWorldId: null,
    };
  }

  return {
    initialPhase: autostart ? 'playing' : 'title',
    startLevelIdx: clampedIdx,
    previewScores: null,
    previewStrokes: Number.isFinite(strokesParam) && strokesParam >= 0 ? strokesParam : 0,
    openMobileModal: view === 'mobile',
    initialWorldId: null,
  };
}

export default function App() {
  const initialParams = useMemo(() => parseInitialParams(), []);
  const canvasHandleRef = useRef<GolfCanvasHandle | null>(null);

  const [phase, setPhase] = useState<GamePhase>(initialParams.initialPhase);
  const [returnPhase, setReturnPhase] = useState<'title' | 'paused'>('title');
  const [levelIndex, setLevelIndex] = useState<number>(initialParams.startLevelIdx);
  const [strokes, setStrokes] = useState<number>(initialParams.previewStrokes);
  const [holeStrokes, setHoleStrokes] = useState<number[]>(() =>
    initialParams.previewScores ?? LEVELS.map(() => 0)
  );
  const [progress, setProgress] = useState<ProgressStore>(() => loadProgressFromStorage());
  const [lastClearNewBest, setLastClearNewBest] = useState<boolean>(false);
  const [showMobileInstall, setShowMobileInstall] = useState<boolean>(
    initialParams.openMobileModal
  );
  const github = useGithubAuth();

  // Sync persisted audio preferences to Web Audio engine on mount and updates
  useEffect(() => {
    golfAudio.setSoundEnabled(progress.audio.soundEnabled);
    golfAudio.setMusicEnabled(progress.audio.musicEnabled);
  }, [progress.audio.soundEnabled, progress.audio.musicEnabled]);

  const muted = !progress.audio.soundEnabled && !progress.audio.musicEnabled;

  const totalPar = useMemo(
    () => LEVELS.reduce((acc, lvl) => acc + lvl.par, 0),
    []
  );
  const overallProgress = useMemo(
    () => getOverallProgressStats(progress),
    [progress]
  );

  const currentLevel = LEVELS[levelIndex] ?? LEVELS[0];
  const currentMaxStrokes = getMaxStrokes(currentLevel.par);
  const currentHoleRecord = progress.holes[currentLevel.id] ?? null;

  // Mirror state machine onto document.body.dataset for reliable accessibility & verification
  useEffect(() => {
    const bodyState =
      phase === 'victory' || phase === 'level_clear' || phase === 'out_of_strokes'
        ? 'gameover'
        : phase === 'course_select' || phase === 'settings'
        ? 'title'
        : phase;
    document.body.dataset.state = bodyState;
    document.body.dataset.phase = phase;
    document.body.dataset.level = String(currentLevel.id);
    document.body.dataset.strokes = String(strokes);
    document.body.dataset.maxStrokes = String(currentMaxStrokes);
  }, [phase, currentLevel.id, strokes, currentMaxStrokes]);

  const persistLastPlayed = useCallback((holeId: number) => {
    setProgress((prev) => {
      const updated = recordLastPlayedHole(prev, holeId);
      if (updated !== prev) {
        saveProgressToStorage(updated);
      }
      return updated;
    });
  }, []);

  // New Game begins from Hole 1 WITHOUT deleting existing saved records
  const handleNewGame = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    golfAudio.unlockAndStartMusic();
    setLevelIndex(0);
    setStrokes(0);
    setHoleStrokes(LEVELS.map(() => 0));
    setLastClearNewBest(false);
    persistLastPlayed(1);
    setPhase('playing');
    document.body.dataset.state = 'playing';
    canvasHandleRef.current?.resetBallToTee();
  }, [persistLastPlayed]);

  // Continue Game opens the latest unlocked playable hole
  const handleContinueGame = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    golfAudio.unlockAndStartMusic();
    const targetIdx = Math.max(
      0,
      Math.min(LEVELS.length - 1, progress.lastUnlockedHole - 1)
    );
    setLevelIndex(targetIdx);
    setStrokes(0);
    setHoleStrokes(LEVELS.map(() => 0));
    setLastClearNewBest(false);
    persistLastPlayed(targetIdx + 1);
    setPhase('playing');
    document.body.dataset.state = 'playing';
    canvasHandleRef.current?.resetBallToTee();
  }, [progress.lastUnlockedHole, persistLastPlayed]);

  const handleSelectHole = useCallback(
    (targetIndex: number) => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      golfAudio.unlockAndStartMusic();
      const safeIdx = Math.max(0, Math.min(LEVELS.length - 1, targetIndex));
      setLevelIndex(safeIdx);
      setStrokes(0);
      setHoleStrokes(LEVELS.map(() => 0));
      setLastClearNewBest(false);
      persistLastPlayed(safeIdx + 1);
      setPhase('playing');
      document.body.dataset.state = 'playing';
      canvasHandleRef.current?.resetBallToTee();
    },
    [persistLastPlayed]
  );

  const handleOpenCoursesFromTitle = useCallback(() => {
    setReturnPhase('title');
    setPhase('course_select');
  }, []);

  const handleOpenCoursesFromPause = useCallback(() => {
    setReturnPhase('paused');
    setPhase('course_select');
  }, []);

  const handleOpenSettingsFromTitle = useCallback(() => {
    setReturnPhase('title');
    setPhase('settings');
  }, []);

  const handleOpenSettingsFromPause = useCallback(() => {
    setReturnPhase('paused');
    setPhase('settings');
  }, []);

  const handleCloseSubmodal = useCallback(() => {
    setPhase(returnPhase);
  }, [returnPhase]);

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

  // Failed attempt: never unlocks next hole, never overwrites best records
  const handleOutOfStrokes = useCallback(() => {
    setPhase('out_of_strokes');
  }, []);

  const handleNextHole = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const nextIdx = Math.min(LEVELS.length - 1, levelIndex + 1);
    setLevelIndex(nextIdx);
    setStrokes(0);
    setLastClearNewBest(false);
    persistLastPlayed(nextIdx + 1);
    setPhase('playing');
  }, [levelIndex, persistLastPlayed]);

  const handleToggleSound = useCallback(() => {
    const nextSound = !progressRef.current.audio.soundEnabled;
    const nextProgress = updateAudioPreferences(progressRef.current, {
      soundEnabled: nextSound,
    });
    golfAudio.setSoundEnabled(nextSound);
    if (nextSound) {
      golfAudio.playButtonClick();
    }
    saveProgressToStorage(nextProgress);
    setProgress(nextProgress);
  }, []);

  const handleToggleMusic = useCallback(() => {
    const nextMusic = !progressRef.current.audio.musicEnabled;
    const nextProgress = updateAudioPreferences(progressRef.current, {
      musicEnabled: nextMusic,
    });
    golfAudio.setMusicEnabled(nextMusic);
    if (nextMusic) {
      golfAudio.unlockAndStartMusic();
    }
    if (nextProgress.audio.soundEnabled) {
      golfAudio.playButtonClick();
    }
    saveProgressToStorage(nextProgress);
    setProgress(nextProgress);
  }, []);

  const handleToggleMute = useCallback(() => {
    const currentlyMuted =
      !progressRef.current.audio.soundEnabled && !progressRef.current.audio.musicEnabled;
    const nextEnabled = currentlyMuted;
    const nextProgress = updateAudioPreferences(progressRef.current, {
      soundEnabled: nextEnabled,
      musicEnabled: nextEnabled,
    });
    golfAudio.setSoundEnabled(nextEnabled);
    golfAudio.setMusicEnabled(nextEnabled);
    if (nextEnabled) {
      golfAudio.playButtonClick();
    }
    saveProgressToStorage(nextProgress);
    setProgress(nextProgress);
  }, []);

  const handleResetProgress = useCallback(() => {
    const cleared = resetSavedProgress(progressRef.current, true);
    saveProgressToStorage(cleared);
    setProgress(cleared);
    setLevelIndex(0);
    setStrokes(0);
    setHoleStrokes(LEVELS.map(() => 0));
    setLastClearNewBest(false);
    canvasHandleRef.current?.resetBallToTee();
  }, []);

  const handleReturnToTitle = useCallback(() => {
    setLevelIndex(0);
    setStrokes(0);
    setLastClearNewBest(false);
    setPhase('title');
    canvasHandleRef.current?.resetBallToTee();
  }, []);

  // Keyboard bindings: Enter/Space on title/clear/out_of_strokes/victory, Escape on submodals, P/Escape pause, R restart, M mute
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();

      if (showMobileInstall) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowMobileInstall(false);
        }
        return;
      }

      if (phase === 'title') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleContinueGame();
        }
        return;
      }

      if (phase === 'course_select' || phase === 'settings') {
        if (e.key === 'Escape') {
          e.preventDefault();
          handleCloseSubmodal();
        }
        return;
      }

      if (phase === 'out_of_strokes') {
        if (e.key === 'Enter' || e.key === ' ' || key === 'r') {
          e.preventDefault();
          handleRestartHole();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handleReturnToTitle();
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
          handleNewGame();
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
    showMobileInstall,
    handleContinueGame,
    handleNewGame,
    handleCloseSubmodal,
    handleNextHole,
    handleRestartHole,
    handleReturnToTitle,
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
        maxStrokes={currentMaxStrokes}
        onStroke={handleStroke}
        onWaterPenalty={handleStroke}
        onHoleSunk={handleHoleSunk}
        onOutOfStrokes={handleOutOfStrokes}
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
          lastUnlockedHole={progress.lastUnlockedHole}
          githubUser={github.user}
          githubConnecting={github.connecting}
          githubError={github.error}
          githubCallbackUrlHint={github.callbackUrlHint}
          onConnectGithub={github.connect}
          onDisconnectGithub={github.disconnect}
          onDismissGithubError={github.clearError}
          onContinueGame={handleContinueGame}
          onNewGame={handleNewGame}
          onSelectHole={handleOpenCoursesFromTitle}
          onOpenSettings={handleOpenSettingsFromTitle}
          onOpenMobileInstall={() => setShowMobileInstall(true)}
        />
      )}

      {/* Illustrated 6-World Selection & 4-Hole Level Selection */}
      {phase === 'course_select' && (
        <CourseSelectModal
          progress={progress}
          initialWorldId={initialParams.initialWorldId}
          onSelectHole={handleSelectHole}
          onClose={handleCloseSubmodal}
        />
      )}

      {/* Settings Modal */}
      {phase === 'settings' && (
        <SettingsModal
          soundEnabled={progress.audio.soundEnabled}
          musicEnabled={progress.audio.musicEnabled}
          completedHoles={overallProgress.completedHoles}
          earnedStars={overallProgress.earnedStars}
          onToggleSound={handleToggleSound}
          onToggleMusic={handleToggleMusic}
          onResetProgress={handleResetProgress}
          onClose={handleCloseSubmodal}
        />
      )}

      {/* Active Playing HUD */}
      {phase !== 'title' && phase !== 'course_select' && phase !== 'settings' && (
        <GameHud
          level={currentLevel}
          levelNumber={currentLevel.id}
          totalLevels={LEVELS.length}
          strokes={strokes}
          maxStrokes={currentMaxStrokes}
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
          onOpenSettings={handleOpenSettingsFromPause}
          onTitle={handleReturnToTitle}
        />
      )}

      {/* Out of Strokes Failure Modal */}
      {phase === 'out_of_strokes' && (
        <OutOfStrokesModal
          levelNumber={currentLevel.id}
          levelName={currentLevel.name}
          strokes={strokes}
          maxStrokes={currentMaxStrokes}
          par={currentLevel.par}
          onRetry={handleRestartHole}
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
          onPlayAgain={handleNewGame}
          onSelectCourse={handleOpenCoursesFromTitle}
          onTitle={handleReturnToTitle}
        />
      )}

      {/* Mobile QR Install Modal */}
      {showMobileInstall && (
        <MobileInstallModal onClose={() => setShowMobileInstall(false)} />
      )}

      {/* Offline Status Indicator */}
      <OfflineIndicator />
    </main>
  );
}

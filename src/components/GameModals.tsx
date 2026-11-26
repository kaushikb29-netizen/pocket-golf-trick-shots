import { useState } from 'react';
import type { GithubUser } from '../hooks/useGithubAuth';
import { golfAudio } from '../game/audio';
import { LEVELS } from '../game/levels';
import { calculateStars, formatParDelta, getScoreLabel } from '../game/physics';
import type { HoleProgressRecord, OverallProgressStats } from '../game/progression';
import type { ScorecardEntry } from '../server/githubHelpers';
import { ConfettiOverlay } from './WorldCompleteModal';

interface PauseModalProps {
  levelNumber: number;
  levelName: string;
  onResume: () => void;
  onRestart: () => void;
  onSelectCourse: () => void;
  onOpenSettings: () => void;
  onTitle: () => void;
}

export function PauseModal({
  levelNumber,
  levelName,
  onResume,
  onRestart,
  onSelectCourse,
  onOpenSettings,
  onTitle,
}: PauseModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(11, 52, 64, 0.64)' }}
    >
      <div className="animate-modal-pop w-full max-w-sm bg-[#FFF8E7] border-[4px] border-[#522810] rounded-3xl p-6 shadow-[0_10px_0_#522810] text-center">
        <p className="text-xs font-extrabold uppercase tracking-wider text-[#8A4B20]">
          Hole {levelNumber} · {levelName}
        </p>
        <h2 id="pause-title" className="mt-1 font-display text-3xl font-bold text-[#3B1D0E]">
          Paused
        </h2>

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => {
              golfAudio.playButtonClick();
              onResume();
            }}
            className="min-h-[48px] w-full font-display text-xl font-bold text-[#FFFDF5] bg-[#2FA752] hover:bg-[#269145] hover:-translate-y-0.5 active:translate-y-0.5 py-3 px-6 rounded-2xl border-[3px] border-[#522810] shadow-[0_4px_0_#522810] active:shadow-[0_1px_0_#522810] transition-transform cursor-pointer whitespace-nowrap"
          >
            Resume
          </button>
          <button
            type="button"
            onClick={() => {
              golfAudio.playButtonClick();
              onRestart();
            }}
            className="min-h-[46px] w-full font-display text-lg font-bold text-[#3B1D0E] bg-[#FDE047] hover:bg-[#FACC15] hover:-translate-y-0.5 active:translate-y-0.5 py-2.5 px-6 rounded-2xl border-[3px] border-[#522810] shadow-[0_4px_0_#522810] active:shadow-[0_1px_0_#522810] transition-transform cursor-pointer whitespace-nowrap"
          >
            Restart Hole
          </button>
          <button
            type="button"
            onClick={() => {
              golfAudio.playButtonClick();
              onSelectCourse();
            }}
            className="min-h-[46px] w-full font-display text-lg font-bold text-[#3B1D0E] bg-[#FFF2CC] hover:bg-[#FCE6A6] hover:-translate-y-0.5 active:translate-y-0.5 py-2.5 px-6 rounded-2xl border-[3px] border-[#522810] shadow-[0_4px_0_#522810] active:shadow-[0_1px_0_#522810] transition-transform cursor-pointer whitespace-nowrap"
          >
            Select World
          </button>
          <button
            type="button"
            onClick={() => {
              golfAudio.playButtonClick();
              onOpenSettings();
            }}
            className="min-h-[46px] w-full font-display text-lg font-bold text-[#3B1D0E] bg-[#FDE68A] hover:bg-[#FCD34D] hover:-translate-y-0.5 active:translate-y-0.5 py-2.5 px-6 rounded-2xl border-[3px] border-[#522810] shadow-[0_4px_0_#522810] active:shadow-[0_1px_0_#522810] transition-transform cursor-pointer whitespace-nowrap"
          >
            Settings
          </button>
          <button
            type="button"
            onClick={() => {
              golfAudio.playButtonClick();
              onTitle();
            }}
            className="min-h-[46px] w-full font-display text-lg font-bold text-[#3B1D0E] bg-[#F5E6C4] hover:bg-[#EBD5A7] hover:-translate-y-0.5 active:translate-y-0.5 py-2.5 px-6 rounded-2xl border-[3px] border-[#522810] shadow-[0_4px_0_#522810] active:shadow-[0_1px_0_#522810] transition-transform cursor-pointer whitespace-nowrap"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}

interface OutOfStrokesModalProps {
  levelNumber: number;
  levelName: string;
  strokes: number;
  maxStrokes: number;
  par: number;
  onRetry: () => void;
  onTitle: () => void;
}

export function OutOfStrokesModal({
  levelNumber,
  levelName,
  strokes,
  maxStrokes,
  par,
  onRetry,
  onTitle,
}: OutOfStrokesModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="out-of-strokes-title"
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(11, 52, 64, 0.68)' }}
    >
      <div className="animate-modal-pop w-full max-w-sm bg-[#FFF8E7] border-[4px] border-[#522810] rounded-3xl p-6 shadow-[0_10px_0_#522810] text-center">
        <p className="text-xs font-extrabold uppercase tracking-wider text-[#8A4B20]">
          Hole {levelNumber} · {levelName}
        </p>

        <div className="mt-3 inline-block px-5 py-1.5 rounded-2xl border-[3px] border-[#522810] shadow-[0_3px_0_#522810] bg-[#DC2626]">
          <h2
            id="out-of-strokes-title"
            className="font-display text-2xl sm:text-3xl font-bold text-[#FFFDF5] tracking-wide"
          >
            OUT OF STROKES!
          </h2>
        </div>

        <p className="mt-2.5 text-sm font-bold text-[#6E3D1B]">
          You used all {maxStrokes} strokes before reaching the cup.
        </p>

        {/* 0 Stars Earned */}
        <div
          className="mt-3 flex items-center justify-center gap-2"
          aria-label="0 out of 3 stars"
        >
          <StarSvg filled={false} />
          <StarSvg filled={false} />
          <StarSvg filled={false} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t-2 border-[#E6D3AB] pt-4">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#8A4B20]">
              Strokes Used
            </div>
            <div className="font-display text-3xl font-bold text-[#B91C1C] tabular-nums">
              {strokes}/{maxStrokes}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#8A4B20]">
              Par
            </div>
            <div className="font-display text-3xl font-bold text-[#247A3C] tabular-nums">
              {par}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            data-start="true"
            data-testid="retry-hole-btn"
            onClick={() => {
              golfAudio.playCardSelect();
              onRetry();
            }}
            className="min-h-[50px] w-full font-display text-xl font-bold text-[#FFFDF5] bg-[#FF595E] hover:bg-[#FF4248] hover:-translate-y-0.5 active:translate-y-0.5 py-3 px-6 rounded-2xl border-[3px] border-[#522810] shadow-[0_4px_0_#522810] active:shadow-[0_1px_0_#522810] transition-transform cursor-pointer whitespace-nowrap"
          >
            Retry Hole
          </button>
          <button
            type="button"
            onClick={() => {
              golfAudio.playButtonClick();
              onTitle();
            }}
            className="min-h-[46px] w-full font-display text-base font-bold text-[#3B1D0E] bg-[#F5E6C4] hover:bg-[#EBD5A7] hover:-translate-y-0.5 active:translate-y-0.5 py-2.5 px-6 rounded-2xl border-[3px] border-[#522810] shadow-[0_4px_0_#522810] active:shadow-[0_1px_0_#522810] transition-transform cursor-pointer whitespace-nowrap"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}

interface SettingsModalProps {
  soundEnabled: boolean;
  musicEnabled: boolean;
  completedHoles: number;
  earnedStars: number;
  onToggleSound: () => void;
  onToggleMusic: () => void;
  onResetProgress: () => void;
  onClose: () => void;
}

export function SettingsModal({
  soundEnabled,
  musicEnabled,
  completedHoles,
  earnedStars,
  onToggleSound,
  onToggleMusic,
  onResetProgress,
  onClose,
}: SettingsModalProps) {
  const [confirmingReset, setConfirmingReset] = useState(false);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(11, 52, 64, 0.72)' }}
    >
      <div className="animate-modal-pop w-full max-w-sm bg-[#FFF8E7] border-[4px] border-[#522810] rounded-3xl p-6 shadow-[0_10px_0_#522810] text-center">
        <h2 id="settings-title" className="font-display text-3xl font-bold text-[#3B1D0E]">
          Settings
        </h2>
        <p className="mt-1 text-xs font-bold text-[#7C4B27]">
          Preferences &amp; saved progress are stored automatically in your browser.
        </p>

        <div className="mt-5 flex flex-col gap-3 text-left">
          {/* Sound Effects Toggle */}
          <div className="flex items-center justify-between gap-3 rounded-2xl border-[3px] border-[#522810] bg-[#FFFDF7] px-4 py-3">
            <div>
              <div className="font-display text-base font-bold text-[#3B1D0E]">
                Sound Effects
              </div>
              <div className="text-[11px] font-semibold text-[#7C4B27]">
                Putts, bounces &amp; celebrations
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={soundEnabled}
              data-testid="toggle-sound-btn"
              onClick={onToggleSound}
              className={`min-h-[40px] min-w-[74px] px-3.5 rounded-xl border-[3px] border-[#522810] font-display text-sm font-bold shadow-[0_3px_0_#522810] active:translate-y-0.5 cursor-pointer transition-colors ${
                soundEnabled
                  ? 'bg-[#2FA752] text-[#FFFDF5]'
                  : 'bg-[#E5D7B8] text-[#5C3A1E]'
              }`}
            >
              {soundEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Background Music Toggle */}
          <div className="flex items-center justify-between gap-3 rounded-2xl border-[3px] border-[#522810] bg-[#FFFDF7] px-4 py-3">
            <div>
              <div className="font-display text-base font-bold text-[#3B1D0E]">
                Music
              </div>
              <div className="text-[11px] font-semibold text-[#7C4B27]">
                Gentle arcade resort groove
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={musicEnabled}
              data-testid="toggle-music-btn"
              onClick={onToggleMusic}
              className={`min-h-[40px] min-w-[74px] px-3.5 rounded-xl border-[3px] border-[#522810] font-display text-sm font-bold shadow-[0_3px_0_#522810] active:translate-y-0.5 cursor-pointer transition-colors ${
                musicEnabled
                  ? 'bg-[#0EA5B7] text-[#FFFDF5]'
                  : 'bg-[#E5D7B8] text-[#5C3A1E]'
              }`}
            >
              {musicEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Reset Progress with Two-Step Confirmation */}
          <div className="rounded-2xl border-[3px] border-[#D7C29E] bg-[#FAF0D7] p-3.5 text-center">
            <div className="text-xs font-extrabold text-[#6E3D1B] tabular-nums">
              Saved Progress: {completedHoles}/{LEVELS.length} Holes · ★ {earnedStars} Stars
            </div>

            {!confirmingReset ? (
              <button
                type="button"
                data-testid="reset-progress-btn"
                onClick={() => {
                  golfAudio.playButtonClick();
                  setConfirmingReset(true);
                }}
                className="mt-2.5 min-h-[42px] w-full font-display text-base font-bold text-[#B91C1C] bg-[#FEE2E2] hover:bg-[#FECACA] active:translate-y-0.5 rounded-xl border-[2.5px] border-[#B91C1C] cursor-pointer transition-colors"
              >
                Reset Progress
              </button>
            ) : (
              <div className="mt-2.5 space-y-2">
                <p className="text-xs font-extrabold text-[#B91C1C]">
                  Erase all stars, best scores &amp; unlocked holes?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    data-testid="confirm-reset-btn"
                    onClick={() => {
                      golfAudio.playButtonClick();
                      onResetProgress();
                      setConfirmingReset(false);
                    }}
                    className="min-h-[42px] font-display text-sm font-bold text-[#FFFDF5] bg-[#DC2626] hover:bg-[#B91C1C] rounded-xl border-[2.5px] border-[#522810] shadow-[0_3px_0_#522810] active:translate-y-0.5 cursor-pointer"
                  >
                    Yes, Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      golfAudio.playButtonClick();
                      setConfirmingReset(false);
                    }}
                    className="min-h-[42px] font-display text-sm font-bold text-[#3B1D0E] bg-[#FFF8E7] hover:bg-[#F5E6C4] rounded-xl border-[2.5px] border-[#522810] shadow-[0_3px_0_#522810] active:translate-y-0.5 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            golfAudio.playButtonClick();
            onClose();
          }}
          className="mt-5 min-h-[46px] w-full font-display text-lg font-bold text-[#3B1D0E] bg-[#F5E6C4] hover:bg-[#EBD5A7] hover:-translate-y-0.5 active:translate-y-0.5 py-2.5 px-6 rounded-2xl border-[3px] border-[#522810] shadow-[0_4px_0_#522810] active:shadow-[0_1px_0_#522810] transition-transform cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
}

interface LevelClearModalProps {
  levelNumber: number;
  levelName: string;
  strokes: number;
  par: number;
  bestStrokes: number | null;
  isNewBest: boolean;
  isWorldFinale?: boolean;
  isFinalHole?: boolean;
  onNextHole: () => void;
  onReplayHole: () => void;
}

function StarSvg({ filled, animClass }: { filled: boolean; animClass?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={`w-9 h-9 sm:w-10 sm:h-10 ${filled && animClass ? animClass : ''}`}
      aria-hidden="true"
    >
      <path
        d="M16 3 L19.9 11.1 L28.8 12.2 L22.2 18.4 L23.9 27.2 L16 22.9 L8.1 27.2 L9.8 18.4 L3.2 12.2 L12.1 11.1 Z"
        fill={filled ? '#FACC15' : '#E2D4B7'}
        stroke="#522810"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {filled && (
        <path
          d="M16 6.8 L17.9 11.1 L22.4 11.7"
          fill="none"
          stroke="#FFFDF5"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.7"
        />
      )}
    </svg>
  );
}

function SparkleAccent({ className, color = '#FACC15' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`w-5 h-5 ${className ?? ''}`} aria-hidden="true">
      <path
        d="M12 2 Q12 12 22 12 Q12 12 12 22 Q12 12 2 12 Q12 12 12 2 Z"
        fill={color}
        stroke="#522810"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LevelClearModal({
  levelNumber,
  levelName,
  strokes,
  par,
  bestStrokes,
  isNewBest,
  isWorldFinale = false,
  isFinalHole = false,
  onNextHole,
  onReplayHole,
}: LevelClearModalProps) {
  const info = getScoreLabel(strokes, par);
  const isSpecialScore = strokes === 1 || strokes <= par - 1 || Boolean(info.isLastChance);
  const bannerColor = info.isLastChance
    ? '#EA580C'
    : info.tone === 'gold'
    ? '#F59E0B'
    : info.tone === 'emerald'
    ? '#2FA752'
    : info.tone === 'sky'
    ? '#0EA5E9'
    : '#FF6B4A';

  const continueLabel = isFinalHole
    ? 'Championship Results →'
    : isWorldFinale
    ? 'World Results →'
    : 'Next Hole';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="level-clear-title"
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(11, 52, 64, 0.62)' }}
    >
      <div className="animate-modal-pop w-full max-w-sm bg-[#FFF8E7] border-[4px] border-[#522810] rounded-3xl p-6 shadow-[0_10px_0_#522810] text-center">
        <p className="text-xs font-extrabold uppercase tracking-wider text-[#8A4B20]">
          Hole {levelNumber} Cleared · {levelName}
        </p>

        {/* Celebratory Score Banner with sparkles for Hole in One / Eagle / Birdie / Last Chance Save */}
        <div className="mt-3 flex items-center justify-center gap-2">
          {isSpecialScore && (
            <SparkleAccent
              className="animate-sparkle shrink-0"
              color={info.tone === 'gold' ? '#FACC15' : '#34D399'}
            />
          )}
          <div
            className={`inline-block px-4 py-1.5 rounded-2xl border-[3px] border-[#522810] shadow-[0_3px_0_#522810] ${
              isSpecialScore ? 'animate-banner-pulse' : ''
            }`}
            style={{ backgroundColor: bannerColor }}
          >
            <h2
              id="level-clear-title"
              className="font-display text-lg sm:text-[22px] font-bold text-[#FFFDF5] tracking-wide whitespace-nowrap"
            >
              {info.title}
            </h2>
          </div>
          {isSpecialScore && (
            <SparkleAccent
              className="animate-sparkle shrink-0"
              color={info.tone === 'gold' ? '#FF595E' : '#FACC15'}
            />
          )}
        </div>

        <p className="mt-2 text-sm font-bold text-[#6E3D1B]">
          {info.detail}
          {isNewBest && (
            <span className="text-[#15803D]"> · New Personal Best!</span>
          )}
          {!isNewBest && bestStrokes !== null && (
            <span className="text-[#8A4B20] tabular-nums"> · Best {bestStrokes}</span>
          )}
        </p>

        {/* Staggered Animated Stars */}
        <div
          className="mt-3 flex items-center justify-center gap-2"
          aria-label={`${info.stars} out of 3 stars`}
        >
          <StarSvg filled={info.stars >= 1} animClass="animate-star-pop-1" />
          <StarSvg filled={info.stars >= 2} animClass="animate-star-pop-2" />
          <StarSvg filled={info.stars >= 3} animClass="animate-star-pop-3" />
        </div>

        {/* Stat Row */}
        <div className="mt-4 grid grid-cols-2 gap-3 border-t-2 border-[#E6D3AB] pt-4">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#8A4B20]">
              Strokes
            </div>
            <div className="font-display text-3xl font-bold text-[#3B1D0E] tabular-nums">
              {strokes}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#8A4B20]">
              Par
            </div>
            <div className="font-display text-3xl font-bold text-[#247A3C] tabular-nums">
              {par}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            data-start="true"
            data-testid="level-clear-continue-btn"
            onClick={() => {
              golfAudio.playCardSelect();
              onNextHole();
            }}
            className="min-h-[50px] w-full font-display text-xl font-bold text-[#FFFDF5] bg-[#2FA752] hover:bg-[#269145] hover:-translate-y-0.5 active:translate-y-0.5 py-3 px-6 rounded-2xl border-[3px] border-[#522810] shadow-[0_4px_0_#522810] active:shadow-[0_1px_0_#522810] transition-transform cursor-pointer whitespace-nowrap"
          >
            {continueLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              golfAudio.playButtonClick();
              onReplayHole();
            }}
            className="min-h-[46px] w-full font-display text-base font-bold text-[#3B1D0E] bg-[#F5E6C4] hover:bg-[#EBD5A7] hover:-translate-y-0.5 active:translate-y-0.5 py-2.5 px-6 rounded-2xl border-[3px] border-[#522810] shadow-[0_4px_0_#522810] active:shadow-[0_1px_0_#522810] transition-transform cursor-pointer whitespace-nowrap"
          >
            Replay Hole
          </button>
        </div>
      </div>
    </div>
  );
}

interface VictoryModalProps {
  holeStrokes: number[];
  savedHoles: Record<number, HoleProgressRecord>;
  overallProgress: OverallProgressStats;
  bestTotal: number | null;
  githubUser: GithubUser | null;
  githubConnecting: boolean;
  githubError: string | null;
  githubCallbackUrlHint: string | null;
  onConnectGithub: () => void;
  onShareScorecard: (holes: ScorecardEntry[]) => Promise<string>;
  onSelectWorld: () => void;
  onReplayAnyHole: () => void;
  onTitle: () => void;
}

export function VictoryModal({
  holeStrokes,
  savedHoles,
  overallProgress,
  bestTotal,
  githubUser,
  githubConnecting,
  githubError,
  githubCallbackUrlHint,
  onConnectGithub,
  onShareScorecard,
  onSelectWorld,
  onReplayAnyHole,
  onTitle,
}: VictoryModalProps) {
  const [savingGist, setSavingGist] = useState(false);
  const [gistUrl, setGistUrl] = useState<string | null>(null);
  const [gistError, setGistError] = useState<string | null>(null);

  // Merge saved personal bests with current session scores so the championship summary always reflects full progress
  const mergedScores = LEVELS.map((lvl, idx) => {
    const saved = savedHoles[lvl.id]?.bestStrokes ?? 0;
    const session = holeStrokes[idx] ?? 0;
    if (saved > 0 && session > 0) return Math.min(saved, session);
    return saved || session;
  });

  const mergedCompletedCount = mergedScores.filter((s) => s > 0).length;
  const totalCompletedHoles = Math.max(overallProgress.completedHoles, mergedCompletedCount);
  const totalAccumulatedStrokes =
    overallProgress.totalBestStrokes > 0
      ? overallProgress.totalBestStrokes
      : mergedScores.reduce((acc, s) => acc + s, 0);
  const referencePar =
    overallProgress.completedPar > 0
      ? overallProgress.completedPar
      : LEVELS.reduce((acc, lvl, idx) => acc + (mergedScores[idx] > 0 ? lvl.par : 0), 0);

  const deltaText =
    totalAccumulatedStrokes > 0 && referencePar > 0
      ? formatParDelta(totalAccumulatedStrokes, referencePar)
      : 'Tour Clear';
  const diff = totalAccumulatedStrokes - referencePar;
  const performanceRank =
    totalAccumulatedStrokes <= 0
      ? 'Grand Champion'
      : diff <= -6
      ? 'Grandmaster'
      : diff <= 0
      ? 'Pro Champion'
      : diff <= 8
      ? 'Gold Finisher'
      : 'Tour Finisher';

  const totalDisplayedStars = LEVELS.reduce((acc, lvl, idx) => {
    const savedStars = savedHoles[lvl.id]?.stars ?? 0;
    const sessionScore = holeStrokes[idx] ?? 0;
    const sessionStars =
      sessionScore > 0 ? Math.max(1, calculateStars(sessionScore, lvl.par, true)) : 0;
    return acc + Math.max(savedStars, sessionStars);
  }, 0);

  const starRatio =
    overallProgress.maxStars > 0 ? totalDisplayedStars / overallProgress.maxStars : 0;
  const displayStars: 1 | 2 | 3 =
    starRatio >= 0.8 || (totalAccumulatedStrokes > 0 && diff <= 0)
      ? 3
      : starRatio >= 0.5 || (totalAccumulatedStrokes > 0 && diff <= 8)
      ? 2
      : 1;

  const firstHalf = LEVELS.slice(0, Math.ceil(LEVELS.length / 2));
  const secondHalf = LEVELS.slice(Math.ceil(LEVELS.length / 2));

  const handleSaveToGithub = async () => {
    golfAudio.playButtonClick();
    setSavingGist(true);
    setGistError(null);
    try {
      const entries: ScorecardEntry[] = LEVELS.map((lvl, idx) => ({
        id: lvl.id,
        name: lvl.name,
        par: lvl.par,
        strokes: mergedScores[idx] ?? 0,
      }));
      const url = await onShareScorecard(entries);
      setGistUrl(url);
    } catch (err) {
      setGistError(err instanceof Error ? err.message : 'Could not save scorecard to GitHub.');
    } finally {
      setSavingGist(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="victory-title"
      data-testid="championship-modal"
      className="fixed inset-0 z-30 flex items-center justify-center p-2 sm:p-3.5"
      style={{ backgroundColor: 'rgba(28, 20, 48, 0.8)' }}
    >
      <ConfettiOverlay />

      <div className="relative z-10 animate-modal-pop w-full max-w-2xl max-h-[94dvh] overflow-y-auto touch-pan-y overscroll-contain bg-[#FFFBEB] border-[4px] border-[#78350F] rounded-3xl p-3.5 sm:p-5 shadow-[0_10px_0_#78350F] text-center">
        {/* Final Championship Celebration Header */}
        <div className="flex items-center justify-center gap-3">
          <div className="relative shrink-0">
            <svg viewBox="0 0 54 54" className="w-13 h-13 sm:w-14 sm:h-14" aria-hidden="true">
              <path
                d="M17 11 L20 4 L27 8.5 L34 4 L37 11 Z"
                fill="#FACC15"
                stroke="#78350F"
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
              <path
                d="M13 14 H41 V24 C41 31.5 34.8 36.5 27 36.5 C19.2 36.5 13 31.5 13 24 Z"
                fill="#F59E0B"
                stroke="#78350F"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path
                d="M13 17 H7 C7 24 10 27.5 14 27.5 M41 17 H47 C47 24 44 27.5 40 27.5"
                fill="none"
                stroke="#78350F"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M27 18 L29.1 23 L34.4 23.5 L30.3 26.9 L31.6 32 L27 29.2 L22.4 32 L23.7 26.9 L19.6 23.5 L24.9 23 Z"
                fill="#FEF08A"
                stroke="#78350F"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <rect x="23" y="36.5" width="8" height="7" fill="#D97706" stroke="#522810" strokeWidth="2.5" />
              <rect x="15.5" y="43" width="23" height="6" rx="2.5" fill="#92400E" stroke="#522810" strokeWidth="2.5" />
            </svg>
            <SparkleAccent className="animate-sparkle w-4 h-4 absolute -top-1 -right-1.5" color="#FACC15" />
            <SparkleAccent className="animate-sparkle w-3.5 h-3.5 absolute top-2 -left-2" color="#EF4444" />
            <SparkleAccent className="animate-sparkle w-3.5 h-3.5 absolute -bottom-0.5 -right-1" color="#38BDF8" />
          </div>
          <div className="text-left">
            <div className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-[#B45309]">
              ALL 6 WORLDS COMPLETED!
            </div>
            <h2
              id="victory-title"
              className="mt-0.5 font-display text-xl sm:text-2xl font-bold text-[#78350F] leading-tight"
            >
              POCKET GOLF CHAMPION!
            </h2>
          </div>
        </div>

        {/* 4-Metric Championship Stat Strip */}
        <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-2xl border-[3px] border-[#D97706] bg-[#FEF3C7] px-2.5 py-2">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#92400E]">
              Holes Cleared
            </div>
            <div className="font-display text-lg sm:text-xl font-bold text-[#3B1D0E] tabular-nums">
              {totalCompletedHoles}/{overallProgress.totalHoles}
            </div>
          </div>
          <div className="sm:border-l-2 sm:border-[#FDE68A]">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#92400E]">
              Best Strokes
            </div>
            <div className="font-display text-lg sm:text-xl font-bold text-[#3B1D0E] tabular-nums">
              {totalAccumulatedStrokes > 0 ? totalAccumulatedStrokes : '—'}
            </div>
          </div>
          <div className="sm:border-l-2 sm:border-[#FDE68A]">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#92400E]">
              Total Stars
            </div>
            <div className="font-display text-lg sm:text-xl font-bold text-[#B45309] tabular-nums">
              ★ {totalDisplayedStars}/{overallProgress.maxStars}
            </div>
          </div>
          <div className="sm:border-l-2 sm:border-[#FDE68A]">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#92400E]">
              Performance
            </div>
            <div className="font-display text-sm sm:text-base font-bold text-[#15803D] leading-tight mt-0.5">
              {performanceRank}
            </div>
            <div className="text-[10px] font-extrabold text-[#78350F] tabular-nums">
              {deltaText}
            </div>
          </div>
        </div>

        {/* Staggered Championship Star Rating */}
        <div
          className="mt-1 flex items-center justify-center gap-1.5"
          aria-label={`${displayStars} out of 3 championship stars`}
        >
          <StarSvg filled={displayStars >= 1} animClass="animate-star-pop-1" />
          <StarSvg filled={displayStars >= 2} animClass="animate-star-pop-2" />
          <StarSvg filled={displayStars >= 3} animClass="animate-star-pop-3" />
        </div>

        {/* Compact 24-Hole Two-Column Scorecard (Holes 1-12 & 13-24) */}
        <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
          {[firstHalf, secondHalf].map((group, groupIdx) => (
            <div
              key={groupIdx}
              className="overflow-hidden rounded-2xl border-[2.5px] border-[#522810] bg-[#FFFDF7]"
            >
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#F5E6C4] border-b-2 border-[#522810] text-[#522810]">
                    <th className="py-0.5 px-2 font-extrabold">Hole</th>
                    <th className="py-0.5 px-1.5 text-center font-extrabold">Par</th>
                    <th className="py-0.5 px-2 text-right font-extrabold">Best</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9D9B6]">
                  {group.map((lvl) => {
                    const idx = lvl.id - 1;
                    const s = mergedScores[idx] ?? 0;
                    const hDiff = s - lvl.par;
                    const toneClass =
                      s === 0
                        ? 'text-[#94A3B8]'
                        : hDiff < 0
                        ? 'text-[#15803D]'
                        : hDiff === 0
                        ? 'text-[#3B1D0E]'
                        : 'text-[#C2410C]';
                    const rowTint =
                      lvl.theme === 'clockwork'
                        ? 'bg-[#FEF3C7]/75'
                        : lvl.theme === 'candy'
                        ? 'bg-[#FDF2F8]/70'
                        : lvl.theme === 'frost'
                        ? 'bg-[#F0F9FF]/65'
                        : undefined;
                    return (
                      <tr key={lvl.id} className={rowTint}>
                        <td className="py-[2px] px-2 font-bold text-[#3B1D0E] truncate max-w-[175px]">
                          {lvl.id}. {lvl.name}
                        </td>
                        <td className="py-[2px] px-1.5 text-center font-semibold text-[#7C5332] tabular-nums">
                          {lvl.par}
                        </td>
                        <td className={`py-[2px] px-2 text-right font-extrabold tabular-nums ${toneClass}`}>
                          {s > 0 ? s : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {bestTotal !== null && (
          <p className="mt-1.5 text-xs font-bold text-[#8A4B20] tabular-nums">
            Personal Best (Full 24-Hole Tour): {bestTotal} Strokes
          </p>
        )}

        {/* Optional GitHub Scorecard Save / Connect Row */}
        <div className="mt-2 flex flex-col items-center gap-1.5">
          {githubUser ? (
            gistUrl ? (
              <a
                href={gistUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-extrabold text-[#15803D] hover:underline"
              >
                Saved to @{githubUser.login}&apos;s GitHub Gist — View Scorecard ↗
              </a>
            ) : (
              <button
                type="button"
                disabled={savingGist}
                onClick={handleSaveToGithub}
                className="min-h-[38px] inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#FFFDF5] bg-[#24292F] hover:bg-[#32383F] disabled:opacity-70 px-4 py-1.5 rounded-xl border-[2.5px] border-[#522810] shadow-[0_3px_0_#522810] cursor-pointer"
              >
                <span>
                  {savingGist
                    ? 'Saving to GitHub...'
                    : `Save Scorecard to GitHub (@${githubUser.login})`}
                </span>
              </button>
            )
          ) : (
            <button
              type="button"
              disabled={githubConnecting}
              onClick={() => {
                golfAudio.playButtonClick();
                onConnectGithub();
              }}
              className="min-h-[36px] inline-flex items-center gap-2 text-xs font-bold text-[#3B1D0E] bg-[#F5E6C4] hover:bg-[#EBD5A7] px-3.5 py-1.5 rounded-xl border-2 border-[#522810] cursor-pointer"
            >
              <span>
                {githubConnecting ? 'Connecting GitHub...' : 'Connect GitHub to Save Scorecard'}
              </span>
            </button>
          )}
          {(gistError || githubError) && (
            <div className="max-w-md rounded-xl border-2 border-[#522810] bg-[#FFF4D6] px-3 py-2 text-center">
              <p className="text-xs font-bold text-[#C2410C]">{gistError || githubError}</p>
              {githubCallbackUrlHint && !gistError && (
                <p className="mt-1 text-[11px] font-semibold text-[#6E3D1B] break-all">
                  Callback URL: <span className="font-mono">{githubCallbackUrlHint}</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* 3 Required Championship Buttons */}
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            data-start="true"
            data-testid="championship-world-select-btn"
            onClick={() => {
              golfAudio.playCardSelect();
              onSelectWorld();
            }}
            className="min-h-[46px] flex-1 font-display text-base sm:text-lg font-bold text-[#FFFDF5] bg-[#2FA752] hover:bg-[#269145] hover:-translate-y-0.5 active:translate-y-0.5 py-2.5 px-4 rounded-2xl border-[3px] border-[#522810] shadow-[0_4px_0_#522810] active:shadow-[0_1px_0_#522810] transition-transform cursor-pointer whitespace-nowrap"
          >
            World Selection
          </button>
          <button
            type="button"
            data-testid="championship-replay-any-btn"
            onClick={() => {
              golfAudio.playButtonClick();
              onReplayAnyHole();
            }}
            className="min-h-[46px] flex-1 font-display text-base sm:text-lg font-bold text-[#3B1D0E] bg-[#FDE047] hover:bg-[#FACC15] hover:-translate-y-0.5 active:translate-y-0.5 py-2.5 px-4 rounded-2xl border-[3px] border-[#522810] shadow-[0_4px_0_#522810] active:shadow-[0_1px_0_#522810] transition-transform cursor-pointer whitespace-nowrap"
          >
            Replay Any Unlocked Hole
          </button>
          <button
            type="button"
            data-testid="championship-main-menu-btn"
            onClick={() => {
              golfAudio.playButtonClick();
              onTitle();
            }}
            className="min-h-[46px] sm:flex-none font-display text-base sm:text-lg font-bold text-[#3B1D0E] bg-[#F5E6C4] hover:bg-[#EBD5A7] hover:-translate-y-0.5 active:translate-y-0.5 py-2.5 px-4 rounded-2xl border-[3px] border-[#522810] shadow-[0_4px_0_#522810] active:shadow-[0_1px_0_#522810] transition-transform cursor-pointer whitespace-nowrap"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}

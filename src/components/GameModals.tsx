import { useState } from 'react';
import type { GithubUser } from '../hooks/useGithubAuth';
import { golfAudio } from '../game/audio';
import { LEVELS } from '../game/levels';
import { formatParDelta, getScoreLabel } from '../game/physics';
import type { ScorecardEntry } from '../server/githubHelpers';

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
            onClick={() => {
              golfAudio.playCardSelect();
              onNextHole();
            }}
            className="min-h-[50px] w-full font-display text-xl font-bold text-[#FFFDF5] bg-[#2FA752] hover:bg-[#269145] hover:-translate-y-0.5 active:translate-y-0.5 py-3 px-6 rounded-2xl border-[3px] border-[#522810] shadow-[0_4px_0_#522810] active:shadow-[0_1px_0_#522810] transition-transform cursor-pointer whitespace-nowrap"
          >
            Next Hole
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
  lastHoleStrokes: number;
  lastHolePar: number;
  candyWorldEarnedStars: number;
  candyWorldMaxStars: number;
  bestTotal: number | null;
  githubUser: GithubUser | null;
  githubConnecting: boolean;
  githubError: string | null;
  githubCallbackUrlHint: string | null;
  onConnectGithub: () => void;
  onShareScorecard: (holes: ScorecardEntry[]) => Promise<string>;
  onPlayAgain: () => void;
  onSelectCourse: () => void;
  onTitle: () => void;
}

export function VictoryModal({
  holeStrokes,
  lastHoleStrokes,
  lastHolePar,
  candyWorldEarnedStars,
  candyWorldMaxStars,
  bestTotal,
  githubUser,
  githubConnecting,
  githubError,
  githubCallbackUrlHint,
  onConnectGithub,
  onShareScorecard,
  onPlayAgain,
  onSelectCourse,
  onTitle,
}: VictoryModalProps) {
  const [savingGist, setSavingGist] = useState(false);
  const [gistUrl, setGistUrl] = useState<string | null>(null);
  const [gistError, setGistError] = useState<string | null>(null);

  const totalPar = LEVELS.reduce((acc, lvl) => acc + lvl.par, 0);
  const playedCount = holeStrokes.filter((s) => s > 0).length;
  const totalStrokes = holeStrokes.reduce((acc, s) => acc + s, 0);
  const playedPar = LEVELS.reduce(
    (acc, lvl, idx) => acc + ((holeStrokes[idx] ?? 0) > 0 ? lvl.par : 0),
    0
  );
  const isFullRun = playedCount === LEVELS.length;
  const effectivePar = isFullRun ? totalPar : Math.max(1, playedPar);
  const effectiveStrokes = totalStrokes > 0 ? totalStrokes : Math.max(1, lastHoleStrokes);
  const deltaText = formatParDelta(effectiveStrokes, effectivePar);
  const diff = effectiveStrokes - effectivePar;
  const hole20Score = Math.max(1, holeStrokes[LEVELS.length - 1] || lastHoleStrokes || lastHolePar);
  const hole20Info = getScoreLabel(hole20Score, lastHolePar);
  const performanceLabel =
    diff <= -4
      ? 'Legendary Trick-Shot Master'
      : diff <= 0
      ? 'Candy Factory Champion'
      : diff <= 5
      ? 'Pro Club Finisher'
      : `${LEVELS.length}-Hole Challenger`;
  const displayStars: 1 | 2 | 3 = isFullRun
    ? diff <= 0
      ? 3
      : diff <= 6
      ? 2
      : 1
    : hole20Info.stars;

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
        strokes: holeStrokes[idx] ?? 0,
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
      className="fixed inset-0 z-30 flex items-center justify-center p-2.5 sm:p-4"
      style={{ backgroundColor: 'rgba(65, 16, 46, 0.72)' }}
    >
      <div className="animate-modal-pop w-full max-w-2xl max-h-[93dvh] overflow-y-auto touch-pan-y overscroll-contain bg-[#FFF8F2] border-[4px] border-[#6B1839] rounded-3xl p-4 sm:p-5 shadow-[0_10px_0_#6B1839] text-center">
        {/* Candy Factory Completed Colorful Celebration Header */}
        <div className="flex items-center justify-center gap-3">
          <div className="relative shrink-0">
            <svg viewBox="0 0 48 48" className="w-12 h-12 sm:w-13 sm:h-13" aria-hidden="true">
              <path
                d="M12 10 H36 V20 C36 27 30.5 32 24 32 C17.5 32 12 27 12 20 Z"
                fill="#EC4899"
                stroke="#6B1839"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path
                d="M12 13 H6 C6 20 9 23 13 23 M36 13 H42 C42 20 39 23 35 23"
                fill="none"
                stroke="#6B1839"
                strokeWidth="3"
                strokeLinecap="round"
              />
              {/* Sweet star emblem on cup */}
              <path
                d="M24 14 L26 19 L31 19.5 L27.2 22.8 L28.4 27.5 L24 24.8 L19.6 27.5 L20.8 22.8 L17 19.5 L22 19 Z"
                fill="#FDE047"
                stroke="#6B1839"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <rect x="20.5" y="32" width="7" height="7" fill="#FACC15" stroke="#522810" strokeWidth="2.5" />
              <rect x="14" y="38" width="20" height="5" rx="2" fill="#BA6B32" stroke="#522810" strokeWidth="2.5" />
            </svg>
            <SparkleAccent className="animate-sparkle w-4 h-4 absolute -top-1.5 -right-1.5" color="#FACC15" />
            <SparkleAccent className="animate-sparkle w-3.5 h-3.5 absolute -bottom-1 -left-1.5" color="#34D399" />
          </div>
          <div className="text-left">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#BE185D]">
              World 5 · {performanceLabel}
            </div>
            <h2
              id="victory-title"
              className="mt-0.5 font-display text-lg sm:text-2xl font-bold text-[#6B1839] leading-tight"
            >
              CANDY FACTORY COMPLETED!
            </h2>
          </div>
        </div>

        {/* Summary Stat Strip: Hole 20 / Run Strokes, Par, Stars */}
        <div className="mt-2.5 grid grid-cols-3 gap-2 rounded-2xl border-[3px] border-[#BE185D] bg-[#FDF2F8] px-3 py-2">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#9D174D]">
              {isFullRun ? 'Total Strokes' : 'Hole 20 Strokes'}
            </div>
            <div className="font-display text-2xl font-bold text-[#3B1D0E] tabular-nums">
              {isFullRun ? effectiveStrokes : hole20Score}
            </div>
          </div>
          <div className="border-x-2 border-[#FBCFE8]">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#9D174D]">
              {isFullRun ? 'Performance' : `Par ${lastHolePar}`}
            </div>
            <div className="font-display text-base sm:text-xl font-bold text-[#15803D] tabular-nums leading-tight mt-0.5">
              {isFullRun ? deltaText : hole20Info.title}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#9D174D]">
              World 5 Stars
            </div>
            <div className="font-display text-2xl font-bold text-[#B45309] tabular-nums">
              ★ {candyWorldEarnedStars}/{candyWorldMaxStars}
            </div>
          </div>
        </div>

        {/* Staggered Star Rating for Hole 20 / Run */}
        <div
          className="mt-1.5 flex items-center justify-center gap-1.5"
          aria-label={`${displayStars} out of 3 stars`}
        >
          <StarSvg filled={displayStars >= 1} animClass="animate-star-pop-1" />
          <StarSvg filled={displayStars >= 2} animClass="animate-star-pop-2" />
          <StarSvg filled={displayStars >= 3} animClass="animate-star-pop-3" />
        </div>

        {/* Compact 20-Hole Two-Column Scorecard (Holes 1-10 & 11-20) */}
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
          {[firstHalf, secondHalf].map((group, groupIdx) => (
            <div
              key={groupIdx}
              className="overflow-hidden rounded-2xl border-[3px] border-[#522810] bg-[#FFFDF7]"
            >
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F5E6C4] border-b-2 border-[#522810] text-[#522810]">
                    <th className="py-1 px-2.5 font-extrabold">Hole</th>
                    <th className="py-1 px-1.5 text-center font-extrabold">Par</th>
                    <th className="py-1 px-2.5 text-right font-extrabold">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9D9B6]">
                  {group.map((lvl) => {
                    const idx = lvl.id - 1;
                    const s = holeStrokes[idx] ?? 0;
                    const hDiff = s - lvl.par;
                    const toneClass =
                      s === 0
                        ? 'text-[#94A3B8]'
                        : hDiff < 0
                        ? 'text-[#15803D]'
                        : hDiff === 0
                        ? 'text-[#3B1D0E]'
                        : 'text-[#C2410C]';
                    const isCandyHole = lvl.theme === 'candy';
                    const isFrostHole = lvl.theme === 'frost';
                    return (
                      <tr
                        key={lvl.id}
                        className={
                          isCandyHole
                            ? 'bg-[#FDF2F8]/80'
                            : isFrostHole
                            ? 'bg-[#F0F9FF]/70'
                            : undefined
                        }
                      >
                        <td className="py-0.5 px-2.5 font-bold text-[#3B1D0E] truncate max-w-[175px]">
                          {lvl.id}. {lvl.name}
                        </td>
                        <td className="py-0.5 px-1.5 text-center font-semibold text-[#7C5332] tabular-nums">
                          {lvl.par}
                        </td>
                        <td className={`py-0.5 px-2.5 text-right font-extrabold tabular-nums ${toneClass}`}>
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
          <p className="mt-2 text-xs font-bold text-[#8A4B20] tabular-nums">
            Personal Best (Full Tour): {bestTotal} Strokes
          </p>
        )}

        {/* Optional GitHub Scorecard Save / Connect Row */}
        <div className="mt-2.5 flex flex-col items-center gap-1.5">
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
                className="min-h-[40px] inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#FFFDF5] bg-[#24292F] hover:bg-[#32383F] disabled:opacity-70 px-4 py-2 rounded-xl border-[2.5px] border-[#522810] shadow-[0_3px_0_#522810] cursor-pointer"
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
              className="min-h-[38px] inline-flex items-center gap-2 text-xs font-bold text-[#3B1D0E] bg-[#F5E6C4] hover:bg-[#EBD5A7] px-3.5 py-1.5 rounded-xl border-2 border-[#522810] cursor-pointer"
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

        <div className="mt-3 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            data-start="true"
            onClick={() => {
              golfAudio.playCardSelect();
              onPlayAgain();
            }}
            className="min-h-[48px] flex-1 font-display text-xl font-bold text-[#FFFDF5] bg-[#FF595E] hover:bg-[#FF4248] hover:-translate-y-0.5 active:translate-y-0.5 py-2.5 px-5 rounded-2xl border-[3px] border-[#522810] shadow-[0_4px_0_#522810] active:shadow-[0_1px_0_#522810] transition-transform cursor-pointer whitespace-nowrap"
          >
            Replay Course
          </button>
          <button
            type="button"
            onClick={() => {
              golfAudio.playButtonClick();
              onSelectCourse();
            }}
            className="min-h-[48px] flex-1 sm:flex-none font-display text-lg font-bold text-[#3B1D0E] bg-[#FFF2CC] hover:bg-[#FCE6A6] hover:-translate-y-0.5 active:translate-y-0.5 py-2.5 px-5 rounded-2xl border-[3px] border-[#522810] shadow-[0_4px_0_#522810] active:shadow-[0_1px_0_#522810] transition-transform cursor-pointer whitespace-nowrap"
          >
            Select World
          </button>
          <button
            type="button"
            onClick={() => {
              golfAudio.playButtonClick();
              onTitle();
            }}
            className="min-h-[48px] flex-1 sm:flex-none font-display text-lg font-bold text-[#3B1D0E] bg-[#F5E6C4] hover:bg-[#EBD5A7] hover:-translate-y-0.5 active:translate-y-0.5 py-2.5 px-5 rounded-2xl border-[3px] border-[#522810] shadow-[0_4px_0_#522810] active:shadow-[0_1px_0_#522810] transition-transform cursor-pointer whitespace-nowrap"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}

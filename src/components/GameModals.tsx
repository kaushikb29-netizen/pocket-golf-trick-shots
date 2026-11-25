import { useState } from 'react';
import type { GithubUser } from '../hooks/useGithubAuth';
import { LEVELS } from '../game/levels';
import { formatParDelta, getScoreLabel } from '../game/physics';
import type { ScorecardEntry } from '../server/githubHelpers';

interface PauseModalProps {
  levelNumber: number;
  levelName: string;
  onResume: () => void;
  onRestart: () => void;
  onTitle: () => void;
}

export function PauseModal({
  levelNumber,
  levelName,
  onResume,
  onRestart,
  onTitle,
}: PauseModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(11, 52, 64, 0.62)' }}
    >
      <div className="w-full max-w-sm bg-[#FFF8E7] border-[4px] border-[#522810] rounded-3xl p-6 shadow-[0_10px_0_#522810] text-center">
        <p className="text-xs font-extrabold uppercase tracking-wider text-[#8A4B20]">
          Hole {levelNumber} · {levelName}
        </p>
        <h2 id="pause-title" className="mt-1 font-display text-3xl font-bold text-[#3B1D0E]">
          Paused
        </h2>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={onResume}
            className="w-full font-display text-xl font-bold text-[#FFFDF5] bg-[#2FA752] hover:bg-[#269145] active:translate-y-0.5 py-3 px-6 rounded-2xl border-[3px] border-[#522810] shadow-[0_4px_0_#522810] cursor-pointer whitespace-nowrap"
          >
            Resume
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full font-display text-lg font-bold text-[#3B1D0E] bg-[#FDE047] hover:bg-[#FACC15] active:translate-y-0.5 py-2.5 px-6 rounded-2xl border-[3px] border-[#522810] shadow-[0_4px_0_#522810] cursor-pointer whitespace-nowrap"
          >
            Restart Hole
          </button>
          <button
            type="button"
            onClick={onTitle}
            className="w-full font-display text-lg font-bold text-[#3B1D0E] bg-[#F5E6C4] hover:bg-[#EBD5A7] active:translate-y-0.5 py-2.5 px-6 rounded-2xl border-[3px] border-[#522810] shadow-[0_4px_0_#522810] cursor-pointer whitespace-nowrap"
          >
            Title Screen
          </button>
        </div>
      </div>
    </div>
  );
}

interface LevelClearModalProps {
  levelNumber: number;
  levelName: string;
  strokes: number;
  par: number;
  onNextHole: () => void;
  onReplayHole: () => void;
}

function StarSvg({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className="w-9 h-9" aria-hidden="true">
      <path
        d="M16 3 L19.9 11.1 L28.8 12.2 L22.2 18.4 L23.9 27.2 L16 22.9 L8.1 27.2 L9.8 18.4 L3.2 12.2 L12.1 11.1 Z"
        fill={filled ? '#FACC15' : '#E2D4B7'}
        stroke="#522810"
        strokeWidth="2.4"
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
  onNextHole,
  onReplayHole,
}: LevelClearModalProps) {
  const info = getScoreLabel(strokes, par);
  const bannerColor =
    info.tone === 'gold'
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
      style={{ backgroundColor: 'rgba(11, 52, 64, 0.58)' }}
    >
      <div className="w-full max-w-sm bg-[#FFF8E7] border-[4px] border-[#522810] rounded-3xl p-6 shadow-[0_10px_0_#522810] text-center">
        <p className="text-xs font-extrabold uppercase tracking-wider text-[#8A4B20]">
          Hole {levelNumber} Cleared · {levelName}
        </p>

        <div
          className="mt-3 inline-block px-5 py-1.5 rounded-2xl border-[3px] border-[#522810]"
          style={{ backgroundColor: bannerColor }}
        >
          <h2
            id="level-clear-title"
            className="font-display text-2xl sm:text-3xl font-bold text-[#FFFDF5] tracking-wide"
          >
            {info.title}
          </h2>
        </div>

        <p className="mt-2 text-sm font-bold text-[#6E3D1B]">{info.detail}</p>

        {/* Stars */}
        <div
          className="mt-3 flex items-center justify-center gap-2"
          aria-label={`${info.stars} out of 3 stars`}
        >
          <StarSvg filled={info.stars >= 1} />
          <StarSvg filled={info.stars >= 2} />
          <StarSvg filled={info.stars >= 3} />
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
            onClick={onNextHole}
            className="w-full font-display text-xl font-bold text-[#FFFDF5] bg-[#2FA752] hover:bg-[#269145] active:translate-y-0.5 py-3 px-6 rounded-2xl border-[3px] border-[#522810] shadow-[0_4px_0_#522810] cursor-pointer whitespace-nowrap"
          >
            Next Hole
          </button>
          <button
            type="button"
            onClick={onReplayHole}
            className="w-full font-display text-base font-bold text-[#3B1D0E] bg-[#F5E6C4] hover:bg-[#EBD5A7] active:translate-y-0.5 py-2.5 px-6 rounded-2xl border-[3px] border-[#522810] shadow-[0_4px_0_#522810] cursor-pointer whitespace-nowrap"
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
  bestTotal: number | null;
  githubUser: GithubUser | null;
  githubConnecting: boolean;
  githubError: string | null;
  githubCallbackUrlHint: string | null;
  onConnectGithub: () => void;
  onShareScorecard: (holes: ScorecardEntry[]) => Promise<string>;
  onPlayAgain: () => void;
  onTitle: () => void;
}

export function VictoryModal({
  holeStrokes,
  bestTotal,
  githubUser,
  githubConnecting,
  githubError,
  githubCallbackUrlHint,
  onConnectGithub,
  onShareScorecard,
  onPlayAgain,
  onTitle,
}: VictoryModalProps) {
  const [savingGist, setSavingGist] = useState(false);
  const [gistUrl, setGistUrl] = useState<string | null>(null);
  const [gistError, setGistError] = useState<string | null>(null);

  const totalPar = LEVELS.reduce((acc, lvl) => acc + lvl.par, 0);
  const totalStrokes = holeStrokes.reduce((acc, s) => acc + s, 0);
  const deltaText = formatParDelta(totalStrokes, totalPar);
  const diff = totalStrokes - totalPar;
  const performanceLabel =
    diff <= -4
      ? 'Legendary Trick-Shot Master'
      : diff <= 0
      ? 'Tour Champion'
      : diff <= 5
      ? 'Pro Club Finisher'
      : '12-Hole Challenger';
  const overallStars: 1 | 2 | 3 = diff <= 0 ? 3 : diff <= 6 ? 2 : 1;

  const firstHalf = LEVELS.slice(0, Math.ceil(LEVELS.length / 2));
  const secondHalf = LEVELS.slice(Math.ceil(LEVELS.length / 2));

  const handleSaveToGithub = async () => {
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
      className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-4"
      style={{ backgroundColor: 'rgba(11, 52, 64, 0.72)' }}
    >
      <div className="w-full max-w-2xl max-h-[94vh] overflow-y-auto bg-[#FFF8E7] border-[4px] border-[#522810] rounded-3xl p-4 sm:p-6 shadow-[0_10px_0_#522810] text-center">
        {/* Champion Trophy + Stars Header */}
        <div className="flex items-center justify-center gap-3">
          <svg viewBox="0 0 48 48" className="w-11 h-11 sm:w-12 sm:h-12 shrink-0" aria-hidden="true">
            <path
              d="M12 10 H36 V20 C36 27 30.5 32 24 32 C17.5 32 12 27 12 20 Z"
              fill="#FACC15"
              stroke="#522810"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path
              d="M12 13 H6 C6 20 9 23 13 23 M36 13 H42 C42 20 39 23 35 23"
              fill="none"
              stroke="#522810"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <rect x="20.5" y="32" width="7" height="7" fill="#F59E0B" stroke="#522810" strokeWidth="2.5" />
            <rect x="14" y="38" width="20" height="5" rx="2" fill="#BA6B32" stroke="#522810" strokeWidth="2.5" />
          </svg>
          <div className="text-left">
            <div className="inline-block px-2.5 py-0.5 rounded-full bg-[#FACC15] border-2 border-[#522810] text-[11px] font-extrabold uppercase tracking-wider text-[#3B1D0E]">
              {performanceLabel}
            </div>
            <h2
              id="victory-title"
              className="mt-1 font-display text-xl sm:text-2xl font-bold text-[#3B1D0E] leading-tight"
            >
              CHAMPION — ALL {LEVELS.length} HOLES CLEARED!
            </h2>
          </div>
        </div>

        {/* Summary Stat Strip: Total Strokes, Total Par, Performance & Stars */}
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl border-[3px] border-[#522810] bg-[#FFF4D6] px-3 py-2.5">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#8A4B20]">
              Total Strokes
            </div>
            <div className="font-display text-2xl font-bold text-[#3B1D0E] tabular-nums">
              {totalStrokes}
            </div>
          </div>
          <div className="border-x-2 border-[#E6D3AB]">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#8A4B20]">
              Total Par
            </div>
            <div className="font-display text-2xl font-bold text-[#247A3C] tabular-nums">
              {totalPar}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#8A4B20]">
              Performance
            </div>
            <div className="font-display text-lg sm:text-xl font-bold text-[#B45309] tabular-nums leading-tight mt-0.5">
              {deltaText}
            </div>
          </div>
        </div>

        {/* Overall Star Rating */}
        <div
          className="mt-2.5 flex items-center justify-center gap-1.5"
          aria-label={`${overallStars} out of 3 stars`}
        >
          <StarSvg filled={overallStars >= 1} />
          <StarSvg filled={overallStars >= 2} />
          <StarSvg filled={overallStars >= 3} />
        </div>

        {/* Compact 12-Hole Two-Column Scorecard */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
          {[firstHalf, secondHalf].map((group, groupIdx) => (
            <div
              key={groupIdx}
              className="overflow-hidden rounded-2xl border-[3px] border-[#522810] bg-[#FFFDF7]"
            >
              <table className="w-full border-collapse text-xs sm:text-sm">
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
                      hDiff < 0
                        ? 'text-[#15803D]'
                        : hDiff === 0
                        ? 'text-[#3B1D0E]'
                        : 'text-[#C2410C]';
                    return (
                      <tr key={lvl.id}>
                        <td className="py-1 px-2.5 font-bold text-[#3B1D0E] truncate max-w-[165px]">
                          {lvl.id}. {lvl.name}
                        </td>
                        <td className="py-1 px-1.5 text-center font-semibold text-[#7C5332] tabular-nums">
                          {lvl.par}
                        </td>
                        <td className={`py-1 px-2.5 text-right font-extrabold tabular-nums ${toneClass}`}>
                          {s}
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
          <p className="mt-2.5 text-xs font-bold text-[#8A4B20] tabular-nums">
            Personal Best: {bestTotal} Strokes
          </p>
        )}

        {/* GitHub Scorecard Save / Connect Row */}
        <div className="mt-3 flex flex-col items-center gap-1.5">
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
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#FFFDF5] bg-[#24292F] hover:bg-[#32383F] disabled:opacity-70 px-4 py-2 rounded-xl border-[2.5px] border-[#522810] shadow-[0_3px_0_#522810] cursor-pointer"
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
              onClick={onConnectGithub}
              className="inline-flex items-center gap-2 text-xs font-bold text-[#3B1D0E] bg-[#F5E6C4] hover:bg-[#EBD5A7] px-3.5 py-1.5 rounded-xl border-2 border-[#522810] cursor-pointer"
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

        <div className="mt-3.5 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            data-start="true"
            onClick={onPlayAgain}
            className="flex-1 font-display text-xl font-bold text-[#FFFDF5] bg-[#FF595E] hover:bg-[#FF4248] active:translate-y-0.5 py-2.5 px-6 rounded-2xl border-[3px] border-[#522810] shadow-[0_4px_0_#522810] cursor-pointer whitespace-nowrap"
          >
            Replay Course
          </button>
          <button
            type="button"
            onClick={onTitle}
            className="flex-1 sm:flex-none font-display text-lg font-bold text-[#3B1D0E] bg-[#F5E6C4] hover:bg-[#EBD5A7] active:translate-y-0.5 py-2.5 px-6 rounded-2xl border-[3px] border-[#522810] shadow-[0_4px_0_#522810] cursor-pointer whitespace-nowrap"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}

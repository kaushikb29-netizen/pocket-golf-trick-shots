import { golfAudio } from '../game/audio';
import { getWorldForLevelId } from '../game/progression';
import { LevelDefinition } from '../game/types';

interface GameHudProps {
  level: LevelDefinition;
  levelNumber: number;
  totalLevels: number;
  strokes: number;
  maxStrokes: number;
  muted: boolean;
  showFirstShotHint: boolean;
  onRestart: () => void;
  onToggleMute: () => void;
  onPause: () => void;
}

export function GameHud({
  level,
  levelNumber,
  totalLevels,
  strokes,
  maxStrokes,
  muted,
  showFirstShotHint,
  onRestart,
  onToggleMute,
  onPause,
}: GameHudProps) {
  const world = getWorldForLevelId(level.id);
  const remaining = Math.max(0, maxStrokes - strokes);
  const isFinalShot = remaining === 1;
  const isExhausted = remaining === 0;

  const worldLabelColor =
    level.theme === 'candy'
      ? 'text-[#BE185D]'
      : level.theme === 'frost'
      ? 'text-[#0369A1]'
      : level.theme === 'neon'
      ? 'text-[#7E22CE]'
      : level.theme === 'beach'
      ? 'text-[#0E7490]'
      : 'text-[#247A3C]';

  const strokesCardClass = isExhausted
    ? 'bg-[#FEE2E2] border-[#B91C1C] shadow-[0_4px_0_#991B1B]'
    : isFinalShot
    ? 'bg-[#FFEDD5] border-[#C2410C] shadow-[0_4px_0_#9A3412]'
    : 'bg-[#FFF6DF] border-[#522810] shadow-[0_4px_0_#522810]';

  const remainingTextClass = isExhausted
    ? 'text-[#B91C1C]'
    : isFinalShot
    ? 'text-[#C2410C]'
    : 'text-[#247A3C]';

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-2 sm:p-4">
      {/* Top Perimeter Clusters: Wooden Arcade Plaques */}
      <div className="flex items-start justify-between gap-1.5 sm:gap-4 w-full">
        {/* Top-Left: Hole Info Plaque */}
        <div
          className="pointer-events-auto flex items-center gap-2 sm:gap-3 bg-[#FFF6DF] border-[3px] border-[#522810] rounded-xl sm:rounded-2xl px-2.5 py-1.5 sm:px-4 sm:py-2 shadow-[0_4px_0_#522810] min-w-0 max-w-[44vw] sm:max-w-none"
          aria-label={`Hole ${levelNumber} of ${totalLevels}, ${level.name}, Par ${level.par}`}
        >
          {/* Code-authored flag SVG icon */}
          <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" aria-hidden="true">
            <line x1="6" y1="21" x2="6" y2="4" stroke="#522810" strokeWidth="2.6" strokeLinecap="round" />
            <path
              d="M7 4.5 L20 9 L7 13.5 Z"
              fill={
                level.theme === 'candy'
                  ? '#EC4899'
                  : level.theme === 'neon'
                  ? '#F43F8E'
                  : '#FF4D4F'
              }
              stroke="#522810"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <ellipse
              cx="6"
              cy="21"
              rx="4"
              ry="1.8"
              fill={
                level.theme === 'candy'
                  ? '#34D399'
                  : level.theme === 'frost'
                  ? '#38BDF8'
                  : '#2FA752'
              }
              stroke="#522810"
              strokeWidth="1.5"
            />
          </svg>
          <div className="leading-tight min-w-0">
            <div className="flex items-baseline gap-1.5 sm:gap-2">
              <span className="font-display text-sm sm:text-lg font-bold text-[#3B1D0E] whitespace-nowrap">
                Hole {levelNumber}/{totalLevels}
              </span>
              <span className="hidden sm:inline text-xs font-bold text-[#8A4B20] whitespace-nowrap">
                · {level.name}
              </span>
            </div>
            <div className={`text-[11px] sm:text-xs font-bold tabular-nums whitespace-nowrap ${worldLabelColor}`}>
              <span className="hidden sm:inline">{world.name} · </span>Par {level.par}
            </div>
          </div>
        </div>

        {/* Top-Right: Strokes Used / Max / Remaining + Square Icon Buttons */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Prominent Stroke Limit & Remaining Indicator */}
          <div
            data-testid="strokes-counter"
            data-remaining={String(remaining)}
            aria-label={`Strokes ${strokes} of ${maxStrokes}, ${remaining} remaining`}
            className={`min-h-[44px] flex items-center gap-2 sm:gap-2.5 border-[3px] rounded-xl sm:rounded-2xl px-2.5 sm:px-3.5 py-1 transition-colors duration-200 ${strokesCardClass}`}
          >
            <div className="leading-tight text-right">
              <div className="flex items-baseline justify-end gap-1">
                <span className="hidden sm:inline text-[10px] font-extrabold uppercase tracking-wider text-[#8A4B20]">
                  Strokes
                </span>
                <span className="font-display text-lg sm:text-[22px] font-bold leading-none text-[#3B1D0E] tabular-nums">
                  {strokes}
                  <span className="text-xs sm:text-sm font-bold text-[#8A4B20]">/{maxStrokes}</span>
                </span>
              </div>
              <div
                data-testid="remaining-strokes"
                className={`text-[10px] sm:text-[11px] font-extrabold leading-tight tabular-nums whitespace-nowrap ${remainingTextClass}`}
              >
                {isExhausted
                  ? '0 left'
                  : isFinalShot
                  ? '1 left · Last Shot!'
                  : `${remaining} left`}
              </div>
            </div>
          </div>

          {/* Restart Button [R] */}
          <button
            type="button"
            tabIndex={-1}
            aria-label="Restart Hole"
            title="Restart Hole (R)"
            onClick={(e) => {
              e.currentTarget.blur();
              golfAudio.playButtonClick();
              onRestart();
            }}
            className="w-11 h-11 flex items-center justify-center bg-[#FDE047] hover:bg-[#FACC15] hover:-translate-y-0.5 active:translate-y-0.5 border-[3px] border-[#522810] rounded-xl shadow-[0_4px_0_#522810] active:shadow-[0_1px_0_#522810] transition-transform cursor-pointer focus-visible:outline-4 focus-visible:outline-white"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
              <path
                d="M4.5 12a7.5 7.5 0 1 1 2.2 5.3"
                fill="none"
                stroke="#3B1D0E"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              <path
                d="M4.5 7.5V12.5H9.5"
                fill="none"
                stroke="#3B1D0E"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Mute Toggle [M] */}
          <button
            type="button"
            tabIndex={-1}
            aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
            title={muted ? 'Unmute (M)' : 'Mute (M)'}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="w-11 h-11 flex items-center justify-center bg-[#FFF6DF] hover:bg-[#FDECC8] hover:-translate-y-0.5 active:translate-y-0.5 border-[3px] border-[#522810] rounded-xl shadow-[0_4px_0_#522810] active:shadow-[0_1px_0_#522810] transition-transform cursor-pointer focus-visible:outline-4 focus-visible:outline-white"
          >
            {muted ? (
              <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                <path
                  d="M4 9.5h4l5-4v13l-5-4H4z"
                  fill="#94A3B8"
                  stroke="#3B1D0E"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
                <path
                  d="M16.5 9.5l4 5m0-5l-4 5"
                  stroke="#DC2626"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                <path
                  d="M4 9.5h4l5-4v13l-5-4H4z"
                  fill="#38B85C"
                  stroke="#3B1D0E"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
                <path
                  d="M16.5 8.5a4.5 4.5 0 0 1 0 7m2.8-9.5a8 8 0 0 1 0 12"
                  fill="none"
                  stroke="#3B1D0E"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>

          {/* Pause Button [P] */}
          <button
            type="button"
            tabIndex={-1}
            aria-label="Pause Game"
            title="Pause (P)"
            onClick={(e) => {
              e.currentTarget.blur();
              golfAudio.playButtonClick();
              onPause();
            }}
            className="w-11 h-11 flex items-center justify-center bg-[#FFF6DF] hover:bg-[#FDECC8] hover:-translate-y-0.5 active:translate-y-0.5 border-[3px] border-[#522810] rounded-xl shadow-[0_4px_0_#522810] active:shadow-[0_1px_0_#522810] transition-transform cursor-pointer focus-visible:outline-4 focus-visible:outline-white"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
              <rect x="6" y="5" width="4.5" height="14" rx="1.5" fill="#3B1D0E" />
              <rect x="13.5" y="5" width="4.5" height="14" rx="1.5" fill="#3B1D0E" />
            </svg>
          </button>
        </div>
      </div>

      {/* Bottom Safe-Margin Contextual Tip (only before first shot on Hole 1) */}
      <div className="flex justify-center pb-1">
        {showFirstShotHint && (
          <p className="text-xs sm:text-sm font-bold text-[#FFFDF5] drop-shadow-[0_2px_3px_rgba(12,48,58,0.85)] text-center px-3">
            Drag back from the ball to aim · Release to shoot
          </p>
        )}
      </div>
    </div>
  );
}

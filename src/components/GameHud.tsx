import { LevelDefinition } from '../game/types';

interface GameHudProps {
  level: LevelDefinition;
  levelNumber: number;
  totalLevels: number;
  strokes: number;
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
  muted,
  showFirstShotHint,
  onRestart,
  onToggleMute,
  onPause,
}: GameHudProps) {
  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-2.5 sm:p-4">
      {/* Top Perimeter Clusters: Wooden Arcade Plaques */}
      <div className="flex items-start justify-between gap-1.5 sm:gap-4 w-full">
        {/* Top-Left: Hole Info Plaque */}
        <div
          className="pointer-events-auto flex items-center gap-2 sm:gap-3 bg-[#FFF6DF] border-[3px] border-[#522810] rounded-xl sm:rounded-2xl px-2.5 py-1.5 sm:px-4 sm:py-2 shadow-[0_4px_0_#522810] shrink-0"
          aria-label={`Hole ${levelNumber} of ${totalLevels}, ${level.name}, Par ${level.par}`}
        >
          {/* Code-authored flag SVG icon */}
          <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" aria-hidden="true">
            <line x1="6" y1="21" x2="6" y2="4" stroke="#522810" strokeWidth="2.6" strokeLinecap="round" />
            <path
              d="M7 4.5 L20 9 L7 13.5 Z"
              fill="#FF4D4F"
              stroke="#522810"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <ellipse cx="6" cy="21" rx="4" ry="1.8" fill="#2FA752" stroke="#522810" strokeWidth="1.5" />
          </svg>
          <div className="leading-tight">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-sm sm:text-lg font-bold text-[#3B1D0E] whitespace-nowrap">
                Hole {levelNumber}/{totalLevels}
              </span>
              <span className="hidden sm:inline text-xs font-bold text-[#8A4B20] whitespace-nowrap">
                · {level.name}
              </span>
            </div>
            <div className="text-[11px] sm:text-xs font-bold text-[#247A3C] tabular-nums whitespace-nowrap">
              Par {level.par}
            </div>
          </div>
        </div>

        {/* Top-Right: Strokes Readout + Utility Square Icon Buttons */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Prominent Strokes Counter */}
          <div
            data-testid="strokes-counter"
            aria-label={`Strokes ${strokes}`}
            className="flex items-center gap-1.5 sm:gap-2 bg-[#FFF6DF] border-[3px] border-[#522810] rounded-xl sm:rounded-2xl px-2.5 py-1.5 sm:px-4 sm:py-1.5 shadow-[0_4px_0_#522810]"
          >
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[#8A4B20]">
              Strokes
            </span>
            <span className="font-display text-xl sm:text-[26px] font-bold leading-none text-[#3B1D0E] tabular-nums min-w-[1.2ch] text-center">
              {strokes}
            </span>
          </div>

          {/* Restart Button [R] */}
          <button
            type="button"
            tabIndex={-1}
            aria-label="Restart Hole"
            title="Restart Hole (R)"
            onClick={(e) => {
              e.currentTarget.blur();
              onRestart();
            }}
            className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center bg-[#FDE047] hover:bg-[#FACC15] active:translate-y-0.5 border-[3px] border-[#522810] rounded-xl shadow-[0_4px_0_#522810] active:shadow-[0_1px_0_#522810] transition-transform cursor-pointer focus-visible:outline-4 focus-visible:outline-white"
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
            className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center bg-[#FFF6DF] hover:bg-[#FDECC8] active:translate-y-0.5 border-[3px] border-[#522810] rounded-xl shadow-[0_4px_0_#522810] active:shadow-[0_1px_0_#522810] transition-transform cursor-pointer focus-visible:outline-4 focus-visible:outline-white"
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
              onPause();
            }}
            className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center bg-[#FFF6DF] hover:bg-[#FDECC8] active:translate-y-0.5 border-[3px] border-[#522810] rounded-xl shadow-[0_4px_0_#522810] active:shadow-[0_1px_0_#522810] transition-transform cursor-pointer focus-visible:outline-4 focus-visible:outline-white"
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
          <p className="text-xs sm:text-sm font-bold text-[#FFFDF5] drop-shadow-[0_2px_3px_rgba(12,48,58,0.85)] text-center">
            Drag back from the ball to aim · Release to shoot
          </p>
        )}
      </div>
    </div>
  );
}

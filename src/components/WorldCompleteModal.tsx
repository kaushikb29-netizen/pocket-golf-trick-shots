import { golfAudio } from '../game/audio';
import { formatParDelta } from '../game/physics';
import { WorldCompletionSummary } from '../game/progression';
import { WorldIllustration } from './CourseSelectModal';

const CONFETTI_PIECES = [
  { left: '5%', delay: '0s', duration: '2.5s', color: '#FF595E', w: 9, h: 14 },
  { left: '12%', delay: '0.35s', duration: '2.8s', color: '#FACC15', w: 10, h: 10 },
  { left: '19%', delay: '0.12s', duration: '2.4s', color: '#22C55E', w: 8, h: 15 },
  { left: '26%', delay: '0.55s', duration: '2.9s', color: '#38BDF8', w: 10, h: 12 },
  { left: '34%', delay: '0.2s', duration: '2.6s', color: '#EC4899', w: 9, h: 14 },
  { left: '42%', delay: '0.7s', duration: '2.7s', color: '#F59E0B', w: 11, h: 9 },
  { left: '50%', delay: '0.08s', duration: '2.5s', color: '#A855F7', w: 8, h: 14 },
  { left: '58%', delay: '0.45s', duration: '2.8s', color: '#2FA752', w: 10, h: 11 },
  { left: '66%', delay: '0.18s', duration: '2.45s', color: '#FF595E', w: 9, h: 13 },
  { left: '74%', delay: '0.62s', duration: '2.9s', color: '#FACC15', w: 10, h: 10 },
  { left: '82%', delay: '0.28s', duration: '2.55s', color: '#38BDF8', w: 8, h: 14 },
  { left: '89%', delay: '0.5s', duration: '2.75s', color: '#EC4899', w: 10, h: 12 },
  { left: '95%', delay: '0.15s', duration: '2.6s', color: '#F97316', w: 9, h: 13 },
  { left: '16%', delay: '1.15s', duration: '2.7s', color: '#A855F7', w: 9, h: 12 },
  { left: '46%', delay: '1.35s', duration: '2.85s', color: '#38BDF8', w: 8, h: 14 },
  { left: '78%', delay: '1.05s', duration: '2.65s', color: '#22C55E', w: 10, h: 11 },
];

export function ConfettiOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      aria-hidden="true"
    >
      {CONFETTI_PIECES.map((piece, idx) => (
        <span
          key={idx}
          className="animate-confetti absolute -top-6 rounded-xs border border-[#522810]/35"
          style={{
            left: piece.left,
            width: `${piece.w}px`,
            height: `${piece.h}px`,
            backgroundColor: piece.color,
            animationDelay: piece.delay,
            animationDuration: piece.duration,
          }}
        />
      ))}
    </div>
  );
}

function CelebrationStar({ filled, animClass }: { filled: boolean; animClass: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={`w-9 h-9 sm:w-10 sm:h-10 ${filled ? animClass : ''}`}
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
          opacity="0.72"
        />
      )}
    </svg>
  );
}

function SparkleIcon({ className, color }: { className?: string; color: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`w-4 h-4 ${className ?? ''}`} aria-hidden="true">
      <path
        d="M12 2 Q12 12 22 12 Q12 12 12 22 Q12 12 2 12 Q12 12 12 2 Z"
        fill={color}
        stroke="#522810"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WorldTrophy({ accentHex }: { accentHex: string }) {
  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <svg viewBox="0 0 64 64" className="w-16 h-16 sm:w-[70px] sm:h-[70px]" aria-hidden="true">
        {/* Cup body */}
        <path
          d="M16 12 H48 V26 C48 35.5 41 42 32 42 C23 42 16 35.5 16 26 Z"
          fill="#FACC15"
          stroke="#522810"
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        {/* Gloss highlight */}
        <path
          d="M21 16 V25 C21 30.2 23.8 34.4 27.6 36.4"
          fill="none"
          stroke="#FFFBEB"
          strokeWidth="2.8"
          strokeLinecap="round"
          opacity="0.75"
        />
        {/* Handles */}
        <path
          d="M16 16 H9 C9 25 12.2 29.5 17 29.5 M48 16 H55 C55 25 51.8 29.5 47 29.5"
          fill="none"
          stroke="#522810"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        {/* World-themed gem emblem */}
        <circle cx="32" cy="25" r="7.5" fill={accentHex} stroke="#522810" strokeWidth="2.2" />
        <path
          d="M32 20.4 L33.5 23.6 L37 24 L34.4 26.4 L35.1 29.8 L32 28 L28.9 29.8 L29.6 26.4 L27 24 L30.5 23.6 Z"
          fill="#FFFBEB"
        />
        {/* Stem & wooden pedestal */}
        <rect x="27.5" y="42" width="9" height="8" fill="#F59E0B" stroke="#522810" strokeWidth="2.8" />
        <rect x="18" y="50" width="28" height="8" rx="3" fill="#92400E" stroke="#522810" strokeWidth="2.8" />
      </svg>
      <SparkleIcon className="animate-sparkle absolute -top-1 -right-1" color="#FACC15" />
      <SparkleIcon className="animate-sparkle absolute top-3 -left-2" color={accentHex} />
      <SparkleIcon className="animate-sparkle absolute bottom-1 -right-2" color="#38BDF8" />
    </div>
  );
}

interface WorldCompleteModalProps {
  summary: WorldCompletionSummary;
  isNewlyUnlocked: boolean;
  canContinueToNextWorld: boolean;
  onContinueNextWorld: () => void;
  onWorldSelection: () => void;
}

export function WorldCompleteModal({
  summary,
  isNewlyUnlocked,
  canContinueToNextWorld,
  onContinueNextWorld,
  onWorldSelection,
}: WorldCompleteModalProps) {
  const { world, totalStrokes, totalPar, earnedStars, maxStars, nextWorld, isNextWorldPlayable } =
    summary;

  const starRatio = maxStars > 0 ? earnedStars / maxStars : 0;
  const trophyStars = starRatio >= 0.85 ? 3 : starRatio >= 0.5 ? 2 : 1;
  const deltaText =
    totalStrokes > 0 ? formatParDelta(totalStrokes, totalPar) : `Par ${totalPar}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="world-complete-title"
      data-testid="world-complete-modal"
      className="fixed inset-0 z-30 flex items-center justify-center p-2.5 sm:p-4"
      style={{ backgroundColor: 'rgba(11, 44, 58, 0.78)' }}
    >
      <ConfettiOverlay />

      <div
        className="relative z-10 animate-modal-pop w-full max-w-lg max-h-[94dvh] overflow-y-auto touch-pan-y overscroll-contain rounded-3xl border-[4px] border-[#522810] p-4 sm:p-5 shadow-[0_12px_0_#522810] text-center"
        style={{ backgroundColor: '#FFF8E7' }}
      >
        {/* World Completion Banner & Trophy */}
        <div
          className="rounded-2xl border-[3px] border-[#522810] px-4 py-3.5 shadow-[0_4px_0_rgba(82,40,16,0.18)]"
          style={{ backgroundColor: world.surfaceHex }}
        >
          <div className="flex items-center justify-center gap-3.5">
            <WorldTrophy accentHex={world.accentHex} />
            <div className="text-left min-w-0">
              <span
                className="inline-block px-2.5 py-0.5 rounded-lg border-2 border-[#522810] font-display text-[11px] font-bold uppercase tracking-wider shadow-[0_2px_0_#522810]"
                style={{
                  backgroundColor: world.badgeBgHex,
                  color: world.badgeTextHex,
                }}
              >
                World {world.worldNumber} Complete!
              </span>
              <h2
                id="world-complete-title"
                className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#3B1D0E] leading-tight"
              >
                {world.name}
              </h2>
              <p className="text-xs font-bold text-[#6E4726] tabular-nums">
                Holes {world.holeIds[0]}–{world.holeIds[3]} · {deltaText}
              </p>
            </div>
          </div>

          {/* Animated 3-Star Celebration Row */}
          <div
            className="mt-2.5 flex items-center justify-center gap-2"
            aria-label={`${earnedStars} out of ${maxStars} world stars earned`}
          >
            <CelebrationStar filled={trophyStars >= 1} animClass="animate-star-pop-1" />
            <CelebrationStar filled={trophyStars >= 2} animClass="animate-star-pop-2" />
            <CelebrationStar filled={trophyStars >= 3} animClass="animate-star-pop-3" />
          </div>
        </div>

        {/* World Stats Strip: Total Strokes, Total Par, World Stars */}
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl border-[3px] border-[#522810] bg-[#FFFDF7] px-2.5 py-2.5">
          <div>
            <div className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[#8A4B20]">
              Total Strokes
            </div>
            <div className="font-display text-2xl sm:text-3xl font-bold text-[#3B1D0E] tabular-nums leading-tight">
              {totalStrokes > 0 ? totalStrokes : '—'}
            </div>
          </div>
          <div className="border-x-2 border-[#EFE2C6]">
            <div className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[#8A4B20]">
              Total Par
            </div>
            <div className="font-display text-2xl sm:text-3xl font-bold text-[#247A3C] tabular-nums leading-tight">
              {totalPar}
            </div>
          </div>
          <div>
            <div className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[#8A4B20]">
              World Stars
            </div>
            <div className="font-display text-2xl sm:text-3xl font-bold text-[#B45309] tabular-nums leading-tight">
              ★ {earnedStars}/{maxStars}
            </div>
          </div>
        </div>

        {/* Next World Unlocked / Ready / Coming Soon Preview Card */}
        {nextWorld && (
          <div
            data-testid="next-world-preview"
            className="mt-3 overflow-hidden rounded-2xl border-[3px] border-[#522810] shadow-[0_4px_0_rgba(82,40,16,0.2)] text-left"
            style={{ backgroundColor: nextWorld.surfaceHex }}
          >
            <div className="relative border-b-[3px] border-[#522810]">
              <WorldIllustration worldId={nextWorld.id} />
              <span
                className={`absolute top-2 left-2 px-2.5 py-0.5 rounded-lg border-2 border-[#522810] font-display text-xs font-bold tracking-wide shadow-[0_2px_0_#522810] ${
                  !isNextWorldPlayable
                    ? 'bg-[#FEF3C7] text-[#92400E]'
                    : isNewlyUnlocked
                    ? 'bg-[#FACC15] text-[#3B1D0E] animate-banner-pulse'
                    : 'bg-[#FFFDF5] text-[#166534]'
                }`}
              >
                {!isNextWorldPlayable
                  ? 'COMING SOON'
                  : isNewlyUnlocked
                  ? 'NEW WORLD UNLOCKED!'
                  : canContinueToNextWorld
                  ? 'NEXT WORLD READY'
                  : 'LOCKED'}
              </span>
              <span
                className="absolute top-2 right-2 px-2 py-0.5 rounded-lg border-2 border-[#522810] font-display text-[11px] font-bold shadow-[0_2px_0_#522810]"
                style={{
                  backgroundColor: nextWorld.badgeBgHex,
                  color: nextWorld.badgeTextHex,
                }}
              >
                World {nextWorld.worldNumber}
              </span>
            </div>

            <div className="px-3.5 py-2.5 bg-[#FFFDF7]/92 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-display text-lg sm:text-xl font-bold text-[#3B1D0E] leading-tight truncate">
                  {nextWorld.name}
                </div>
                <p className="text-xs font-semibold text-[#6E4726] leading-snug">
                  {!isNextWorldPlayable
                    ? 'Coming soon in a future update!'
                    : canContinueToNextWorld
                    ? nextWorld.tagline
                    : `Clear all 4 holes of ${world.name} to unlock ${nextWorld.name}.`}
                </p>
              </div>
              <span className="shrink-0 text-xs font-extrabold text-[#7C4B27] tabular-nums">
                Holes {nextWorld.holeIds[0]}–{nextWorld.holeIds[3]}
              </span>
            </div>
          </div>
        )}

        {/* Explicit Action Buttons — Never Auto-Starts Next World */}
        <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
          {canContinueToNextWorld && nextWorld && (
            <button
              type="button"
              data-start="true"
              data-testid="continue-next-world-btn"
              onClick={() => {
                golfAudio.playCardSelect();
                onContinueNextWorld();
              }}
              className="min-h-[50px] flex-1 font-display text-lg sm:text-xl font-bold text-[#FFFDF5] hover:-translate-y-0.5 active:translate-y-0.5 py-3 px-5 rounded-2xl border-[3px] border-[#522810] shadow-[0_4px_0_#522810] active:shadow-[0_1px_0_#522810] transition-transform cursor-pointer whitespace-nowrap"
              style={{ backgroundColor: nextWorld.accentHex }}
            >
              Continue to Next World
            </button>
          )}
          <button
            type="button"
            data-testid="world-complete-select-btn"
            onClick={() => {
              golfAudio.playButtonClick();
              onWorldSelection();
            }}
            className={`min-h-[50px] ${
              canContinueToNextWorld ? 'flex-1 sm:flex-none' : 'w-full'
            } font-display text-lg font-bold text-[#3B1D0E] bg-[#F5E6C4] hover:bg-[#EBD5A7] hover:-translate-y-0.5 active:translate-y-0.5 py-3 px-5 rounded-2xl border-[3px] border-[#522810] shadow-[0_4px_0_#522810] active:shadow-[0_1px_0_#522810] transition-transform cursor-pointer whitespace-nowrap`}
          >
            World Selection
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { golfAudio } from '../game/audio';
import { LEVELS } from '../game/levels';
import {
  COURSE_WORLDS,
  CourseWorld,
  getOverallProgressStats,
  getWorldById,
  getWorldStats,
  isHoleImplemented,
  isHoleUnlocked,
  isWorldUnlocked,
  ProgressStore,
  WorldId,
} from '../game/progression';

interface CourseSelectModalProps {
  progress: ProgressStore;
  initialWorldId?: WorldId | null;
  onSelectHole: (levelIndex: number) => void;
  onClose: () => void;
}

function MiniStar({
  filled,
  size = 'sm',
}: {
  filled: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}) {
  const dim =
    size === 'xs'
      ? 'w-3.5 h-3.5'
      : size === 'sm'
      ? 'w-4 h-4'
      : size === 'md'
      ? 'w-5 h-5'
      : 'w-6 h-6';
  return (
    <svg viewBox="0 0 24 24" className={`${dim} shrink-0`} aria-hidden="true">
      <path
        d="M12 2.4 L14.9 8.4 L21.5 9.2 L16.6 13.8 L17.9 20.3 L12 17.1 L6.1 20.3 L7.4 13.8 L2.5 9.2 L9.1 8.4 Z"
        fill={filled ? '#FACC15' : '#DFCFAF'}
        stroke="#522810"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PadlockIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`${className} shrink-0`} fill="currentColor" aria-hidden="true">
      <path d="M5 7V5a3 3 0 0 1 6 0v2h1a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h1Zm1.5 0h3V5a1.5 1.5 0 0 0-3 0v2Z" />
    </svg>
  );
}

function CheckBadgeIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`${className} shrink-0`} fill="none" aria-hidden="true">
      <path
        d="M3.2 8.4 L6.4 11.6 L12.8 4.8"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Custom lightweight cartoon-arcade full-bleed illustrated banner for each of the 6 worlds */
function WorldIllustration({
  worldId,
  tall = false,
}: {
  worldId: WorldId;
  tall?: boolean;
}) {
  const heightClass = tall ? 'h-[96px] sm:h-[112px]' : 'h-[80px] sm:h-[88px]';

  if (worldId === 'sunny-garden') {
    return (
      <svg
        viewBox="0 0 400 88"
        preserveAspectRatio="xMidYMid slice"
        className={`w-full ${heightClass} block`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="sg-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#63D2FF" />
            <stop offset="100%" stopColor="#BAE6FD" />
          </linearGradient>
        </defs>
        <rect width="400" height="88" fill="url(#sg-sky)" />
        <circle cx="348" cy="22" r="14" fill="#FDE047" stroke="#D97706" strokeWidth="2" />
        <path d="M0 50 Q110 34 215 48 T400 42 L400 88 L0 88 Z" fill="#38B85C" />
        <path d="M0 60 Q125 48 245 58 T400 52 L400 88 L0 88 Z" fill="#2FA752" />
        <rect x="64" y="52" width="112" height="10" rx="4" fill="#C47335" stroke="#522810" strokeWidth="2.4" />
        <circle cx="28" cy="50" r="15" fill="#1F8A43" stroke="#14532D" strokeWidth="2" />
        <circle cx="206" cy="46" r="11" fill="#22A44D" stroke="#14532D" strokeWidth="2" />
        <circle cx="202" cy="44" r="3" fill="#FF595E" />
        <circle cx="211" cy="48" r="2.8" fill="#FDE047" />
        <circle cx="378" cy="54" r="14" fill="#1F8A43" stroke="#14532D" strokeWidth="2" />
        <ellipse cx="300" cy="66" rx="11" ry="4.5" fill="#1E293B" stroke="#E2E8F0" strokeWidth="1.8" />
        <line x1="300" y1="65" x2="300" y2="25" stroke="#FFFBEB" strokeWidth="3" strokeLinecap="round" />
        <path d="M301 26 L328 33 L301 41 Z" fill="#FF4D4F" stroke="#522810" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="122" cy="71" r="6.8" fill="#FFFFFF" stroke="#1E293B" strokeWidth="2" />
      </svg>
    );
  }

  if (worldId === 'tropical-trouble') {
    return (
      <svg
        viewBox="0 0 400 88"
        preserveAspectRatio="xMidYMid slice"
        className={`w-full ${heightClass} block`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="tt-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1AC7D9" />
            <stop offset="100%" stopColor="#0C8CA4" />
          </linearGradient>
        </defs>
        <rect width="400" height="88" fill="url(#tt-sea)" />
        <path d="M30 22 Q48 17 66 22" stroke="#E0FBFC" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.65" />
        <path d="M225 18 Q245 13 265 18" stroke="#E0FBFC" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.65" />
        <path d="M326 26 Q344 21 362 26" stroke="#E0FBFC" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.55" />
        <path d="M0 51 Q115 35 235 46 T400 44 L400 88 L0 88 Z" fill="#F5DF9E" stroke="#C59D5F" strokeWidth="2" />
        <rect x="86" y="50" width="236" height="27" rx="12" fill="#32B256" stroke="#522810" strokeWidth="2.5" />
        <ellipse cx="176" cy="63.5" rx="25" ry="8.5" fill="#F7DC94" stroke="#D9A85B" strokeWidth="1.8" />
        <circle cx="242" cy="63" r="9.5" fill="#FF595E" stroke="#522810" strokeWidth="2.2" />
        <circle cx="242" cy="63" r="4.2" fill="#FDE047" />
        <path d="M44 72 Q39 46 52 26" stroke="#9A5B2C" strokeWidth="5.5" fill="none" strokeLinecap="round" />
        <path d="M52 26 Q28 18 16 32 Q34 29 52 26 Z" fill="#22A44D" stroke="#14532D" strokeWidth="1.5" />
        <path d="M52 26 Q50 10 72 12 Q61 21 52 26 Z" fill="#2AC25B" stroke="#14532D" strokeWidth="1.5" />
        <path d="M52 26 Q76 20 86 36 Q68 32 52 26 Z" fill="#1F8A43" stroke="#14532D" strokeWidth="1.5" />
        <circle cx="360" cy="64" r="12" fill="#FF595E" stroke="#522810" strokeWidth="2" />
        <path d="M360 52 L360 76 M348 64 L372 64" stroke="#FFFDF5" strokeWidth="3.5" />
        <ellipse cx="294" cy="64" rx="8.5" ry="3.5" fill="#0F172A" />
        <line x1="294" y1="63" x2="294" y2="29" stroke="#FFFBEB" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M295 30 L319 36 L295 43 Z" fill="#FF9F1C" stroke="#522810" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (worldId === 'neon-nights') {
    return (
      <svg
        viewBox="0 0 400 88"
        preserveAspectRatio="xMidYMid slice"
        className={`w-full ${heightClass} block`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="nn-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#12072E" />
            <stop offset="55%" stopColor="#241054" />
            <stop offset="100%" stopColor="#160836" />
          </linearGradient>
        </defs>
        <rect width="400" height="88" fill="url(#nn-bg)" />
        <path
          d="M0 22 H400 M0 44 H400 M0 66 H400 M40 0 V88 M100 0 V88 M160 0 V88 M220 0 V88 M280 0 V88 M340 0 V88"
          stroke="#38BDF8"
          strokeWidth="1"
          opacity="0.16"
        />
        <rect x="36" y="40" width="328" height="34" rx="10" fill="#1B0E3F" stroke="#38BDF8" strokeWidth="3" />
        <line x1="200" y1="43" x2="200" y2="71" stroke="#F43F8E" strokeWidth="5" strokeLinecap="round" />
        <line x1="200" y1="43" x2="200" y2="71" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="116" cy="57" r="11.5" fill="#090418" stroke="#38BDF8" strokeWidth="2.8" />
        <circle cx="116" cy="57" r="4.8" fill="#C084FC" />
        <circle cx="268" cy="57" r="11.5" fill="#090418" stroke="#C084FC" strokeWidth="2.8" />
        <circle cx="268" cy="57" r="4.8" fill="#38BDF8" />
        <circle cx="332" cy="57" r="8.5" fill="#050212" stroke="#38BDF8" strokeWidth="2.2" />
        <line x1="332" y1="56" x2="332" y2="20" stroke="#E0F2FE" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M333 21 L358 28 L333 35 Z" fill="#F43F8E" stroke="#FBCFE8" strokeWidth="1.6" strokeLinejoin="round" />
        <circle cx="64" cy="18" r="2" fill="#38BDF8" />
        <circle cx="164" cy="16" r="2.2" fill="#F43F8E" />
        <circle cx="276" cy="20" r="2" fill="#C084FC" />
        <circle cx="378" cy="18" r="1.8" fill="#38BDF8" />
      </svg>
    );
  }

  if (worldId === 'frost-falls') {
    return (
      <svg
        viewBox="0 0 400 88"
        preserveAspectRatio="xMidYMid slice"
        className={`w-full ${heightClass} block`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="ff-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#26649B" />
            <stop offset="100%" stopColor="#66A6D4" />
          </linearGradient>
        </defs>
        <rect width="400" height="88" fill="url(#ff-sky)" />
        <path d="M0 50 Q98 32 198 46 T400 42 L400 88 L0 88 Z" fill="#EDF7FF" />
        <rect x="64" y="50" width="276" height="27" rx="10" fill="#4E8EB0" stroke="#7A3E1A" strokeWidth="3" />
        <rect x="134" y="53" width="102" height="21" rx="7" fill="#C2F1FF" stroke="#0284C7" strokeWidth="2" />
        <polygon points="108,45 114,29 120,45" fill="#7DD3FC" stroke="#0C4A6E" strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="264" cy="63.5" r="9.2" fill="#FFFFFF" stroke="#1E3A5F" strokeWidth="2" />
        <circle cx="264" cy="63.5" r="5.2" fill="none" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="3 2" />
        <polygon points="34,20 18,50 50,50" fill="#1E6B5A" stroke="#0F3D34" strokeWidth="1.8" strokeLinejoin="round" />
        <polygon points="34,20 26,35 42,35" fill="#FFFFFF" />
        <polygon points="368,22 353,50 383,50" fill="#1E6B5A" stroke="#0F3D34" strokeWidth="1.8" strokeLinejoin="round" />
        <polygon points="368,22 361,36 375,36" fill="#FFFFFF" />
        <ellipse cx="312" cy="64" rx="8.2" ry="3.4" fill="#0F172A" />
        <line x1="312" y1="63" x2="312" y2="27" stroke="#FFFBEB" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M313 28 L336 34 L313 41 Z" fill="#FF4D4F" stroke="#522810" strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="80" cy="18" r="2.2" fill="#FFFFFF" opacity="0.88" />
        <circle cx="176" cy="23" r="1.8" fill="#FFFFFF" opacity="0.85" />
        <circle cx="252" cy="16" r="2.4" fill="#FFFFFF" opacity="0.9" />
        <circle cx="336" cy="20" r="2" fill="#FFFFFF" opacity="0.85" />
      </svg>
    );
  }

  if (worldId === 'candy-factory') {
    return (
      <svg
        viewBox="0 0 400 88"
        preserveAspectRatio="xMidYMid slice"
        className={`w-full ${heightClass} block`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="cf-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F9A8D4" />
            <stop offset="100%" stopColor="#FDE68A" />
          </linearGradient>
        </defs>
        <rect width="400" height="88" fill="url(#cf-sky)" />
        {/* Cotton candy clouds */}
        <circle cx="62" cy="24" r="14" fill="#FFF1F2" opacity="0.9" />
        <circle cx="78" cy="22" r="11" fill="#FFF1F2" opacity="0.9" />
        <circle cx="326" cy="20" r="12" fill="#FFF1F2" opacity="0.88" />
        <circle cx="342" cy="22" r="15" fill="#FFF1F2" opacity="0.88" />
        {/* Strawberry frosting rolling hills */}
        <path d="M0 49 Q90 30 190 45 T400 41 L400 88 L0 88 Z" fill="#F472B6" stroke="#9D174D" strokeWidth="2" />
        {/* Mint wafer putting track */}
        <rect x="52" y="50" width="296" height="27" rx="12" fill="#6EE7B7" stroke="#7C2D12" strokeWidth="3" />
        {/* Caramel puddle */}
        <ellipse cx="144" cy="63.5" rx="28" ry="8.5" fill="#F59E0B" stroke="#92400E" strokeWidth="2" />
        {/* Peppermint swirl bumper */}
        <circle cx="222" cy="63" r="11" fill="#FFFDF5" stroke="#BE123C" strokeWidth="2.4" />
        <path d="M222 52 A11 11 0 0 1 233 63 L222 63 Z" fill="#FB7185" />
        <path d="M222 74 A11 11 0 0 1 211 63 L222 63 Z" fill="#FB7185" />
        <circle cx="222" cy="63" r="3.4" fill="#BE123C" />
        {/* Giant Lollipop trees */}
        <line x1="36" y1="74" x2="36" y2="36" stroke="#FFFBEB" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="36" cy="30" r="13" fill="#EC4899" stroke="#831843" strokeWidth="2.2" />
        <circle cx="36" cy="30" r="7.5" fill="none" stroke="#FFFDF5" strokeWidth="2.4" strokeDasharray="5 3" />
        <line x1="368" y1="74" x2="368" y2="40" stroke="#FFFBEB" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="368" cy="33" r="11.5" fill="#38BDF8" stroke="#075985" strokeWidth="2.2" />
        <circle cx="368" cy="33" r="6" fill="none" stroke="#FFFDF5" strokeWidth="2.2" strokeDasharray="4 3" />
        {/* Cup & candy pennant */}
        <ellipse cx="298" cy="64" rx="8.5" ry="3.5" fill="#4A1D1F" />
        <line x1="298" y1="63" x2="298" y2="26" stroke="#FFFBEB" strokeWidth="2.8" strokeLinecap="round" />
        <path d="M299 27 L324 33 L299 40 Z" fill="#EC4899" stroke="#522810" strokeWidth="1.8" strokeLinejoin="round" />
        {/* Colorful sprinkles */}
        <rect x="108" y="24" width="7" height="3" rx="1.5" transform="rotate(-24 108 24)" fill="#EC4899" />
        <rect x="184" y="18" width="7" height="3" rx="1.5" transform="rotate(18 184 18)" fill="#38BDF8" />
        <rect x="260" y="22" width="7" height="3" rx="1.5" transform="rotate(-15 260 22)" fill="#22C55E" />
      </svg>
    );
  }

  // clockwork-carnival
  return (
    <svg
      viewBox="0 0 400 88"
      preserveAspectRatio="xMidYMid slice"
      className={`w-full ${heightClass} block`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="cc-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#312E81" />
          <stop offset="60%" stopColor="#6D28D9" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <rect width="400" height="88" fill="url(#cc-sky)" />
      {/* Carnival string lights */}
      <path d="M0 16 Q100 28 200 16 T400 16" fill="none" stroke="#FDE68A" strokeWidth="1.5" opacity="0.7" />
      <circle cx="52" cy="21" r="2.8" fill="#FDE047" />
      <circle cx="118" cy="22" r="2.8" fill="#FB7185" />
      <circle cx="186" cy="17" r="2.8" fill="#38BDF8" />
      <circle cx="258" cy="22" r="2.8" fill="#FDE047" />
      <circle cx="332" cy="20" r="2.8" fill="#FB7185" />
      {/* Striped Big-Top Carnival Tent on left */}
      <polygon points="16,58 58,20 100,58" fill="#EF4444" stroke="#522810" strokeWidth="2.2" strokeLinejoin="round" />
      <polygon points="44,58 58,20 72,58" fill="#FFFBEB" stroke="#522810" strokeWidth="1.8" strokeLinejoin="round" />
      <line x1="58" y1="20" x2="58" y2="10" stroke="#FDE047" strokeWidth="2.4" />
      <polygon points="58,10 72,14 58,18" fill="#FDE047" />
      {/* Interlocking Brass Clockwork Gears on right */}
      <circle cx="348" cy="38" r="16" fill="#F59E0B" stroke="#78350F" strokeWidth="2.6" strokeDasharray="6 3" />
      <circle cx="348" cy="38" r="9" fill="#FDE68A" stroke="#78350F" strokeWidth="2" />
      <circle cx="348" cy="38" r="3" fill="#78350F" />
      <circle cx="318" cy="48" r="10.5" fill="#D97706" stroke="#78350F" strokeWidth="2.2" strokeDasharray="4 2.5" />
      <circle cx="318" cy="48" r="4.5" fill="#FEF3C7" stroke="#78350F" strokeWidth="1.8" />
      {/* Warm wooden midway ground */}
      <rect x="0" y="54" width="400" height="34" fill="#92400E" />
      {/* Brass-rimmed carnival putting lane */}
      <rect x="74" y="51" width="248" height="27" rx="10" fill="#2FA752" stroke="#F59E0B" strokeWidth="3" />
      {/* Rotating clockwork cog bumper */}
      <circle cx="182" cy="64.5" r="9.8" fill="#FBBF24" stroke="#522810" strokeWidth="2.2" />
      <circle cx="182" cy="64.5" r="4.2" fill="#FFFBEB" stroke="#522810" strokeWidth="1.5" />
      {/* Golden cup & crimson carnival flag */}
      <ellipse cx="278" cy="64.5" rx="8.2" ry="3.4" fill="#1E1B4B" stroke="#FDE047" strokeWidth="1.6" />
      <line x1="278" y1="63" x2="278" y2="27" stroke="#FDE68A" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M279 28 L304 34 L279 41 Z" fill="#F59E0B" stroke="#522810" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

export function CourseSelectModal({
  progress,
  initialWorldId = null,
  onSelectHole,
  onClose,
}: CourseSelectModalProps) {
  const [selectedWorldId, setSelectedWorldId] = useState<WorldId | null>(() => {
    if (!initialWorldId) return null;
    const candidate = getWorldById(initialWorldId);
    return !candidate.comingSoon && isWorldUnlocked(progress, candidate)
      ? candidate.id
      : null;
  });

  const overall = getOverallProgressStats(progress);
  const activeWorld = selectedWorldId ? getWorldById(selectedWorldId) : null;

  // VIEW 2: LEVEL SELECTION (4-BUTTON GRID FOR OPENED WORLD)
  if (activeWorld && !activeWorld.comingSoon) {
    const worldStats = getWorldStats(progress, activeWorld);

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="level-select-title"
        className="fixed inset-0 z-30 flex items-center justify-center p-2.5 sm:p-4"
        style={{ backgroundColor: 'rgba(11, 52, 64, 0.74)' }}
      >
        <div className="animate-modal-pop w-full max-w-3xl max-h-[94dvh] overflow-y-auto touch-pan-y overscroll-contain bg-[#FFF8E7] border-[4px] border-[#522810] rounded-3xl p-3.5 sm:p-5 shadow-[0_12px_0_#522810]">
          {/* Top Navigation Bar */}
          <div className="flex items-center justify-between gap-2 pb-3 border-b-2 border-[#E6D3AB]">
            <button
              type="button"
              data-testid="back-to-worlds-btn"
              onClick={() => {
                golfAudio.playButtonClick();
                setSelectedWorldId(null);
              }}
              className="min-h-[42px] px-3.5 py-2 font-display text-sm sm:text-base font-bold text-[#3B1D0E] bg-[#F5E6C4] hover:bg-[#EBD5A7] hover:-translate-y-0.5 active:translate-y-0.5 rounded-xl border-[3px] border-[#522810] shadow-[0_3px_0_#522810] active:shadow-[0_1px_0_#522810] transition-transform cursor-pointer whitespace-nowrap"
            >
              ← All Worlds
            </button>

            <div className="inline-flex items-center gap-1.5 font-display text-base sm:text-lg font-bold text-[#B45309] tabular-nums">
              <MiniStar filled={worldStats.earnedStars > 0} size="md" />
              <span>
                {worldStats.earnedStars}/{worldStats.maxStars} Stars
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                golfAudio.playButtonClick();
                onClose();
              }}
              aria-label="Back to Main Menu"
              className="min-h-[42px] px-3.5 py-2 font-display text-sm sm:text-base font-bold text-[#3B1D0E] bg-[#FFFDF7] hover:bg-[#F5E6C4] hover:-translate-y-0.5 active:translate-y-0.5 rounded-xl border-[3px] border-[#522810] shadow-[0_3px_0_#522810] active:shadow-[0_1px_0_#522810] transition-transform cursor-pointer whitespace-nowrap"
            >
              Menu
            </button>
          </div>

          {/* Illustrated World Hero Banner */}
          <div
            className="mt-3.5 overflow-hidden rounded-2xl border-[3px] border-[#522810] shadow-[0_4px_0_rgba(82,40,16,0.2)]"
            style={{ backgroundColor: activeWorld.surfaceHex }}
          >
            <div className="relative border-b-[3px] border-[#522810]">
              <WorldIllustration worldId={activeWorld.id} tall />
              <span
                className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-lg border-2 border-[#522810] font-display text-xs font-bold shadow-[0_2px_0_#522810]"
                style={{
                  backgroundColor: activeWorld.badgeBgHex,
                  color: activeWorld.badgeTextHex,
                }}
              >
                World {activeWorld.worldNumber}
              </span>
            </div>

            <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-left">
                <h2
                  id="level-select-title"
                  className="font-display text-xl sm:text-2xl font-bold text-[#3B1D0E] leading-tight"
                >
                  {activeWorld.name}
                </h2>
                <p className="text-xs sm:text-sm font-semibold text-[#6E4726]">
                  {activeWorld.tagline}
                </p>
              </div>
              <div className="text-left sm:text-right text-xs sm:text-sm font-extrabold text-[#7C4B27] tabular-nums">
                <div>
                  {worldStats.implementedHoles < worldStats.totalHoles
                    ? `Holes ${activeWorld.holeIds[0]}–${activeWorld.holeIds[worldStats.implementedHoles - 1]} Ready`
                    : `Holes ${activeWorld.holeIds[0]}–${activeWorld.holeIds[3]}`}
                  {worldStats.totalPar !== null ? ` · Par ${worldStats.totalPar}` : ''}
                </div>
                <div
                  className={
                    worldStats.status === 'completed' ? 'text-[#15803D]' : 'text-[#B45309]'
                  }
                >
                  {worldStats.status === 'completed'
                    ? worldStats.implementedHoles < worldStats.totalHoles
                      ? 'Available Holes Cleared!'
                      : 'World Completed!'
                    : `${worldStats.completedCount}/${worldStats.implementedHoles} Holes Cleared`}
                </div>
              </div>
            </div>
          </div>

          {/* Four-Button Level Selection Grid */}
          <div
            data-testid="level-select-grid"
            className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5"
          >
            {activeWorld.holeIds.map((holeId) => {
              const implemented = isHoleImplemented(holeId);
              const lvl = implemented ? LEVELS[holeId - 1] : null;
              const rec = progress.holes[holeId];
              const unlocked = implemented && isHoleUnlocked(progress, holeId);
              const isNextUp = unlocked && !rec && holeId === progress.lastUnlockedHole;

              return (
                <button
                  key={holeId}
                  type="button"
                  disabled={!unlocked}
                  data-testid={`hole-btn-${holeId}`}
                  onClick={() => {
                    if (!unlocked || !lvl) return;
                    golfAudio.playCardSelect();
                    onSelectHole(holeId - 1);
                  }}
                  aria-label={
                    !implemented
                      ? `Hole ${holeId} Coming Soon`
                      : unlocked && lvl
                      ? `Play Hole ${holeId}: ${lvl.name}, Par ${lvl.par}${
                          rec ? `, Best ${rec.bestStrokes} strokes, ${rec.stars} stars` : ''
                        }`
                      : `Hole ${holeId} locked. Complete Hole ${holeId - 1} to unlock.`
                  }
                  className={`group text-left rounded-2xl border-[3px] p-3.5 sm:p-4 transition-all duration-150 flex flex-col justify-between gap-3 ${
                    unlocked
                      ? 'border-[#522810] bg-[#FFFDF7] hover:bg-[#FFF9E6] hover:-translate-y-0.5 active:translate-y-0.5 shadow-[0_5px_0_#522810] active:shadow-[0_2px_0_#522810] cursor-pointer focus-visible:outline-4 focus-visible:outline-[#FDE047]'
                      : 'border-[#C9B896] bg-[#F2E9D6] text-[#8E7656] shadow-none cursor-not-allowed opacity-85'
                  }`}
                >
                  {/* Top Row: Hole Number Badge + Stars */}
                  <div className="flex items-start justify-between gap-2 w-full">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border-2 font-display text-xs font-bold leading-tight"
                          style={
                            unlocked
                              ? {
                                  backgroundColor: activeWorld.badgeBgHex,
                                  color: activeWorld.badgeTextHex,
                                  borderColor: '#522810',
                                }
                              : {
                                  backgroundColor: '#E6DAC1',
                                  color: '#7C6549',
                                  borderColor: '#B8A583',
                                }
                          }
                        >
                          {!unlocked && <PadlockIcon className="w-3 h-3" />}
                          Hole {holeId}
                        </span>

                        {isNextUp && (
                          <span className="px-2 py-0.5 rounded-lg bg-[#FF595E] text-[#FFFDF5] border-2 border-[#522810] font-display text-[11px] font-bold leading-tight">
                            Next Up
                          </span>
                        )}
                      </div>

                      <h3 className="mt-1.5 font-display text-lg sm:text-xl font-bold text-[#3B1D0E] leading-snug truncate">
                        {lvl ? lvl.name : 'Coming Soon'}
                      </h3>
                    </div>

                    {/* 3-Star Display */}
                    <div
                      className="flex items-center gap-0.5 shrink-0 pt-0.5"
                      aria-label={`${rec?.stars ?? 0} of 3 stars`}
                    >
                      <MiniStar filled={(rec?.stars ?? 0) >= 1} size="md" />
                      <MiniStar filled={(rec?.stars ?? 0) >= 2} size="md" />
                      <MiniStar filled={(rec?.stars ?? 0) >= 3} size="md" />
                    </div>
                  </div>

                  {/* Bottom Row: Par + Best Strokes + Play Indicator */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t-2 border-[#EFE2C6] w-full">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs sm:text-sm font-bold tabular-nums">
                      {lvl ? (
                        <>
                          <span className="text-[#247A3C]">Par {lvl.par}</span>
                          <span aria-hidden="true" className="text-[#B8A17A]">
                            ·
                          </span>
                          <span className={rec ? 'text-[#3B1D0E]' : 'text-[#8A6744]'}>
                            {!unlocked
                              ? `Clear Hole ${holeId - 1}`
                              : rec
                              ? `Best: ${rec.bestStrokes} ${rec.bestStrokes === 1 ? 'stroke' : 'strokes'}`
                              : 'Best: —'}
                          </span>
                        </>
                      ) : (
                        <span className="text-[#8E7656]">Coming Soon</span>
                      )}
                    </div>

                    {unlocked ? (
                      <span
                        className="shrink-0 px-3 py-1 rounded-xl border-2 border-[#522810] font-display text-xs sm:text-sm font-bold text-[#FFFDF5] shadow-[0_2px_0_#522810]"
                        style={{ backgroundColor: activeWorld.accentHex }}
                      >
                        {rec ? 'Replay' : 'Play'}
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs font-extrabold text-[#947C5E]">
                        {implemented ? 'Locked' : 'Soon'}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // VIEW 1: SIX-WORLD SELECTION GRID
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="course-select-title"
      className="fixed inset-0 z-30 flex items-center justify-center p-2.5 sm:p-4"
      style={{ backgroundColor: 'rgba(11, 52, 64, 0.74)' }}
    >
      <div className="animate-modal-pop w-full max-w-5xl max-h-[94dvh] overflow-y-auto touch-pan-y overscroll-contain bg-[#FFF8E7] border-[4px] border-[#522810] rounded-3xl p-3.5 sm:p-5 shadow-[0_12px_0_#522810]">
        {/* Header Bar */}
        <div className="pb-3 border-b-2 border-[#E6D3AB]">
          <div className="flex items-center justify-between gap-2.5">
            <h2
              id="course-select-title"
              className="font-display text-2xl sm:text-3xl font-bold text-[#3B1D0E] leading-tight"
            >
              Select World
            </h2>

            <button
              type="button"
              onClick={() => {
                golfAudio.playButtonClick();
                onClose();
              }}
              aria-label="Back to Main Menu"
              className="min-h-[42px] px-4 py-1.5 font-display text-base font-bold text-[#3B1D0E] bg-[#F5E6C4] hover:bg-[#EBD5A7] hover:-translate-y-0.5 active:translate-y-0.5 rounded-xl border-[3px] border-[#522810] shadow-[0_3px_0_#522810] active:shadow-[0_1px_0_#522810] transition-transform cursor-pointer whitespace-nowrap shrink-0"
            >
              ← Back
            </button>
          </div>
          <p className="mt-1 text-xs sm:text-sm font-bold text-[#7C4B27] tabular-nums flex items-center gap-1.5 flex-wrap">
            <span>
              {overall.completedHoles}/{overall.totalHoles} Holes Cleared
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 text-[#B45309]">
              <MiniStar filled={overall.earnedStars > 0} size="sm" />
              {overall.earnedStars}/{overall.maxStars} Stars
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {overall.completedWorlds}/{overall.playableWorlds} Worlds Completed
            </span>
            {progress.bestFullCourseTotal !== null && (
              <>
                <span aria-hidden="true">·</span>
                <span>Tour Best {progress.bestFullCourseTotal}</span>
              </>
            )}
          </p>
        </div>

        {/* 6 Illustrated Themed World Cards */}
        <div
          data-testid="world-select-grid"
          className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5"
        >
          {COURSE_WORLDS.map((world: CourseWorld) => {
            const stats = getWorldStats(progress, world);
            const unlocked = isWorldUnlocked(progress, world);
            const isComingSoon = world.comingSoon;
            const isPartialWorld = !isComingSoon && stats.implementedHoles < stats.totalHoles;

            const statusLabel = isComingSoon
              ? 'Coming Soon'
              : !unlocked
              ? `Locked · Clear Hole ${world.holeIds[0] - 1}`
              : stats.status === 'completed'
              ? isPartialWorld
                ? `${stats.implementedHoles}/${stats.implementedHoles} Ready Cleared`
                : 'Completed'
              : stats.status === 'in_progress'
              ? `${stats.completedCount}/${stats.implementedHoles} Cleared`
              : isPartialWorld
              ? `Holes ${world.holeIds[0]}–${world.holeIds[stats.implementedHoles - 1]} Ready`
              : 'Not Started';

            const lockBadgeText = isComingSoon
              ? 'Coming Soon'
              : unlocked
              ? stats.status === 'completed'
                ? isPartialWorld
                  ? '2/2 Ready'
                  : 'Completed'
                : 'Unlocked'
              : 'Locked';

            return (
              <article
                key={world.id}
                data-testid={`world-card-${world.id}`}
                data-status={stats.status}
                className={`flex flex-col overflow-hidden rounded-2xl border-[3px] border-[#522810] shadow-[0_5px_0_rgba(82,40,16,0.22)] transition-transform duration-150 ${
                  unlocked ? 'hover:-translate-y-0.5' : 'opacity-90'
                }`}
                style={{ backgroundColor: world.surfaceHex }}
              >
                {/* Full-Bleed Illustrated Scene Header */}
                <div className="relative border-b-[3px] border-[#522810] overflow-hidden">
                  <div className={!unlocked && !isComingSoon ? 'saturate-[0.55]' : ''}>
                    <WorldIllustration worldId={world.id} />
                  </div>

                  {/* World Number Pill (Top-Left) */}
                  <span
                    className="absolute top-2 left-2 px-2 py-0.5 rounded-lg border-2 border-[#522810] font-display text-[11px] font-bold shadow-[0_2px_0_#522810]"
                    style={{
                      backgroundColor: world.badgeBgHex,
                      color: world.badgeTextHex,
                    }}
                  >
                    World {world.worldNumber}
                  </span>

                  {/* Lock / Unlocked / Coming Soon Pill (Top-Right) */}
                  <span
                    className={`absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border-2 border-[#522810] font-display text-[11px] font-bold shadow-[0_2px_0_#522810] ${
                      isComingSoon
                        ? 'bg-[#FEF3C7] text-[#92400E]'
                        : unlocked
                        ? stats.status === 'completed'
                          ? 'bg-[#22C55E] text-[#FFFDF5]'
                          : 'bg-[#FFFDF5] text-[#166534]'
                        : 'bg-[#E7DCC4] text-[#6E4D2D]'
                    }`}
                  >
                    {!unlocked && !isComingSoon && <PadlockIcon className="w-3 h-3" />}
                    {stats.status === 'completed' && <CheckBadgeIcon className="w-3 h-3" />}
                    <span>{lockBadgeText}</span>
                  </span>
                </div>

                {/* Card Body */}
                <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between gap-2.5 bg-[#FFFDF7]/90">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-display text-lg font-bold text-[#3B1D0E] leading-tight">
                          {world.name}
                        </h3>
                        <p className="mt-0.5 text-[11px] sm:text-xs font-semibold text-[#6E4726] leading-snug">
                          {world.tagline}
                        </p>
                      </div>

                      {/* Stars Earned */}
                      <div
                        className="inline-flex items-center gap-1 font-display text-sm sm:text-base font-bold text-[#B45309] tabular-nums shrink-0"
                        aria-label={
                          isComingSoon
                            ? `${world.name} coming soon`
                            : `${stats.earnedStars} of ${stats.maxStars} stars earned`
                        }
                      >
                        <MiniStar filled={!isComingSoon && stats.earnedStars > 0} size="sm" />
                        <span>
                          {stats.earnedStars}/{stats.maxStars}
                        </span>
                      </div>
                    </div>

                    {/* Holes & Completion Status Row */}
                    <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] sm:text-xs font-bold tabular-nums text-[#7C4B27]">
                      <span>
                        Holes {world.holeIds[0]}–{world.holeIds[3]}
                      </span>
                      {stats.totalPar !== null && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Par {stats.totalPar}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          isComingSoon
                            ? 'text-[#B45309]'
                            : !unlocked
                            ? 'text-[#9A6B42]'
                            : stats.status === 'completed'
                            ? 'text-[#15803D]'
                            : stats.status === 'in_progress'
                            ? 'text-[#B45309]'
                            : 'text-[#6E4726]'
                        }
                      >
                        {statusLabel}
                      </span>
                    </div>

                    {/* Compact 4-Hole Preview Strip */}
                    <div className="mt-2 grid grid-cols-4 gap-1.5" aria-hidden="true">
                      {world.holeIds.map((holeId) => {
                        const holeImplemented = !isComingSoon && isHoleImplemented(holeId);
                        const rec = holeImplemented ? progress.holes[holeId] : undefined;
                        const holeOpen = holeImplemented && isHoleUnlocked(progress, holeId);
                        return (
                          <div
                            key={holeId}
                            className={`rounded-lg border px-1 py-1 text-center text-[10px] font-extrabold leading-none tabular-nums ${
                              !holeImplemented
                                ? 'border-[#E6D6B8] bg-[#F8F1E1] text-[#A28763]'
                                : rec
                                ? 'border-[#522810] bg-[#FEF3C7] text-[#3B1D0E]'
                                : holeOpen
                                ? 'border-[#522810]/60 bg-[#FFFDF7] text-[#3B1D0E]'
                                : 'border-[#DFD2B8] bg-[#F2E9D6] text-[#9C8565]'
                            }`}
                          >
                            <div>H{holeId}</div>
                            <div className="mt-0.5 text-[9px] text-[#B45309]">
                              {!holeImplemented
                                ? 'Soon'
                                : rec
                                ? '★'.repeat(rec.stars)
                                : holeOpen
                                ? 'Open'
                                : '🔒'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Open World / Locked / Coming Soon Button */}
                  <button
                    type="button"
                    disabled={!unlocked}
                    data-testid={`open-world-${world.id}`}
                    onClick={() => {
                      if (!unlocked || isComingSoon) return;
                      golfAudio.playCardSelect();
                      setSelectedWorldId(world.id);
                    }}
                    className={`min-h-[42px] w-full font-display text-sm sm:text-base font-bold rounded-xl border-[3px] border-[#522810] transition-transform whitespace-nowrap ${
                      unlocked
                        ? 'text-[#FFFDF5] shadow-[0_3.5px_0_#522810] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[0_1px_0_#522810] cursor-pointer focus-visible:outline-4 focus-visible:outline-[#FDE047]'
                        : isComingSoon
                        ? 'text-[#92400E] bg-[#FEF3C7] border-[#B45309]/50 shadow-none cursor-not-allowed'
                        : 'text-[#8C6D4F] bg-[#E8DEC7] shadow-none cursor-not-allowed'
                    }`}
                    style={unlocked ? { backgroundColor: world.accentHex } : undefined}
                  >
                    {isComingSoon
                      ? 'Coming Soon'
                      : !unlocked
                      ? `Locked · Clear Hole ${world.holeIds[0] - 1}`
                      : stats.status === 'completed'
                      ? `Open ${world.name} →`
                      : `Select Hole (${world.holeIds[0]}–${
                          world.holeIds[Math.max(0, stats.implementedHoles - 1)]
                        }) →`}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

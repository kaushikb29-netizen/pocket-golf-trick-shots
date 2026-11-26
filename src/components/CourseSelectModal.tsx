import { golfAudio } from '../game/audio';
import { LEVELS } from '../game/levels';
import {
  COURSE_WORLDS,
  CourseWorld,
  getOverallProgressStats,
  getWorldStats,
  isHoleUnlocked,
  ProgressStore,
} from '../game/progression';

interface CourseSelectModalProps {
  progress: ProgressStore;
  onSelectHole: (levelIndex: number) => void;
  onClose: () => void;
}

function MiniStar({ filled, size = 'sm' }: { filled: boolean; size?: 'xs' | 'sm' | 'md' }) {
  const dim = size === 'xs' ? 'w-3 h-3' : size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
  return (
    <svg viewBox="0 0 24 24" className={`${dim} shrink-0`} aria-hidden="true">
      <path
        d="M12 2.4 L14.9 8.4 L21.5 9.2 L16.6 13.8 L17.9 20.3 L12 17.1 L6.1 20.3 L7.4 13.8 L2.5 9.2 L9.1 8.4 Z"
        fill={filled ? '#FACC15' : '#D9C7A3'}
        stroke="#522810"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Custom lightweight cartoon-arcade full-bleed illustrated banner for each of the 4 worlds */
function WorldIllustration({ worldId }: { worldId: CourseWorld['id'] }) {
  if (worldId === 'sunny-garden') {
    return (
      <svg
        viewBox="0 0 400 84"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-[76px] sm:h-[82px] block"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="sg-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#63D2FF" />
            <stop offset="100%" stopColor="#BAE6FD" />
          </linearGradient>
        </defs>
        <rect width="400" height="84" fill="url(#sg-sky)" />
        {/* Warm sun */}
        <circle cx="348" cy="22" r="14" fill="#FDE047" stroke="#D97706" strokeWidth="2" />
        {/* Rolling green lawn hills */}
        <path d="M0 48 Q110 34 215 46 T400 40 L400 84 L0 84 Z" fill="#38B85C" />
        <path d="M0 58 Q125 46 245 56 T400 50 L400 84 L0 84 Z" fill="#2FA752" />
        {/* Wooden mini-golf barrier */}
        <rect x="64" y="50" width="112" height="10" rx="4" fill="#C47335" stroke="#522810" strokeWidth="2.4" />
        {/* Decorative garden bushes & flowers */}
        <circle cx="28" cy="48" r="15" fill="#1F8A43" stroke="#14532D" strokeWidth="2" />
        <circle cx="206" cy="44" r="11" fill="#22A44D" stroke="#14532D" strokeWidth="2" />
        <circle cx="202" cy="42" r="3" fill="#FF595E" />
        <circle cx="211" cy="46" r="2.8" fill="#FDE047" />
        <circle cx="378" cy="52" r="14" fill="#1F8A43" stroke="#14532D" strokeWidth="2" />
        {/* Cup & coral flag */}
        <ellipse cx="300" cy="64" rx="11" ry="4.5" fill="#1E293B" stroke="#E2E8F0" strokeWidth="1.8" />
        <line x1="300" y1="63" x2="300" y2="24" stroke="#FFFBEB" strokeWidth="3" strokeLinecap="round" />
        <path d="M301 25 L328 32 L301 40 Z" fill="#FF4D4F" stroke="#522810" strokeWidth="2" strokeLinejoin="round" />
        {/* Golf ball */}
        <circle cx="122" cy="69" r="6.8" fill="#FFFFFF" stroke="#1E293B" strokeWidth="2" />
      </svg>
    );
  }

  if (worldId === 'tropical-trouble') {
    return (
      <svg
        viewBox="0 0 400 84"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-[76px] sm:h-[82px] block"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="tt-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1AC7D9" />
            <stop offset="100%" stopColor="#0C8CA4" />
          </linearGradient>
        </defs>
        <rect width="400" height="84" fill="url(#tt-sea)" />
        {/* Ocean shimmer arcs */}
        <path d="M30 22 Q48 17 66 22" stroke="#E0FBFC" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.65" />
        <path d="M225 18 Q245 13 265 18" stroke="#E0FBFC" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.65" />
        <path d="M326 26 Q344 21 362 26" stroke="#E0FBFC" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.55" />
        {/* Warm sandy beach island */}
        <path d="M0 49 Q115 33 235 44 T400 42 L400 84 L0 84 Z" fill="#F5DF9E" stroke="#C59D5F" strokeWidth="2" />
        {/* Putting turf island & sand trap */}
        <rect x="86" y="48" width="236" height="27" rx="12" fill="#32B256" stroke="#522810" strokeWidth="2.5" />
        <ellipse cx="176" cy="61.5" rx="25" ry="8.5" fill="#F7DC94" stroke="#D9A85B" strokeWidth="1.8" />
        {/* Coral pinball bumper */}
        <circle cx="242" cy="61" r="9.5" fill="#FF595E" stroke="#522810" strokeWidth="2.2" />
        <circle cx="242" cy="61" r="4.2" fill="#FDE047" />
        {/* Swaying palm tree silhouette on left */}
        <path d="M44 70 Q39 44 52 24" stroke="#9A5B2C" strokeWidth="5.5" fill="none" strokeLinecap="round" />
        <path d="M52 24 Q28 16 16 30 Q34 27 52 24 Z" fill="#22A44D" stroke="#14532D" strokeWidth="1.5" />
        <path d="M52 24 Q50 8 72 10 Q61 19 52 24 Z" fill="#2AC25B" stroke="#14532D" strokeWidth="1.5" />
        <path d="M52 24 Q76 18 86 34 Q68 30 52 24 Z" fill="#1F8A43" stroke="#14532D" strokeWidth="1.5" />
        {/* Beach umbrella accent on right */}
        <circle cx="360" cy="62" r="12" fill="#FF595E" stroke="#522810" strokeWidth="2" />
        <path d="M360 50 L360 74 M348 62 L372 62" stroke="#FFFDF5" strokeWidth="3.5" />
        {/* Flag */}
        <ellipse cx="294" cy="62" rx="8.5" ry="3.5" fill="#0F172A" />
        <line x1="294" y1="61" x2="294" y2="27" stroke="#FFFBEB" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M295 28 L319 34 L295 41 Z" fill="#FF9F1C" stroke="#522810" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (worldId === 'neon-nights') {
    return (
      <svg
        viewBox="0 0 400 84"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-[76px] sm:h-[82px] block"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="nn-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#12072E" />
            <stop offset="55%" stopColor="#241054" />
            <stop offset="100%" stopColor="#160836" />
          </linearGradient>
        </defs>
        <rect width="400" height="84" fill="url(#nn-bg)" />
        {/* Crisp neon grid */}
        <path
          d="M0 22 H400 M0 44 H400 M0 66 H400 M40 0 V84 M100 0 V84 M160 0 V84 M220 0 V84 M280 0 V84 M340 0 V84"
          stroke="#38BDF8"
          strokeWidth="1"
          opacity="0.16"
        />
        {/* Glowing neon lane borders */}
        <rect x="36" y="38" width="328" height="34" rx="10" fill="#1B0E3F" stroke="#38BDF8" strokeWidth="3" />
        {/* Laser gate */}
        <line x1="200" y1="41" x2="200" y2="69" stroke="#F43F8E" strokeWidth="5" strokeLinecap="round" />
        <line x1="200" y1="41" x2="200" y2="69" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
        {/* Glowing Portal A & B */}
        <circle cx="116" cy="55" r="11.5" fill="#090418" stroke="#38BDF8" strokeWidth="2.8" />
        <circle cx="116" cy="55" r="4.8" fill="#C084FC" />
        <circle cx="268" cy="55" r="11.5" fill="#090418" stroke="#C084FC" strokeWidth="2.8" />
        <circle cx="268" cy="55" r="4.8" fill="#38BDF8" />
        {/* Neon cup & pink flag */}
        <circle cx="332" cy="55" r="8.5" fill="#050212" stroke="#38BDF8" strokeWidth="2.2" />
        <line x1="332" y1="54" x2="332" y2="18" stroke="#E0F2FE" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M333 19 L358 26 L333 33 Z" fill="#F43F8E" stroke="#FBCFE8" strokeWidth="1.6" strokeLinejoin="round" />
        {/* Starlight flecks */}
        <circle cx="64" cy="16" r="2" fill="#38BDF8" />
        <circle cx="164" cy="14" r="2.2" fill="#F43F8E" />
        <circle cx="276" cy="18" r="2" fill="#C084FC" />
        <circle cx="378" cy="16" r="1.8" fill="#38BDF8" />
      </svg>
    );
  }

  // frost-falls
  return (
    <svg
      viewBox="0 0 400 84"
      preserveAspectRatio="xMidYMid slice"
      className="w-full h-[76px] sm:h-[82px] block"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ff-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#26649B" />
          <stop offset="100%" stopColor="#66A6D4" />
        </linearGradient>
      </defs>
      <rect width="400" height="84" fill="url(#ff-sky)" />
      {/* Snowy hills */}
      <path d="M0 48 Q98 30 198 44 T400 40 L400 84 L0 84 Z" fill="#EDF7FF" />
      {/* Matte alpine putting green & glossy glacier ice sheet */}
      <rect x="64" y="48" width="276" height="27" rx="10" fill="#4E8EB0" stroke="#7A3E1A" strokeWidth="3" />
      <rect x="134" y="51" width="102" height="21" rx="7" fill="#C2F1FF" stroke="#0284C7" strokeWidth="2" />
      {/* Ice crystal */}
      <polygon points="108,43 114,27 120,43" fill="#7DD3FC" stroke="#0C4A6E" strokeWidth="1.8" strokeLinejoin="round" />
      {/* Snowball bumper */}
      <circle cx="264" cy="61.5" r="9.2" fill="#FFFFFF" stroke="#1E3A5F" strokeWidth="2" />
      <circle cx="264" cy="61.5" r="5.2" fill="none" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="3 2" />
      {/* Snow-covered alpine pines flanking */}
      <polygon points="34,18 18,48 50,48" fill="#1E6B5A" stroke="#0F3D34" strokeWidth="1.8" strokeLinejoin="round" />
      <polygon points="34,18 26,33 42,33" fill="#FFFFFF" />
      <polygon points="368,20 353,48 383,48" fill="#1E6B5A" stroke="#0F3D34" strokeWidth="1.8" strokeLinejoin="round" />
      <polygon points="368,20 361,34 375,34" fill="#FFFFFF" />
      {/* Cup & flag */}
      <ellipse cx="312" cy="62" rx="8.2" ry="3.4" fill="#0F172A" />
      <line x1="312" y1="61" x2="312" y2="25" stroke="#FFFBEB" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M313 26 L336 32 L313 39 Z" fill="#FF4D4F" stroke="#522810" strokeWidth="1.8" strokeLinejoin="round" />
      {/* Snowflakes */}
      <circle cx="80" cy="16" r="2.2" fill="#FFFFFF" opacity="0.88" />
      <circle cx="176" cy="21" r="1.8" fill="#FFFFFF" opacity="0.85" />
      <circle cx="252" cy="14" r="2.4" fill="#FFFFFF" opacity="0.9" />
      <circle cx="336" cy="18" r="2" fill="#FFFFFF" opacity="0.85" />
    </svg>
  );
}

export function CourseSelectModal({
  progress,
  onSelectHole,
  onClose,
}: CourseSelectModalProps) {
  const overall = getOverallProgressStats(progress);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="course-select-title"
      className="fixed inset-0 z-30 flex items-center justify-center p-2.5 sm:p-4"
      style={{ backgroundColor: 'rgba(11, 52, 64, 0.72)' }}
    >
      <div className="animate-modal-pop w-full max-w-4xl max-h-[94dvh] overflow-y-auto touch-pan-y overscroll-contain bg-[#FFF8E7] border-[4px] border-[#522810] rounded-3xl p-3.5 sm:p-5 shadow-[0_12px_0_#522810]">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b-2 border-[#E6D3AB]">
          <div className="text-left">
            <h2
              id="course-select-title"
              className="font-display text-2xl sm:text-3xl font-bold text-[#3B1D0E] leading-tight"
            >
              Select Hole
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm font-bold text-[#7C4B27] tabular-nums flex items-center gap-1.5 flex-wrap">
              <span>
                {overall.completedHoles}/{overall.totalHoles} Holes Cleared
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-[#B45309]">
                <MiniStar filled size="sm" />
                {overall.earnedStars}/{overall.maxStars} Stars
              </span>
              <span aria-hidden="true">·</span>
              <span>Unlocked up to Hole {progress.lastUnlockedHole}</span>
              {progress.bestFullCourseTotal !== null && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Full Tour Best {progress.bestFullCourseTotal}</span>
                </>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              golfAudio.playButtonClick();
              onClose();
            }}
            aria-label="Back to Main Menu"
            className="min-h-[44px] px-4 py-2 font-display text-base font-bold text-[#3B1D0E] bg-[#F5E6C4] hover:bg-[#EBD5A7] hover:-translate-y-0.5 active:translate-y-0.5 rounded-xl border-[3px] border-[#522810] shadow-[0_3px_0_#522810] active:shadow-[0_1px_0_#522810] transition-transform cursor-pointer whitespace-nowrap"
          >
            ← Back
          </button>
        </div>

        {/* 4 Full-Bleed Illustrated World Theme Cards */}
        <div className="mt-3.5 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5">
          {COURSE_WORLDS.map((world) => {
            const stats = getWorldStats(progress, world);
            const unlockedInWorld = world.holeIds.filter((id) => isHoleUnlocked(progress, id));
            const worldUnlocked = unlockedInWorld.length > 0;
            const targetHoleId =
              stats.status === 'completed'
                ? world.holeIds[0]
                : unlockedInWorld[unlockedInWorld.length - 1] ?? world.holeIds[0];
            const statusText = !worldUnlocked
              ? `Locked · Clear Hole ${world.holeIds[0] - 1}`
              : stats.status === 'completed'
              ? 'Course Completed'
              : stats.status === 'in_progress'
              ? `${stats.completedCount}/${stats.totalHoles} Holes Cleared`
              : 'Ready to Play';
            const statusColor = !worldUnlocked
              ? 'text-[#9A6B42]'
              : stats.status === 'completed'
              ? 'text-[#15803D]'
              : stats.status === 'in_progress'
              ? 'text-[#B45309]'
              : 'text-[#6E4726]';

            return (
              <article
                key={world.id}
                data-testid={`world-card-${world.id}`}
                className={`flex flex-col overflow-hidden rounded-2xl border-[3px] border-[#522810] bg-[#FFFDF7] shadow-[0_5px_0_rgba(82,40,16,0.22)] transition-transform duration-150 ${
                  worldUnlocked ? 'hover:-translate-y-0.5' : 'opacity-90'
                }`}
              >
                {/* Full-Bleed Illustrated Scene Header */}
                <div className="relative border-b-[3px] border-[#522810] overflow-hidden">
                  <WorldIllustration worldId={world.id} />
                </div>

                {/* Card Body */}
                <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between gap-2.5">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display text-lg sm:text-xl font-bold text-[#3B1D0E] leading-tight">
                          {world.name}
                        </h3>
                        <p className="mt-0.5 text-xs font-semibold text-[#6E4726] leading-snug">
                          {world.tagline}
                        </p>
                      </div>
                      <div
                        className="inline-flex items-center gap-1 font-display text-base font-bold text-[#B45309] tabular-nums shrink-0"
                        aria-label={`${stats.earnedStars} of ${stats.maxStars} stars earned`}
                      >
                        <MiniStar filled={stats.earnedStars > 0} size="md" />
                        <span>
                          {stats.earnedStars}/{stats.maxStars}
                        </span>
                      </div>
                    </div>

                    {/* Clean Unboxed World Metadata Row */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-bold tabular-nums text-[#7C4B27]">
                      <span>
                        Holes {world.holeIds[0]}–{world.holeIds[world.holeIds.length - 1]}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{stats.totalHoles} Holes</span>
                      <span aria-hidden="true">·</span>
                      <span>Par {stats.totalPar}</span>
                      <span aria-hidden="true">·</span>
                      <span className={statusColor}>{statusText}</span>
                    </div>
                  </div>

                  {/* Individual Hole Quick-Pick Row */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {world.holeIds.map((holeId) => {
                      const lvl = LEVELS[holeId - 1];
                      const rec = progress.holes[holeId];
                      const unlocked = isHoleUnlocked(progress, holeId);
                      return (
                        <button
                          key={holeId}
                          type="button"
                          disabled={!unlocked}
                          data-testid={`hole-btn-${holeId}`}
                          onClick={() => {
                            if (!unlocked) return;
                            golfAudio.playCardSelect();
                            onSelectHole(holeId - 1);
                          }}
                          aria-label={
                            unlocked
                              ? `Play Hole ${holeId}: ${lvl.name}, Par ${lvl.par}${
                                  rec ? `, Best ${rec.bestStrokes} strokes, ${rec.stars} stars` : ''
                                }`
                              : `Hole ${holeId} locked. Complete Hole ${holeId - 1} to unlock.`
                          }
                          className={`min-h-[46px] flex flex-col items-center justify-center rounded-xl border-2 px-1 py-1 transition-transform duration-150 ${
                            !unlocked
                              ? 'border-[#DFD2B8] bg-[#F2E9D6] text-[#9C8565] cursor-not-allowed opacity-75'
                              : rec
                              ? 'border-[#522810] bg-[#FEF7E0] hover:bg-[#FDECC0] hover:-translate-y-0.5 active:translate-y-0.5 cursor-pointer'
                              : 'border-[#522810]/70 bg-[#FAF3E3] hover:border-[#522810] hover:bg-[#F7E8C7] hover:-translate-y-0.5 active:translate-y-0.5 cursor-pointer'
                          }`}
                        >
                          <span className="font-display text-xs font-bold leading-none flex items-center gap-0.5">
                            {!unlocked && (
                              <svg viewBox="0 0 16 16" className="w-2.5 h-2.5 shrink-0" fill="currentColor" aria-hidden="true">
                                <path d="M5 7V5a3 3 0 0 1 6 0v2h1a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h1Zm1.5 0h3V5a1.5 1.5 0 0 0-3 0v2Z" />
                              </svg>
                            )}
                            <span>H{holeId}</span>
                          </span>
                          <span className="mt-0.5 text-[10px] font-bold tabular-nums leading-none">
                            {!unlocked ? 'Locked' : rec ? `Best ${rec.bestStrokes}` : `Par ${lvl.par}`}
                          </span>
                          <span className="mt-1 flex items-center gap-0.5">
                            <MiniStar filled={(rec?.stars ?? 0) >= 1} size="xs" />
                            <MiniStar filled={(rec?.stars ?? 0) >= 2} size="xs" />
                            <MiniStar filled={(rec?.stars ?? 0) >= 3} size="xs" />
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Primary World Play CTA */}
                  <button
                    type="button"
                    disabled={!worldUnlocked}
                    onClick={() => {
                      if (!worldUnlocked) return;
                      golfAudio.playCardSelect();
                      onSelectHole(targetHoleId - 1);
                    }}
                    className={`min-h-[42px] w-full font-display text-base sm:text-lg font-bold rounded-xl border-[3px] border-[#522810] transition-transform whitespace-nowrap ${
                      worldUnlocked
                        ? 'text-[#FFFDF5] shadow-[0_3.5px_0_#522810] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[0_1px_0_#522810] cursor-pointer'
                        : 'text-[#8C6D4F] bg-[#E8DEC7] shadow-none cursor-not-allowed'
                    }`}
                    style={worldUnlocked ? { backgroundColor: world.accentHex } : undefined}
                  >
                    {!worldUnlocked
                      ? `Unlock Hole ${world.holeIds[0]} to Play`
                      : stats.status === 'completed'
                      ? `Replay ${world.name}`
                      : `Play ${world.name} (Hole ${targetHoleId})`}
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

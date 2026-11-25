interface TitleScreenProps {
  totalLevels: number;
  bestTotal: number | null;
  totalPar: number;
  onStart: () => void;
}

export function TitleScreen({ totalLevels, bestTotal, totalPar, onStart }: TitleScreenProps) {
  return (
    <div className="fixed inset-0 z-20 flex flex-col items-center justify-between px-6 py-8 sm:py-10 pointer-events-none">
      {/* Subtle radial vignette behind center emblem so title pops cleanly while live course stays visible */}
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(circle at 50% 48%, rgba(12, 58, 70, 0.58) 0%, rgba(12, 58, 70, 0.22) 55%, rgba(9, 44, 54, 0.45) 100%)',
        }}
      />

      {/* Top spacer for balanced vertical framing */}
      <div className="h-4 sm:h-6" />

      {/* Centerpiece SVG Emblem Crest & Primary CTA */}
      <div className="flex flex-col items-center text-center max-w-xl w-full pointer-events-auto">
        <div className="animate-float-slow w-full max-w-[440px]">
          <svg
            viewBox="0 0 460 215"
            className="w-full h-auto drop-shadow-[0_10px_0_rgba(44,24,16,0.38)]"
            role="img"
            aria-label="Pocket Golf Trick Shots"
          >
            {/* Wooden arcade crest ribbon backing */}
            <rect
              x="28"
              y="34"
              width="404"
              height="148"
              rx="32"
              fill="#FFF8E7"
              stroke="#522810"
              strokeWidth="7"
            />
            <rect
              x="39"
              y="45"
              width="382"
              height="126"
              rx="23"
              fill="#38B85C"
              stroke="#247A3C"
              strokeWidth="4"
            />
            {/* Mowed stripes inside crest */}
            <clipPath id="crest-turf-clip">
              <rect x="41" y="47" width="378" height="122" rx="21" />
            </clipPath>
            <g clipPath="url(#crest-turf-clip)">
              <rect x="65" y="45" width="46" height="130" fill="#2FA752" />
              <rect x="157" y="45" width="46" height="130" fill="#2FA752" />
              <rect x="249" y="45" width="46" height="130" fill="#2FA752" />
              <rect x="341" y="45" width="46" height="130" fill="#2FA752" />
            </g>

            {/* Golf ball & fluttering coral pennant crest topper */}
            <circle cx="230" cy="34" r="24" fill="#FFFBEB" stroke="#522810" strokeWidth="5" />
            <circle cx="223" cy="27" r="4" fill="#CBD5E1" opacity="0.7" />
            <circle cx="234" cy="39" r="3" fill="#CBD5E1" opacity="0.7" />
            <circle cx="236" cy="25" r="2.5" fill="#CBD5E1" opacity="0.7" />
            {/* Mini flag sticking out right */}
            <line x1="252" y1="30" x2="252" y2="5" stroke="#522810" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M254 6 L284 14 L254 22 Z" fill="#FF4D4F" stroke="#522810" strokeWidth="3" strokeLinejoin="round" />

            {/* Main Display Title: POCKET GOLF */}
            <text
              x="230"
              y="112"
              textAnchor="middle"
              fontFamily="Fredoka, Plus Jakarta Sans, sans-serif"
              fontWeight="700"
              fontSize="54"
              letterSpacing="1"
              fill="#FFFDF5"
              stroke="#3B1D0E"
              strokeWidth="10"
              paintOrder="stroke fill"
            >
              POCKET GOLF
            </text>

            {/* Ribbon banner for TRICK SHOTS */}
            <path
              d="M108 134 L352 134 L342 164 L354 188 L106 188 L118 164 Z"
              fill="#F59E0B"
              stroke="#522810"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            <text
              x="230"
              y="170"
              textAnchor="middle"
              fontFamily="Fredoka, Plus Jakarta Sans, sans-serif"
              fontWeight="700"
              fontSize="26"
              letterSpacing="3"
              fill="#FFFDF5"
              stroke="#522810"
              strokeWidth="6"
              paintOrder="stroke fill"
            >
              TRICK SHOTS
            </text>
          </svg>
        </div>

        {/* Primary CTA */}
        <button
          type="button"
          data-start="true"
          onClick={onStart}
          className="mt-6 font-display text-2xl sm:text-[28px] font-bold tracking-wide text-[#FFFDF5] bg-[#FF595E] hover:bg-[#FF4248] active:translate-y-1 px-11 py-4 rounded-2xl border-[4px] border-[#522810] shadow-[0_6px_0_#522810] active:shadow-[0_2px_0_#522810] transition-transform duration-150 cursor-pointer focus-visible:outline-4 focus-visible:outline-[#FDE047] whitespace-nowrap"
        >
          Play Course
        </button>

        {/* Quiet unboxed course metadata */}
        <p className="mt-4 text-sm font-semibold text-[#FFF8E7] drop-shadow-[0_2px_2px_rgba(0,0,0,0.65)] tabular-nums">
          {totalLevels} Holes · Par {totalPar}
          {bestTotal !== null ? ` · Best ${bestTotal}` : ''}
        </p>
      </div>

      {/* Flat borderless control hint in bottom safe margin */}
      <p className="text-xs sm:text-sm font-semibold text-[#FFF8E7]/95 drop-shadow-[0_2px_3px_rgba(0,0,0,0.7)] text-center">
        Drag back to aim · Release to shoot · R Restart · P Pause
      </p>
    </div>
  );
}

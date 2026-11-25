import type { GithubUser } from '../hooks/useGithubAuth';

interface TitleScreenProps {
  totalLevels: number;
  bestTotal: number | null;
  totalPar: number;
  githubUser: GithubUser | null;
  githubConnecting: boolean;
  githubError: string | null;
  githubCallbackUrlHint: string | null;
  onConnectGithub: () => void;
  onDisconnectGithub: () => void;
  onDismissGithubError: () => void;
  onStart: () => void;
}

function GithubMarkSvg() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.54 2.87 8.39 6.84 9.75.5.09.68-.22.68-.49 0-.24-.01-.88-.01-1.72-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.57 2.34 1.12 2.91.85.09-.66.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.38 9.38 0 0 1 12 6.84c.85 0 1.71.12 2.51.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.59.69.49A10.27 10.27 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

export function TitleScreen({
  totalLevels,
  bestTotal,
  totalPar,
  githubUser,
  githubConnecting,
  githubError,
  githubCallbackUrlHint,
  onConnectGithub,
  onDisconnectGithub,
  onDismissGithubError,
  onStart,
}: TitleScreenProps) {
  return (
    <div className="fixed inset-0 z-20 flex flex-col items-center justify-between px-4 sm:px-6 py-4 sm:py-6 pointer-events-none">
      {/* Subtle radial vignette behind center emblem so title pops cleanly while live course stays visible */}
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(circle at 50% 48%, rgba(12, 58, 70, 0.58) 0%, rgba(12, 58, 70, 0.22) 55%, rgba(9, 44, 54, 0.45) 100%)',
        }}
      />

      {/* Top Row: Compact GitHub Connection Plaque (Right-Aligned) */}
      <div className="w-full flex flex-col items-end gap-2 pointer-events-auto">
        {githubUser ? (
          <div className="flex items-center gap-2 bg-[#FFF8E7] border-[3px] border-[#522810] rounded-2xl px-3 py-1.5 shadow-[0_4px_0_#522810]">
            {githubUser.avatarUrl && (
              <img
                src={githubUser.avatarUrl}
                alt={githubUser.login}
                className="w-6 h-6 rounded-full border-2 border-[#522810]"
              />
            )}
            <span className="text-xs sm:text-sm font-extrabold text-[#3B1D0E]">
              @{githubUser.login}
            </span>
            <button
              type="button"
              onClick={onDisconnectGithub}
              className="ml-1 text-[11px] font-extrabold text-[#8A4B20] hover:text-[#C2410C] underline cursor-pointer"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            type="button"
            data-testid="github-connect-btn"
            disabled={githubConnecting}
            onClick={onConnectGithub}
            className="flex items-center gap-2 bg-[#24292F] hover:bg-[#32383F] disabled:opacity-70 active:translate-y-0.5 text-[#FFFDF5] text-xs sm:text-sm font-bold px-3.5 py-2 rounded-xl border-[3px] border-[#522810] shadow-[0_4px_0_#522810] transition-transform cursor-pointer whitespace-nowrap"
          >
            <GithubMarkSvg />
            <span>{githubConnecting ? 'Connecting...' : 'Connect GitHub'}</span>
          </button>
        )}

        {githubError && (
          <div
            role="status"
            className="max-w-xs sm:max-w-sm bg-[#FFF8E7] border-[3px] border-[#522810] rounded-2xl px-3.5 py-2.5 shadow-[0_5px_0_#522810] text-left text-xs text-[#3B1D0E]"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold leading-snug">{githubError}</p>
              <button
                type="button"
                onClick={onDismissGithubError}
                aria-label="Dismiss GitHub notice"
                className="text-[#8A4B20] hover:text-[#3B1D0E] font-extrabold cursor-pointer shrink-0"
              >
                ×
              </button>
            </div>
            {githubCallbackUrlHint && (
              <p className="mt-1.5 text-[11px] font-semibold text-[#6E3D1B] break-all">
                Callback URL: <span className="font-mono">{githubCallbackUrlHint}</span>
              </p>
            )}
          </div>
        )}
      </div>

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

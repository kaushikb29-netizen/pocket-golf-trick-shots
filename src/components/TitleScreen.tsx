import type { GithubUser } from '../hooks/useGithubAuth';
import { golfAudio } from '../game/audio';

interface TitleScreenProps {
  totalLevels: number;
  bestTotal: number | null;
  totalPar: number;
  earnedStars: number;
  maxStars: number;
  completedHoles: number;
  lastUnlockedHole: number;
  githubUser: GithubUser | null;
  githubConnecting: boolean;
  githubError: string | null;
  githubCallbackUrlHint: string | null;
  onConnectGithub: () => void;
  onDisconnectGithub: () => void;
  onDismissGithubError: () => void;
  onContinueGame: () => void;
  onNewGame: () => void;
  onSelectHole: () => void;
  onOpenSettings: () => void;
  onOpenMobileInstall: () => void;
}

function GithubMarkSvg() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.54 2.87 8.39 6.84 9.75.5.09.68-.22.68-.49 0-.24-.01-.88-.01-1.72-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.57 2.34 1.12 2.91.85.09-.66.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.38 9.38 0 0 1 12 6.84c.85 0 1.71.12 2.51.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.59.69.49A10.27 10.27 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

function PhoneQrSvg() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" aria-hidden="true">
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" stroke="currentColor" strokeWidth="2.2" />
      <rect x="9.5" y="6.5" width="2" height="2" fill="currentColor" />
      <rect x="12.5" y="6.5" width="2" height="2" fill="currentColor" />
      <rect x="9.5" y="9.5" width="2" height="2" fill="currentColor" />
      <rect x="12.5" y="12.5" width="2" height="2" fill="currentColor" />
      <circle cx="12" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}

export function TitleScreen({
  totalLevels,
  bestTotal,
  totalPar,
  earnedStars,
  maxStars,
  completedHoles,
  lastUnlockedHole,
  githubUser,
  githubConnecting,
  githubError,
  githubCallbackUrlHint,
  onConnectGithub,
  onDisconnectGithub,
  onDismissGithubError,
  onContinueGame,
  onNewGame,
  onSelectHole,
  onOpenSettings,
  onOpenMobileInstall,
}: TitleScreenProps) {
  return (
    <div className="fixed inset-0 z-20 flex flex-col items-center justify-between px-3.5 sm:px-6 py-3 sm:py-5 pointer-events-none">
      {/* Subtle radial vignette behind center emblem so title pops cleanly while live course stays visible */}
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(circle at 50% 46%, rgba(10, 48, 60, 0.62) 0%, rgba(12, 58, 70, 0.24) 55%, rgba(9, 44, 54, 0.48) 100%)',
        }}
      />

      {/* Top Corner Utility Bar: Install in Mobile (Left) + Connect GitHub (Right) */}
      <div className="w-full flex items-start justify-between gap-2 pointer-events-auto">
        <button
          type="button"
          data-testid="install-mobile-btn"
          onClick={() => {
            golfAudio.playButtonClick();
            onOpenMobileInstall();
          }}
          className="min-h-[42px] flex items-center gap-2 bg-[#FFF6DF] hover:bg-[#FDECC8] hover:-translate-y-0.5 active:translate-y-0.5 text-[#3B1D0E] text-xs sm:text-sm font-extrabold px-3.5 py-2 rounded-xl border-[3px] border-[#522810] shadow-[0_4px_0_#522810] active:shadow-[0_1px_0_#522810] transition-transform cursor-pointer whitespace-nowrap"
        >
          <PhoneQrSvg />
          <span>Install in Mobile</span>
        </button>

        <div className="flex flex-col items-end gap-2">
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
                onClick={() => {
                  golfAudio.playButtonClick();
                  onDisconnectGithub();
                }}
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
              onClick={() => {
                golfAudio.playButtonClick();
                onConnectGithub();
              }}
              className="min-h-[42px] flex items-center gap-2 bg-[#24292F] hover:bg-[#32383F] hover:-translate-y-0.5 disabled:opacity-70 active:translate-y-0.5 text-[#FFFDF5] text-xs sm:text-sm font-bold px-3.5 py-2 rounded-xl border-[3px] border-[#522810] shadow-[0_4px_0_#522810] active:shadow-[0_1px_0_#522810] transition-transform cursor-pointer whitespace-nowrap"
            >
              <GithubMarkSvg />
              <span className="hidden xs:inline sm:inline">
                {githubConnecting ? 'Connecting...' : 'Connect GitHub'}
              </span>
              <span className="xs:hidden sm:hidden">
                {githubConnecting ? '...' : 'GitHub'}
              </span>
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
      </div>

      {/* Centerpiece SVG Emblem Crest & 4-Option Main Menu */}
      <div className="animate-modal-pop flex flex-col items-center text-center max-w-xl w-full pointer-events-auto">
        <div className="animate-float-slow w-full max-w-[330px] sm:max-w-[430px]">
          <svg
            viewBox="0 0 460 215"
            className="w-full h-auto drop-shadow-[0_11px_0_rgba(44,24,16,0.42)]"
            role="img"
            aria-label="Pocket Golf Trick Shots"
          >
            <defs>
              <clipPath id="crest-turf-clip">
                <rect x="41" y="47" width="378" height="122" rx="21" />
              </clipPath>
            </defs>

            {/* Wooden arcade crest backing */}
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

            {/* Mowed turf stripes + subtle periodic shine glint inside crest */}
            <g clipPath="url(#crest-turf-clip)">
              <rect x="65" y="45" width="46" height="130" fill="#2FA752" />
              <rect x="157" y="45" width="46" height="130" fill="#2FA752" />
              <rect x="249" y="45" width="46" height="130" fill="#2FA752" />
              <rect x="341" y="45" width="46" height="130" fill="#2FA752" />
              <polygon
                className="animate-crest-shine"
                points="0,42 54,42 18,175 -36,175"
                fill="rgba(255, 255, 255, 0.28)"
              />
            </g>

            {/* Golf ball & fluttering coral pennant crest topper */}
            <circle cx="230" cy="34" r="24" fill="#FFFBEB" stroke="#522810" strokeWidth="5" />
            <circle cx="223" cy="27" r="4" fill="#CBD5E1" opacity="0.7" />
            <circle cx="234" cy="39" r="3" fill="#CBD5E1" opacity="0.7" />
            <circle cx="236" cy="25" r="2.5" fill="#CBD5E1" opacity="0.7" />
            <line x1="252" y1="30" x2="252" y2="5" stroke="#522810" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M254 6 L284 14 L254 22 Z" fill="#FF4D4F" stroke="#522810" strokeWidth="3" strokeLinejoin="round" />

            {/* Subtle sparkle accents flanking the topper */}
            <path
              className="animate-sparkle"
              style={{ transformOrigin: '188px 24px' }}
              d="M188 15 Q188 24 197 24 Q188 24 188 33 Q188 24 179 24 Q188 24 188 15 Z"
              fill="#FDE047"
            />
            <path
              className="animate-sparkle"
              style={{ transformOrigin: '296px 26px', animationDelay: '0.8s' }}
              d="M296 19 Q296 26 303 26 Q296 26 296 33 Q296 26 289 26 Q296 26 296 19 Z"
              fill="#FFFDF5"
            />

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

        {/* Balanced 2x2 Tactile Arcade Main Menu */}
        <div className="mt-4 sm:mt-5 grid grid-cols-2 gap-2.5 sm:gap-3 w-full max-w-[440px] px-1">
          <button
            type="button"
            data-start="true"
            data-testid="continue-game-btn"
            onClick={() => {
              golfAudio.playCardSelect();
              onContinueGame();
            }}
            className="min-h-[56px] flex flex-col items-center justify-center font-display text-lg sm:text-[21px] font-bold leading-tight text-[#FFFDF5] bg-[#FF595E] hover:bg-[#FF4248] hover:-translate-y-0.5 active:translate-y-1 px-4 py-2.5 rounded-2xl border-[4px] border-[#522810] shadow-[0_5px_0_#522810] hover:shadow-[0_6px_0_#522810] active:shadow-[0_2px_0_#522810] transition-all duration-150 cursor-pointer focus-visible:outline-4 focus-visible:outline-[#FDE047] whitespace-nowrap"
          >
            <span>Continue Game</span>
            <span className="text-[11px] font-sans font-extrabold text-[#FFF8E7]/90">
              Hole {lastUnlockedHole} of {totalLevels}
            </span>
          </button>

          <button
            type="button"
            data-testid="new-game-btn"
            onClick={() => {
              golfAudio.playCardSelect();
              onNewGame();
            }}
            className="min-h-[56px] flex flex-col items-center justify-center font-display text-lg sm:text-[21px] font-bold leading-tight text-[#FFFDF5] bg-[#2FA752] hover:bg-[#269145] hover:-translate-y-0.5 active:translate-y-1 px-4 py-2.5 rounded-2xl border-[4px] border-[#522810] shadow-[0_5px_0_#522810] hover:shadow-[0_6px_0_#522810] active:shadow-[0_2px_0_#522810] transition-all duration-150 cursor-pointer focus-visible:outline-4 focus-visible:outline-[#FDE047] whitespace-nowrap"
          >
            <span>New Game</span>
            <span className="text-[11px] font-sans font-extrabold text-[#ECFDF3]/90">
              Start at Hole 1
            </span>
          </button>

          <button
            type="button"
            data-testid="select-hole-btn"
            onClick={() => {
              golfAudio.playButtonClick();
              onSelectHole();
            }}
            className="min-h-[50px] font-display text-lg sm:text-[20px] font-bold tracking-wide text-[#3B1D0E] bg-[#FFF6DF] hover:bg-[#FDECC8] hover:-translate-y-0.5 active:translate-y-1 px-4 py-2.5 rounded-2xl border-[4px] border-[#522810] shadow-[0_5px_0_#522810] hover:shadow-[0_6px_0_#522810] active:shadow-[0_2px_0_#522810] transition-all duration-150 cursor-pointer focus-visible:outline-4 focus-visible:outline-[#FDE047] whitespace-nowrap"
          >
            Select Hole
          </button>

          <button
            type="button"
            data-testid="settings-btn"
            onClick={() => {
              golfAudio.playButtonClick();
              onOpenSettings();
            }}
            className="min-h-[50px] font-display text-lg sm:text-[20px] font-bold tracking-wide text-[#3B1D0E] bg-[#FDE68A] hover:bg-[#FCD34D] hover:-translate-y-0.5 active:translate-y-1 px-4 py-2.5 rounded-2xl border-[4px] border-[#522810] shadow-[0_5px_0_#522810] hover:shadow-[0_6px_0_#522810] active:shadow-[0_2px_0_#522810] transition-all duration-150 cursor-pointer focus-visible:outline-4 focus-visible:outline-[#FDE047] whitespace-nowrap"
          >
            Settings
          </button>
        </div>

        {/* Quiet Unboxed Progress & Course Summary */}
        <p className="mt-3.5 text-xs sm:text-sm font-bold text-[#FFF8E7] drop-shadow-[0_2px_3px_rgba(0,0,0,0.72)] tabular-nums">
          {totalLevels} Holes · Par {totalPar}
          {earnedStars > 0 ? ` · ★ ${earnedStars}/${maxStars} Stars` : ''}
          {completedHoles > 0 ? ` · ${completedHoles}/${totalLevels} Cleared` : ''}
          {bestTotal !== null ? ` · Best ${bestTotal}` : ''}
        </p>
      </div>

      {/* Flat borderless control hint in bottom safe margin */}
      <p className="text-[11px] sm:text-sm font-semibold text-[#FFF8E7]/95 drop-shadow-[0_2px_3px_rgba(0,0,0,0.72)] text-center px-2">
        Drag back to aim · Release to shoot · R Restart · P Pause
      </p>
    </div>
  );
}

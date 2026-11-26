import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { golfAudio } from '../game/audio';
import {
  getMobileInstallUrl,
  useOnlineStatus,
  usePWAInstall,
} from '../hooks/usePWAInstall';

interface MobileInstallModalProps {
  onClose: () => void;
}

export function MobileInstallModal({ onClose }: MobileInstallModalProps) {
  const installUrl = useMemo(() => getMobileInstallUrl(), []);
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(installUrl, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#2B1408',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [installUrl]);

  const handleCopyLink = async () => {
    golfAudio.playButtonClick();
    try {
      await navigator.clipboard.writeText(installUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-install-title"
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4"
      style={{ backgroundColor: 'rgba(11, 52, 64, 0.72)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          golfAudio.playButtonClick();
          onClose();
        }
      }}
    >
      <div className="animate-modal-pop w-full max-w-sm max-h-[93dvh] overflow-y-auto touch-pan-y bg-[#FFF8E7] border-[4px] border-[#522810] rounded-3xl p-5 sm:p-6 shadow-[0_12px_0_#522810] text-center">
        <div className="flex items-start justify-between gap-2">
          <div className="text-left">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#0E7490]">
              Play Anywhere · Offline Ready
            </p>
            <h2
              id="mobile-install-title"
              className="mt-0.5 font-display text-2xl font-bold text-[#3B1D0E] leading-tight"
            >
              Install on Mobile
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              golfAudio.playButtonClick();
              onClose();
            }}
            aria-label="Close mobile install dialog"
            className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-[#F5E6C4] hover:bg-[#EBD5A7] border-[3px] border-[#522810] shadow-[0_3px_0_#522810] active:translate-y-0.5 font-display text-xl font-bold text-[#3B1D0E] cursor-pointer"
          >
            ×
          </button>
        </div>

        <p className="mt-2 text-xs sm:text-sm font-semibold text-[#6E4726] text-left leading-snug">
          Scan this QR code with your phone camera to open the game and add it to your home screen.
        </p>

        {/* Scannable QR Code Plaque */}
        <div className="mt-3.5 flex flex-col items-center">
          <div className="p-3 bg-white rounded-2xl border-[3px] border-[#522810] shadow-[0_5px_0_rgba(82,40,16,0.22)]">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR code to install Pocket Golf at ${installUrl}`}
                data-testid="mobile-install-qr"
                className="w-44 h-44 sm:w-48 sm:h-48 block rounded-lg"
              />
            ) : (
              <div className="w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center text-xs font-bold text-[#7C4B27]">
                Generating QR...
              </div>
            )}
          </div>

          {/* Direct URL + Copy Button */}
          <div className="mt-3 w-full flex items-center gap-1.5 bg-[#FFFDF7] border-2 border-[#D7C29E] rounded-xl px-2.5 py-1.5">
            <span className="flex-1 text-[11px] font-mono font-semibold text-[#5C3A1E] truncate text-left">
              {installUrl}
            </span>
            <button
              type="button"
              onClick={handleCopyLink}
              className="shrink-0 px-2.5 py-1 rounded-lg bg-[#F5E6C4] hover:bg-[#EBD5A7] border-2 border-[#522810] text-[11px] font-extrabold text-[#3B1D0E] cursor-pointer"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Native One-Tap PWA Install CTA when available on device */}
        {isInstallable && !isInstalled && (
          <button
            type="button"
            data-testid="pwa-direct-install-btn"
            onClick={async () => {
              golfAudio.playCardSelect();
              await install();
            }}
            className="mt-3.5 min-h-[46px] w-full font-display text-lg font-bold text-[#FFFDF5] bg-[#2FA752] hover:bg-[#269145] hover:-translate-y-0.5 active:translate-y-0.5 py-2.5 px-5 rounded-2xl border-[3px] border-[#522810] shadow-[0_4px_0_#522810] active:shadow-[0_1px_0_#522810] transition-transform cursor-pointer"
          >
            Install App Now
          </button>
        )}

        {isInstalled && (
          <p className="mt-3 text-xs font-extrabold text-[#15803D]">
            Already installed on this device!
          </p>
        )}

        {/* Concise Android & iOS Install Instructions */}
        <div className="mt-3.5 rounded-2xl bg-[#FAF0D7] border-2 border-[#E2CFA3] p-3 text-left text-[11px] sm:text-xs font-semibold text-[#5C3A1E] space-y-1.5">
          <p>
            <strong className="text-[#3B1D0E]">Android (Chrome):</strong> Scan QR → tap{' '}
            <strong className="text-[#3B1D0E]">Install App</strong> or menu{' '}
            <strong className="text-[#3B1D0E]">Add to Home screen</strong>.
          </p>
          <p className={isIOS ? 'text-[#3B1D0E] font-bold' : undefined}>
            <strong className="text-[#3B1D0E]">iPhone / iPad (Safari):</strong> Scan QR → tap{' '}
            <strong className="text-[#3B1D0E]">Share</strong> →{' '}
            <strong className="text-[#3B1D0E]">Add to Home Screen</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            golfAudio.playButtonClick();
            onClose();
          }}
          className="mt-4 min-h-[44px] w-full font-display text-base font-bold text-[#3B1D0E] bg-[#F5E6C4] hover:bg-[#EBD5A7] active:translate-y-0.5 py-2.5 px-5 rounded-2xl border-[3px] border-[#522810] shadow-[0_4px_0_#522810] active:shadow-[0_1px_0_#522810] transition-transform cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-3 left-3 z-50 flex items-center gap-2 rounded-xl bg-[#F59E0B] border-2 border-[#522810] px-3 py-1.5 text-xs font-extrabold text-[#FFFDF5] shadow-[0_3px_0_#522810]"
    >
      <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
      Offline Mode — Playing locally
    </div>
  );
}

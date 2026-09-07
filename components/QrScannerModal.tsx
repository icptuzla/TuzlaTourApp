import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Lock, Play, X, Trophy } from 'lucide-react';
import { Language } from '../types';
import { QUEST_TARGETS, NFT_REWARD_IDS } from '../constants/questData';
import { findQuestTargetFromQr } from '../utils/qrMatcher';
import { Preferences } from '@capacitor/preferences';

export interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  unlockedRewards: string[];
  onRewardFound: (id: string) => void;
  onSelectVideo?: (videoUrl: string) => void;
  isUtilityMode?: boolean;
  enableInfiniteAnimations?: boolean;
  scannerFps?: number;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  lang,
  unlockedRewards,
  onRewardFound,
  onSelectVideo,
  isUtilityMode = false,
  enableInfiniteAnimations = true,
  scannerFps = 15,
}) => {
  const [scannerFeedback, setScannerFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [activeVideoModal, setActiveVideoModal] = useState<{ url: string; title: string } | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'map-quest-reader';

  // Scanner initialization lifecycle
  useEffect(() => {
    let cancelled = false;
    if (isOpen) {
      // Delay to let AnimatePresence spring animation render and size the container
      const timer = setTimeout(() => {
        if (!cancelled) startScanner();
      }, 350);
      return () => {
        cancelled = true;
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async () => {
    const container = document.getElementById(scannerContainerId);
    if (!container) {
      console.warn('[QR Scanner] Container not found:', scannerContainerId);
      onClose();
      return;
    }

    // Stop any existing scanner instance first
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (_) {
        /* ignore cleanup errors */
      }
      html5QrCodeRef.current = null;
    }

    try {
      const html5QrCode = new Html5Qrcode(scannerContainerId, { verbose: false });
      html5QrCodeRef.current = html5QrCode;

      const onScanSuccess = async (decodedText: string) => {
        const trimmedText = decodedText?.trim() ?? '';
        const target = findQuestTargetFromQr(trimmedText);

        if (!target) {
          setScannerFeedback({
            text:
              lang === 'bs'
                ? 'Pogrešan QR kod. Skenirajte QR kod s pravog mjesta.'
                : 'Wrong QR code. Scan the QR code for the correct location.',
            type: 'error',
          });
          return;
        }

        // Haptic feedback on device if supported
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate([100, 50, 100]);
          } catch (_) {}
        }

        // Record in local scan ledger for history tracking
        try {
          const { value } = await Preferences.get({ key: 'tuzla_scan_ledger' });
          let ledger: any[] = [];
          if (value) {
            try {
              ledger = JSON.parse(value);
            } catch (_) {}
          }

          if (!ledger.some((entry) => entry.id === target.id)) {
            const now = new Date();
            const timeStr = now.toLocaleTimeString(lang === 'bs' ? 'bs-BA' : 'en-US', {
              hour: '2-digit',
              minute: '2-digit',
            });
            const dateStr = now.toLocaleDateString(lang === 'bs' ? 'bs-BA' : 'en-US', {
              month: 'short',
              day: 'numeric',
            });
            const updatedLedger = [{ id: target.id, timestamp: `${dateStr}, ${timeStr}` }, ...ledger];
            await Preferences.set({ key: 'tuzla_scan_ledger', value: JSON.stringify(updatedLedger) });
          }
        } catch (e) {
          console.warn('[QR Scanner] Ledger update skipped:', e);
        }

        if (unlockedRewards.includes(target.id)) {
          setScannerFeedback({
            text:
              lang === 'bs'
                ? `${target.name.bs} je već otključan.`
                : `${target.name.en} is already unlocked.`,
            type: 'success',
          });
          setTimeout(() => setScannerFeedback(null), 3000);
          onClose();
          return;
        }

        onRewardFound(target.id);
        setScannerFeedback({
          text:
            lang === 'bs'
              ? `Nagrada za ${target.name.bs} otključana!`
              : `Reward unlocked for ${target.name.en}!`,
          type: 'success',
        });
        setTimeout(() => setScannerFeedback(null), 3000);
        onClose();
      };

      const qrConfig = {
        fps: Math.max(scannerFps, 20),
        qrbox: { width: Math.min(window.innerWidth * 0.7, 260), height: Math.min(window.innerWidth * 0.7, 260) },
        disableFlip: false,
      };

      try {
        await html5QrCode.start({ facingMode: 'environment' }, qrConfig, onScanSuccess, () => {});
      } catch (err) {
        console.warn('[QR Scanner] Environment camera failed, trying fallback to any camera...', err);
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            await html5QrCode.start(devices[0].id, qrConfig, onScanSuccess, () => {});
          } else {
            throw new Error('No cameras found on device.');
          }
        } catch (fallbackErr) {
          console.error('[QR Scanner] Fallback failed:', fallbackErr);
          onClose();
          setScannerFeedback({ text: 'Camera error: Could not access camera', type: 'error' });
          setTimeout(() => setScannerFeedback(null), 3000);
        }
      }
    } catch (err) {
      console.error('[QR Scanner] Initialization error:', err);
      onClose();
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (_) {
        /* ignore stop errors */
      }
      html5QrCodeRef.current = null;
    }
  };

  const unlockedItems = QUEST_TARGETS.filter((item) => unlockedRewards.includes(item.id));
  const lockedItems = QUEST_TARGETS.filter((item) => !unlockedRewards.includes(item.id));
  const NFT_IPFS =
    'https://bafybeibd5ee6pjvkhn3kuitcclb5zjqdwo23yvprfwsaabcctylesvspsi.ipfs.dweb.link?filename=kenan-alajbegovic.webp';

  return (
    <>
      {/* SCANNER OVERLAY */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-[2000] bg-black flex flex-col pt-32"
          >
            {/* LASER SCANNER FRAME */}
            <div className="relative w-full h-[40vh] flex flex-col items-center justify-center mb-12">
              {!isUtilityMode && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-12 bg-amber-500/10 blur-[40px] rounded-full" />
              )}

              <div className="relative w-72 h-72">
                {/* Real Camera Feed */}
                <div
                  id={scannerContainerId}
                  className="absolute inset-0 rounded-2xl overflow-clip bg-black border-2 border-white/10 shadow-[0_0_80px_rgba(245,158,11,0.1)]"
                  style={{ backgroundColor: 'black', minWidth: '280px', minHeight: '280px' }}
                />

                {/* Cyber Frame Decor */}
                <div className="absolute -inset-4 border-2 border-white/5 rounded-[2.5rem] pointer-events-none" />
                <div
                  className={`absolute -inset-1 border border-amber-500/50 rounded-[1.5rem] pointer-events-none ${
                    enableInfiniteAnimations ? 'animate-pulse' : ''
                  }`}
                />

                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-500 rounded-tl-2xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-500 rounded-tr-2xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-500 rounded-bl-2xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-500 rounded-br-2xl" />

                {/* Animated Laser line with blur trail */}
                {enableInfiniteAnimations ? (
                  <motion.div
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                    className="absolute left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent z-10"
                  >
                    <div className="absolute inset-0 bg-amber-400 blur-sm opacity-50" />
                  </motion.div>
                ) : (
                  <div className="absolute left-0 top-1/2 w-full h-1 -translate-y-1/2 bg-gradient-to-r from-transparent via-amber-500 to-transparent z-10" />
                )}
              </div>

              <div className="mt-8 flex flex-col items-center">
                <span className="text-amber-400 font-black text-xs uppercase tracking-[0.3em] mb-2 animate-pulse">
                  Scanning Signal
                </span>
                <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest text-center px-12 leading-relaxed">
                  Position QR code within the frame to unlock rewards
                </span>
              </div>
            </div>

            {/* REWARD SECTIONS */}
            <div className="flex-1 overflow-y-auto px-6 pb-20 hide-scrollbar space-y-12">
              {/* SECTION: UNLOCKED */}
              {unlockedItems.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">
                      {lang === 'bs' ? 'Otključane Nagrade' : 'Unlocked Rewards'}
                    </h2>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {unlockedItems.map((item) => {
                      const isNFTItem = NFT_REWARD_IDS.includes(item.id);
                      const itemName = item.name[lang as keyof typeof item.name] || item.name.en || item.name.bs;
                      return (
                        <div key={item.id} className="flex flex-col gap-2">
                          <motion.div
                            layout
                            className="group relative h-32 rounded-3xl overflow-hidden border border-amber-400/40 bg-white/5 shadow-xl transition-all active:scale-95 cursor-pointer"
                            onClick={() => {
                              if (item.video) {
                                setActiveVideoModal({ url: item.video, title: itemName });
                                if (onSelectVideo) onSelectVideo(item.video);
                              } else if ((item as any).website) {
                                window.open((item as any).website, '_blank');
                              }
                            }}
                          >
                            <img
                              src={item.Image}
                              alt={itemName}
                              className={`w-full h-full object-cover brightness-[0.7] ${
                                isUtilityMode ? '' : 'group-hover:brightness-100 transition-all duration-500'
                              }`}
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 to-transparent p-5 flex flex-col justify-center">
                              <span className="text-amber-400 text-[10px] font-black uppercase tracking-widest mb-1 leading-none">
                                {lang === 'bs' ? 'Otključano' : 'Unlocked'}
                              </span>
                              <h3 className="text-lg font-black text-white uppercase leading-none tracking-tight">
                                {itemName}
                              </h3>
                            </div>
                            {item.video && (
                              <div className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-gradient-to-tr from-amber-400 to-yellow-400 border border-yellow-200 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/40 group-hover:scale-110 transition-transform">
                                <Play className="w-5 h-5 text-slate-950 fill-slate-950 ml-0.5" />
                              </div>
                            )}
                            <div className="absolute bottom-0 left-0 h-1 bg-amber-500 transition-all duration-500 w-full shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                          </motion.div>
                          {isNFTItem && (
                            <button
                              onClick={() => {
                                window.open(NFT_IPFS, '_blank', 'noopener,noreferrer');
                              }}
                              className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm text-white flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                              style={{
                                background: 'linear-gradient(135deg, #7c3aed, #a855f7, #ec4899)',
                                boxShadow: '0 8px 25px rgba(168,85,247,0.5)',
                              }}
                            >
                              🎖️ {lang === 'bs' ? 'Mint NFT Nagradu → Solflare' : 'Mint NFT Reward → Solflare'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION: LOCKED */}
              {lockedItems.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <Lock className="w-5 h-5 text-slate-500" />
                    <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">
                      {lang === 'bs' ? 'Preostali Zadaci' : 'Remaining Quests'}
                    </h2>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {lockedItems.map((item) => (
                      <div
                        key={item.id}
                        className="relative h-28 rounded-3xl overflow-hidden border border-white/5 bg-slate-900/50"
                      >
                        <img
                          src={item.Image}
                          alt="Locked"
                          className={`w-full h-full object-cover grayscale brightness-[0.3] ${
                            isUtilityMode ? 'blur-sm' : 'blur-xl'
                          }`}
                        />
                        <div className="absolute inset-0 flex items-center justify-between px-8">
                          <div className="flex flex-col">
                            <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1 leading-none">
                              Find to Unlock
                            </span>
                            <h3 className="text-md font-black text-slate-600 uppercase leading-none tracking-tight italic">
                              SECRET LOCATION
                            </h3>
                          </div>
                          <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                            <Lock className="w-4 h-4 text-slate-700" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-white/10 hover:bg-white/20 backdrop-blur-2xl border border-white/20 rounded-3xl flex items-center justify-center text-white shadow-2xl active:scale-90 transition-all"
            >
              <X className="w-8 h-8" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SCANNER FEEDBACK TOAST */}
      <AnimatePresence>
        {scannerFeedback && (
          <motion.div
            initial={{ y: 50, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 370, damping: 24 }}
            className={`fixed bottom-24 left-6 right-6 z-[3000] p-5 rounded-3xl shadow-[0_20px_50px_rgba(15,23,42,0.35)] flex items-center gap-4 ${
              scannerFeedback.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                scannerFeedback.type === 'success' ? 'bg-white/20' : 'bg-white/20'
              }`}
            >
              {scannerFeedback.type === 'success' ? (
                <Trophy className="w-6 h-6 text-white" />
              ) : (
                <X className="w-6 h-6 text-white" />
              )}
            </div>
            <div className="flex-1">
              <span className="text-[10px] font-black uppercase tracking-widest block mb-1">
                {scannerFeedback.type === 'success'
                  ? lang === 'bs'
                    ? 'Čestitamo'
                    : 'Congratulations'
                  : lang === 'bs'
                  ? 'Greška skeniranja'
                  : 'Scan error'}
              </span>
              <span className="text-base font-black uppercase leading-none tracking-tight">
                {scannerFeedback.text}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* UNLOCKED POI CINEMATIC VIDEO MODAL */}
      <AnimatePresence>
        {activeVideoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[7000] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-6"
          >
            <div className="w-full max-w-2xl bg-black border border-white/15 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col">
              {/* Header */}
              <div className="p-4 sm:p-5 flex items-center justify-between border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center border border-amber-400/30">
                    <Play className="w-4 h-4 fill-amber-400" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
                      {lang === 'bs' ? 'Cinematic Video' : 'Cinematic Video'}
                    </span>
                    <h3 className="text-base font-black text-white uppercase tracking-tight">
                      {activeVideoModal.title}
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => setActiveVideoModal(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Video Player */}
              <div className="relative w-full aspect-video sm:max-h-[60vh] bg-black flex items-center justify-center">
                <video
                  src={activeVideoModal.url}
                  autoPlay
                  controls
                  playsInline
                  preload="auto"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/10 bg-white/5 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">
                  {lang === 'bs' ? 'Tuzla Tour Audio-Vizuelni Vodič' : 'Tuzla Tour Audio-Visual Guide'}
                </span>
                <button
                  onClick={() => setActiveVideoModal(null)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-all"
                >
                  {lang === 'bs' ? 'Zatvori Video' : 'Close Video'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

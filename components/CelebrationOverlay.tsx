import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles, X, ExternalLink, Award } from 'lucide-react';

interface CelebrationOverlayProps {
  phase: number;
  rewardUrl?: string;
  onClose: () => void;
}

export const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({
  phase,
  rewardUrl,
  onClose,
}) => {
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-sm p-6 overflow-hidden text-center bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-amber-400/40 rounded-3xl shadow-2xl"
        >
          {/* Decorative background glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Badge Icon */}
          <div className="relative inline-flex items-center justify-center mb-4">
            <div className="absolute inset-0 bg-amber-400 rounded-full blur-xl opacity-50 animate-pulse" />
            <div className="relative flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-amber-500 to-amber-300 rounded-full shadow-xl border-2 border-white/40">
              <Trophy className="w-10 h-10 text-slate-950" />
            </div>
          </div>

          <div className="space-y-1 mb-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-[10px] font-black uppercase tracking-widest">
              <Sparkles className="w-3 h-3" />
              <span>Čestitamo! / Congratulations!</span>
            </div>
            <h2 className="text-xl font-black text-white">
              Faza {phase} Završena!
            </h2>
            <p className="text-xs text-slate-300">
              Uspješno ste otključali sve znamenitosti ove faze.
            </p>
          </div>

          {rewardUrl && (
            <div className="mb-5 p-3 rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  Solana Devnet NFT Nagrada
                </span>
                <a
                  href={rewardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-white"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <img
                src={rewardUrl}
                alt="NFT Reward"
                className="w-full h-40 object-cover rounded-xl border border-amber-400/30 shadow-md"
              />
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg active:scale-95 transition-all"
          >
            Nastavi Potragu 🚀
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CelebrationOverlay;

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Route, X, Footprints, Clock, Loader2 } from 'lucide-react';
import { Language } from '../types';

interface NavigationHudProps {
  isNavigating: boolean;
  selectedNavTarget: { name: string; lat: number; lon: number } | null;
  lang: Language;
  routeDistance: number | null;
  routeTime: number | null;
  isRouteLoading: boolean;
  onEndNavigation: () => void;
}

export const NavigationHud: React.FC<NavigationHudProps> = ({
  isNavigating,
  selectedNavTarget,
  lang,
  routeDistance,
  routeTime,
  isRouteLoading,
  onEndNavigation,
}) => {
  return (
    <AnimatePresence>
      {isNavigating && selectedNavTarget && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="absolute inset-0 z-20 pointer-events-none flex items-end justify-center pb-28 px-4"
        >
          <motion.div
            drag
            dragMomentum={false}
            className="w-full max-w-md pointer-events-auto cursor-grab active:cursor-grabbing bg-slate-950 border border-emerald-500/30 rounded-3xl p-5 shadow-2xl flex flex-col gap-4"
          >
            {/* Header Info */}
            <div className="flex items-start justify-between">
              <div className="flex gap-3">
                <div className="p-3 bg-emerald-600/20 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                  <Route size={24} className="animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400">
                    {lang === 'bs' ? 'U Toku je Pješačka Ruta' : 'Walking Route in Progress'}
                  </span>
                  <h4 className="text-base font-black text-white line-clamp-1 mt-0.5">
                    {selectedNavTarget.name}
                  </h4>
                </div>
              </div>
              <button
                onClick={onEndNavigation}
                className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Data Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Distance Card */}
              <div className="bg-white/5 border border-white/5 rounded-2xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center gap-2 text-slate-400">
                  <Footprints size={14} />
                  <span className="text-xs font-bold">{lang === 'bs' ? 'Udaljenost' : 'Distance'}</span>
                </div>
                <div className="mt-2 text-white font-black text-xl flex items-baseline gap-1">
                  {isRouteLoading ? (
                    <Loader2 className="animate-spin text-emerald-400" size={20} />
                  ) : routeDistance !== null ? (
                    routeDistance >= 1000 ? (
                      <>
                        {(routeDistance / 1000).toFixed(1)}
                        <span className="text-xs text-emerald-400 font-bold">km</span>
                      </>
                    ) : (
                      <>
                        {Math.round(routeDistance)}
                        <span className="text-xs text-emerald-400 font-bold">m</span>
                      </>
                    )
                  ) : (
                    '--'
                  )}
                </div>
              </div>

              {/* Duration Card */}
              <div className="bg-white/5 border border-white/5 rounded-2xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center gap-2 text-slate-400">
                  <Clock size={14} />
                  <span className="text-xs font-bold">{lang === 'bs' ? 'Vrijeme' : 'Duration'}</span>
                </div>
                <div className="mt-2 text-white font-black text-xl flex items-baseline gap-1">
                  {isRouteLoading ? (
                    <Loader2 className="animate-spin text-emerald-400" size={20} />
                  ) : routeTime !== null ? (
                    <>
                      {Math.ceil(routeTime / 60)}
                      <span className="text-xs text-emerald-400 font-bold">min</span>
                    </>
                  ) : (
                    '--'
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={onEndNavigation}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-lg shadow-red-600/20"
              >
                {lang === 'bs' ? 'Završi' : 'End'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

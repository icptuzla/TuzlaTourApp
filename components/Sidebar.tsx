import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { AppTab, Language } from '../types';
import {
  Wallet,
  CheckSquare,
  Home,
  Map,
  Gamepad2,
  BookOpen,
  Utensils,
  Bed,
  X,
  History as HistoryIcon,
  Compass,
  Heart
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  lang: Language;
}

interface NavItemConfig {
  id: AppTab;
  icon: React.ComponentType<{ className?: string }>;
  label: { en: string; bs: string; de: string; tr: string };
  isHeader?: boolean;
  isSubItem?: boolean;
  // Resting progressive blue styling
  inactiveClass: string;
  inactiveIconClass: string;
  inactiveBorderClass: string;
  // Active progressive golden/amber/yellow/orange styling
  activeClass: string;
  activeGlow: string;
  activeBorder: string;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, activeTab, onSelectTab, lang }) => {
  const navItems: NavItemConfig[] = [
    {
      id: AppTab.LANDING,
      icon: Home,
      label: { en: 'Home', bs: 'Početna', de: 'Startseite', tr: 'Ana Sayfa' },
      inactiveClass: 'bg-gradient-to-r from-sky-50/90 to-blue-50/80 text-sky-700 hover:from-sky-100 hover:to-blue-100/90 hover:text-sky-900',
      inactiveIconClass: 'text-sky-600',
      inactiveBorderClass: 'border-sky-200/50',
      activeClass: 'bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-slate-950 font-black',
      activeGlow: 'shadow-[0_8px_20px_rgba(251,191,36,0.45)]',
      activeBorder: 'border-amber-300/80'
    },
    {
      id: AppTab.CITY_GUIDE,
      icon: BookOpen,
      label: { en: 'City Guide', bs: 'Gradski Vodič', de: 'Stadtführer', tr: 'Şehir Rehberi' },
      isHeader: true,
      inactiveClass: 'bg-gradient-to-r from-blue-100/80 via-indigo-50/70 to-blue-100/80 text-blue-900 hover:from-blue-200/80 hover:to-indigo-100',
      inactiveIconClass: 'text-blue-700',
      inactiveBorderClass: 'border-blue-200/60',
      activeClass: 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 font-black',
      activeGlow: 'shadow-[0_8px_22px_rgba(245,158,11,0.5)]',
      activeBorder: 'border-amber-400/90'
    },
    {
      id: AppTab.HISTORY,
      icon: HistoryIcon,
      label: { en: 'History', bs: 'Historija', de: 'Geschichte', tr: 'Tarih' },
      isSubItem: true,
      inactiveClass: 'bg-gradient-to-r from-blue-50/70 to-indigo-50/60 text-blue-800 hover:from-blue-100/80 hover:to-indigo-100/80 hover:text-blue-950',
      inactiveIconClass: 'text-blue-600',
      inactiveBorderClass: 'border-blue-100/60',
      activeClass: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-400 text-slate-950 font-black',
      activeGlow: 'shadow-[0_6px_18px_rgba(245,158,11,0.4)]',
      activeBorder: 'border-amber-300'
    },
    {
      id: AppTab.FOOD,
      icon: Utensils,
      label: { en: 'Food', bs: 'Hrana', de: 'Essen', tr: 'Yemek' },
      isSubItem: true,
      inactiveClass: 'bg-gradient-to-r from-blue-100/60 to-indigo-100/50 text-blue-800 hover:from-blue-200/70 hover:to-indigo-200/60 hover:text-blue-950',
      inactiveIconClass: 'text-blue-700',
      inactiveBorderClass: 'border-blue-200/60',
      activeClass: 'bg-gradient-to-r from-amber-500 via-orange-400 to-amber-600 text-slate-950 font-black',
      activeGlow: 'shadow-[0_6px_18px_rgba(249,115,22,0.4)]',
      activeBorder: 'border-orange-300'
    },
    {
      id: AppTab.ACCOMMODATION,
      icon: Bed,
      label: { en: 'Accommodation', bs: 'Smještaj', de: 'Unterkunft', tr: 'Konaklama' },
      isSubItem: true,
      inactiveClass: 'bg-gradient-to-r from-indigo-100/60 to-blue-200/50 text-indigo-800 hover:from-indigo-200/70 hover:to-blue-300/60 hover:text-indigo-950',
      inactiveIconClass: 'text-indigo-700',
      inactiveBorderClass: 'border-indigo-200/60',
      activeClass: 'bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 text-slate-950 font-black',
      activeGlow: 'shadow-[0_6px_18px_rgba(249,115,22,0.45)]',
      activeBorder: 'border-orange-300'
    },
    {
      id: AppTab.MAP,
      icon: Map,
      label: { en: 'Map', bs: 'Mapa', de: 'Karte', tr: 'Harita' },
      inactiveClass: 'bg-gradient-to-r from-blue-100 via-sky-100 to-blue-200/80 text-blue-900 hover:from-blue-200 hover:to-sky-200',
      inactiveIconClass: 'text-blue-700',
      inactiveBorderClass: 'border-blue-300/70',
      activeClass: 'bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 text-slate-950 font-black',
      activeGlow: 'shadow-[0_8px_24px_rgba(245,158,11,0.55)]',
      activeBorder: 'border-amber-300'
    },
    {
      id: AppTab.QUEST,
      icon: Gamepad2,
      label: { en: 'Quest', bs: 'Potraga', de: 'Quest', tr: 'Görev' },
      inactiveClass: 'bg-gradient-to-r from-indigo-100 via-blue-200 to-indigo-200 text-indigo-950 hover:from-indigo-200 hover:to-blue-300 font-extrabold',
      inactiveIconClass: 'text-indigo-800',
      inactiveBorderClass: 'border-indigo-300/80',
      activeClass: 'bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-500 text-slate-950 font-black ring-2 ring-yellow-300/80',
      activeGlow: 'shadow-[0_0_30px_rgba(251,191,36,0.65)]',
      activeBorder: 'border-yellow-200'
    },
    {
      id: AppTab.TASK_MANAGER,
      icon: CheckSquare,
      label: { en: 'Planner', bs: 'Planer', de: 'Planer', tr: 'Planlayıcı' },
      inactiveClass: 'bg-gradient-to-r from-blue-200 via-indigo-200 to-blue-300 text-blue-950 hover:from-blue-300 hover:to-indigo-300',
      inactiveIconClass: 'text-blue-900',
      inactiveBorderClass: 'border-blue-400/80',
      activeClass: 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 font-black',
      activeGlow: 'shadow-[0_8px_24px_rgba(249,115,22,0.55)]',
      activeBorder: 'border-amber-400'
    },
    {
      id: AppTab.WALLET,
      icon: Wallet,
      label: { en: 'Wallet', bs: 'Novčanik', de: 'Wallet', tr: 'Cüzdan' },
      inactiveClass: 'bg-gradient-to-r from-blue-300 via-indigo-300 to-sky-300 text-slate-950 hover:from-blue-400 hover:to-indigo-400 font-bold',
      inactiveIconClass: 'text-blue-950',
      inactiveBorderClass: 'border-blue-500/80',
      activeClass: 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-600 text-slate-950 font-black',
      activeGlow: 'shadow-[0_8px_25px_rgba(245,158,11,0.6)]',
      activeBorder: 'border-yellow-300'
    },
  ];

  const handleSelect = (tab: AppTab) => {
    onSelectTab(tab);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed top-0 left-0 h-full w-72 bg-white/95 backdrop-blur-xl z-[101] shadow-2xl flex flex-col border-r border-slate-200/80"
          >
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-slate-100 bg-white/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-md shadow-blue-500/30">
                  <Compass className="w-4.5 h-4.5 text-white" />
                </div>
                <span className="font-quicksand font-black text-lg tracking-tight bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">
                  Tuzla Tour Guide
                </span>
              </div>

              <button
                onClick={() => onClose()}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors active:scale-95"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Links */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-1.5 custom-scrollbar">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const label = item.label[lang as keyof typeof item.label] || item.label.en;
                const isSubItem = item.isSubItem;
                const isHeader = item.isHeader;

                return (
                  <motion.button
                    key={item.id}
                    whileHover={{ x: 3, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { handleSelect(item.id); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-200 group text-left border relative overflow-hidden ${isSubItem ? 'ml-4 w-[calc(100%-1rem)] py-1.5 px-2.5' : ''
                      } ${isActive
                        ? `${item.activeClass} ${item.activeGlow} ${item.activeBorder} scale-[1.01]`
                        : `${item.inactiveClass} ${item.inactiveBorderClass} shadow-sm hover:shadow-md`
                      }`}
                  >
                    {/* Active side indicator accent */}
                    {isActive && (
                      <motion.div
                        layoutId="active-nav-indicator"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4.5 bg-slate-950 rounded-r-full shadow-sm"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}

                    <div className={`p-1 rounded-lg transition-all duration-200 ${isActive
                        ? 'bg-slate-950/10 text-slate-950'
                        : `${item.inactiveIconClass} group-hover:scale-105`
                      }`}>
                      <Icon className={`w-4.5 h-4.5 transition-transform duration-200 ${isActive ? 'scale-105' : ''}`} />
                    </div>

                    <span className={`tracking-wide transition-colors flex-1 ${isHeader
                        ? 'text-sm font-black uppercase tracking-wider'
                        : isSubItem
                          ? 'text-xs font-bold'
                          : 'text-xs font-extrabold'
                      }`}>
                      {label}
                    </span>

                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-950/80 mr-0.5 animate-pulse" />
                    )}
                  </motion.button>
                );
              })}

              <div className="pt-6 mt-2 flex flex-row items-center gap-6 px-4">
                {/* Minimalist Taxi Button - Large Icon, Aligned Left */}
                <button
                  onClick={() => window.confirm("Taxi 1525?") && (window.location.href = 'tel:1525')}
                  className="flex flex-col items-center group active:scale-95 transition-transform"
                >
                  <img
                    src="/assets/Gallery/QuestQRLocations/Taxi1525.webp"
                    alt="Taxi 1525"
                    className="w-24 h-24 object-contain mb-1 transition-transform group-hover:scale-105"
                  />
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-900/60 group-hover:text-blue-600">Taxi 1525</span>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-center bg-white/40">
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
              <span className="text-xs font-black tracking-wider text-slate-700">
                Tuzla
              </span>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default Sidebar;

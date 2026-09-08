import React, { useState, useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Menu } from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();
import { Analytics } from "@vercel/analytics/react"
import Sidebar from './components/Sidebar';
import LandingPage from './components/LandingPage';
import SecurityGuard from './components/SecurityGuard';
import LanguageSelector from './components/LanguageSelector';
import FullScreenImageViewer from './components/FullScreenImageViewer';
import ErrorBoundary from './components/ErrorBoundary';
import ReloadPrompt from './components/ReloadPrompt';
import OfflineIndicator from './components/OfflineIndicator';
import MapQuestView from "./components/MapQuestView";
import { AppTab } from './types';
import { ImageProvider } from './hooks/ImageContext';
import { GlobalAppProvider, useGlobalApp } from './contexts/GlobalAppContext';
import { useDraggablePopups } from './hooks/useDraggablePopups';
import { SpeedInsights } from "@vercel/speed-insights/react"
import ARGuide from './components/ARGuide';

const MapView = React.lazy(() => import('./components/MapView'));
const History = React.lazy(() => import('./components/History'));
const CityGuide = React.lazy(() => import('./components/CityGuide'));
const WalletShell = React.lazy(() => import('./components/Wallet'));
const TaskManager = React.lazy(() => import('./components/TaskManager'));
const Food = React.lazy(() => import('./components/Food'));
const Accommodation = React.lazy(() => import('./components/Accommodation'));
const getTabFromPath = (path: string): AppTab => {
  switch (path) {
    case '/': return AppTab.LANDING;
    case '/city-guide': return AppTab.CITY_GUIDE;
    case '/history': return AppTab.HISTORY;
    case '/map': return AppTab.MAP;
    case '/quest': return AppTab.QUEST;
    case '/wallet': return AppTab.WALLET;
    case '/task-manager': return AppTab.TASK_MANAGER;
    case '/food': return AppTab.FOOD;
    case '/accommodation': return AppTab.ACCOMMODATION;
    case '/ar': return AppTab.AR;
    default: return AppTab.LANDING;
  }
};

const getPathFromTab = (tab: AppTab): string => {
  switch (tab) {
    case AppTab.LANDING: return '/';
    case AppTab.CITY_GUIDE: return '/city-guide';
    case AppTab.HISTORY: return '/history';
    case AppTab.MAP: return '/map';
    case AppTab.QUEST: return '/quest';
    case AppTab.WALLET: return '/wallet';
    case AppTab.TASK_MANAGER: return '/task-manager';
    case AppTab.FOOD: return '/food';
    case AppTab.ACCOMMODATION: return '/accommodation';
    case AppTab.AR: return '/ar';
    default: return '/';
  }
};

const AppContent: React.FC = () => {
  const { lang, setLang, features, unlockedRewards, setUnlockedRewards } = useGlobalApp();
  useDraggablePopups();

  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = getTabFromPath(location.pathname);

  const [navigationTarget, setNavigationTarget] = useState<any | null>(null);
  const [autoOpenScanner, setAutoOpenScanner] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isWalletUnlocked, setIsWalletUnlocked] = useState(false);

  const navigateToTab = (tab: AppTab, options?: { openScanner?: boolean }) => {
    const path = getPathFromTab(tab);
    if (location.pathname !== path) {
      navigate(path);
    }
    setAutoOpenScanner(options?.openScanner || false);
    setIsDrawerOpen(false);
  };

  useEffect(() => {
    const handleBackButton = async () => {
      if (isDrawerOpen) {
        setIsDrawerOpen(false);
        return;
      }

      if (location.pathname !== '/') {
        navigate(-1);
      } else {
        const confirmed = window.confirm(lang === 'bs' ? 'Da li želite izaći iz aplikacije?' : 'Would you like to exit app?');
        if (confirmed) {
          CapApp.exitApp();
        }
      }
    };

    if (Capacitor.getPlatform() === 'web') return;

    const registration = CapApp.addListener('backButton', handleBackButton);

    return () => {
      registration.then(r => r.remove()).catch(() => { });
    };
  }, [isDrawerOpen, lang, location.pathname, navigate]);

  return (
    <ImageProvider>
      <ReloadPrompt />
      <OfflineIndicator lang={lang} />

      <header className="fixed top-0 left-0 right-0 h-[88px] bg-white/80 backdrop-blur-md z-[80] border-b border-slate-100 flex items-center justify-between px-3 sm:px-6 shadow-sm">
        <div className="flex items-center z-10 w-20">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex flex-col items-center justify-center p-1 bg-transparent border-none transition-all active:scale-95 group focus:outline-none"
          >
            <Menu className="w-8 h-8 text-blue-900 transition-transform group-hover:scale-110" />
            <span className="text-[10px] uppercase font-bold text-blue-900 mt-1">Menu</span>
          </button>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center z-0 w-[55%] sm:w-auto pointer-events-none">
          <h1 className="text-[4.5vw] sm:text-xl lg:text-2xl font-black tracking-tight leading-none uppercase flex flex-row flex-wrap sm:flex-nowrap justify-center items-center gap-1 sm:gap-1.5 text-center">
            <span className="text-blue-900">Tuzla</span>
            <span className="text-blue-500">Tour</span>
            <span className="text-amber-500">Guide</span>
          </h1>
        </div>

        <div className="flex items-center justify-end z-10 w-20">
          <LanguageSelector currentLang={lang} onSelect={setLang} />
        </div>
      </header>

      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <filter id="remove-black-background" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="
            1 0 0 0 0
            0 1 0 0 0
            0 0 1 0 0
            1 1 1 0 -0.05
          " />
        </filter>
      </svg>

      <div className="relative min-h-screen bg-white flex overflow-hidden pt-[88px]">
        <Sidebar
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          activeTab={activeTab}
          onSelectTab={navigateToTab}
          lang={lang}
        />

        <div
          className="flex-1 flex flex-col min-h-[calc(100vh-64px)] overflow-hidden"
          style={{
            filter: isDrawerOpen ? 'blur(4px)' : 'none',
            transition: 'filter 0.3s ease',
          }}
        >
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <ErrorBoundary>
              <Suspense fallback={
                <div className="h-full flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-50">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-blue-900 font-black uppercase text-xs tracking-widest animate-pulse">
                    {lang === 'en' ? 'Loading Tuzla...' : 'Učitavanje...'}
                  </p>
                </div>
              }>
                <Routes>
                  <Route path="/" element={<LandingPage lang={lang} onNavigate={navigateToTab} />} />
                  <Route path="/city-guide" element={<CityGuide lang={lang} />} />
                  <Route path="/history" element={<History lang={lang} />} />
                  <Route path="/map" element={
                    <MapView lang={lang} features={features} unlockedRewards={unlockedRewards} />
                  } />
                  <Route path="/quest" element={
                    <MapQuestView
                      lang={lang}
                      features={features}
                      unlockedRewards={unlockedRewards}
                      onRewardFound={(id) => setUnlockedRewards((prev) => (prev.includes(id) ? prev : [...prev, id]))}
                      navigationTarget={navigationTarget}
                      onClearNavigation={() => setNavigationTarget(null)}
                      initialOpenScanner={autoOpenScanner}
                    />
                  } />
                  <Route path="/wallet" element={
                    <SecurityGuard lang={lang} isUnlocked={isWalletUnlocked} onUnlock={() => setIsWalletUnlocked(true)}>
                      <WalletShell lang={lang} />
                    </SecurityGuard>
                  } />
                  <Route path="/task-manager" element={<TaskManager lang={lang} />} />
                  <Route path="/food" element={<Food lang={lang} />} />
                  <Route path="/accommodation" element={<Accommodation lang={lang} />} />
                  <Route path="/ar" element={
                    <ARGuide
                      lang={lang}
                      features={features}
                      unlockedRewards={unlockedRewards}
                      onRewardFound={(id) => setUnlockedRewards((prev) => (prev.includes(id) ? prev : [...prev, id]))}
                      initialTarget={navigationTarget}
                      onNavigate={(poi) => {
                        setNavigationTarget(poi);
                        navigateToTab(AppTab.MAP);
                      }}
                    />
                  } />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>
      </div>
      <FullScreenImageViewer />
    </ImageProvider>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <GlobalAppProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </GlobalAppProvider>
    </QueryClientProvider>
  );
};

export default App;

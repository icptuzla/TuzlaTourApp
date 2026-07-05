import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const ReloadPrompt: React.FC = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <div className="ReloadPrompt-container">
      {needRefresh && (
        <div className="fixed bottom-20 left-4 right-4 z-[9999] animate-bounce-in">
          <div className="bg-white/80 backdrop-blur-md border border-blue-200 rounded-2xl shadow-2xl p-4 flex flex-col gap-3 max-w-sm mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                {offlineReady ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">
                  {offlineReady ? 'Spremno za offline rad!' : 'Nova verzija dostupna'}
                </p>
                <p className="text-xs text-slate-500">
                  {offlineReady 
                    ? 'Aplikacija je sačuvana na vašem uređaju.' 
                    : 'Kliknite na dugme ispod da osvježite aplikaciju.'}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => close()}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Zatvori
              </button>
              {needRefresh && (
                <button
                  onClick={() => updateServiceWorker(true)}
                  className="px-4 py-2 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95"
                >
                  Osvježi
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReloadPrompt;

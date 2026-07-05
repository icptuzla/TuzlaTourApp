
import React from 'react';
import { Language } from '../types';
import { useImage } from '../hooks/ImageContext';
import { ZoomIn } from 'lucide-react';

interface HistoryProps {
  lang: Language;
}

const History: React.FC<HistoryProps> = ({ lang }) => {
  const images: Record<Language, string[]> = {
    en: ['/assets/HistoryEN.webp', '/assets/HistoryEN2.webp'],
    bs: ['/assets/HistoryBA.webp', '/assets/HistoryBA2.webp'],
    de: ['/assets/HistoryDE.webp', '/assets/HistoryDE2.webp'],
    tr: ['/assets/HistoryTR.webp', '/assets/HistoryTR2.webp'],
  };

  const activeImages = images[lang] || images.en;
  
  const { openGallery } = useImage();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {activeImages.map((src, index) => (
        <div 
          key={index} 
          className="relative w-full rounded-3xl overflow-hidden shadow-2xl border border-blue-400/60 shadow-[0_0_12px_rgba(59,130,246,0.35)] bg-slate-100 group cursor-pointer history-card-3d"
          onClick={() => openGallery(activeImages, index)}
          role="button"
          tabIndex={0}
          aria-label={`View Tuzla History Image ${index + 1} fullscreen`}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openGallery(activeImages, index); }}
        >
          <img
            src={src}
            alt={`Tuzla History ${lang.toUpperCase()} ${index + 1}`}
            className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
          {/* Glossy overlay effect for modern UI */}
          <div className="absolute inset-0 bg-gradient-to-tr from-black/0 via-white/5 to-white/20 pointer-events-none" />
          {/* Tap-to-zoom hint */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm text-white/90 text-xs px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none sm:flex hidden">
            <ZoomIn size={14} />
            <span>{lang === 'de' ? 'Zum Zoomen tippen' : lang === 'tr' ? 'Yakınlaştırmak için dokunun' : lang === 'bs' ? 'Dodirnite za zum' : 'Tap to zoom'}</span>
          </div>
          {/* Mobile-visible hint icon */}
          <div className="absolute bottom-3 right-3 bg-black/40 backdrop-blur-sm text-white/80 p-2 rounded-full sm:hidden">
            <ZoomIn size={16} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default History;

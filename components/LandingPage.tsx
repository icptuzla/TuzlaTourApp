import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { ZoomIn } from 'lucide-react';
import type { FC } from 'react';



import { AppTab, Language } from '../types';
import {
  ArrowRight,
  Play,
  Pause,
  ChevronRight,
  ArrowUp,
  QrCode,
  Home,
  X,
  Facebook,
  Linkedin,
  Share2,
  ArrowDown
} from 'lucide-react';
import { useImage } from '../hooks/ImageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { getAppFeatures } from '../utils/platform';

interface LandingPageProps {
  lang: Language;
  onNavigate?: (tab: AppTab, options?: { openScanner?: boolean }) => void;
}

const copy = {
  en: {
    heroScroll: 'Scroll to explore Tuzla',
    cardsTitle: 'Your Journey Starts Here',
    linksTitle: 'Quick Links',
    albumTitle: 'Photo Gallery',
    explore: 'Explore',
  },
  bs: {
    heroScroll: 'Istražite Tuzlu',
    cardsTitle: 'Tvoje putovanje počinje ovdje',
    linksTitle: 'Brzi linkovi i partneri',
    albumTitle: 'Foto Galerija',
    explore: 'Istraži',
  },
  de: {
    heroScroll: 'Entdecke Tuzla',
    cardsTitle: 'Deine Reise beginnt hier',
    linksTitle: 'Schnellzugriffe und Partner',
    albumTitle: 'Fotoalbum',
    explore: 'Entdecken',
  },
  tr: {
    heroScroll: 'Tuzla\'yi Keşfet',
    cardsTitle: 'Yolculuğun Burada Başliyor',
    linksTitle: 'Hizli Linkler ve Partnerler',
    albumTitle: 'Fotoğraf Albümü',
    explore: 'Keşfet',
  },
} as const;

const navCards = [
  { id: AppTab.CITY_GUIDE, title: { en: 'City Guide', bs: 'Gradski Vodič' }, image: '/assets/Gallery/City Guide/GradTuzla-1.webp', color: 'blue' },
  { id: AppTab.FOOD, title: { en: 'Food', bs: 'Hrana' }, image: '/assets/Gallery/Food/foodprime.webp', color: 'orange' },
  { id: AppTab.ACCOMMODATION, title: { en: 'Accommodation', bs: 'Smještaj' }, image: '/assets/Gallery/Accommodation/mellain.webp', color: 'indigo' },
  { id: AppTab.MAP, title: { en: 'Map', bs: 'Mapa' }, image: '/assets/MapaBosnia.webp', color: 'blue' },
];

const externalLinks = [
  { name: 'TZTZ', url: 'https://tztz.ba', logo: '/assets/Gallery/QuestQRLocations/tztzlogo.webp' },
  { name: 'Grad Tuzla', url: 'https://grad.tuzla.ba', logo: '/assets/Gallery/QuestQRLocations/Zastava_tuzle.webp' },
  { name: 'WizzAir', url: 'https://wizzair.com', logo: '/assets/Gallery/QuestQRLocations/wizzurl.webp' },
  { name: 'Ilincica', url: 'https://ilincica.ba', logo: '/assets/Gallery/QuestQRLocations/ilincicaba.webp' },
];

const previewImages = Array.from({ length: 25 }, (_, i) => `/assets/Gallery/Photos/tuzla${i + 1}.webp`)
  .filter(p => p !== '/assets/Gallery/Photos/tuzla2.webp');

const LandingPage: React.FC<LandingPageProps> = ({ lang, onNavigate }) => {
  const t = (copy as any)[lang] || copy.en;
  const { openGallery } = useImage();
  const { platform } = getAppFeatures();
  const [heroLoopCount, setHeroLoopCount] = useState(0);
  const [isHeroPlaying, setIsHeroPlaying] = useState(false);
  const [isHeroReady, setIsHeroReady] = useState(false);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const cardsSectionRef = useRef<HTMLElement>(null);
  const cleanSrc = (src?: string) => {
    if (!src) return '';
    return src.replace(/^["']|["']$/g, '');
  };

  const isDev = import.meta.env.DEV;
  const defaultWebSrc = "/assets/Gallery/Photos/HDweb_compressed.mp4";

  const initialWebSrc = cleanSrc(isDev ? '' : import.meta.env.VITE_VERCEL_BLOB_HERO_WEB) || defaultWebSrc;
  const preferredSrc = initialWebSrc;

  const [videoSrc, setVideoSrc] = useState(preferredSrc);

  const toggleHeroVideo = () => {
    if (heroVideoRef.current) {
      if (isHeroPlaying) {
        heroVideoRef.current.pause();
      } else {
        heroVideoRef.current.play();
        setHeroLoopCount(0); // Reset count if manual play
      }
      setIsHeroPlaying(!isHeroPlaying);
    }
  };

  const handleHeroVideoEnd = () => {
    setIsHeroPlaying(false);
  };

  const handleVideoError = () => {
    const fallback = defaultWebSrc;
    if (videoSrc !== fallback) {
      console.warn(`Video failed to load from ${videoSrc}. Falling back to local asset: ${fallback}`);
      setVideoSrc(fallback);
    } else {
      console.error("Local fallback video also failed to load.");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Tuzla Virtual Tour Guide',
          text: lang === 'bs' ? 'Istraži Tuzlu kroz ovu interaktivnu aplikaciju!' : 'Check out this interactive map and guide to Tuzla!',
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert(lang === 'bs' ? 'Link kopiran!' : 'Link copied to clipboard!');
    }
  };

  return (
    <div className="bg-white">
      {/* 1. HERO SECTION */}
      <section
        className="relative h-screen w-full overflow-hidden bg-white flex items-center justify-center"
      >
        <img
          src="/assets/tuzguide.webp"
          alt="Tuzla Guide"
          className="absolute inset-0 h-full w-full object-cover z-0"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 z-0" />

        <div className="absolute top-[75%] -translate-y-1/2 left-0 right-0 flex flex-col items-center justify-center text-white gap-4 pointer-events-none z-10">
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="flex flex-col items-center gap-2"
          >
            <span className="text-sm font-black uppercase tracking-[0.3em] drop-shadow-lg text-white/90">
              {t.heroScroll}
            </span>
            <ArrowDown className="w-6 h-6 text-white/90 mt-2" />
          </motion.div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-12 space-y-12">
        {/* 2. NAVIGATION CARDS */}
        <section ref={cardsSectionRef} id="explore-sections">
          <div className="mb-10">
            <h2 className="text-[28px] font-black text-blue-900 tracking-tight uppercase font-quicksand">
              {t.cardsTitle}
            </h2>
            <div className="w-20 h-2 bg-blue-600 rounded-full mt-2" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {navCards.map((card) => (
              <button
                key={card.id}
                onClick={() => onNavigate?.(card.id)}
                className="group relative h-[19.2rem] w-full rounded-[2.5rem] overflow-hidden border-2 border-blue-400/60 shadow-[0_0_15px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.8)] transition-all duration-500 hover:-translate-y-2 hover:border-blue-400"
              >
                <img src={card.image} alt={card.id} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-8 left-8 text-left">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">
                    {(card.title as any)[lang] || card.title.en}
                  </h3>
                  <div className="flex items-center gap-2 text-white/80 group-hover:text-white transition-colors">
                    <span className="text-sm font-bold uppercase tracking-widest">{t.explore}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* 2.5. Pannonica Special */}
        <div className="w-full mt-8 relative rounded-[2.5rem] overflow-hidden shadow-2xl border-2 border-blue-400/40 group">
          <div
            className="cursor-pointer"
            onClick={() => openGallery(['/assets/Pannonica.webp', ...previewImages], 0)}
          >
            <img
              src="/assets/Pannonica.webp"
              alt="Pannonica Lakes"
              className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>
          <div className="absolute bottom-4 right-4 bg-black/40 backdrop-blur-sm text-white/80 p-2.5 rounded-2xl pointer-events-none">
            <ZoomIn size={20} />
          </div>
        </div>

        <div className="w-full flex justify-center mt-4">
          <a
            href="https://panonika.ba"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:scale-105 transition-transform duration-300"
          >
            <img
              src="/assets/panonikalogo.webp"
              alt="Pannonica Logo"
              className="w-[200px] h-[50px] object-contain"
            />
          </a>
        </div>

        {/* 3. EXTERNAL PARTNER LINKS */}
        <section className="py-10">
          <div className="mb-8 text-center md:text-left">
            <h2 className="text-[28px] font-black text-blue-900 tracking-tight uppercase font-quicksand">
              {t.linksTitle}
            </h2>
            <div className="w-24 h-2 bg-blue-600 rounded-full mt-2 mx-auto md:mx-0" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {externalLinks.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center justify-center hover:scale-105 transition-transform duration-300 active:scale-95"
              >
                <div className="h-20 w-full flex items-center justify-center">
                  <img src={link.logo} alt={link.name} className="h-full w-auto object-contain drop-shadow-sm group-hover:scale-110 transition-transform" />
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* 4. PHOTO ALBUM */}
        <section>
          <div className="mb-10">
            <h2 className="text-[28px] font-black text-blue-900 tracking-tight uppercase font-quicksand">
              {t.albumTitle}
            </h2>
            <div className="w-20 h-2 bg-blue-600 rounded-full mt-2" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {previewImages.slice(0, 12).map((src, idx) => (
              <button
                key={src}
                onClick={() => openGallery(previewImages, idx)}
                className="relative aspect-square rounded-2xl overflow-hidden border-2 border-blue-400/60 shadow-[0_0_15px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.8)] hover:scale-[1.02] transition-all duration-500 active:scale-95 group"
              >
                <img src={src} alt="Tuzla Photo" className="h-full w-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-blue-600/0 hover:bg-blue-600/10 transition-colors" />
              </button>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-xl font-black text-blue-900/80 italic font-quicksand leading-relaxed max-w-2xl mx-auto px-4">
              {lang === 'bs' || lang === 'en' || lang === 'de' || lang === 'tr'
                ? 'Posjetite Tuzlu' : 'Visit Tuzla'}
            </p>
            <div className="w-12 h-1 bg-amber-400 rounded-full mx-auto mt-4 opacity-50" />
          </div>
        </section>

        {/* 4.5. SMARTPHONE VIDEO */}
        <section className="py-10 flex flex-col items-center">
          <div className="mb-10 text-center">
            <h2 className="text-[28px] font-black text-blue-900 tracking-tight uppercase font-quicksand">
              Video
            </h2>
            <div className="w-16 h-2 bg-blue-600 rounded-full mt-2 mx-auto" />
          </div>
          <div className="relative w-[340px] h-[680px] border-[14px] border-slate-900 rounded-[3rem] bg-black shadow-2xl overflow-hidden ring-4 ring-slate-800">
            <div className="absolute top-0 inset-x-0 h-6 bg-slate-900 rounded-b-2xl w-32 mx-auto z-30"></div>
            <video
              ref={heroVideoRef}
              playsInline
              className="absolute inset-0 h-full w-full object-cover z-0"
              src={videoSrc}
              onEnded={handleHeroVideoEnd}
              onError={handleVideoError}
            />
            <AnimatePresence>
              {!isHeroPlaying && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center z-20 bg-black/30"
                >
                  <button
                    onClick={toggleHeroVideo}
                    className="w-16 h-16 bg-white/20 backdrop-blur-md border border-white/40 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all hover:scale-110 active:scale-95"
                  >
                    <Play className="w-8 h-8 fill-current ml-1" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* 4.6. SOCIAL & COMMUNITY */}
        <section className="pt-8 pb-4">
          <div className="mb-10 text-center flex flex-col items-center">
            <h2 className="text-[28px] font-black text-blue-900 tracking-tight uppercase font-quicksand">
              {lang === 'bs' ? 'Zajednica & Mreže' : 'Community & Social'}
            </h2>
            <div className="w-20 h-2 bg-blue-600 rounded-full mt-2" />
          </div>

          <div className="flex flex-col items-center gap-8">
            <div className="flex justify-center flex-wrap gap-4 sm:gap-6">
              <a href="https://x.com/icptuzla" className="p-4 rounded-full bg-slate-100 text-slate-400 hover:text-[#1DA1F2] hover:bg-[#1DA1F2]/10 transition-colors relative group">
                <img src="/assets/x.svg" alt="X" className="w-6 h-6" />
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] uppercase font-bold px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Twitter (X)</span>
              </a>
              <a href="https://bsky.app/profile/aisotuzla.bsky.social" className="p-4 rounded-full bg-slate-100 text-slate-400 hover:text-[#0285FF] hover:bg-[#0285FF]/10 transition-colors relative group">
                <img src="/assets/bluesky.svg" alt="Bluesky" className="w-6 h-6" />
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] uppercase font-bold px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Bluesky</span>
              </a>
              <a href="https://www.facebook.com/AmirICPTuzla" className="p-4 rounded-full bg-slate-100 text-slate-400 hover:text-[#4267B2] hover:bg-[#4267B2]/10 transition-colors relative group">
                <Facebook className="w-6 h-6" />
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] uppercase font-bold px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Facebook</span>
              </a>
              <a href="https://www.linkedin.com/in/icptuzla-amir-mulaosmanovic-ab356a34b/" className="p-4 rounded-full bg-slate-100 text-slate-400 hover:text-[#0077b5] hover:bg-[#0077b5]/10 transition-colors relative group">
                <Linkedin className="w-6 h-6" />
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] uppercase font-bold px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">LinkedIn</span>
              </a>
              <button onClick={handleShare} className="p-4 rounded-full bg-slate-100 text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition-colors relative group cursor-pointer">
                <Share2 className="w-6 h-6" />
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] uppercase font-bold px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Share App</span>
              </button>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-8 text-sm font-bold uppercase tracking-widest">
              <a
                href="#"
                className="flex items-center gap-2 group hover:text-blue-600 transition-colors border-b-2 border-transparent hover:border-blue-600 pb-1 text-slate-400"
              >
                <img
                  src="/assets/aisologo.webp"
                  alt="AISO Logo"
                  className="w-6 h-6 object-contain pointer-events-none group-hover:scale-110 transition-transform"
                />
                <span>AISO Tuzla</span>
              </a>
            </div>
          </div>
        </section>

        {/* 5. EXPLORE MORE ENDING */}
        <section className="py-12 border-t border-slate-100 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="inline-block p-4 bg-blue-50 rounded-3xl mb-4">
              <Home className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-4xl font-black text-blue-900 uppercase tracking-tight font-quicksand">
              {lang === 'bs' ? 'Istražite više' : 'Explore More'}
            </h2>
            <p className="text-slate-500 max-w-lg mx-auto text-lg leading-relaxed font-medium">
              {lang === 'bs'
                ? 'Vaše putovanje se ne završava ovdje. Tuzla nudi beskrajne priče i skrivene dragulje.'
                : 'Your journey doesn\'t end here. Tuzla offers endless stories and hidden gems waiting to be discovered.'}
            </p>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="mt-8 px-12 py-5 bg-blue-600 text-white font-black rounded-[2rem] shadow-2xl hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest text-sm flex items-center gap-3 mx-auto font-quicksand"
            >
              <ArrowUp className="w-5 h-5" />
              {lang === 'bs' ? 'Povratak na vrh' : 'Back to Home'}
            </button>
          </motion.div>
        </section>
      </div>


    </div>
  );
};

export default LandingPage;

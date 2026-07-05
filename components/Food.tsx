import React, { useState } from 'react';
import { Language } from '../types';
import { TRANSLATIONS, ALL_TUZLA_VENUES } from '../constants';
import {
  ExternalLink,
  UtensilsCrossed,
  Navigation,
  Star,
  Bike,
  Utensils,
  Coffee,
  Plus,
  Check,
  ChevronRight
} from 'lucide-react';
import { LocationData } from '../types';
import { addToItinerary } from '../utils/itineraryUtils';
import { useImage } from '../hooks/ImageContext';

/* ─── All Venues Sub-component ─── */
const AllVenuesSection: React.FC<{ lang: Language }> = ({ lang }) => {
  const [filter, setFilter] = useState<'All' | 'Dining'>('All');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const filtered = filter === 'All' ? ALL_TUZLA_VENUES : ALL_TUZLA_VENUES.filter(v => v.type === filter);

  const handleAddToItinerary = async (venue: LocationData) => {
    const type = venue.type === 'Dining' ? 'Restaurant' : 'Attraction';
    const added = await addToItinerary(venue.name, venue.address, type);
    if (added) {
      setAddedIds(prev => new Set(prev).add(venue.name));
    }
  };

  const typeLabel = (v: LocationData) => {
    if (v.type === 'Dining') return lang === 'en' ? 'Dining' : lang === 'de' ? 'Restaurant' : 'Restoran';
    return lang === 'en' ? 'Dessert' : lang === 'de' ? 'Dessert' : 'Desert';
  };

  return (
    <div className="w-full flex flex-col gap-8">
      <div className="space-y-2 border-b border-blue-100 pb-6">
        <h2 className="text-3xl font-black text-blue-950 uppercase flex items-center gap-3">
          <Utensils className="w-8 h-8 text-blue-600" />
          {lang === 'en' ? 'Food Places' : lang === 'bs' ? 'Hrana i piće' : lang === 'de' ? 'Essensplätze' : 'Yemek Mekanları'}
        </h2>
        <p className="text-blue-500/80 font-semibold uppercase text-xs tracking-[0.2em]">
          {lang === 'en' ? 'Best dining in one place' : lang === 'de' ? 'Restaurants an einem Ort' : lang === 'tr' ? 'En iyi restoranlar tek yerde' : 'Restorani na jednom mjestu'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['All', 'Dining'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest border transition-all ${filter === f
                ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20'
                : 'bg-white text-blue-700 border-blue-200 hover:-translate-y-0.5'
              }`}
          >
            {f === 'All' ? (lang === 'en' ? 'All' : lang === 'de' ? 'Alle' : 'Sve')
              : (lang === 'en' ? 'Dining' : lang === 'de' ? 'Restaurant' : 'Restorani')}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((venue, idx) => (
          <div
            key={idx}
            className="group bg-white p-6 rounded-[2rem] border border-blue-400/40 shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:shadow-[0_0_25px_rgba(59,130,246,0.6)] hover:border-blue-400 transition-all hover:-translate-y-1 flex flex-col"
          >
            {venue.image && (
              <div className="w-full h-40 sm:h-48 rounded-2xl overflow-hidden mb-5 shadow-inner bg-blue-50/50">
                <img
                  src={venue.image}
                  alt={venue.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
            )}
            <div className="space-y-4 flex-grow">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-black text-blue-950 leading-tight group-hover:text-blue-600 transition-colors">
                  {venue.name}
                </h3>
                <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg shrink-0 ml-2">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  <span className="text-[10px] font-black text-yellow-700">{venue.rating}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-600">
                  <Star className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs font-bold leading-tight">{venue.address}</span>
                </div>
                <div className="flex items-center gap-2 text-blue-900/50">
                  <UtensilsCrossed className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs font-semibold">{venue.category}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-blue-50">
                <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-green-50 text-green-600 border border-green-100`}>
                  {typeLabel(venue)}
                </span>
                <span className="text-[10px] font-black text-blue-400">
                  {venue.user_ratings_total} {lang === 'en' ? 'reviews' : lang === 'de' ? 'Bewertungen' : lang === 'tr' ? 'yorum' : 'recenzija'}
                </span>
              </div>

              {/* Website Link */}
              <div className="flex flex-col gap-2">
                {venue.website && (
                  <a
                    href={venue.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-50 text-blue-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                  >
                    {lang === 'en' ? 'Visit' : lang === 'de' ? 'Besuchen' : 'Posjeti'}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <button
                onClick={() => handleAddToItinerary(venue)}
                disabled={addedIds.has(venue.name)}
                className={`flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-sm ${addedIds.has(venue.name)
                    ? 'bg-green-50 text-green-600 border border-green-200 cursor-default'
                    : 'bg-yellow-500 text-white hover:bg-yellow-600 active:scale-95'
                  }`}
              >
                {addedIds.has(venue.name) ? (
                  <><Check className="w-3.5 h-3.5" /> {lang === 'en' ? 'In Plan' : lang === 'de' ? 'In Plan' : 'U planu'}</>
                ) : (
                  <><Plus className="w-3.5 h-3.5" /> {lang === 'en' ? 'Itinerary' : lang === 'de' ? 'Plan' : 'Plan'}</>
                )}
              </button>
            </div>
          </div>
        ))}

        {/* Food Delivery Special Card Relocated to the End */}
        <a
          href="https://korpa.ba/kategorije?kat=&min="
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col bg-white p-6 rounded-[2rem] border border-blue-400/40 shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:shadow-[0_0_25px_rgba(59,130,246,0.6)] hover:border-blue-400 transition-all hover:-translate-y-1"
        >
          <div className="space-y-4 flex-grow flex flex-col">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-black text-blue-950 leading-tight group-hover:text-blue-600 transition-colors uppercase">
                {lang === 'bs' ? 'Dostava Hrane' : lang === 'de' ? 'Essenslieferung' : lang === 'tr' ? 'Yemek Teslimatı' : 'Food Delivery'}
              </h3>
              <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg shrink-0 ml-2 border border-blue-100">
                <Bike className="w-3 h-3 text-blue-500" />
              </div>
            </div>

            <div className="w-full h-24 sm:h-28 rounded-xl overflow-hidden shadow-inner bg-blue-50/50 flex items-center justify-center p-2">
              <img
                src="/assets/Gallery/Food/korpa.webp"
                alt="korpa.ba"
                className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
              />
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <div className="flex items-center gap-2 text-blue-600">
                <UtensilsCrossed className="w-4 h-4 shrink-0" />
                <span className="text-xs font-bold leading-tight">korpa.ba</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 w-full py-3 mt-auto rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-sm bg-yellow-500 text-white hover:bg-yellow-600 active:scale-95">
              {lang === 'en' ? 'Order' : lang === 'bs' ? 'Naruči' : lang === 'de' ? 'Bestellen' : 'Sipariş'}
              <ExternalLink className="w-3.5 h-3.5" />
            </div>
          </div>
        </a>
      </div>
    </div>
  );
};

interface FoodProps {
  lang: Language;
}

const Food: React.FC<FoodProps> = ({ lang }) => {
  const { openGallery } = useImage();

  const restaurantImages = [
    { src: '/assets/Gallery/Food/RESTAURANTS1.webp', alt: 'Restaurants List 1' },
    { src: '/assets/Gallery/Food/RESTAURANTS2.webp', alt: 'Restaurants List 2' },
    { src: '/assets/Gallery/Food/RESTAURANTS3.webp', alt: 'Restaurants List 3' },
    { src: '/assets/Gallery/Food/RESTAURANTS4.webp', alt: 'Restaurants List 4' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-32 space-y-16 overflow-x-hidden">
      <header className="text-center space-y-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-blue-700 shadow-sm">
            <UtensilsCrossed className="h-4 w-4" />
            {lang === 'en' ? 'Food & Drink' : lang === 'de' ? 'Essen & Trinken' : lang === 'tr' ? 'Yemek & İçecek' : 'Hrana i piće'}
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-blue-950 uppercase tracking-tighter">
            {lang === 'en' ? 'Gastronomy' : lang === 'de' ? 'Gastronomie' : lang === 'tr' ? 'Gastronomi' : 'Gastronomija'}
          </h1>
          <p className="text-blue-600 font-medium text-lg max-w-2xl mx-auto leading-relaxed">
            {lang === 'en'
              ? 'Discover best restaurants and local flavors in Tuzla.'
              : lang === 'de'
                ? 'Entdecken Sie die besten Restaurants und lokalen Spezialitäten in Tuzla.'
                : lang === 'tr'
                  ? 'Tuzla\'nın en iyi restoranlarını ve yerel lezzetlerini keşfedin.'
                  : 'Otkrijte najbolje restorane i lokalne okuse u Tuzli.'}
          </p>
        </div>

      </header>

      <section className="w-full">
        <AllVenuesSection lang={lang} />
      </section>

      {/* 4 Image Scrollable Row */}
      <div className="w-full flex overflow-x-auto gap-4 sm:gap-6 snap-x snap-mandatory hide-scrollbar pb-6 px-4 -mx-4 mt-16 pt-12 border-t border-blue-50">
        {restaurantImages.map((img, index) => (
          <div
            key={index}
            onClick={() => openGallery(restaurantImages.map(r => r.src), index)}
            className="relative w-[300px] sm:w-[350px] shrink-0 h-[500px] sm:h-[600px] rounded-3xl overflow-hidden shadow-2xl border-4 border-white cursor-pointer snap-center group"
          >
            <img
              src={img.src}
              alt={img.alt}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-300" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Food;

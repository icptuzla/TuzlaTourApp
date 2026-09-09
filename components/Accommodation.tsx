
import React, { useState } from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';
import {
  ExternalLink,
  Info,
  ChevronRight,
  MapPin,
  Building2,
  Globe,
  Phone,
  Star,
  Plus,
  Check
} from 'lucide-react';
import { tuzlaHotelData, HotelData } from '../tuzlaHotelData';
import { addToItinerary } from '../utils/itineraryUtils';
import { useImage } from '../hooks/ImageContext';
const copy = {
  en: {
    allHotels: 'All Hotels', verified: 'Verified accommodations in Tuzla', priceRange: 'Price range', reviews: 'reviews', visitUs: 'Visit Us', added: 'Added', itinerary: 'Itinerary', rentalsTitle: 'Rental Offers', rentalsText: 'Direct booking rental places in Tuzla.', scanOrTap: 'Scan or tap to book', stayBadge: 'Stay in Tuzla', title: 'Accommodation', subtitle: 'Hotels, apartments, and travel links in one place.', sidebarHint: 'Use the sidebar for History, Map, Quest, and Gallery.', disclaimerTitle: 'Disclaimer', disclaimerBody: 'TuzlaTour is an informational guide. We are not responsible for bookings, reservations, or the service quality of the listed hotels and apartments. All reservations are made directly with the respective providers.',
  },
  bs: {
    allHotels: 'Svi hoteli', verified: 'Verificirani smještaj u Tuzli', priceRange: 'Cijena', reviews: 'recenzija', visitUs: 'Posjetite nas', added: 'Dodano', itinerary: 'Plan', rentalsTitle: 'Apartmani Tuzla', rentalsText: 'Ponuda smještaja u Tuzli.', scanOrTap: 'Skeniraj ili dodirni za rezervaciju', stayBadge: 'Smještaj u Tuzli', title: 'Smještaj', subtitle: 'Hoteli, apartmani i putni linkovi na jednom mjestu.', sidebarHint: 'Koristi bočnu traku za historiju, mapu, quest i galeriju.', disclaimerTitle: 'Izjava o odricanju odgovornosti', disclaimerBody: 'TuzlaTour je informativni vodič. Ne snosimo odgovornost za rezervacije, ugovaranje smještaja niti za kvalitet usluge navedenih hotela i apartmana. Sve rezervacije se vrše direktno kod odgovarajućih pružaoca usluga.',
  },
  de: {
    allHotels: 'Alle Hotels', verified: 'Verifizierte Unterkünfte in Tuzla', priceRange: 'Preisspanne', reviews: 'Bewertungen', visitUs: 'Besuchen', added: 'Hinzugefügt', itinerary: 'Plan', rentalsTitle: 'Möblierte Wohnungen', rentalsText: 'Möblierte Wohnungen in Tuzla.', scanOrTap: 'Scannen oder tippen', stayBadge: 'Unterkunft in Tuzla', title: 'Unterkunft', subtitle: 'Hotels, Apartments und Reiselinks an einem Ort.', sidebarHint: 'Nutze die Seitenleiste für Geschichte, Karte, Quest und Galerie.', disclaimerTitle: 'Haftungsausschluss', disclaimerBody: 'TuzlaTour ist ein Informationsführer. Wir sind nicht verantwortlich für Buchungen, Reservierungen oder die Servicequalität der aufgeführten Hotels und Apartments. Alle Reservierungen werden direkt bei den jeweiligen Anbietern vorgenommen.',
  },
  tr: {
    allHotels: 'Tüm Oteller', verified: 'Tuzla’da doğrulanmış konaklama seçenekleri', priceRange: 'Fiyat aralığı', reviews: 'yorum', visitUs: 'Ziyaret et', added: 'Eklendi', itinerary: 'Plan', rentalsTitle: 'Kiralık Daireler', rentalsText: 'Tuzla’da doğrudan rezervasyon yapılabilen kiralık yerler.', scanOrTap: 'Rezervasyon için tarayın veya dokunun', stayBadge: 'Tuzla’da Kal', title: 'Konaklama', subtitle: 'Oteller, daireler ve seyahat bağlantıları tek yerde.', sidebarHint: 'Tarih, Harita, Görev ve Galeri için kenar çubuğunu kullanın.', disclaimerTitle: 'Sorumluluk Reddi', disclaimerBody: 'TuzlaTour bilgilendirme amaçlı bir rehberdir. Listelenen otel ve dairelerin rezervasyonlarından, konaklama anlaşmalarından veya hizmet kalitesinden sorumlu değiliz. Tüm rezervasyonlar doğrudan ilgili hizmet sağlayıcılarla yapılır.',
  },
} as const;

/* â”€â”€â”€ Hotel Cards Sub-component â”€â”€â”€ */
const HotelCardsSection: React.FC<{ lang: Language }> = ({ lang }) => {
  const t = copy[lang] ?? copy.en;
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const handleAddToItinerary = async (hotel: HotelData) => {
    const added = await addToItinerary(hotel.name, hotel.address, 'Hotel');
    if (added) {
      setAddedIds(prev => new Set(prev).add(hotel.name));
    }
  };

  const ratingDots = (rating: number) => {
    const filled = Math.round((rating / 10) * 5);
    return Array.from({ length: 5 }, (_, i) => i < filled);
  };

  return (
    <div className="w-full flex flex-col gap-8">
      <div className="space-y-2 border-b border-blue-100 pb-6">
        <h2 className="text-3xl font-black text-blue-950 uppercase flex items-center gap-3">
          <Building2 className="w-8 h-8 text-blue-600" />
          {t.allHotels}
        </h2>
        <p className="text-blue-500/80 font-semibold uppercase text-xs tracking-[0.2em]">
          {t.verified}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {tuzlaHotelData.map((hotel, idx) => (
          <div
            key={idx}
            className="group relative bg-white rounded-[2.5rem] overflow-hidden border border-blue-400/40 shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:shadow-[0_0_25px_rgba(59,130,246,0.6)] hover:border-blue-400 transition-all"
          >
            {/* Image */}
            <div className="relative h-52 overflow-hidden bg-gradient-to-br from-blue-100 to-cyan-50">
              {hotel.image ? (
                <img
                  src={hotel.image}
                  alt={hotel.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Building2 className="w-16 h-16 text-blue-300" />
                </div>
              )}
              <div className="absolute top-4 right-4 flex items-center gap-1 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-md">
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-black text-blue-950">{hotel.rating}</span>
              </div>
              <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-white to-transparent" />
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-xl font-black text-blue-950 uppercase tracking-tight">{hotel.name}</h3>
                <p className="mt-1 text-sm text-blue-600/70 leading-relaxed">{hotel.description[lang]}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-2 text-blue-600">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="text-xs font-bold leading-tight">{hotel.address}</span>
                </div>
                {hotel.phone && (
                  <a href={`tel:${hotel.phone}`} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors">
                    <Phone className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-bold">{hotel.phone}</span>
                  </a>
                )}
              </div>

              {/* Amenities */}
              <div className="flex flex-wrap gap-1.5">
                {hotel.amenities.map(a => (
                  <span key={a} className="px-2.5 py-1 rounded-full bg-blue-50 text-[9px] font-black text-blue-700 uppercase tracking-wider border border-blue-100">
                    {a}
                  </span>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-blue-50">
                <div>
                  <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">
                    {t.priceRange}
                  </p>
                  <p className="font-black text-blue-950 text-sm">{hotel.priceRange}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {ratingDots(hotel.rating).map((filled, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full ${filled ? 'bg-yellow-500' : 'bg-gray-200'}`} />
                  ))}
                  <span className="text-[9px] font-bold text-blue-900/40 ml-1">{hotel.user_ratings_total} {t.reviews}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {hotel.website && (
                  <a
                    href={hotel.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                  >
                    {t.visitUs}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <button
                  onClick={() => handleAddToItinerary(hotel)}
                  disabled={addedIds.has(hotel.name)}
                  className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-sm ${addedIds.has(hotel.name)
                    ? 'bg-green-50 text-green-600 border border-green-200 cursor-default'
                    : 'bg-yellow-500 text-white hover:bg-yellow-600 active:scale-95'
                    }`}
                >
                  {addedIds.has(hotel.name) ? (
                    <><Check className="w-3.5 h-3.5" /> {t.added}</>
                  ) : (
                    <><Plus className="w-3.5 h-3.5" /> {t.itinerary}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Standalone Direct Booking Card */}
        <div className="group relative bg-white rounded-[2.5rem] overflow-hidden border-2 border-dashed border-blue-400/40 shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:shadow-[0_0_25px_rgba(59,130,246,0.6)] hover:border-blue-400 transition-all bg-blue-50/30 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-blue-100 group-hover:scale-110 transition-transform duration-500">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-black text-blue-950 uppercase tracking-tight">
              {t.rentalsTitle}
            </h3>
            <p className="text-[11px] text-blue-600/70 font-bold leading-relaxed max-w-[240px]">
              {t.rentalsText}
            </p>
          </div>

          <a
            href="https://www.ba-hotel.com/en/tuzla-hotels-46026/vacation-rentals/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-3 group/qr"
          >
            <div className="p-3 bg-white rounded-3xl shadow-xl border border-blue-100 group-hover/qr:rotate-2 transition-transform">
              <img
                src="/assets/Gallery/Accommodation/accommodationsQR.webp"
                alt="Direct Booking QR"
                className="w-40 h-40 sm:w-48 sm:h-48"
              />
            </div>
            <div className="px-5 py-2 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 group-hover/qr:bg-blue-700 transition-colors">
              {t.scanOrTap}
              <ExternalLink className="w-3 h-3" />
            </div>
          </a>
        </div>
      </div>
    </div>
  );
};

interface AccommodationProps {
  lang: Language;
}

const Accommodation: React.FC<AccommodationProps> = ({ lang }) => {
  const t = copy[lang] ?? copy.en;
  const { openGallery } = useImage();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-32 space-y-16">
      <header className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-blue-700 shadow-sm">
          <Building2 className="h-4 w-4" />
          {t.stayBadge}
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-blue-950 uppercase tracking-tighter">
          {t.title}
        </h1>
        <p className="text-blue-600 font-medium text-lg max-w-2xl mx-auto leading-relaxed">
          {t.subtitle}
        </p>
      </header>

      <section className="w-full">
        <HotelCardsSection lang={lang} />
      </section>

      <section className="flex items-center gap-3 rounded-[2rem] border border-blue-100 bg-white px-5 py-4 text-sm text-blue-900 shadow-sm">
        <Globe className="h-5 w-5 text-blue-600" />
        <div className="leading-6">
          {t.sidebarHint}
        </div>
      </section>

      <section className="flex items-start gap-4 rounded-[2rem] border border-amber-200 bg-amber-50/50 px-6 py-5 text-sm text-amber-900/90 shadow-sm">
        <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-black uppercase tracking-widest text-[10px] text-amber-700">
            {t.disclaimerTitle}
          </p>
          <p className="leading-relaxed font-medium">
            {t.disclaimerBody}
          </p>
        </div>
      </section>
    </div>
  );
};

export default Accommodation;

import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Ticket,
  Search,
  Plus,
  Check,
  RefreshCw,
  Upload,
  FileText,
  Copy,
  Trash2,
  X,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { Language } from '../types';
import { VerifiedEvent, VerifiedEventCategory } from '../types/events';
import { addToItinerary } from '../utils/itineraryUtils';

interface CalendarViewProps {
  lang: Language;
}

const MONTH_NAMES_BS = [
  'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Juni',
  'Juli', 'August', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
];

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_BS = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'];
const DAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const ALLOWED_YEARS = [2026, 2027];

const CATEGORIES: VerifiedEventCategory[] = ['Music', 'Culture', 'Theatre', 'Sport', 'Panonnica'];

const SAMPLE_JSON_PROMPT = `[
  {
    "title": "Koncert u Parku",
    "category": "Music",
    "start_date": "2026-08-25",
    "start_time": "20:00",
    "venue_name": "Soni Trg",
    "price": "Besplatno"
  }
]`;

const LOCAL_STORAGE_KEY = 'tuzla_manual_events_v1';

const getInitialCalendarState = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const initialYear = ALLOWED_YEARS.includes(currentYear)
    ? currentYear
    : ALLOWED_YEARS[0];

  const monthStr = String(currentMonth + 1).padStart(2, '0');
  const dayStr = String(now.getDate()).padStart(2, '0');
  const initialDateStr = `${initialYear}-${monthStr}-${dayStr}`;

  return { initialYear, initialMonth: currentMonth, initialDateStr };
};

export const EventCalendarView: React.FC<CalendarViewProps> = ({ lang }) => {
  const { initialYear, initialMonth, initialDateStr } = useMemo(() => getInitialCalendarState(), []);

  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth);
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(initialDateStr);

  const [events, setEvents] = useState<VerifiedEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [addedEvents, setAddedEvents] = useState<string[]>([]);

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Import Modal & Form states
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importTab, setImportTab] = useState<'json' | 'form'>('form');
  const [jsonInput, setJsonInput] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Manual Form State
  const [formTitle, setFormTitle] = useState<string>('');
  const [formCategory, setFormCategory] = useState<VerifiedEventCategory>('Culture');
  const [formDate, setFormDate] = useState<string>(initialDateStr);
  const [formTime, setFormTime] = useState<string>('20:00');
  const [formVenue, setFormVenue] = useState<string>('Tuzla');
  const [formPrice, setFormPrice] = useState<string>('Besplatno');

  const getLocalStoredEvents = (): VerifiedEvent[] => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore error
    }
    return [];
  };

  const saveLocalStoredEvents = (newEvents: VerifiedEvent[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newEvents));
    } catch {
      // ignore
    }
  };

  const loadEvents = async () => {
    setLoading(true);
    let serverEvents: VerifiedEvent[] = [];
    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        serverEvents = await res.json();
      }
    } catch (err) {
      console.warn('API events fetch fallback to local storage');
    }

    // Merge server events with locally saved manual events
    const localEvents = getLocalStoredEvents();
    const map = new Map<string, VerifiedEvent>();

    serverEvents.forEach(e => map.set(e.id, e));
    localEvents.forEach(e => map.set(e.id, e));

    const merged = Array.from(map.values());
    setEvents(merged);
    setLoading(false);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleAddToItinerary = async (evt: VerifiedEvent) => {
    await addToItinerary(evt.title, `${evt.venue_name} (${evt.start_date} @ ${evt.start_time})`, 'Attraction');
    setAddedEvents(prev => [...prev, evt.id]);
  };

  const handleDeleteEvent = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(lang === 'bs' ? 'Da li ste sigurni da želite obrisati ovaj događaj?' : 'Are you sure you want to delete this event?')) {
      return;
    }

    // Update local state
    const updated = events.filter(evt => evt.id !== id);
    setEvents(updated);
    saveLocalStoredEvents(updated);

    // Call API if available
    try {
      await fetch(`/api/events?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch {
      // Ignore API errors for client-only fallback
    }
  };

  const processImportedEvents = async (rawList: any[]) => {
    if (!Array.isArray(rawList) || rawList.length === 0) {
      throw new Error(lang === 'bs' ? 'Nisu pronađeni validni podaci u JSON-u.' : 'No valid event items found in JSON.');
    }

    const normalized: VerifiedEvent[] = rawList
      .filter(item => item && typeof item === 'object' && (item.title || item.name))
      .map((item, idx) => {
        const cleanTitle = String(item.title || item.name || '').trim();
        const rawCat = String(item.category || '').trim();

        let category: VerifiedEventCategory = 'Culture';
        if (CATEGORIES.includes(rawCat as any)) {
          category = rawCat as VerifiedEventCategory;
        } else if (cleanTitle.toLowerCase().includes('jazz') || cleanTitle.toLowerCase().includes('koncert') || cleanTitle.toLowerCase().includes('dj')) {
          category = 'Music';
        } else if (cleanTitle.toLowerCase().includes('film') || cleanTitle.toLowerCase().includes('kino') || cleanTitle.toLowerCase().includes('izložba')) {
          category = 'Culture';
        } else if (cleanTitle.toLowerCase().includes('teatar') || cleanTitle.toLowerCase().includes('predstava')) {
          category = 'Theatre';
        }

        let startDate = String(item.start_date || '').trim();
        let startTime = item.start_time ? String(item.start_time).trim() : '20:00';

        if (item.date_time) {
          const parts = String(item.date_time).trim().split(' ');
          if (parts[0]) startDate = parts[0];
          if (parts[1]) startTime = parts[1];
        }

        if (!startDate) {
          startDate = new Date().toISOString().split('T')[0];
        }

        const venueName = item.venue_name || item.location ? String(item.venue_name || item.location).trim() : 'Tuzla';
        const city = item.city ? String(item.city).trim() : 'Tuzla';
        const price = item.price ? String(item.price).trim() : 'Besplatno';

        const sourceUrl = item.link || item.source_url;
        const sourceUrls = Array.isArray(item.source_urls)
          ? item.source_urls
          : (sourceUrl ? [sourceUrl] : []);

        return {
          id: item.id || `evt-${startDate}-${cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}-${idx}`,
          title: cleanTitle,
          category,
          start_date: startDate,
          start_time: startTime,
          venue_name: venueName,
          city,
          price,
          source_urls: sourceUrls,
          verification_sources: ['Private AICrawler Import'],
          verified: true,
          updated_at: new Date().toISOString()
        };
      });

    if (normalized.length === 0) {
      throw new Error(lang === 'bs' ? 'Nisu pronađeni validni događaji u JSON-u.' : 'No valid events parsed from JSON.');
    }

    // Try saving to backend API
    try {
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalized)
      });
    } catch (err) {
      console.warn('API post fallback to local storage');
    }

    // Update local state and localStorage
    const currentLocal = getLocalStoredEvents();
    const map = new Map<string, VerifiedEvent>();
    events.forEach(e => map.set(e.id, e));
    currentLocal.forEach(e => map.set(e.id, e));
    normalized.forEach(e => map.set(e.id, e));

    const merged = Array.from(map.values());
    saveLocalStoredEvents(merged);
    setEvents(merged);

    return normalized.length;
  };

  const handleJsonImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);
    setImportSuccess(null);
    setIsSubmitting(true);

    try {
      let parsed: any;
      try {
        parsed = JSON.parse(jsonInput);
      } catch (err) {
        throw new Error(lang === 'bs' ? 'Neispravan JSON format. Provjerite zagrade i navodnike.' : 'Invalid JSON format. Check brackets and quotes.');
      }

      const list = Array.isArray(parsed) ? parsed : [parsed];
      const count = await processImportedEvents(list);

      setImportSuccess(
        lang === 'bs'
          ? `Uspješno uvezeno ${count} događaja sa vašeg AICrawler-a!`
          : `Successfully imported ${count} event(s) from your AICrawler!`
      );
      setJsonInput('');
      setTimeout(() => setShowImportModal(false), 1500);
    } catch (err: any) {
      setImportError(err.message || 'Import failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);
    setImportSuccess(null);

    if (!formTitle.trim() || !formDate.trim()) {
      setImportError(lang === 'bs' ? 'Naziv i Datum su obavezni.' : 'Title and Date are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const singleEvent = {
        title: formTitle,
        category: formCategory,
        start_date: formDate,
        start_time: formTime,
        venue_name: formVenue,
        price: formPrice
      };

      await processImportedEvents([singleEvent]);
      setImportSuccess(lang === 'bs' ? 'Događaj uspješno dodan!' : 'Event added successfully!');
      setFormTitle('');
      setTimeout(() => setShowImportModal(false), 1200);
    } catch (err: any) {
      setImportError(err.message || 'Add event failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPromptSample = () => {
    navigator.clipboard.writeText(SAMPLE_JSON_PROMPT);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const months = lang === 'bs' ? MONTH_NAMES_BS : MONTH_NAMES_EN;
  const days = lang === 'bs' ? DAYS_BS : DAYS_EN;

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1);
    const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0);

    const daysInMonth = lastDayOfMonth.getDate();
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysArray: { dateStr: string | null; dayNumber: number | null; isCurrentMonth: boolean }[] = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      daysArray.push({ dateStr: null, dayNumber: null, isCurrentMonth: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const monthStr = String(selectedMonth + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const fullDateStr = `${selectedYear}-${monthStr}-${dayStr}`;
      daysArray.push({ dateStr: fullDateStr, dayNumber: d, isCurrentMonth: true });
    }

    return daysArray;
  }, [selectedYear, selectedMonth]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, VerifiedEvent[]> = {};
    events.forEach((evt) => {
      if (!map[evt.start_date]) {
        map[evt.start_date] = [];
      }
      map[evt.start_date].push(evt);
    });
    return map;
  }, [events]);

  const filteredSelectedDayEvents = useMemo(() => {
    if (!selectedDateStr) return [];
    let list = eventsByDate[selectedDateStr] || [];
    if (activeCategory !== 'All') {
      list = list.filter((e) => e.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.venue_name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [eventsByDate, selectedDateStr, activeCategory, searchQuery]);

  const upcomingEventsInMonth = useMemo(() => {
    const monthPrefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    let list = events.filter((e) => e.start_date.startsWith(monthPrefix));
    if (activeCategory !== 'All') {
      list = list.filter((e) => e.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.venue_name.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => a.start_date.localeCompare(b.start_date));
  }, [events, selectedYear, selectedMonth, activeCategory, searchQuery]);

  const handlePrevMonth = () => {
    const minYear = ALLOWED_YEARS[0];
    if (selectedMonth === 0) {
      if (selectedYear > minYear) {
        setSelectedYear(selectedYear - 1);
        setSelectedMonth(11);
      }
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    const maxYear = ALLOWED_YEARS[ALLOWED_YEARS.length - 1];
    if (selectedMonth === 11) {
      if (selectedYear < maxYear) {
        setSelectedYear(selectedYear + 1);
        setSelectedMonth(0);
      }
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header Banner */}
      <div className="flex flex-col gap-4 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
            <CalendarIcon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 sm:text-2xl">
              {lang === 'bs' ? 'Kalendar Događaja' : 'Events Calendar'}
            </h2>
            <p className="text-xs font-semibold text-slate-500 sm:text-sm">
              {lang === 'bs'
                ? 'Tuzla Tour Guide • Kalendar kulturnih i zabavnih dešavanja u Tuzli'
                : 'Tuzla Tour Guide • Cultural and entertainment event calendar in Tuzla'}
            </p>
          </div>
        </div>

        {/* Add Event Button & Year Selector */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>{lang === 'bs' ? 'Dodaj Događaj' : 'Add Event'}</span>
          </button>

          {ALLOWED_YEARS.map((yr) => (
            <button
              key={yr}
              onClick={() => setSelectedYear(yr)}
              className={`rounded-2xl px-4 py-2.5 text-xs font-black transition-all ${selectedYear === yr
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              {yr}
            </button>
          ))}

          <button
            onClick={loadEvents}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-all disabled:opacity-50"
            title="Refresh events"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Month Header Nav & Search Bar */}
      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="flex items-center justify-between rounded-2xl border border-blue-100 bg-white p-3 shadow-xs">
          <button
            onClick={handlePrevMonth}
            disabled={selectedYear === ALLOWED_YEARS[0] && selectedMonth === 0}
            className="rounded-xl border border-slate-100 p-2 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <span className="text-lg font-black text-slate-800 sm:text-xl">
            {months[selectedMonth]} {selectedYear}
          </span>

          <button
            onClick={handleNextMonth}
            disabled={selectedYear === ALLOWED_YEARS[ALLOWED_YEARS.length - 1] && selectedMonth === 11}
            className="rounded-xl border border-slate-100 p-2 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Category & Search Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'bs' ? 'Pretraži događaje...' : 'Search events...'}
              className="w-full rounded-2xl border border-blue-100 bg-white py-2.5 pl-9 pr-4 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
            className="rounded-2xl border border-blue-100 bg-white px-3 py-2.5 text-xs font-black text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="All">{lang === 'bs' ? 'Sve Kategorije' : 'All Categories'}</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid Layout: Calendar Box vs Event List */}
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Calendar Grid Box */}
        <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white p-4 shadow-sm sm:p-5">
          {/* Day Headers */}
          <div className="grid grid-cols-7 mb-2 gap-1 text-center">
            {days.map((day, idx) => (
              <div key={idx} className="py-2 text-xs font-black uppercase tracking-wider text-slate-400">
                {day}
              </div>
            ))}
          </div>

          {/* Day Boxes */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarDays.map((item, index) => {
              if (!item.isCurrentMonth || !item.dateStr) {
                return (
                  <div
                    key={index}
                    className="min-h-[70px] sm:min-h-[90px] rounded-2xl border border-transparent bg-slate-50/50 opacity-30"
                  />
                );
              }

              const dayEvents = eventsByDate[item.dateStr] || [];
              const isSelected = selectedDateStr === item.dateStr;
              const hasEvents = dayEvents.length > 0;

              return (
                <div
                  key={index}
                  onClick={() => setSelectedDateStr(item.dateStr)}
                  className={`group relative flex min-h-[75px] sm:min-h-[95px] flex-col justify-between rounded-2xl border p-2 text-left transition-all cursor-pointer ${isSelected
                      ? 'border-blue-600 bg-blue-50/80 shadow-md ring-2 ring-blue-500/20'
                      : hasEvents
                        ? 'border-blue-200 bg-blue-50/30 hover:border-blue-300'
                        : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${isSelected
                          ? 'bg-blue-600 text-white'
                          : hasEvents
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-700'
                        }`}
                    >
                      {item.dayNumber}
                    </span>

                    {hasEvents && (
                      <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    )}
                  </div>

                  {/* Event pills inside box */}
                  <div className="mt-1 flex flex-col gap-1 overflow-hidden">
                    {dayEvents.slice(0, 2).map((evt) => (
                      <div
                        key={evt.id}
                        className={`truncate rounded-lg px-1.5 py-0.5 text-[9px] font-bold ${evt.category === 'Sport'
                            ? 'bg-emerald-100 text-emerald-800'
                            : evt.category === 'Music'
                              ? 'bg-purple-100 text-purple-800'
                              : evt.category === 'Panonnica'
                                ? 'bg-cyan-100 text-cyan-800'
                                : 'bg-blue-100 text-blue-800'
                          }`}
                      >
                        {evt.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[9px] font-black text-slate-400 pl-1">
                        +{dayEvents.length - 2} {lang === 'bs' ? 'još' : 'more'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar: Selected Day & Month Overview */}
        <div className="space-y-4">
          <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-blue-600">
                  {lang === 'bs' ? 'Događaji za dan' : 'Selected Day Events'}
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  {selectedDateStr || (lang === 'bs' ? 'Odaberite datum' : 'Select a date')}
                </h3>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 border border-blue-200">
                {filteredSelectedDayEvents.length} {lang === 'bs' ? 'događaja' : 'events'}
              </span>
            </div>

            <div className="mt-4 space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {loading ? (
                <div className="py-12 text-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mx-auto" />
                  <p className="mt-2 text-xs font-medium text-slate-500">
                    {lang === 'bs' ? 'Učitavanje događaja...' : 'Loading events...'}
                  </p>
                </div>
              ) : filteredSelectedDayEvents.length === 0 ? (
                <div className="py-8 text-center text-xs font-medium text-slate-400">
                  {lang === 'bs'
                    ? 'Nema zakazanih događaja za ovaj datum.'
                    : 'No scheduled events for this date.'}
                </div>
              ) : (
                filteredSelectedDayEvents.map((evt) => {
                  const isAdded = addedEvents.includes(evt.id);
                  return (
                    <div
                      key={evt.id}
                      className="relative rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition-all hover:border-blue-200 hover:bg-white group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-800">
                          {evt.category}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleAddToItinerary(evt)}
                            disabled={isAdded}
                            className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all active:scale-95 ${isAdded
                                ? 'bg-emerald-100 text-emerald-800 cursor-default'
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                              }`}
                          >
                            {isAdded ? (
                              <>
                                <Check className="h-3 w-3" />
                                <span>{lang === 'bs' ? 'Dodano' : 'In Itinerary'}</span>
                              </>
                            ) : (
                              <>
                                <Plus className="h-3 w-3" />
                                <span>{lang === 'bs' ? 'Planer' : 'Itinerary'}</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={(e) => handleDeleteEvent(evt.id, e)}
                            className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title={lang === 'bs' ? 'Obriši događaj' : 'Delete event'}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4 className="mt-2 text-base font-black text-slate-900 leading-snug">
                        {evt.title}
                      </h4>

                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-blue-500" />
                          <span>{evt.start_time}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-red-500" />
                          <span className="truncate">{evt.venue_name}</span>
                        </div>
                      </div>

                      {evt.price && (
                        <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                          <Ticket className="h-3.5 w-3.5 text-emerald-600" />
                          <span>{evt.price}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Month Highlights List */}
          <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50/40 via-white to-cyan-50/30 p-5 shadow-sm">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
              {lang === 'bs' ? 'Svi događaji u mjesecu' : 'All Events in Month'} ({months[selectedMonth]})
            </h4>
            <div className="mt-3 space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {upcomingEventsInMonth.map((e) => (
                <div
                  key={e.id}
                  onClick={() => setSelectedDateStr(e.start_date)}
                  className="flex items-center justify-between rounded-xl bg-white p-2.5 border border-slate-100 cursor-pointer hover:border-blue-300 transition-all"
                >
                  <div className="truncate pr-2">
                    <div className="text-xs font-black text-slate-800 truncate">{e.title}</div>
                    <div className="text-[10px] text-slate-500">{e.venue_name}</div>
                  </div>
                  <span className="shrink-0 rounded-lg bg-blue-50 border border-blue-100 px-2 py-1 text-[10px] font-black text-blue-700">
                    {e.start_date.split('-').slice(1).join('/')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Event Modal (Ručni Brzi Unos) */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-xl rounded-3xl border border-blue-100 bg-white p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {lang === 'bs' ? 'Dodaj Događaj' : 'Add Event'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {lang === 'bs'
                      ? 'Ručni brzi unos novog događaja u kalendar'
                      : 'Quick manual entry of a new event into the calendar'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowImportModal(false)}
                className="rounded-2xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error & Success Messages */}
            {importError && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-red-50 p-3 text-xs font-bold text-red-700 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {importSuccess && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700 border border-emerald-200">
                <Check className="h-4 w-4 shrink-0" />
                <span>{importSuccess}</span>
              </div>
            )}

            {/* Form Entry */}
            <form onSubmit={handleManualFormSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    {lang === 'bs' ? 'Naziv Događaja *' : 'Event Title *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="npr. Koncert Ljetne Noći"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    {lang === 'bs' ? 'Kategorija' : 'Category'}
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as VerifiedEventCategory)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    {lang === 'bs' ? 'Datum (YYYY-MM-DD) *' : 'Date (YYYY-MM-DD) *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    {lang === 'bs' ? 'Vrijeme (HH:mm)' : 'Time (HH:mm)'}
                  </label>
                  <input
                    type="text"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    placeholder="20:00"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    {lang === 'bs' ? 'Lokacija / Klub' : 'Venue Name'}
                  </label>
                  <input
                    type="text"
                    value={formVenue}
                    onChange={(e) => setFormVenue(e.target.value)}
                    placeholder="npr. BKC Tuzla"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    {lang === 'bs' ? 'Cijena Ulaza' : 'Ticket Price'}
                  </label>
                  <input
                    type="text"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="npr. Besplatno ili 10 KM"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !formTitle.trim()}
                  className="flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-2.5 text-xs font-black text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  <span>{lang === 'bs' ? 'Spremi Događaj' : 'Save Event'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

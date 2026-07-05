import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, CreditCard, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { Language } from '../types';
import { Preferences } from '@capacitor/preferences';

type Mode = 'expenses' | 'tasks' | 'itinerary' | 'threeDayPlan';

type ExpenseItem = {
  id: number;
  name: string;
  amount: number;
  date: string;
};

type TaskItem = {
  id: number;
  text: string;
  completed: boolean;
  type: 'Shop' | 'To-Do';
};

type ItineraryItem = {
  id: number;
  name: string;
  address: string;
  type: 'Hotel' | 'Restaurant' | 'Attraction';
  checked: boolean;
};

interface TaskManagerProps {
  lang: Language;
}

const storageKey = 'tuzla_task_manager_v1';

const threeDayPlanText = `Dan 1: Dolazak i Prvi Koraci

✈️ Slijetanje (Aerodrom Tuzla):
• Otvorite Tuzla Tour Guide aplikaciju
• Koristite tab "Taksi/Prevoz" za direktan poziv lokalnog taksi servisa do centra grada

🏨 Smještaj:
• Otvorite tab "Smještaj" (Accommodation Link)
• Odaberite hotel, napravite poziv direktno iz aplikacije
• Koristite "Smart Navigation" mapu da stignete do odabrane lokacije

🍽️ Ručak:
• Otvorite tab "Hrana"
• Pronađite obrok po želji ili naručite dostavu direktno na vašu lokaciju

🗺️ Upoznavanje grada:
• Otvorite tab "Potraga" (Interactive Quest Map)
• Pratite mapu do historijskih atrakcija (Freedom Square itd.)
• Završite "igru" na lokacijama kako biste otključali digitalne popuste
• Čuvajte popuste u svom TON novčaniku

🌙 Večera: Povratak u hotelski restoran za večeru.

Dan 2: Panonsko osvježenje i Stari Grad

☀️ Jutarnje osvježenje:
• Otvorite "Mapa" i uputite se ka Panonskim jezerima
• Savjet: Dođite rano dok je voda najčistija
• Cijena cjelodnevne ulaznice: 7.50 KM
• Besplatno obiđite Muzej i Neolitsko sojeničko naselje

🍽️ Večera i Desert:
• Večerajte u restoranu Panonski Lovac
• Za desert idite na Palačinkaru Bagi
• Uključite navigaciju, skenirajte QR kod po dolasku
• Ostvarite popust na porciju najboljih palačinaka na Balkanu

🏛️ Stari Grad:
• Prošetajte do spomenika "Ismet i Meša"
• Potražite QR kod na lokaciji za posebno iznenađenje u aplikaciji!

🌙 Povratak: Hotel

Dan 3: Priroda, Parking i Shopping

🌲 Priroda:
• Otvorite tab "Mapa" i pokrenite navigaciju ka izletištu Ilinčica
• Uživajte u adrenalinskom parku, šumi i hladovini

🛍️ Shopping i Parking:
• Otvorite tab "Parking" u aplikaciji
• Pronađite najpovoljniju zonu za BCC (Bingo City Center)
• Izvršite plaćanje putem SMS-a (odaberite trajanje: sat ili dan)
• U tržnom centru Bingo koristite svoju kameru
• Pronađite AR guided 3D model lopte
• Skenirajte ga za osvajanje nove nagrade u aplikaciji

⏰ Slobodno vrijeme:
• Ostatak dana iskoristite za istraživanje grada po vašem izboru

🏨 Hotel checkout
• Pozovite Taxi ili potražite autobusku liniju u aplikaciji sa real time lokacijom koja vozi na aerodrom

━━━━━━━━━━━━━━━━━━━━━

HVALA NA POSJETI, DOĐITE NAM OPET!`;

const copy = {
  en: {
    title: 'Personal Notebook',
    expenses: 'Ledger',
    tasks: 'Tasks',
    expensePlaceholder: 'Item, e.g. Lunch at Restaurant Kapija',
    amountPlaceholder: 'KM',
    expenseTotal: 'Total',
    addExpense: 'Add',
    taskPlaceholder: 'New task...',
    shopping: 'Shop list',
    addTask: 'Add',
    emptyLedger: 'No expenses yet.',
    emptyTasks: 'No tasks yet.',
    addHint: 'Tap the plus button to add an entry.',
    itinerary: 'Itinerary',
    emptyItinerary: 'No itinerary items yet. Add hotels or restaurants from Tourist Info!',
  },
  bs: {
    title: 'Lični planer',
    expenses: 'Evidencija',
    tasks: 'Zadaci',
    expensePlaceholder: 'Stavka, npr. Čevapi u "Limenci"',
    amountPlaceholder: 'KM',
    expenseTotal: 'Ukupno',
    addExpense: 'Dodaj',
    taskPlaceholder: 'Novi zadatak...',
    shopping: 'Lista kupovine',
    addTask: 'Dodaj',
    emptyLedger: 'Nema troškova još uvijek.',
    emptyTasks: 'Nema zadataka još uvijek.',
    addHint: 'Dodirni plus za novu stavku.',
    itinerary: 'Plan puta',
    emptyItinerary: 'Još nema stavki u planu. Dodaj hotele ili restorane iz Turističkih info!',
  },
  de: {
    title: 'Persönliches Notizbuch',
    expenses: 'Ledger',
    tasks: 'Aufgaben',
    expensePlaceholder: 'Eintrag, z. B. Kaffee in Sloboda',
    amountPlaceholder: 'KM',
    expenseTotal: 'Summe',
    addExpense: 'Hinzufügen',
    taskPlaceholder: 'Neue Aufgabe...',
    shopping: 'Einkaufsliste',
    addTask: 'Hinzufügen',
    emptyLedger: 'Noch keine Ausgaben.',
    emptyTasks: 'Noch keine Aufgaben.',
    addHint: 'Tippe auf das Plus, um einen Eintrag hinzuzufügen.',
    itinerary: 'Reiseplan',
    emptyItinerary: 'Noch keine Reiseplan-Einträge. Füge Hotels oder Restaurants aus Tourist Info hinzu!',
  },
  tr: {
    title: 'Kişisel Not Defteri',
    expenses: 'Muhasebe',
    tasks: 'Görevler',
    expensePlaceholder: 'Kalem, örn. Sloboda\'da kahve',
    amountPlaceholder: 'KM',
    expenseTotal: 'Toplam',
    addExpense: 'Ekle',
    taskPlaceholder: 'Yeni görev...',
    shopping: 'Alışveriş listesi',
    addTask: 'Ekle',
    emptyLedger: 'Henüz masraf yok.',
    emptyTasks: 'Henüz görev yok.',
    addHint: 'Yeni giriş eklemek için artı düğmesine dokunun.',
    itinerary: 'Güzergah',
    emptyItinerary: 'Henüz güzergah öğesi yok. Otellerden veya restoranlardan ekleyin!',
  },
} as const;

const readState = async (): Promise<{ expenses: ExpenseItem[]; tasks: TaskItem[]; itinerary: ItineraryItem[] }> => {
  if (typeof window === 'undefined') {
    return { expenses: [], tasks: [], itinerary: [] };
  }

  try {
    const { value: raw } = await Preferences.get({ key: storageKey });
    if (!raw) return { expenses: [], tasks: [], itinerary: [] };
    const parsed = JSON.parse(raw) as { expenses?: ExpenseItem[]; tasks?: TaskItem[]; itinerary?: ItineraryItem[] };
    return {
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      itinerary: Array.isArray(parsed.itinerary) ? parsed.itinerary : [],
    };
  } catch {
    return { expenses: [], tasks: [], itinerary: [] };
  }
};

const TaskManager: React.FC<TaskManagerProps> = ({ lang }) => {
  const t = copy[lang] ?? copy.en;
  const [view, setView] = useState<Mode>('expenses');

  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const [expName, setExpName] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [taskText, setTaskText] = useState('');
  const [isShopping, setIsShopping] = useState(false);

  useEffect(() => {
    const loadInitialState = async () => {
      const state = await readState();
      setExpenses(state.expenses);
      setTasks(state.tasks);
      setItinerary(state.itinerary);
      setIsLoaded(true);
    };
    loadInitialState();
  }, []);

  // Sync with Preferences when state changes
  useEffect(() => {
    if (typeof window === 'undefined' || !isLoaded) return;
    const data = JSON.stringify({ expenses, tasks, itinerary });

    // Fire and forget
    Preferences.set({ key: storageKey, value: data });
  }, [expenses, tasks, itinerary, isLoaded]);

  // Listen for itinerary updates from other components (external updates to Preferences)
  useEffect(() => {
    const handler = async () => {
      const saved = await readState();
      setItinerary(saved.itinerary);
    };
    window.addEventListener('itinerary-updated', handler);
    return () => window.removeEventListener('itinerary-updated', handler);
  }, []);

  const total = useMemo(
    () => expenses.reduce((acc, curr) => acc + curr.amount, 0).toFixed(2),
    [expenses]
  );

  const addExpense = () => {
    const amount = Number.parseFloat(expAmount);
    if (!expName.trim() || Number.isNaN(amount)) return;

    setExpenses((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: expName.trim(),
        amount,
        date: new Date().toLocaleDateString(),
      },
    ]);
    setExpName('');
    setExpAmount('');
  };

  const addTask = () => {
    if (!taskText.trim()) return;

    setTasks((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: taskText.trim(),
        completed: false,
        type: isShopping ? 'Shop' : 'To-Do',
      },
    ]);
    setTaskText('');
  };

  const toggleTask = (id: number) => {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task)));
  };

  const deleteExpense = (id: number) => {
    setExpenses((prev) => prev.filter((item) => item.id !== id));
  };

  const deleteTask = (id: number) => {
    setTasks((prev) => prev.filter((item) => item.id !== id));
  };

  const toggleItinerary = (id: number) => {
    setItinerary((prev) => prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)));
  };

  const deleteItinerary = (id: number) => {
    setItinerary((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-32">
      <section className="overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-[0_24px_60px_rgba(37,99,235,0.12)]">
        <div className="bg-[linear-gradient(135deg,_#0f172a_0%,_#1d4ed8_55%,_#38bdf8_100%)] px-6 py-8 text-white sm:px-8">
          <div className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.28em] text-cyan-100">
            <CreditCard className="h-5 w-5" />
            {lang === 'bs' ? 'Lični organizer' : lang === 'tr' ? 'Kişisel Organizatör' : lang === 'de' ? 'Persönlicher Organizer' : 'Personal Organizer'}
          </div>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">{t.title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/80">
            {lang === 'en'
              ? 'Track travel spending and simple task lists inside the sidebar flow.'
              : lang === 'de'
                ? 'Verfolge Reiseausgaben und einfache Aufgaben direkt im Sidebar-Flow.'
                : lang === 'tr'
                  ? 'Seyahat harcamalarını ve görev listelerini burada takip edin.'
                  : 'Prati troskove putovanja i jednostavne zadatke unutar sidebar toka.'}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => setView('expenses')}
              className={`rounded-2xl px-6 py-4 text-base font-black transition-all ${view === 'expenses' ? 'bg-white text-blue-900 shadow-lg' : 'bg-white/10 text-white/80 backdrop-blur-md'}`}
            >
              {t.expenses}
            </button>
            <button
              onClick={() => setView('tasks')}
              className={`rounded-2xl px-6 py-4 text-base font-black transition-all ${view === 'tasks' ? 'bg-white text-blue-900 shadow-lg' : 'bg-white/10 text-white/80 backdrop-blur-md'}`}
            >
              {t.tasks}
            </button>
            <button
              onClick={() => setView('itinerary')}
              className={`rounded-2xl px-6 py-4 text-base font-black transition-all ${view === 'itinerary' ? 'bg-white text-blue-900 shadow-lg' : 'bg-white/10 text-white/80 backdrop-blur-md'}`}
            >
              {t.itinerary}
            </button>
            <button
              onClick={() => setView('threeDayPlan')}
              className={`rounded-2xl px-6 py-4 text-base font-black transition-all ${view === 'threeDayPlan' ? 'bg-white text-blue-900 shadow-lg' : 'bg-white/10 text-white/80 backdrop-blur-md'}`}
            >
              3 Day Plan
            </button>
          </div>
        </div>

        {!isLoaded ? (
          <div className="flex justify-center items-center py-20 min-h-[300px]">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_1fr]">
            {view === 'expenses' ? (
              <section className="space-y-5">
                <div className="rounded-[1.5rem] border border-blue-100 bg-blue-50/60 p-4">
                  <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto]">
                    <input
                      value={expName}
                      onChange={(e) => setExpName(e.target.value)}
                      placeholder={t.expensePlaceholder}
                      className="rounded-2xl border border-blue-100 bg-white px-5 py-4 text-base font-medium text-slate-900 outline-none focus:border-blue-400"
                    />
                    <input
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                      placeholder={t.amountPlaceholder}
                      type="number"
                      inputMode="decimal"
                      className="rounded-2xl border border-blue-100 bg-white px-5 py-4 text-base font-medium text-slate-900 outline-none focus:border-blue-400"
                    />
                    <button
                      onClick={addExpense}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-base font-black text-white shadow-lg shadow-blue-500/25 transition-transform hover:-translate-y-0.5"
                    >
                      <Plus className="h-5 w-5" />
                      {t.addExpense}
                    </button>
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-500">{t.addHint}</p>
                </div>

                <div className="space-y-3">
                  {expenses.length === 0 ? (
                    <div className="rounded-[1.5rem] border border-dashed border-blue-200 bg-white p-6 text-sm text-slate-500">
                      {t.emptyLedger}
                    </div>
                  ) : (
                    expenses.map((expense) => (
                      <div key={expense.id} className="flex items-center justify-between rounded-[1.5rem] border border-blue-100 bg-white p-5 shadow-sm">
                        <div>
                          <div className="text-lg font-black text-slate-900">{expense.name}</div>
                          <div className="text-sm text-slate-500">{expense.date}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="rounded-full bg-blue-50 px-4 py-1.5 text-base font-black text-blue-700">
                            {expense.amount.toFixed(2)} KM
                          </div>
                          <button
                            onClick={() => deleteExpense(expense.id)}
                            className="rounded-full border border-red-100 bg-red-50 p-2 text-red-600 transition-colors hover:bg-red-100"
                            aria-label="Delete expense"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="rounded-[1.5rem] border border-blue-100 bg-[linear-gradient(135deg,_rgba(59,130,246,0.1),_rgba(255,255,255,0.95))] p-5">
                  <div className="text-xs font-black uppercase tracking-[0.28em] text-blue-500">{t.expenseTotal}</div>
                  <div className="mt-2 text-3xl font-black text-blue-900">{total} KM</div>
                </div>
              </section>
            ) : view === 'tasks' ? (
              <section className="space-y-5">
                <div className="rounded-[1.5rem] border border-blue-100 bg-blue-50/60 p-4">
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                    <input
                      value={taskText}
                      onChange={(e) => setTaskText(e.target.value)}
                      placeholder={t.taskPlaceholder}
                      className="rounded-2xl border border-blue-100 bg-white px-5 py-4 text-base font-medium text-slate-900 outline-none focus:border-blue-400"
                    />
                    <button
                      onClick={() => setIsShopping((prev) => !prev)}
                      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-black transition-all ${isShopping ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-white text-slate-700 border border-blue-100'}`}
                    >
                      <ShoppingBag className="h-5 w-5" />
                      {t.shopping}
                    </button>
                    <button
                      onClick={addTask}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-base font-black text-white shadow-lg shadow-blue-500/25 transition-transform hover:-translate-y-0.5"
                    >
                      <Plus className="h-5 w-5" />
                      {t.addTask}
                    </button>
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-500">{t.addHint}</p>
                </div>

                <div className="space-y-3">
                  {tasks.length === 0 ? (
                    <div className="rounded-[1.5rem] border border-dashed border-blue-200 bg-white p-6 text-sm text-slate-500">
                      {t.emptyTasks}
                    </div>
                  ) : (
                    tasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between rounded-[1.5rem] border border-blue-100 bg-white p-4 shadow-sm">
                        <button
                          onClick={() => toggleTask(task.id)}
                          className="flex items-center gap-3 text-left"
                        >
                          {task.completed ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-blue-300" />
                          )}
                          <div>
                            <div className={`text-lg font-black ${task.completed ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                              {task.text}
                            </div>
                            <div className="text-sm text-slate-500">{task.type}</div>
                          </div>
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="rounded-full border border-red-100 bg-red-50 p-2 text-red-600 transition-colors hover:bg-red-100"
                          aria-label="Delete task"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>
            ) : view === 'itinerary' ? (
              <section className="space-y-5">
                <div className="space-y-3">
                  {itinerary.length === 0 ? (
                    <div className="rounded-[1.5rem] border border-dashed border-blue-200 bg-white p-6 text-sm text-slate-500">
                      {t.emptyItinerary}
                    </div>
                  ) : (
                    itinerary.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-[1.5rem] border border-blue-100 bg-white p-4 shadow-sm">
                        <button
                          onClick={() => toggleItinerary(item.id)}
                          className="flex items-center gap-3 text-left"
                        >
                          {item.checked ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-blue-300" />
                          )}
                          <div>
                            <div className={`text-lg font-black ${item.checked ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                              {item.name}
                            </div>
                            <div className="text-sm text-slate-500">{item.address}</div>
                          </div>
                        </button>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest ${item.type === 'Hotel' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                            item.type === 'Restaurant' ? 'bg-green-50 text-green-700 border border-green-100' :
                              'bg-yellow-50 text-yellow-700 border border-yellow-100'
                            }`}>
                            {item.type}
                          </span>
                          <button
                            onClick={() => deleteItinerary(item.id)}
                            className="rounded-full border border-red-100 bg-red-50 p-2 text-red-600 transition-colors hover:bg-red-100"
                            aria-label="Delete itinerary item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            ) : view === 'threeDayPlan' ? (
              <section className="space-y-5">
                <div className="rounded-[1.5rem] border border-blue-100 bg-white p-5 shadow-sm">
                  <div className="whitespace-pre-wrap text-sm font-semibold leading-7 text-slate-700 sm:text-base">
                    {threeDayPlanText}
                  </div>
                </div>
              </section>
            ) : null}

            <aside className="rounded-[1.75rem] border border-blue-100 bg-[linear-gradient(180deg,_#ffffff_0%,_#eff6ff_100%)] p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.28em] text-blue-500">
                <CreditCard className="h-4 w-4" />
                {lang === 'bs' ? 'Brzi pregled' : lang === 'tr' ? 'Hızlı Bakış' : lang === 'de' ? 'Schnellübersicht' : 'Quick Overview'}
              </div>
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl bg-white p-4">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    {lang === 'bs' ? 'Troškovi' : lang === 'tr' ? 'Masraflar' : lang === 'de' ? 'Ausgaben' : 'Expenses'}
                  </div>
                  <div className="mt-1 text-2xl font-black text-blue-900">{expenses.length}</div>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    {lang === 'bs' ? 'Zadaci' : lang === 'tr' ? 'Görevler' : lang === 'de' ? 'Aufgaben' : 'Tasks'}
                  </div>
                  <div className="mt-1 text-2xl font-black text-blue-900">{tasks.length}</div>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    {lang === 'bs' ? 'Shop stavke' : lang === 'tr' ? 'Alışveriş' : lang === 'de' ? 'Einkaufsliste' : 'Shop items'}
                  </div>
                  <div className="mt-1 text-2xl font-black text-blue-900">
                    {tasks.filter((task) => task.type === 'Shop').length}
                  </div>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    {lang === 'bs' ? 'Plan puta' : lang === 'tr' ? 'Güzergah' : lang === 'de' ? 'Reiseplan' : 'Itinerary'}
                  </div>
                  <div className="mt-1 text-2xl font-black text-blue-900">
                    {itinerary.length}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </section>

      <a
        href="https://tuzla.bingocitycenter.ba"
        target="_blank"
        rel="noopener noreferrer"
        className="block mt-6 overflow-hidden rounded-[1.5rem] border border-blue-100 shadow-sm transition-transform hover:scale-[1.02]"
      >
        <img
          src="/assets/BCC.webp"
          alt="Bingo City Center"
          className="w-full h-auto object-cover"
        />
      </a>

      {/* Spacer for bottom navigation safety */}
      <div className="h-20" />
    </div>
  );
};

export default TaskManager;

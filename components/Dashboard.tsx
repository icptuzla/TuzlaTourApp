import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient, type Session } from '@supabase/supabase-js';
import {
  Activity, ArrowUpRight, Award, CheckCircle2, ChevronRight, Crown,
  Gauge, LogOut, Mail, MapPin, ShieldCheck, Sparkles, Star, Trophy, Users, Zap
} from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

type Lang = 'bs' | 'en' | 'de' | 'tr';
type PlayerDashboard = {
  profile?: { display_name?: string; leaderboard_opt_in?: boolean };
  xp_total?: number; level?: number; level_title?: string; next_level_xp?: number;
  xp_into_level?: number; xp_for_level?: number; quests_completed?: number;
  completed_quests?: Array<{quest_id:string; title:Record<string,string>; phase:number; xp_awarded:number; completed_at:string}>;
  achievements?: Array<{id:string; title:Record<string,string>; description:Record<string,string>; icon:string; unlocked_at:string}>;
  recent_xp?: Array<{amount:number; reason:string; description?:string; created_at:string}>;
};
type Leader = {player_rank:number; display_name:string; xp_total:number; player_level:number; quests_completed:number};
type AdminData = {
  players_total:number; quests_total:number; quests_active:number; completions_total:number;
  xp_awarded_total:number; players_active_30d:number;
  top_players: Array<{id:string;display_name:string;xp_total:number;level:number;quests_completed:number}>;
  recent_completions: Array<{player_id:string;display_name:string;quest_id:string;title:Record<string,string>;xp_awarded:number;completed_at:string}>;
  recent_verification_attempts: Array<{player_id:string;quest_id:string;method:string;succeeded:boolean;failure_reason:string;distance_meters:number;created_at:string}>;
};
type QuestConfig = {id:string;title:Record<string,string>;qr_configured:boolean;qr_input:string;gps_required:boolean;radius_meters:number;xp_reward:number;is_active:boolean};

const copy = {
  en: { title:'Tuzla Explorer', subtitle:'Your city adventure, levelled up.', signIn:'Sign in to save your progress', email:'Email address', send:'Send magic link', sent:'Check your inbox — your secure sign-in link is on its way.', setup:'Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your Vercel environment variables.', overview:'My adventure', admin:'Admin control room', xp:'TOTAL XP', level:'LEVEL', quests:'QUESTS COMPLETED', badges:'BADGES EARNED', next:'Next level', leaderboard:'Community leaderboard', history:'Recent XP activity', completed:'Completed locations', achievements:'Achievements', optIn:'Show me on the public leaderboard', signOut:'Sign out', noActivity:'Your adventure starts here. Scan a location QR code to earn your first XP.', noBadges:'Your first badge is waiting.', adminOnly:'Admin access is not enabled for this account yet.', players:'Players', active30:'Active players (30 days)', completions:'Quest completions', xpAwarded:'XP awarded', recent:'Latest completions', attempts:'Verification attempts', rank:'RANK', player:'PLAYER', total:'XP', status:'STATUS', success:'Verified', failed:'Rejected', loading:'Loading your adventure…', error:'Something went wrong. Please try again.' },
  bs: { title:'Istraživač Tuzle', subtitle:'Tvoja gradska avantura, novi nivo.', signIn:'Prijavi se i sačuvaj napredak', email:'Email adresa', send:'Pošalji link za prijavu', sent:'Provjeri email — link za sigurnu prijavu je poslan.', setup:'Supabase još nije konfigurisan. Dodaj VITE_SUPABASE_URL i VITE_SUPABASE_PUBLISHABLE_KEY u Vercel environment variables.', overview:'Moja avantura', admin:'Admin kontrolna tabla', xp:'UKUPNO XP', level:'NIVO', quests:'ZAVRŠENE POTRAGE', badges:'OSVOJENE ZNAČKE', next:'Sljedeći nivo', leaderboard:'Rang lista zajednice', history:'Nedavna XP aktivnost', completed:'Završene lokacije', achievements:'Postignuća', optIn:'Prikaži me na javnoj rang listi', signOut:'Odjavi se', noActivity:'Tvoja avantura počinje ovdje. Skeniraj QR kod lokacije i osvoji prvi XP.', noBadges:'Čeka te prva značka.', adminOnly:'Admin pristup još nije omogućen za ovaj račun.', players:'Igrači', active30:'Aktivni igrači (30 dana)', completions:'Završene potrage', xpAwarded:'Dodijeljeni XP', recent:'Posljednje završene potrage', attempts:'Pokušaji verifikacije', rank:'RANG', player:'IGRAČ', total:'XP', status:'STATUS', success:'Potvrđeno', failed:'Odbijeno', loading:'Učitavanje avanture…', error:'Došlo je do greške. Pokušaj ponovo.' },
  de: { title:'Tuzla Entdecker', subtitle:'Dein Stadtabenteuer, auf dem nächsten Level.', signIn:'Anmelden und Fortschritt speichern', email:'E-Mail-Adresse', send:'Anmeldelink senden', sent:'Prüfe deinen Posteingang.', setup:'Supabase ist noch nicht konfiguriert.', overview:'Mein Abenteuer', admin:'Admin-Dashboard', xp:'GESAMT-XP', level:'LEVEL', quests:'ABGESCHLOSSENE QUESTS', badges:'ABZEICHEN', next:'Nächstes Level', leaderboard:'Bestenliste', history:'Letzte XP-Aktivität', completed:'Abgeschlossene Orte', achievements:'Erfolge', optIn:'In der öffentlichen Bestenliste anzeigen', signOut:'Abmelden', noActivity:'Scanne einen QR-Code, um deine ersten XP zu verdienen.', noBadges:'Dein erstes Abzeichen wartet.', adminOnly:'Admin-Zugriff ist noch nicht aktiviert.', players:'Spieler', active30:'Aktive Spieler (30 Tage)', completions:'Abgeschlossene Quests', xpAwarded:'Vergebene XP', recent:'Letzte Abschlüsse', attempts:'Verifizierungsversuche', rank:'RANG', player:'SPIELER', total:'XP', status:'STATUS', success:'Bestätigt', failed:'Abgelehnt', loading:'Lade dein Abenteuer…', error:'Ein Fehler ist aufgetreten.' },
  tr: { title:'Tuzla Kaşifi', subtitle:'Şehir maceran bir üst seviyede.', signIn:'İlerlemeni kaydetmek için giriş yap', email:'E-posta adresi', send:'Giriş bağlantısı gönder', sent:'Gelen kutunu kontrol et.', setup:'Supabase henüz yapılandırılmadı.', overview:'Maceram', admin:'Yönetici paneli', xp:'TOPLAM XP', level:'SEVİYE', quests:'TAMAMLANAN GÖREVLER', badges:'KAZANILAN ROZETLER', next:'Sonraki seviye', leaderboard:'Topluluk sıralaması', history:'Son XP etkinliği', completed:'Tamamlanan konumlar', achievements:'Başarımlar', optIn:'Herkese açık sıralamada göster', signOut:'Çıkış yap', noActivity:'İlk XP puanını kazanmak için bir konumun QR kodunu tara.', noBadges:'İlk rozetin seni bekliyor.', adminOnly:'Bu hesap için yönetici erişimi etkin değil.', players:'Oyuncular', active30:'Aktif oyuncular (30 gün)', completions:'Tamamlanan görevler', xpAwarded:'Verilen XP', recent:'Son tamamlananlar', attempts:'Doğrulama denemeleri', rank:'SIRA', player:'OYUNCU', total:'XP', status:'DURUM', success:'Doğrulandı', failed:'Reddedildi', loading:'Maceran yükleniyor…', error:'Bir hata oluştu.' }
} as const;

const formatDate = (value?: string, lang:Lang='en') => value ? new Date(value).toLocaleDateString(lang === 'bs' ? 'bs-BA' : lang === 'de' ? 'de-DE' : lang === 'tr' ? 'tr-TR' : 'en-GB', {day:'numeric',month:'short'}) : '';
const localized = (value:Record<string,string>|undefined, lang:Lang) => value?.[lang] || value?.en || value?.bs || '';

const Dashboard: React.FC<{lang:Lang}> = ({lang}) => {
  const t = copy[lang] || copy.en;
  const [session,setSession] = useState<Session|null>(null);
  const [email,setEmail] = useState('');
  const [sending,setSending] = useState(false);
  const [sent,setSent] = useState(false);
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(true);
  const [player,setPlayer] = useState<PlayerDashboard|null>(null);
  const [leaders,setLeaders] = useState<Leader[]>([]);
  const [admin,setAdmin] = useState<AdminData|null>(null);
  const [questConfig,setQuestConfig] = useState<QuestConfig[]>([]);
  const [savingQuest,setSavingQuest] = useState<string|null>(null);
  const [view,setView] = useState<'player'|'admin'>('player');
  const [savingOptIn,setSavingOptIn] = useState(false);

  const loadData = useCallback(async () => {
    if (!supabase || !session) return;
    setLoading(true); setError('');
    const [playerResult,leaderResult,adminResult] = await Promise.all([
      supabase.rpc('get_my_tuzla_dashboard'),
      supabase.rpc('get_tuzla_leaderboard',{p_limit:10}),
      supabase.rpc('get_tuzla_admin_dashboard',{p_recent_limit:20})
    ]);
    if (playerResult.error) setError(playerResult.error.message);
    else setPlayer(playerResult.data as PlayerDashboard);
    if (!leaderResult.error) setLeaders((leaderResult.data || []) as Leader[]);
    setAdmin(adminResult.error ? null : adminResult.data as AdminData);
    if (!adminResult.error) {
      const {data:quests} = await supabase.rpc('admin_get_tuzla_quest_config');
      setQuestConfig(((quests || []) as Omit<QuestConfig,'qr_input'>[]).map(q=>({...q,qr_input:''})));
    } else setQuestConfig([]);
    setLoading(false);
  },[session]);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({data}) => setSession(data.session));
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,nextSession) => setSession(nextSession));
    return () => subscription.unsubscribe();
  },[]);

  useEffect(() => { if (session) void loadData(); else { setPlayer(null); setAdmin(null); setLoading(false); } },[session,loadData]);

  const sendLink = async (event:React.FormEvent) => {
    event.preventDefault();
    if (!supabase || !email.trim()) return;
    setSending(true); setError('');
    const {error:authError} = await supabase.auth.signInWithOtp({
      email:email.trim(),
      options:{emailRedirectTo:window.location.origin + '/dashboard',shouldCreateUser:true}
    });
    setSending(false);
    if (authError) setError(authError.message); else setSent(true);
  };

  const toggleLeaderboard = async (checked:boolean) => {
    if (!supabase || !session?.user) return;
    setSavingOptIn(true);
    const {error:updateError} = await supabase.from('profiles').update({leaderboard_opt_in:checked}).eq('id',session.user.id);
    if (updateError) setError(updateError.message); else await loadData();
    setSavingOptIn(false);
  };

  const saveQuestConfig = async (quest:QuestConfig) => {
    if (!supabase) return;
    setSavingQuest(quest.id); setError('');
    const {error:saveError} = await supabase.rpc('admin_set_tuzla_quest_qr',{p_quest_id:quest.id,p_qr_payload:quest.qr_input});
    if (saveError) setError(saveError.message);
    else setQuestConfig(rows=>rows.map(row=>row.id===quest.id?{...row,qr_configured:true,qr_input:'',gps_required:true}:row));
    setSavingQuest(null);
  };

  const progress = useMemo(() => {
    if (!player) return 0;
    if (!player.xp_for_level || player.xp_for_level <= 0) return 100;
    return Math.min(100,Math.max(0,((player.xp_into_level || 0)/player.xp_for_level)*100));
  },[player]);

  if (!supabase) return <main className="min-h-[calc(100vh-56px)] bg-slate-950 text-white px-5 py-12"><div className="mx-auto max-w-xl rounded-3xl border border-amber-400/20 bg-slate-900 p-8"><ShieldCheck className="mb-4 h-10 w-10 text-amber-400"/><h1 className="text-2xl font-black">{t.title}</h1><p className="mt-3 text-slate-300">{t.setup}</p><p className="mt-5 text-xs text-slate-500">VITE_SUPABASE_URL<br/>VITE_SUPABASE_PUBLISHABLE_KEY</p></div></main>;

  if (!session) return <main className="relative min-h-[calc(100vh-56px)] overflow-hidden bg-slate-950 px-5 py-12 text-white">
    <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl"/><div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl"/>
    <div className="relative mx-auto max-w-md rounded-[2rem] border border-white/10 bg-slate-900/90 p-8 shadow-2xl">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/20"><Trophy className="h-7 w-7"/></div>
      <p className="text-xs font-black uppercase tracking-[.25em] text-amber-400">TUZLA TOUR GUIDE</p><h1 className="mt-2 text-3xl font-black tracking-tight">{t.title}</h1><p className="mt-2 text-sm text-slate-400">{t.subtitle}</p>
      <form onSubmit={sendLink} className="mt-8 space-y-4"><label className="block text-xs font-bold uppercase tracking-wider text-slate-300">{t.email}</label><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-amber-400"/><button disabled={sending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-yellow-500 px-4 py-3 font-black text-slate-950 transition hover:brightness-110 disabled:opacity-60"><Mail className="h-4 w-4"/>{sending?'…':t.send}</button></form>
      {sent && <p className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">{t.sent}</p>}
      {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
    </div>
  </main>;

  if (loading) return <main className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-slate-950 text-amber-300"><div className="flex items-center gap-3"><span className="h-5 w-5 animate-spin rounded-full border-2 border-amber-300 border-t-transparent"/>{t.loading}</div></main>;

  return <main className="min-h-[calc(100vh-56px)] bg-slate-950 px-4 py-8 text-white sm:px-6">
    <div className="mx-auto max-w-6xl">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.25em] text-amber-400">TUZLA TOUR GUIDE / PLAYER HUB</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">{t.title}</h1><p className="mt-1 text-sm text-slate-400">{t.subtitle}</p></div><div className="flex items-center gap-3"><span className="hidden max-w-44 truncate text-sm text-slate-400 sm:block">{session.user.email}</span><button onClick={()=>supabase.auth.signOut()} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/5"><LogOut className="h-4 w-4"/>{t.signOut}</button></div></header>
      <div className="mb-6 flex gap-2"><button onClick={()=>setView('player')} className={`rounded-xl px-4 py-2 text-sm font-bold ${view==='player'?'bg-amber-400 text-slate-950':'bg-white/5 text-slate-300'}`}>{t.overview}</button>{admin && <button onClick={()=>setView('admin')} className={`rounded-xl px-4 py-2 text-sm font-bold ${view==='admin'?'bg-amber-400 text-slate-950':'bg-white/5 text-slate-300'}`}>{t.admin}</button>}</div>
      {error && <div className="mb-5 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</div>}
      {view==='player' && player && <>
        <section className="relative mb-6 overflow-hidden rounded-[2rem] border border-amber-300/20 bg-gradient-to-br from-blue-950 via-slate-900 to-slate-900 p-6 sm:p-8"><div className="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rounded-full bg-amber-400/10 blur-2xl"/><div className="relative flex flex-wrap items-center justify-between gap-6"><div><p className="text-xs font-black uppercase tracking-[.2em] text-amber-300">LEVEL {player.level || 1}</p><h2 className="mt-1 text-3xl font-black">{player.level_title || 'Explorer'}</h2><p className="mt-2 text-sm text-slate-400">{player.profile?.display_name || session.user.email}</p></div><div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-amber-400/60 bg-slate-950/60 shadow-[0_0_40px_rgba(251,191,36,.18)]"><div className="text-center"><Crown className="mx-auto h-5 w-5 text-amber-300"/><span className="text-2xl font-black">{player.level || 1}</span></div></div></div><div className="relative mt-8"><div className="mb-2 flex justify-between text-xs font-bold"><span className="text-slate-300">{t.next}</span><span className="text-amber-300">{player.xp_into_level || 0} / {player.xp_for_level || 0} XP</span></div><div className="h-3 overflow-hidden rounded-full bg-black/40"><div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-yellow-500 transition-all" style={{width:progress+'%'}}/></div><p className="mt-2 text-right text-[11px] text-slate-500">{player.next_level_xp ? `${Math.max(0,player.next_level_xp-(player.xp_total||0))} XP to next level` : 'Maximum level reached'}</p></div></section>
        <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">{[{label:t.xp,value:(player.xp_total||0).toLocaleString(),icon:Zap},{label:t.level,value:player.level||1,icon:Gauge},{label:t.quests,value:player.quests_completed||0,icon:MapPin},{label:t.badges,value:player.achievements?.length||0,icon:Award}].map((item,i)=><div key={i} className="rounded-2xl border border-white/10 bg-slate-900 p-4"><item.icon className="mb-3 h-5 w-5 text-amber-300"/><p className="text-[10px] font-black tracking-wider text-slate-500">{item.label}</p><p className="mt-1 text-2xl font-black tabular-nums">{item.value}</p></div>)}</section>
        <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]"><section className="rounded-3xl border border-white/10 bg-slate-900 p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><h3 className="flex items-center gap-2 text-lg font-black"><Trophy className="h-5 w-5 text-amber-300"/>{t.achievements}</h3><span className="text-xs text-slate-500">{player.achievements?.length||0} unlocked</span></div>{player.achievements?.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{player.achievements.map(a=><div key={a.id} className="rounded-2xl border border-amber-300/15 bg-gradient-to-br from-amber-300/10 to-transparent p-4"><span className="text-2xl">{a.icon}</span><p className="mt-2 text-sm font-black">{localized(a.title,lang)}</p><p className="mt-1 text-[11px] text-slate-500">{localized(a.description,lang)}</p></div>)}</div>:<p className="text-sm text-slate-500">{t.noBadges}</p>}</section>
          <section className="rounded-3xl border border-white/10 bg-slate-900 p-5 sm:p-6"><h3 className="mb-5 flex items-center gap-2 text-lg font-black"><Star className="h-5 w-5 text-amber-300"/>{t.leaderboard}</h3>{leaders.length ? <div className="space-y-3">{leaders.map(row=><div key={row.player_rank} className="flex items-center gap-3"><span className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black ${row.player_rank===1?'bg-amber-400 text-slate-950':'bg-white/5 text-slate-400'}`}>{row.player_rank}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{row.display_name}</p><p className="text-[10px] text-slate-500">Level {row.player_level} · {row.quests_completed} quests</p></div><p className="text-sm font-black text-amber-300">{row.xp_total.toLocaleString()} XP</p></div>)}</div>:<p className="text-sm text-slate-500">No public scores yet.</p>}<label className="mt-6 flex items-center gap-3 border-t border-white/10 pt-4 text-xs text-slate-400"><input type="checkbox" checked={!!player.profile?.leaderboard_opt_in} disabled={savingOptIn} onChange={e=>toggleLeaderboard(e.target.checked)} className="h-4 w-4 accent-amber-400"/>{t.optIn}</label></section></div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2"><section className="rounded-3xl border border-white/10 bg-slate-900 p-5"><h3 className="mb-4 flex items-center gap-2 font-black"><CheckCircle2 className="h-5 w-5 text-emerald-300"/>{t.completed}</h3>{player.completed_quests?.length ? <div className="space-y-3">{player.completed_quests.map(q=><div key={q.quest_id} className="flex items-center justify-between gap-3 border-b border-white/5 pb-3 last:border-0"><div className="min-w-0"><p className="truncate text-sm font-bold">{localized(q.title,lang)}</p><p className="text-[10px] text-slate-500">Phase {q.phase} · {formatDate(q.completed_at,lang)}</p></div><span className="shrink-0 text-xs font-black text-amber-300">+{q.xp_awarded} XP</span></div>)}</div>:<p className="text-sm text-slate-500">{t.noActivity}</p>}</section><section className="rounded-3xl border border-white/10 bg-slate-900 p-5"><h3 className="mb-4 flex items-center gap-2 font-black"><Activity className="h-5 w-5 text-sky-300"/>{t.history}</h3>{player.recent_xp?.length ? <div className="space-y-3">{player.recent_xp.map((x,i)=><div key={i} className="flex items-center justify-between gap-3 border-b border-white/5 pb-3 last:border-0"><div className="min-w-0"><p className="truncate text-sm font-bold">{x.description || x.reason.replaceAll('_',' ')}</p><p className="text-[10px] text-slate-500">{formatDate(x.created_at,lang)}</p></div><span className="text-xs font-black text-emerald-300">+{x.amount} XP</span></div>)}</div>:<p className="text-sm text-slate-500">{t.noActivity}</p>}</section></div>
      </>}
      {view==='admin' && admin && <><section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{[{label:t.players,value:admin.players_total,icon:Users},{label:t.active30,value:admin.players_active_30d,icon:Activity},{label:t.completions,value:admin.completions_total,icon:CheckCircle2},{label:t.xpAwarded,value:admin.xp_awarded_total.toLocaleString(),icon:Zap}].map((item,i)=><div key={i} className="rounded-2xl border border-white/10 bg-slate-900 p-4"><item.icon className="mb-3 h-5 w-5 text-amber-300"/><p className="text-[10px] font-black tracking-wider text-slate-500">{item.label}</p><p className="mt-1 text-2xl font-black">{item.value}</p></div>)}</section><section className="mb-6 rounded-3xl border border-amber-300/20 bg-slate-900 p-5 sm:p-6"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-black">Quest & QR control</h3><p className="mt-1 text-xs text-slate-500">Set the exact text encoded inside each physical QR code. GPS is checked server-side.</p></div><span className="rounded-lg bg-amber-300/10 px-3 py-1 text-[10px] font-black text-amber-300">{questConfig.filter(q=>q.qr_configured).length} / {questConfig.length} QR SET</span></div><div className="space-y-3">{questConfig.map(q=><div key={q.id} className="grid gap-3 rounded-2xl border border-white/5 bg-slate-950/50 p-3 md:grid-cols-[1fr_2fr_auto] md:items-center"><div><p className="text-sm font-black">{localized(q.title,lang)}</p><p className="text-[10px] text-slate-500">{q.id} · {q.xp_reward} XP · {q.radius_meters}m GPS</p><p className={`mt-1 text-[10px] font-bold ${q.qr_configured?'text-emerald-300':'text-rose-300'}`}>{q.qr_configured?'QR configured':'QR not configured'}</p></div><input value={q.qr_input} onChange={e=>setQuestConfig(rows=>rows.map(row=>row.id===q.id?{...row,qr_input:e.target.value}:row))} placeholder={q.qr_configured?'Enter new QR payload to replace':'Paste exact QR payload (16+ characters)'} className="min-w-0 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-amber-400"/><div className="flex items-center justify-end"><button disabled={savingQuest===q.id || q.qr_input.trim().length<16} onClick={()=>saveQuestConfig(q)} className="rounded-lg bg-amber-300 px-3 py-2 text-[10px] font-black text-slate-950 disabled:opacity-40">{savingQuest===q.id?'Saving…':q.qr_configured?'Replace QR':'Save QR'}</button></div></div>)}</div></section><div className="grid gap-6 lg:grid-cols-2"><section className="rounded-3xl border border-white/10 bg-slate-900 p-5"><h3 className="mb-4 font-black">{t.recent}</h3>{admin.recent_completions?.map((c,i)=><div key={i} className="flex justify-between gap-3 border-b border-white/5 py-3 last:border-0"><div><p className="text-sm font-bold">{c.display_name || c.player_id.slice(0,8)}</p><p className="text-xs text-slate-500">{localized(c.title,lang)} · {formatDate(c.completed_at,lang)}</p></div><span className="text-xs font-black text-amber-300">+{c.xp_awarded} XP</span></div>)}</section><section className="rounded-3xl border border-white/10 bg-slate-900 p-5"><h3 className="mb-4 font-black">{t.attempts}</h3>{admin.recent_verification_attempts?.map((a,i)=><div key={i} className="flex items-center justify-between gap-3 border-b border-white/5 py-3 last:border-0"><div className="min-w-0"><p className="truncate text-sm font-bold">{a.quest_id || 'Unknown quest'}</p><p className="text-[10px] text-slate-500">{a.method} · {a.failure_reason || formatDate(a.created_at,lang)}</p></div><span className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-black ${a.succeeded?'bg-emerald-400/10 text-emerald-300':'bg-rose-400/10 text-rose-300'}`}>{a.succeeded?t.success:t.failed}</span></div>)}</section></div></>}
      {view==='player' && !player && <div className="rounded-2xl border border-white/10 bg-slate-900 p-6 text-slate-300">{t.error}</div>}
      {view==='admin' && !admin && <div className="rounded-2xl border border-amber-400/20 bg-slate-900 p-6"><ShieldCheck className="mb-3 h-7 w-7 text-amber-300"/><h3 className="font-black">{t.admin}</h3><p className="mt-2 text-sm text-slate-400">{t.adminOnly}</p></div>}
      <footer className="mt-10 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-slate-600"><Sparkles className="h-3.5 w-3.5"/> Explore more. Earn more. Discover Tuzla.</footer>
    </div>
  </main>;
};

export default Dashboard;

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';
import {
    Wallet as WalletIcon,
    Lock,
    CheckCircle2,
    Globe,
    X,
    Copy,
    ExternalLink,
    Zap,
    QrCode,
    Award,
    ArrowLeftRight,
    BookOpen,
    Play,
    Trash2,
    AlertCircle,
    Stethoscope
} from 'lucide-react';
import { useNetwork } from '../hooks/useNetwork';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';

// Solana Imports
import { ConnectionProvider, WalletProvider, useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useGlobalApp } from '../contexts/GlobalAppContext';
import { QUEST_TARGETS } from '../constants/questData';
import { findQuestTargetFromQr } from '../utils/qrMatcher';
import { Preferences } from '@capacitor/preferences';

import '@solana/wallet-adapter-react-ui/styles.css';

interface WalletProps {
    lang: Language;
}

interface LedgerEntry {
    id: string;
    timestamp: string;
}

// Inner Content Component to access hooks inside the Providers
const WalletContent: React.FC<{
    lang: Language;
    network: 'mainnet-beta' | 'devnet';
    setNetwork: (net: 'mainnet-beta' | 'devnet') => void;
}> = ({ lang, network, setNetwork }) => {
    const [bamValue, setBamValue] = useState<string>('');
    const [conversionMode, setConversionMode] = useState<'BAM_TO_EUR' | 'EUR_TO_BAM'>('BAM_TO_EUR');
    const [solBalance, setSolBalance] = useState<number | null>(null);
    const [copySuccess, setCopySuccess] = useState(false);

    const [isScanning, setIsScanning] = useState(false);
    const [scannerFeedback, setScannerFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [ledger, setLedger] = useState<LedgerEntry[]>([]);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [playingVideo, setPlayingVideo] = useState<string | null>(null);

    const scannerRef = useRef<Html5Qrcode | null>(null);
    const isOnline = useNetwork();
    const t = TRANSLATIONS[lang];

    const { unlockedRewards, setUnlockedRewards } = useGlobalApp();

    const convertedValue = bamValue
        ? conversionMode === 'BAM_TO_EUR'
            ? (parseFloat(bamValue) / 1.95583).toFixed(2)
            : (parseFloat(bamValue) * 1.95583).toFixed(2)
        : '0.00';

    // Solana hooks
    const { publicKey, connected: solConnected, disconnect } = useWallet();
    const { connection } = useConnection();

    // Load Scan History Ledger on init
    useEffect(() => {
        const loadLedger = async () => {
            const { value } = await Preferences.get({ key: 'tuzla_scan_ledger' });
            if (value) {
                try {
                    setLedger(JSON.parse(value));
                } catch {
                    setLedger([]);
                }
            }
        };
        loadLedger();
    }, []);

    // Fetch SOL balance when connected
    useEffect(() => {
        if (!publicKey || !connection) { setSolBalance(null); return; }
        let cancelled = false;
        const fetchBalance = async () => {
            try {
                const lamports = await connection.getBalance(publicKey);
                if (!cancelled) setSolBalance(lamports / LAMPORTS_PER_SOL);
            } catch {
                if (!cancelled) setSolBalance(null);
            }
        };
        fetchBalance();
        const id = connection.onAccountChange(publicKey, (info) => {
            if (!cancelled) setSolBalance(info.lamports / LAMPORTS_PER_SOL);
        });
        return () => {
            cancelled = true;
            connection.removeAccountChangeListener(id);
        };
    }, [publicKey, connection]);

    const handleCopyAddress = () => {
        if (!publicKey) return;
        navigator.clipboard.writeText(publicKey.toBase58());
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const shortAddress = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;

    const startScanner = async () => {
        setIsScanning(true);
        setScannerFeedback(null);
        setTimeout(async () => {
            const containerId = 'wallet-reader';
            if (!document.getElementById(containerId)) return;
            try {
                const scanner = new Html5Qrcode(containerId);
                scannerRef.current = scanner;
                await scanner.start(
                    { facingMode: 'environment' },
                    { fps: 12, qrbox: { width: 220, height: 220 } },
                    async (decodedText) => {
                        const trimmed = decodedText?.trim() ?? '';
                        const target = findQuestTargetFromQr(trimmed);

                        if (!target) {
                            setScannerFeedback({
                                text: lang === 'bs'
                                    ? 'Nepoznat QR kod lokacije.'
                                    : 'Unknown location QR code.',
                                type: 'error'
                            });
                            return;
                        }

                        // Add to ledger
                        const now = new Date();
                        const timeStr = now.toLocaleTimeString(lang === 'bs' ? 'bs-BA' : 'en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                        const dateStr = now.toLocaleDateString(lang === 'bs' ? 'bs-BA' : 'en-US', {
                            month: 'short',
                            day: 'numeric'
                        });
                        const timestamp = `${dateStr}, ${timeStr}`;

                        // Check if already in ledger
                        const exists = ledger.some(item => item.id === target.id);
                        let newLedger = [...ledger];

                        if (exists) {
                            setScannerFeedback({
                                text: lang === 'bs'
                                    ? `${target.name.bs} je već u vašoj knjizi skeniranja.`
                                    : `${target.name.en} is already in your ledger.`,
                                type: 'success'
                            });
                            setTimeout(() => setScannerFeedback(null), 3000);
                            stopScanner();
                            return;
                        } else {
                            newLedger = [{ id: target.id, timestamp }, ...ledger];
                            setLedger(newLedger);
                            await Preferences.set({ key: 'tuzla_scan_ledger', value: JSON.stringify(newLedger) });
                        }

                        // Unlock in global app state
                        if (!unlockedRewards.includes(target.id)) {
                            setUnlockedRewards(prev => [...prev, target.id]);
                        }

                        setScannerFeedback({
                            text: lang === 'bs'
                                ? `Otključana lokacija: ${target.name.bs}!`
                                : `Unlocked location: ${target.name.en}!`,
                            type: 'success'
                        });
                        setTimeout(() => setScannerFeedback(null), 3000);
                        stopScanner();
                    },
                    () => { }
                );
            } catch (err) {
                console.error("Scanner error", err);
                setIsScanning(false);
                setScannerFeedback({
                    text: lang === 'bs' ? "Nije moguće pokrenuti kameru." : "Could not start camera.",
                    type: 'error'
                });
                setTimeout(() => setScannerFeedback(null), 3000);
            }
        }, 150);
    };

    const stopScanner = () => {
        if (scannerRef.current) {
            scannerRef.current.stop().then(() => {
                scannerRef.current?.clear();
                scannerRef.current = null;
                setIsScanning(false);
            }).catch(e => {
                console.error(e);
                setIsScanning(false);
            });
        } else {
            setIsScanning(false);
        }
    };

    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => { });
            }
        }
    }, []);

    const handleClearLedger = async () => {
        setLedger([]);
        await Preferences.remove({ key: 'tuzla_scan_ledger' });
        setShowClearConfirm(false);
    };

    return (
        <div className="min-h-screen bg-slate-50/50 pb-32 overflow-x-hidden">
            <div className="max-w-6xl mx-auto p-4 sm:p-8">
                {/* Offline Warning */}
                {!isOnline && (
                    <div className="mb-8 flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl animate-pulse">
                        <span className="text-amber-500">📡</span>
                        <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                            {t.blockchainOffline}
                        </p>
                    </div>
                )}

                <div className="text-center mb-12">
                    <h1 className="text-4xl font-black text-blue-950 uppercase tracking-tight flex items-center justify-center gap-3">
                        <WalletIcon className="w-10 h-10 text-blue-600" />
                        {t.digitalWalletTitle}
                    </h1>
                    <div className="h-1 w-24 bg-blue-600 mx-auto rounded-full mt-2" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* ── Left Column: Solana + Scanner + Converter (7 cols on lg) ── */}
                    <div className="lg:col-span-7 space-y-6">

                        {/* Solana Card (Solflare Integration) */}
                        <div className="p-5 sm:p-6 bg-white border border-purple-100 rounded-[2rem] shadow-xl relative overflow-hidden flex flex-col gap-5">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
                            
                            {/* Header */}
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-50 border border-slate-100 shadow-inner shrink-0">
                                        <img src="/assets/Gallery/QuestQRLocations/sologo.png" alt="Solflare" className="w-7 h-7 object-contain" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Solflare Wallet</p>
                                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Solana Blockchain</h3>
                                    </div>
                                </div>
                                {/* Clean Network Switcher */}
                                <button
                                    onClick={() => setNetwork(network === 'devnet' ? 'mainnet-beta' : 'devnet')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all active:scale-95 shrink-0"
                                    title={`Switch network. Current: ${network}`}
                                >
                                    <div className={`w-2 h-2 rounded-full ${network === 'mainnet-beta' ? 'bg-emerald-500' : 'bg-purple-500'}`} />
                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                                        {network === 'devnet' ? 'DEVNET' : 'MAINNET'}
                                    </span>
                                    <ArrowLeftRight size={10} className="text-slate-400 ml-1" />
                                </button>
                            </div>

                            {/* Wallet Info */}
                            <div className="flex-1 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                {solConnected && publicKey ? (
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <p className="text-xs text-slate-400 font-bold uppercase">{t.walletAddress}</p>
                                            <button onClick={handleCopyAddress} className="text-purple-600 hover:text-purple-700 p-1" title="Copy Address">
                                                {copySuccess ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                            </button>
                                        </div>
                                        <p className="text-lg font-black text-purple-950 font-mono tracking-tight">{shortAddress(publicKey.toBase58())}</p>
                                        <div className="pt-3 border-t border-slate-200 flex justify-between items-end">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">{t.solBalance}</p>
                                            <p className="text-xl font-black text-purple-700 leading-none">
                                                {solBalance !== null ? `◎ ${solBalance.toFixed(4)}` : '—'}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col justify-center">
                                        <p className="text-xs text-slate-400 font-bold uppercase mb-1">Status</p>
                                        <p className="text-sm font-black text-slate-800 uppercase">{t.statusNotConnected}</p>
                                    </div>
                                )}
                            </div>

                            {/* Standardized Action Button */}
                            <div className="h-14 w-full">
                                {solConnected && publicKey ? (
                                    <button
                                        onClick={() => {
                                            if (disconnect) disconnect();
                                        }}
                                        className="w-full h-full bg-slate-800 hover:bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                    >
                                        DISCONNECT
                                    </button>
                                ) : (
                                    <div className="w-full h-full [&>.wallet-adapter-button]:w-full [&>.wallet-adapter-button]:h-full [&>.wallet-adapter-button]:justify-center [&>.wallet-adapter-button]:bg-gradient-to-r [&>.wallet-adapter-button]:from-purple-600 [&>.wallet-adapter-button]:to-indigo-600 [&>.wallet-adapter-button]:rounded-xl [&>.wallet-adapter-button]:text-xs [&>.wallet-adapter-button]:font-black [&>.wallet-adapter-button]:uppercase [&>.wallet-adapter-button]:tracking-widest [&>.wallet-adapter-button]:shadow-lg hover:[&>.wallet-adapter-button]:scale-[0.98] [&>.wallet-adapter-button]:transition-all">
                                        <WalletMultiButton />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* QR Scanner Trigger Card */}
                        <div className="p-5 sm:p-6 bg-white border border-blue-100 rounded-[2rem] shadow-xl relative overflow-hidden flex flex-col gap-5">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
                            
                            {/* Header */}
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-50 border border-slate-100 shadow-inner shrink-0">
                                        <QrCode size={24} className="text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{t.explorationTitle}</p>
                                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">{t.qrLocationScannerTitle}</h3>
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center">
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    {t.qrScannerDesc}
                                </p>
                            </div>

                            {/* Standardized Action Button */}
                            <button
                                onClick={startScanner}
                                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <QrCode size={16} />
                                {t.startScanner}
                            </button>
                        </div>

                        {/* Currency Converter */}
                        <div className="p-5 sm:p-6 bg-white border border-emerald-100 rounded-[2rem] shadow-xl relative overflow-hidden flex flex-col gap-5">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                            
                            {/* Header */}
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-50 border border-slate-100 shadow-inner shrink-0">
                                        <ArrowLeftRight size={24} className="text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Exchange</p>
                                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">{t.currencyConverterTitle}</h3>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setConversionMode(m => m === 'BAM_TO_EUR' ? 'EUR_TO_BAM' : 'BAM_TO_EUR');
                                        setBamValue('');
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all active:scale-95 shrink-0"
                                    title="Swap currency"
                                >
                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                                        {conversionMode === 'BAM_TO_EUR' ? 'BAM → EUR' : 'EUR → BAM'}
                                    </span>
                                    <ArrowLeftRight size={10} className="text-slate-400 ml-1" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                                <div>
                                    <label className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">
                                        {conversionMode === 'BAM_TO_EUR' ? t.enterBamLabel : t.enterEurLabel}
                                    </label>
                                    <input
                                        type="number"
                                        value={bamValue}
                                        onChange={(e) => setBamValue(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 font-black focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                    />
                                </div>
                                <div className="pt-3 border-t border-slate-200 flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] font-bold text-emerald-600 uppercase mb-0.5">
                                            {conversionMode === 'BAM_TO_EUR' ? t.estimatedEurLabel : t.estimatedBamLabel}
                                        </p>
                                        <p className="text-[9px] text-slate-400">{t.conversionRateText}</p>
                                    </div>
                                    <p className="text-xl font-black text-emerald-700 leading-none">
                                        {conversionMode === 'BAM_TO_EUR' ? `€ ${convertedValue}` : `KM ${convertedValue}`}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Right Column: Scan History Ledger + Partner Links (5 cols on lg) ── */}
                    <div className="lg:col-span-5 space-y-6">

                        {/* Scan History Ledger */}
                        <div className="p-4 sm:p-6 bg-white border border-emerald-100 rounded-[2rem] shadow-xl space-y-4 flex flex-col relative min-h-[380px]">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

                            <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
                                <div className="flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-emerald-600" />
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                                        {t.scanHistoryLedgerTitle}
                                    </h3>
                                </div>
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                                    {ledger.length} / {QUEST_TARGETS.length}
                                </span>
                            </div>

                            {/* Ledger Entries List */}
                            <div className="flex-1 overflow-y-auto max-h-[400px] pr-1 space-y-3 custom-scrollbar">
                                {ledger.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 my-auto">
                                        <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                                            <BookOpen size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-700 uppercase">
                                                {t.ledgerEmptyTitle}
                                            </p>
                                            <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
                                                {t.ledgerEmptyDesc}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    ledger.map((entry) => {
                                        const target = QUEST_TARGETS.find(q => q.id === entry.id);
                                        if (!target) return null;
                                        const targetName = target.name[lang] || target.name.en || target.name.bs;
                                        return (
                                            <div
                                                key={entry.id}
                                                className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-100 rounded-2xl flex items-center gap-3 transition-colors group relative"
                                            >
                                                <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-slate-200">
                                                    <img
                                                        src={target.Image}
                                                        alt={targetName}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight truncate">
                                                        {targetName}
                                                    </h4>
                                                    <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                                                        {entry.timestamp}
                                                    </span>
                                                </div>

                                                {/* Play Reward Video Button */}
                                                {(target as any).video && (
                                                    <button
                                                        onClick={() => setPlayingVideo((target as any).video)}
                                                        className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl transition-all shrink-0 active:scale-90"
                                                        title={t.watchCinematic}
                                                    >
                                                        <Play size={14} className="fill-emerald-600" />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Clear History Trigger */}
                            {ledger.length > 0 && (
                                <div className="pt-3 border-t border-slate-100 shrink-0">
                                    {showClearConfirm ? (
                                        <div className="flex items-center gap-2 bg-red-50 p-2 border border-red-100 rounded-2xl">
                                            <AlertCircle size={16} className="text-red-500 shrink-0" />
                                            <span className="text-[10px] font-bold text-red-700 uppercase flex-grow">
                                                {t.clearHistoryConfirm}
                                            </span>
                                            <button
                                                onClick={handleClearLedger}
                                                className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider"
                                            >
                                                {t.yesDelete}
                                            </button>
                                            <button
                                                onClick={() => setShowClearConfirm(false)}
                                                className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-lg text-[9px] font-black uppercase tracking-wider"
                                            >
                                                {t.cancel}
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setShowClearConfirm(true)}
                                            className="w-full py-2.5 bg-slate-50 border border-slate-100 hover:bg-red-50 hover:text-red-600 hover:border-red-100 text-slate-400 font-black text-[10px] uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                                        >
                                            <Trash2 size={12} />
                                            {t.clearScanHistory}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Partner Agencies */}
                        <div className="p-4 sm:p-8 bg-white border border-emerald-100 rounded-[2rem] shadow-xl space-y-6 overflow-hidden">
                            <h2 className="text-xl font-black text-emerald-950 uppercase tracking-tight flex items-center gap-2">
                                <Globe size={20} className="text-emerald-600" />
                                {t.partnerAgenciesTitle}
                            </h2>
                            <div className="space-y-4">
                                <button
                                    onClick={() => window.open('https://dentist-tuzla.onhercules.app/dentist-tourism/', '_blank')}
                                    className="w-full h-16 bg-white text-blue-600 border-2 border-blue-500 font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all text-sm tracking-widest uppercase hover:bg-slate-50"
                                >
                                    <Stethoscope size={18} />
                                    {t.dentalTourism}
                                </button>
                                <button
                                    onClick={() => window.open('https://aiso-tuzla.lovable.app/', '_blank')}
                                    className="w-full h-16 bg-blue-600 text-yellow-300 font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all text-sm tracking-widest uppercase hover:bg-blue-700"
                                >
                                    AISO TUZLA
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Privacy Disclaimer (Placed at the bottom of the Wallet page) */}
                <div className="mt-12 p-6 sm:p-8 bg-white border border-slate-200/80 rounded-[2rem] shadow-sm text-xs text-slate-500 leading-relaxed space-y-4">
                    <p className="font-light italic text-slate-500 leading-relaxed">
                        {t.privacyDisclaimerText}
                    </p>
                    <p className="font-bold text-slate-700 uppercase tracking-tight text-xs">{t.privacyKeyPointsTitle}</p>
                    <ul className="list-disc pl-5 space-y-2.5">
                        <li>
                            <span className="font-bold text-slate-700">{t.zeroCustodyTitle}</span> {t.zeroCustodyText}
                        </li>
                        <li>
                            <span className="font-bold text-slate-700">{t.privacyByDesignTitle}</span> {t.privacyByDesignText}
                        </li>
                        <li>
                            <span className="font-bold text-slate-700">{t.noDataStorageTitle}</span> {t.noDataStorageText}
                        </li>
                        <li>
                            <span className="font-bold text-slate-700">{t.onDeviceProcessingTitle}</span> {t.onDeviceProcessingText}
                        </li>
                    </ul>
                </div>
            </div>

            {/* VIDEO PLAYER */}
            <AnimatePresence>
                {playingVideo && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[7000] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-6"
                    >
                        <div className="w-full max-w-2xl bg-black border border-white/15 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col">
                            <div className="p-4 sm:p-5 flex items-center justify-between border-b border-white/10 bg-white/5">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center border border-amber-400/30">
                                        <Play className="w-4 h-4 fill-amber-400" />
                                    </div>
                                    <h3 className="text-base font-black text-white uppercase tracking-tight">
                                        {t.watchCinematic}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setPlayingVideo(null)}
                                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="relative w-full aspect-video sm:max-h-[60vh] bg-black flex items-center justify-center">
                                <video
                                    src={playingVideo}
                                    autoPlay
                                    controls
                                    playsInline
                                    preload="auto"
                                    className="w-full h-full object-contain"
                                />
                            </div>

                            <div className="p-4 border-t border-white/10 bg-white/5 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-400">
                                    {t.watchCinematic}
                                </span>
                                <button
                                    onClick={() => setPlayingVideo(null)}
                                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-all"
                                >
                                    {t.closeVideo}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* QR SCANNER CONTAINER MODAL OVERLAY */}
            <AnimatePresence>
                {isScanning && (
                    <div className="fixed inset-0 z-[6000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                        <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] overflow-hidden p-6 flex flex-col items-center">
                            {/* Header */}
                            <div className="w-full flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-black text-white uppercase tracking-wider">
                                        {t.qrLocationScannerTitle}
                                    </h3>
                                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                                        {t.scanLocationToUnlock}
                                    </p>
                                </div>
                                <button
                                    onClick={stopScanner}
                                    className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-full transition-all active:scale-95"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Camera Viewport */}
                            <div className="relative w-full aspect-square bg-black rounded-3xl overflow-hidden border-2 border-purple-500/30">
                                <div id="wallet-reader" className="w-full h-full"></div>

                                {/* Overlay Scanning Guide */}
                                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                    <div className="w-48 h-48 border-2 border-dashed border-purple-500/40 rounded-2xl relative">
                                        {/* Corners */}
                                        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-purple-400 -translate-x-1 -translate-y-1 rounded-tl-md"></div>
                                        <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-purple-400 translate-x-1 -translate-y-1 rounded-tr-md"></div>
                                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-purple-400 -translate-x-1 translate-y-1 rounded-bl-md"></div>
                                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-purple-400 translate-x-1 translate-y-1 rounded-br-md"></div>

                                        {/* Laser line animation */}
                                        <div className="absolute left-0 right-0 h-1 bg-purple-400/80 animate-scanner-laser top-[10%]"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Hint */}
                            <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mt-6 animate-pulse">
                                {t.positionCodeInFrame}
                            </p>
                        </div>
                    </div>
                )}
            </AnimatePresence>

            {/* SCANNER FEEDBACK TOAST */}
            <AnimatePresence>
                {scannerFeedback && (
                    <motion.div
                        initial={{ y: 50, opacity: 0, scale: 0.95 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 50, opacity: 0, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 370, damping: 24 }}
                        className={`fixed bottom-24 left-6 right-6 z-[6500] p-5 rounded-3xl shadow-[0_20px_50px_rgba(15,23,42,0.35)] flex items-center gap-4 ${scannerFeedback.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}
                    >
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-white/20">
                            {scannerFeedback.type === 'success' ? <Award className="w-6 h-6 text-white" /> : <X className="w-6 h-6 text-white" />}
                        </div>
                        <div className="flex-1">
                            <span className="text-[10px] font-black uppercase tracking-widest block mb-1">
                                {scannerFeedback.type === 'success'
                                    ? (lang === 'bs' ? 'Uspješno' : 'Success')
                                    : (lang === 'bs' ? 'Greška' : 'Error')}
                            </span>
                            <span className="text-sm font-black uppercase leading-none tracking-tight">{scannerFeedback.text}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                @keyframes laser-move {
                    0% { top: 10%; }
                    50% { top: 90%; }
                    100% { top: 10%; }
                }
                .animate-scanner-laser {
                    animation: laser-move 2.5s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

// Main Export Component wrapping contents in Solana Providers
const Wallet: React.FC<WalletProps> = ({ lang }) => {
    const [network, setNetwork] = useState<'mainnet-beta' | 'devnet'>('devnet');

    const endpoint = useMemo(() => {
        if (network === 'mainnet-beta') {
            return 'https://api.mainnet-beta.solana.com';
        }
        return clusterApiUrl('devnet');
    }, [network]);

    const wallets = useMemo(() => [
        new SolflareWalletAdapter()
    ], []);

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    <WalletContent lang={lang} network={network} setNetwork={setNetwork} />
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

export default Wallet;

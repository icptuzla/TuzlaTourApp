import React, { useState, useEffect, useRef } from 'react';

import { Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { Wallet as WalletIcon, Lock, CheckCircle2, Home, Stethoscope, Globe, X, Copy, ExternalLink, Zap, QrCode, Award, ArrowLeftRight } from 'lucide-react';
import { useNetwork } from '../hooks/useNetwork';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';



// TON Connect Removed
// Solana Imports
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';

interface WalletProps {
    lang: Language;
}

const Wallet: React.FC<WalletProps> = ({ lang }) => {
    const [activeSubTab, setActiveSubTab] = useState<'PAYMENT'>('PAYMENT');
    const [bamValue, setBamValue] = useState<string>('');
    const [conversionMode, setConversionMode] = useState<'BAM_TO_EUR' | 'EUR_TO_BAM'>('BAM_TO_EUR');
    const [solBalance, setSolBalance] = useState<number | null>(null);
    const [copySuccess, setCopySuccess] = useState(false);

    const [isScanning, setIsScanning] = useState(false);
    const [scannedReward, setScannedReward] = useState<string | null>(null);
    const [isMinting, setIsMinting] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);

    const isOnline = useNetwork();
    const t = TRANSLATIONS[lang];
    const convertedValue = bamValue
        ? conversionMode === 'BAM_TO_EUR'
            ? (parseFloat(bamValue) / 1.95583).toFixed(2)
            : (parseFloat(bamValue) * 1.95583).toFixed(2)
        : '0.00';

    // Solana wallet state
    const { publicKey, disconnect: solDisconnect, connected: solConnected, wallet: solWallet } = useWallet();
    const { connection } = useConnection();

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
        setScannedReward(null);
        setTimeout(async () => {
            if (!document.getElementById('wallet-reader')) return;
            try {
                const scanner = new Html5Qrcode('wallet-reader');
                scannerRef.current = scanner;
                await scanner.start(
                    { facingMode: 'environment' },
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    (decodedText) => {
                        setScannedReward(decodedText);
                        stopScanner();
                    },
                    (errorMessage) => { }
                );
            } catch (err) {
                console.error("Scanner error", err);
                setIsScanning(false);
                alert(lang === 'bs' ? "Nije moguće pokrenuti kameru." : "Could not start camera.");
            }
        }, 100);
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
                scannerRef.current.stop().catch(() => {});
            }
        }
    }, []);

    const handleMint = async () => {
        if (!solConnected || !publicKey) {
            alert(lang === 'bs' ? 'Molimo spojite Solflare novčanik.' : 'Please connect your Solflare wallet.');
            return;
        }
        setIsMinting(true);
        try {
            // Simulate mint transaction for Solflare interaction
            await new Promise(resolve => setTimeout(resolve, 2000));
            alert(lang === 'bs' ? `Uspješno mintano u Solflare: ${scannedReward}` : `Successfully minted to Solflare: ${scannedReward}`);
            setScannedReward(null);
        } catch (error) {
            alert(lang === 'bs' ? "Mintanje nije uspjelo" : "Minting failed");
        } finally {
            setIsMinting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 pb-32 overflow-x-hidden">
            <div className="max-w-6xl mx-auto p-4 sm:p-8">
                {/* Offline Warning */}
                {!isOnline && (
                    <div className="mb-8 flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl animate-pulse">
                        <span className="text-amber-500">📡</span>
                        <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                            {lang === 'bs' ? 'Blockchain zahtijeva internet vezu' : 'Blockchain requires internet'}
                        </p>
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {activeSubTab === 'PAYMENT' && (
                        <motion.div
                            key="payment"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-8"
                        >
                            <div className="text-center mb-12">
                                <h1 className="text-4xl font-black text-blue-950 uppercase tracking-tight">
                                    {lang === 'bs' ? 'Digitalni' : 'Digital'} <span className="text-blue-600">{lang === 'bs' ? 'Novčanik' : 'Wallet'}</span>
                                </h1>
                                <div className="h-1 w-24 bg-blue-600 mx-auto rounded-full mt-2" />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* ── Left Column: Solana + Scanner ── */}
                                <div className="space-y-6">



                                    {/* Solana Card */}
                                    <div className="p-4 sm:p-6 glassy rounded-[2rem] border border-purple-100 shadow-xl space-y-4 overflow-hidden">
                                        <div className="flex justify-between items-center flex-wrap gap-2 max-w-full">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                                                    <Zap size={18} className="text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Solana (Devnet)</p>
                                                    {solConnected && publicKey ? (
                                                        <p className="text-base font-black text-purple-950">{shortAddress(publicKey.toBase58())}</p>
                                                    ) : (
                                                        <p className="text-base font-black text-slate-400">{lang === 'bs' ? 'Nije spojeno' : 'Not connected'}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="max-w-[160px] overflow-hidden">
                                              <WalletMultiButton
                                                  style={{
                                                      background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                                                      borderRadius: '1rem',
                                                      fontSize: '10px',
                                                      fontWeight: 900,
                                                      height: '36px',
                                                      padding: '0 12px',
                                                      maxWidth: '100%',
                                                      overflow: 'hidden',
                                                      textOverflow: 'ellipsis',
                                                      whiteSpace: 'nowrap',
                                                  }}
                                              />
                                            </div>
                                        </div>

                                        {/* SOL Balance + Address actions */}
                                        <AnimatePresence>
                                            {solConnected && publicKey && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="pt-4 border-t border-purple-100 space-y-3"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-[10px] font-bold text-purple-300 uppercase">SOL Balance</p>
                                                            <p className="text-2xl font-black text-purple-700">
                                                                {solBalance !== null ? `◎ ${solBalance.toFixed(4)}` : '—'}
                                                            </p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={handleCopyAddress}
                                                                className="p-2 bg-purple-100 rounded-xl hover:bg-purple-200 transition-all active:scale-90"
                                                                title="Copy address"
                                                            >
                                                                {copySuccess
                                                                    ? <CheckCircle2 size={16} className="text-green-600" />
                                                                    : <Copy size={16} className="text-purple-600" />
                                                                }
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {/* Solana Explorer Button */}
                                                    <button
                                                        onClick={() => window.open(`https://explorer.solana.com/address/${publicKey.toBase58()}?cluster=devnet`, '_blank')}
                                                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow hover:shadow-lg active:scale-95 transition-all"
                                                    >
                                                        <ExternalLink size={14} />
                                                        {lang === 'bs' ? 'Pregledaj na Solana Exploreru' : 'View on Solana Explorer'}
                                                    </button>
                                                    <p className="text-[10px] text-purple-300 font-mono break-all">
                                                        {publicKey.toBase58()}
                                                    </p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    {/* NFT Rewards Card */}
                                    <div className="p-4 sm:p-6 glassy rounded-[2rem] border border-fuchsia-100 shadow-xl space-y-4 overflow-hidden">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-fuchsia-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                                                    <Award size={18} className="text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-fuchsia-400 uppercase tracking-widest">NFT Rewards</p>
                                                    <p className="text-base font-black text-fuchsia-950">Scan & Mint</p>
                                                </div>
                                            </div>
                                            {!isScanning && !scannedReward && (
                                                <button
                                                    onClick={startScanner}
                                                    className="w-10 h-10 bg-fuchsia-100 text-fuchsia-600 rounded-xl flex items-center justify-center hover:bg-fuchsia-200 transition-colors active:scale-95"
                                                    title="Scan QR Code"
                                                >
                                                    <QrCode size={20} />
                                                </button>
                                            )}
                                        </div>
                                        
                                        <AnimatePresence>
                                            {isScanning && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                                    <div className="relative rounded-2xl overflow-hidden bg-black aspect-square max-h-64 mx-auto w-full max-w-[256px] border-4 border-fuchsia-100 mt-4">
                                                        <div id="wallet-reader" className="w-full h-full"></div>
                                                        <button onClick={stopScanner} className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 z-50">
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                            
                                            {scannedReward && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="pt-4 border-t border-fuchsia-100 space-y-3">
                                                    <div className="p-4 bg-fuchsia-50 rounded-xl border border-fuchsia-100 text-center">
                                                        <p className="text-xs font-bold text-fuchsia-600 uppercase mb-1">Found Reward</p>
                                                        <p className="text-sm font-black text-fuchsia-950 truncate">{scannedReward}</p>
                                                    </div>
                                                    <button
                                                        onClick={handleMint}
                                                        disabled={isMinting || !solConnected}
                                                        className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-sm flex justify-center items-center gap-2 transition-all ${
                                                            !solConnected ? 'bg-slate-100 text-slate-400 cursor-not-allowed' :
                                                            isMinting ? 'bg-fuchsia-300 text-fuchsia-700 animate-pulse' : 'bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white shadow-lg hover:shadow-xl active:scale-95'
                                                        }`}
                                                    >
                                                        {isMinting ? (lang === 'bs' ? 'Mintanje...' : 'Minting...') : (lang === 'bs' ? 'Mintaj na Solflare' : 'Mint to Solflare')}
                                                    </button>
                                                    {!solConnected && (
                                                        <p className="text-[10px] text-center text-rose-500 font-bold uppercase mt-2">
                                                            {lang === 'bs' ? 'Spojite Solflare novčanik za mintanje' : 'Connect Solflare wallet to mint'}
                                                        </p>
                                                    )}
                                                    <button onClick={() => setScannedReward(null)} className="w-full text-center text-xs text-slate-400 font-bold uppercase hover:text-slate-600">
                                                        Cancel
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Currency Converter */}
                                    <div className="p-4 sm:p-6 glassy rounded-[2rem] border border-blue-100 shadow-xl space-y-4 overflow-hidden">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest">Currency Converter</h3>
                                            <button
                                                onClick={() => {
                                                    setConversionMode(m => m === 'BAM_TO_EUR' ? 'EUR_TO_BAM' : 'BAM_TO_EUR');
                                                    setBamValue('');
                                                }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow"
                                                title="Switch conversion direction"
                                            >
                                                <ArrowLeftRight size={12} />
                                                {conversionMode === 'BAM_TO_EUR' ? 'BAM → EUR' : 'EUR → BAM'}
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-[10px] font-bold text-blue-300 uppercase block mb-1">
                                                    {conversionMode === 'BAM_TO_EUR' ? 'Enter BAM' : 'Enter EUR'}
                                                </label>
                                                <input
                                                    type="number"
                                                    value={bamValue}
                                                    onChange={(e) => setBamValue(e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-full bg-blue-50 border border-blue-100 rounded-2xl px-5 py-3 text-blue-950 font-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div className="bg-blue-900/5 p-5 rounded-2xl border border-blue-100/50">
                                                <p className="text-[10px] font-bold text-blue-300 uppercase mb-1">
                                                    {conversionMode === 'BAM_TO_EUR' ? 'Estimated EUR' : 'Estimated BAM'}
                                                </p>
                                                <p className="text-3xl font-black text-blue-600">
                                                    {conversionMode === 'BAM_TO_EUR' ? `€ ${convertedValue}` : `KM ${convertedValue}`}
                                                </p>
                                                <p className="text-[10px] text-blue-300 mt-1">
                                                    Rate: 1 EUR = 1.95583 BAM
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Privacy Disclaimer */}
                                    <div className="px-2 text-[11px] text-slate-500 font-light italic leading-relaxed space-y-3 pb-4">
                                        <p>
                                            This application functions as a non-custodial, self-sovereign interface. We provide the tools for you to interact with information and blockchain services, but you maintain absolute ownership and control of your digital assets and identity.
                                        </p>
                                        <p className="font-medium text-slate-600 not-italic">Key Privacy &amp; Data Security Points</p>
                                        <ul className="list-disc pl-4 space-y-2">
                                            <li><span className="font-medium not-italic text-slate-600">Zero Custody of Assets:</span> We do not hold your private keys, seed phrases, or digital assets. You have sole, exclusive control over your wallet. We cannot access, recover, or move your funds.</li>
                                            <li><span className="font-medium not-italic text-slate-600">Privacy-by-Design:</span> In compliance with the new Law on Personal Data Protection of Bosnia and Herzegovina (Official Gazette of BiH, No. 12/25, aligned with GDPR), this app is built to collect zero personal identifying information (PII).</li>
                                            <li><span className="font-medium not-italic text-slate-600">No Data Storage:</span> We do not store your personal history, location logs, or behavioral data on our servers. Any interaction—including AI queries or image analysis for landmark identification—is processed anonymously.</li>
                                            <li><span className="font-medium not-italic text-slate-600">On-Device Processing:</span> Wherever possible, data processing is handled locally on your own device to ensure your information never leaves your possession.</li>
                                            <li><span className="font-medium not-italic text-slate-600">User Responsibility:</span> Because we hold no data or keys, we cannot assist with account recovery. Your security rests entirely on your protection of your private keys and device credentials.</li>
                                        </ul>
                                    </div>
                                </div>

                                {/* ── Right Column: Partner Links ── */}
                                <div className="p-4 sm:p-8 glassy rounded-[2rem] sm:rounded-[3rem] border border-emerald-100 shadow-xl space-y-6 overflow-hidden">
                                    <h2 className="text-xl font-black text-emerald-950 uppercase tracking-tight flex items-center gap-2">
                                        <Globe size={20} className="text-emerald-600" />
                                        Partner Agencies
                                    </h2>
                                    <div className="space-y-4">
                                        <button
                                            onClick={() => window.open('https://travelagency-icptuzla.wasmer.app/', '_blank')}
                                            className="w-full h-16 bg-emerald-600 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                                        >
                                            <Globe size={18} />
                                            TRAVEL AGENCIES
                                        </button>
                                        <button
                                            onClick={() => window.open('https://dentist-tuzla.onhercules.app/dentist-tourism/', '_blank')}
                                            className="w-full h-16 bg-white text-blue-600 border-2 border-blue-50 font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                                        >
                                            <Stethoscope size={18} />
                                            DENTAL TOURISM
                                        </button>
                                        <button
                                            onClick={() => window.open('https://aiso-tuzla-ai.lovable.app/', '_blank')}
                                            className="w-full h-16 bg-blue-600 text-yellow-400 font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                                        >
                                            AISO TUZLA
                                        </button>
                                        <button
                                            onClick={() => window.open('https://bosnia-collection.vercel.app/', '_blank')}
                                            className="w-full h-16 bg-gold-500 text-blue-700 font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                                        >
                                            BOSNIA AND HERZEGOVINA DIGITAL ALBUM
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}



                </AnimatePresence>
            </div>



            <style>{`
                .glassy {
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(20px);
                }
            `}</style>
        </div>
    );
};


export default Wallet;

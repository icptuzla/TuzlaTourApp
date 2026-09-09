// src/hooks/useQuestState.ts
import { useState, useRef, useEffect } from 'react';

export const useQuestState = () => {
    const [isScanning, setIsScanning] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const [selectedNavTarget, setSelectedNavTarget] = useState<any | null>(null);
    const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
    const [showRules, setShowRules] = useState(false);
    const [isOfflineMode, setIsOfflineMode] = useState(false);
    const [playingVideo, setPlayingVideo] = useState<string | null>(null);

    const rulesTimerRef = useRef<NodeJS.Timeout | null>(null);

    const handleTriggerRules = () => {
        if (rulesTimerRef.current) clearTimeout(rulesTimerRef.current);
        setShowRules(prev => !prev);
    };

    useEffect(() => {
        if (showRules) {
            rulesTimerRef.current = setTimeout(() => setShowRules(false), 10000);
        }
        return () => {
            if (rulesTimerRef.current) clearTimeout(rulesTimerRef.current);
        };
    }, [showRules]);

    return {
        isScanning, setIsScanning,
        isNavigating, setIsNavigating,
        selectedNavTarget, setSelectedNavTarget,
        isPresetModalOpen, setIsPresetModalOpen,
        showRules, setShowRules, handleTriggerRules,
        isOfflineMode, setIsOfflineMode,
        playingVideo, setPlayingVideo
    };
};
/**
 * useKeyboardShortcuts.ts
 *
 * Attaches a global `keydown` listener and dispatches to action handlers
 * based on the user's configured shortcut map.
 *
 * Uses the "latest ref" pattern to access current state values without
 * triggering re-registrations of the event listener. All options are stored
 * in a single ref that is updated synchronously during render.
 */

import { useEffect, useRef } from 'react';
import type { ShortcutAction, ShortcutsMap } from '../types/app';
import { DEFAULT_SHORTCUTS } from '../constants/shortcuts';
import type { StoredChannel } from '../db';
import type { LayoutMode } from './useMultiview';
import type { View } from './useNavigation';
import { Bridge } from '../services/tauri-bridge';

export interface UseKeyboardShortcutsOptions {
    // --- Current state values (accessed via latest ref pattern) ---
    shortcuts: ShortcutsMap;
    activeView: View;
    showSettingsPopup: boolean;
    categoriesOpen: boolean;
    categoriesHidden: boolean;
    categoriesHiddenTransparent: boolean;
    position: number;
    currentChannels: StoredChannel[];
    currentChannel: StoredChannel | null;
    switchLayout: ((layout: LayoutMode) => void) | null;
    titleBarSearchRef: React.RefObject<HTMLInputElement | null>;
    handlePlayChannel: (channel: StoredChannel, autoSwitched?: boolean) => void;
    lastPlayedChannel: StoredChannel | null;

    // --- Action callbacks ---
    showShortcutsOverlay: boolean;
    setShowShortcutsOverlay: React.Dispatch<React.SetStateAction<boolean>>;
    handleTogglePlay: () => void;
    handleToggleMute: () => void;
    handleToggleStats: () => void;
    handleToggleFullscreen: () => void;
    handleShowSubtitleModal: () => void;
    handleShowAudioModal: () => void;
    handleSeek: (position: number) => void;
    handleToggleEpgView: () => void;
    setActiveView: React.Dispatch<React.SetStateAction<View>>;
    setShowSettingsPopup: React.Dispatch<React.SetStateAction<boolean>>;
    setCategoriesOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setShowControls: React.Dispatch<React.SetStateAction<boolean>>;
    guideTransparent: boolean;
    setGuideTransparent: React.Dispatch<React.SetStateAction<boolean>>;
    isTransparentGuideZapActive: boolean;

    // --- Channel info overlay flash ---
    onChannelChangeFlash?: () => void;
    // --- Transparent guide flash on channel zap ---
    onTransparentGuideZapFlash?: () => void;
}

/**
 * Registers a global keydown listener that fires the appropriate action when
 * the user presses a configured shortcut key.
 *
 * Uses the latest ref pattern to avoid stale closures - all state is accessed
 * through a single ref that is updated synchronously during render.
 * The listener is attached once on mount and removed on unmount.
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions): void {
    // Store all options in a single ref, updated synchronously during render
    const latestRefs = useRef(options);
    latestRefs.current = options;

    useEffect(() => {
        const handleKeyDown = async (e: KeyboardEvent) => {
            // Don't handle shortcuts when typing in inputs
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement
            ) {
                return;
            }

            // Access all values through the latest ref
            const {
                shortcuts,
                activeView,
                showSettingsPopup,
                categoriesOpen,
                categoriesHidden,
                categoriesHiddenTransparent,
                position,
                currentChannels,
                currentChannel,
                switchLayout,
                titleBarSearchRef,
                handlePlayChannel,
                lastPlayedChannel,
                showShortcutsOverlay,
                setShowShortcutsOverlay,
                handleTogglePlay,
                handleToggleMute,
                handleToggleStats,
                handleToggleFullscreen,
                handleShowSubtitleModal,
                handleShowAudioModal,
                handleSeek,
                handleToggleEpgView,
                setActiveView,
                setShowSettingsPopup,
                setCategoriesOpen,
                setShowControls,
                guideTransparent,
                setGuideTransparent,
                isTransparentGuideZapActive,
                onChannelChangeFlash,
                onTransparentGuideZapFlash,
            } = latestRefs.current;

            // Helper to match keys case-insensitively for letters, falling back to physical key code (e.code) for non-English layouts
            const matches = (action: ShortcutAction): boolean => {
                const storedKey = shortcuts[action] || DEFAULT_SHORTCUTS[action];
                if (!storedKey) return false;

                const eventKey = e.key;
                const eventCode = e.code;

                // 1. Direct character match (case-insensitive for single letters)
                if (eventKey === storedKey) return true;
                if (eventKey.length === 1 && storedKey.length === 1 && eventKey.toLowerCase() === storedKey.toLowerCase()) {
                    return true;
                }

                // 2. Physical key position fallback (layout-independent for non-English OS keyboards)
                if (storedKey.length === 1 && /^[a-zA-Z]$/.test(storedKey)) {
                    if (eventCode === `Key${storedKey.toUpperCase()}`) return true;
                } else if (storedKey.length === 1 && /^[0-9]$/.test(storedKey)) {
                    if (eventCode === `Digit${storedKey}` || eventCode === `Numpad${storedKey}`) return true;
                } else if (storedKey === '/') {
                    if (eventCode === 'Slash' || eventCode === 'NumpadDivide') return true;
                } else if (storedKey === ',') {
                    if (eventCode === 'Comma') return true;
                } else if (storedKey === ' ') {
                    if (eventCode === 'Space') return true;
                }

                return false;
            };

            if (matches('toggleShortcutsOverlay')) {
                e.preventDefault();
                setShowShortcutsOverlay((show) => !show);
            } else if (matches('togglePlay')) {
                e.preventDefault();
                handleTogglePlay();
            } else if (matches('toggleMute')) {
                handleToggleMute();
            } else if (matches('toggleStats')) {
                e.preventDefault();
                handleToggleStats();
            } else if (matches('toggleFullscreen')) {
                e.preventDefault();
                handleToggleFullscreen();
            } else if (matches('selectSubtitle')) {
                e.preventDefault();
                handleShowSubtitleModal();
            } else if (matches('selectAudio')) {
                e.preventDefault();
                handleShowAudioModal();
            } else if (matches('toggleGuide')) {
                setActiveView((v) => (v === 'guide' ? 'none' : 'guide'));
            } else if (matches('toggleTransparentGuide')) {
                e.preventDefault();
                setShowControls(true);
                if (activeView === 'guide') {
                    // If already in transparent mode, close; otherwise enter transparent mode
                    if (guideTransparent) {
                        setActiveView('none');
                        setCategoriesOpen(false);
                    }
                } else {
                    // Open guide in transparent mode
                    setGuideTransparent(true);
                    setActiveView('guide');
                    setCategoriesOpen(!categoriesHiddenTransparent);
                }
            } else if (matches('toggleCategories')) {
                setCategoriesOpen((open) => !open);
            } else if (matches('toggleLiveTV')) {
                e.preventDefault();
                setShowControls(true);
                if (activeView === 'guide') {
                    if (guideTransparent) {
                        setGuideTransparent(false);
                        setCategoriesOpen(!categoriesHidden);
                    } else {
                        // LiveTV is open, close it entirely
                        setActiveView('none');
                        setCategoriesOpen(false);
                    }
                } else {
                    // Open LiveTV, respect user's category hidden preference
                    setActiveView('guide');
                    setCategoriesOpen(!categoriesHidden);
                }
            } else if (matches('toggleSettings')) {
                e.preventDefault();
                // Toggle settings popup if in main layout, otherwise toggle full view
                setShowSettingsPopup((show) => !show);
            } else if (matches('toggleSports')) {
                e.preventDefault();
                setCategoriesOpen(false);
                setActiveView((v) => (v === 'sports' ? 'none' : 'sports'));
            } else if (matches('toggleDvr')) {
                e.preventDefault();
                setCategoriesOpen(false);
                setActiveView((v) => (v === 'dvr' ? 'none' : 'dvr'));
            } else if (matches('toggleCalendar')) {
                e.preventDefault();
                setCategoriesOpen(false);
                setActiveView((v) => (v === 'calendar' ? 'none' : 'calendar'));
            } else if (matches('toggleNuvio')) {
                e.preventDefault();
                setCategoriesOpen(false);
                setActiveView((v) => (v === 'nuvio' ? 'none' : 'nuvio'));
            } else if (matches('toggleStrem')) {
                e.preventDefault();
                setCategoriesOpen(false);
                setActiveView((v) => (v === 'stremio' ? 'none' : 'stremio'));
            } else if (matches('toggleEpgView')) {
                e.preventDefault();
                handleToggleEpgView();
            } else if (matches('focusSearch')) {
                e.preventDefault();
                setShowControls(true);
                if (activeView !== 'guide') {
                    setActiveView('guide');
                }
                setCategoriesOpen(true);
                if (titleBarSearchRef.current) {
                    titleBarSearchRef.current.focus();
                }
            } else if (matches('close')) {
                e.preventDefault();
                if (showShortcutsOverlay) {
                    setShowShortcutsOverlay(false);
                    return;
                }
                try {
                    if (await Bridge.isFullscreen()) {
                        await Bridge.toggleFullscreen();
                        return;
                    }
                } catch (err) {
                    console.error('[KeyboardShortcuts] Failed to exit fullscreen on Escape:', err);
                }

                // Close settings popup first if open
                if (showSettingsPopup) {
                    setShowSettingsPopup(false);
                } else {
                    setActiveView('none');
                }
                setCategoriesOpen(false);
                setShowControls(false);
            } else if (matches('seekForward')) {
                e.preventDefault();
                handleSeek(position + 10);
            } else if (matches('seekBackward')) {
                e.preventDefault();
                handleSeek(position - 10);
            } else if (matches('layoutMain')) {
                e.preventDefault();
                switchLayout?.('main');
            } else if (matches('layoutPip')) {
                e.preventDefault();
                switchLayout?.('pip');
            } else if (matches('layoutBigBottom')) {
                e.preventDefault();
                switchLayout?.('bigbottom');
            } else if (matches('layout2x2')) {
                e.preventDefault();
                switchLayout?.('2x2');
            } else if (matches('channelUp')) {
                e.preventDefault();
                if (currentChannels.length > 0 && currentChannel) {
                    const currentIndex = currentChannels.findIndex((ch) => ch.stream_id === currentChannel.stream_id);
                    if (currentIndex > 0) {
                        handlePlayChannel(currentChannels[currentIndex - 1]);
                    } else if (currentIndex === 0) {
                        // Wrap to last channel
                        handlePlayChannel(currentChannels[currentChannels.length - 1]);
                    }
                    // Flash channel info overlay when changing channels outside guide/sports (or during transparent guide overlay zap)
                    if (activeView !== 'guide' && activeView !== 'sports') {
                        onChannelChangeFlash?.();
                        onTransparentGuideZapFlash?.();
                    } else if (activeView === 'guide' && guideTransparent && isTransparentGuideZapActive) {
                        onChannelChangeFlash?.();
                        onTransparentGuideZapFlash?.();
                    }
                }
            } else if (matches('channelDown')) {
                e.preventDefault();
                if (currentChannels.length > 0 && currentChannel) {
                    const currentIndex = currentChannels.findIndex((ch) => ch.stream_id === currentChannel.stream_id);
                    if (currentIndex >= 0 && currentIndex < currentChannels.length - 1) {
                        handlePlayChannel(currentChannels[currentIndex + 1]);
                    } else if (currentIndex === currentChannels.length - 1) {
                        // Wrap to first channel
                        handlePlayChannel(currentChannels[0]);
                    }
                    // Flash channel info overlay when changing channels outside guide/sports (or during transparent guide overlay zap)
                    if (activeView !== 'guide' && activeView !== 'sports') {
                        onChannelChangeFlash?.();
                        onTransparentGuideZapFlash?.();
                    } else if (activeView === 'guide' && guideTransparent && isTransparentGuideZapActive) {
                        onChannelChangeFlash?.();
                        onTransparentGuideZapFlash?.();
                    }
                }
            } else if (matches('replayLastStream')) {
                e.preventDefault();
                if (lastPlayedChannel) {
                    handlePlayChannel(lastPlayedChannel);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []); // Empty dep array: all state accessed via latest ref
}

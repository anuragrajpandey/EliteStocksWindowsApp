import { useEffect, useState } from 'react';
import { getChannelMetadata } from '../services/video-metadata';
import type { ChannelMetadata } from '../db';
import { dbEvents } from '../db/sqlite-adapter';
import { useAppSettings } from '../hooks/useAppSettings';
import './MetadataBadge.css';

interface MetadataBadgeProps {
    streamId: string;
    variant?: 'compact' | 'detailed';
    showResolution?: boolean;
    showFps?: boolean;
    showSound?: boolean;
}

/**
 * MetadataBadge - Displays video quality, FPS, and audio channel info
 * Automatically refreshes when metadata is updated in the database
 */
export function MetadataBadge({
    streamId,
    variant = 'compact',
    showResolution,
    showFps,
    showSound,
}: MetadataBadgeProps) {
    const [metadata, setMetadata] = useState<ChannelMetadata | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const {
        epgMetadataBadgeResolution = true,
        epgMetadataBadgeFps = true,
        epgMetadataBadgeSound = true,
    } = useAppSettings();

    const effectiveShowResolution = showResolution ?? epgMetadataBadgeResolution;
    const effectiveShowFps = showFps ?? epgMetadataBadgeFps;
    const effectiveShowSound = showSound ?? epgMetadataBadgeSound;

    // Load metadata on mount and when streamId or refreshKey changes
    useEffect(() => {
        getChannelMetadata(streamId).then(setMetadata);
    }, [streamId, refreshKey]);

    // Listen to database updates for channelMetadata table only
    // Scoped subscription prevents re-renders on unrelated DB writes (e.g. EPG sync, favorites)
    useEffect(() => {
        const unsubscribe = dbEvents.subscribe('channelMetadata', () => {
            setRefreshKey(prev => prev + 1);
        });
        return unsubscribe;
    }, []);

    // Return null immediately - badge will pop in when data loads
    if (!metadata) return null;

    const { quality_label, fps, audio_channels } = metadata;

    const hasRes = Boolean(effectiveShowResolution && quality_label);
    const hasFps = Boolean(effectiveShowFps && fps > 0);
    const hasSound = Boolean(effectiveShowSound && audio_channels);

    if (!hasRes && !hasFps && !hasSound) return null;

    if (variant === 'compact') {
        return (
            <div className="metadata-badge compact">
                {hasRes && <span className="quality">{quality_label}</span>}
            </div>
        );
    }

    return (
        <div className="metadata-badge detailed">
            {hasRes && <span className="quality">{quality_label}</span>}
            {hasFps && <span className="fps">{Math.round(fps)}fps</span>}
            {hasSound && <span className="audio">{audio_channels}</span>}
        </div>
    );
}

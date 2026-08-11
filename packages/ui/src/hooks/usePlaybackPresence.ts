import { useEffect } from 'react';
import i18n from '../i18n';
import { setPlaybackPresence } from '../services/discord/presence';

export interface PlaybackState {
  playing: boolean;
  paused: boolean;
  title: string | null;
  subtitle?: string | null;
  posterUrl?: string | null;
  positionSec?: number;
  durationSec?: number;
}

export function usePlaybackPresence(state: PlaybackState): void {
  const { playing, paused, title, subtitle, posterUrl, positionSec = 0, durationSec = 0 } = state;

  useEffect(() => {
    if (!playing || !title) {
      setPlaybackPresence(null);
      return;
    }

    setPlaybackPresence({
      title: title || i18n.t('common:watchingYnotv'),
      subtitle: subtitle || undefined,
      posterUrl: posterUrl || undefined,
      paused,
      positionSec,
      durationSec,
    });
  }, [playing, paused, title, subtitle, posterUrl, positionSec, durationSec]);

  // Clean up playback presence on unmount
  useEffect(() => {
    return () => {
      setPlaybackPresence(null);
    };
  }, []);
}

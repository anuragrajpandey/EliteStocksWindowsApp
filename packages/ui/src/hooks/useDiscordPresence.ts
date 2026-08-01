import { useEffect } from 'react';
import { useUIStore } from '../stores/uiStore';
import type { View } from './useNavigation';
import { configureDiscord, setBrowsePresence, type BrowsePresence } from '../services/discord/presence';

export interface DiscordSettings {
  discordRichPresence?: boolean;
  discordHideTitle?: boolean;
  discordShowWhenPaused?: boolean;
  discordShowWhenBrowsing?: boolean;
  discordShowPoster?: boolean;
  discordShowTimestamp?: boolean;
}

const VIEW_LABELS: Record<string, BrowsePresence> = {
  none: { details: 'Browsing ynotv' },
  guide: { details: 'Browsing Live TV' },
  movies: { details: 'Browsing Movies' },
  series: { details: 'Browsing Series' },
  dvr: { details: 'Checking DVR Recordings' },
  sports: { details: 'Checking Sports Hub' },
  calendar: { details: 'Checking TV Calendar' },
  stremio: { details: 'Browsing Stremio' },
  nuvio: { details: 'Browsing Nuvio' },
  settings: { details: 'Tweaking Settings' },
};

export function useDiscordPresence(
  settings: DiscordSettings,
  activeView: View
): void {
  const moviesSelectedItem = useUIStore((s) => s.moviesSelectedItem);
  const seriesSelectedItem = useUIStore((s) => s.seriesSelectedItem);

  // Sync settings with presence engine
  useEffect(() => {
    configureDiscord({
      enabled: settings.discordRichPresence ?? false,
      hideTitle: settings.discordHideTitle ?? false,
      showWhenPaused: settings.discordShowWhenPaused ?? true,
      showWhenBrowsing: settings.discordShowWhenBrowsing ?? true,
      showPoster: settings.discordShowPoster ?? true,
      showTimestamp: settings.discordShowTimestamp ?? true,
    });
  }, [
    settings.discordRichPresence,
    settings.discordHideTitle,
    settings.discordShowWhenPaused,
    settings.discordShowWhenBrowsing,
    settings.discordShowPoster,
    settings.discordShowTimestamp,
  ]);

  // Sync browsing view state
  useEffect(() => {
    if (activeView === 'movies' && moviesSelectedItem) {
      const itemAny = moviesSelectedItem as any;
      const year = itemAny.year ? String(itemAny.year) : undefined;
      const poster = itemAny.cover || itemAny.stream_icon || itemAny.poster || itemAny.poster_path || undefined;
      setBrowsePresence({
        details: `Browsing ${itemAny.title}`,
        state: year ? `Movie · ${year}` : 'Movie',
        largeImage: poster,
        largeText: itemAny.title,
      });
      return;
    }

    if (activeView === 'series' && seriesSelectedItem) {
      const itemAny = seriesSelectedItem as any;
      const year = itemAny.year ? String(itemAny.year) : undefined;
      const poster = itemAny.cover || itemAny.stream_icon || itemAny.poster || itemAny.poster_path || undefined;
      setBrowsePresence({
        details: `Browsing ${itemAny.title}`,
        state: year ? `Series · ${year}` : 'Series',
        largeImage: poster,
        largeText: itemAny.title,
      });
      return;
    }

    setBrowsePresence(VIEW_LABELS[activeView] ?? { details: 'Browsing ynotv' });
  }, [activeView, moviesSelectedItem, seriesSelectedItem, settings.discordRichPresence]);
}

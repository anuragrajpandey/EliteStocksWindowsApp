import { useEffect } from 'react';
import i18n from '../i18n';
import { useUIStore } from '../stores/uiStore';
import type { View } from './useNavigation';
import { configureDiscord, setBrowsePresence } from '../services/discord/presence';

export interface DiscordSettings {
  discordRichPresence?: boolean;
  discordHideTitle?: boolean;
  discordShowWhenPaused?: boolean;
  discordShowWhenBrowsing?: boolean;
  discordShowPoster?: boolean;
  discordShowTimestamp?: boolean;
}

const VIEW_LABELS: Record<string, string> = {
  none: 'discord:browsingYnotv',
  guide: 'discord:browsingLiveTv',
  movies: 'discord:browsingMovies',
  series: 'discord:browsingSeries',
  dvr: 'discord:checkingDvrRecordings',
  sports: 'discord:checkingSportsHub',
  calendar: 'discord:checkingTvCalendar',
  stremio: 'discord:browsingStremio',
  nuvio: 'discord:browsingNuvio',
  settings: 'discord:tweakingSettings',
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
        details: i18n.t('discord:browsingItem', { title: itemAny.title }),
        state: year ? i18n.t('discord:movieYear', { year }) : i18n.t('discord:movie'),
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
        details: i18n.t('discord:browsingItem', { title: itemAny.title }),
        state: year ? i18n.t('discord:seriesYear', { year }) : i18n.t('discord:series'),
        largeImage: poster,
        largeText: itemAny.title,
      });
      return;
    }

    const labelKey = VIEW_LABELS[activeView] ?? 'discord:browsingYnotv';
    setBrowsePresence({ details: i18n.t(labelKey, { defaultValue: i18n.t('discord:browsingYnotv') }) });
  }, [activeView, moviesSelectedItem, seriesSelectedItem, settings.discordRichPresence]);
}

# Changelog

## v2.4.0

### Added

- **Failover auto-match** - Automatically build failover groups by selecting sources and categories to match from. A minimum match percentage threshold can be configured. Access via the `Failover Group` button in the EPG and select `Smart Auto-Group`.
- **Channel stream probe** - Scan playlists (configurable per source or category) to populate metadata badges, identify dead or geo-blocked channels, quickly disable all dead channels, and view a breakdown of stream resolutions. To access, click the new Probe button in the EPG.
- **Sports enhancements:**
  - **Live sidebar widget** - When enabled, a live games sidebar with live games count appears when hovering over the Live Now button, showing a compact view of all currently live games with scores and a play button for each linked channel, allowing quick game switching without leaving the player.
  - **Team channel linking and auto-linking** - Link channels to teams for quick access during live games. Configure under `Sports → Live Now → Manage Team Channels`. Channels can be linked manually or automatically, with an option to auto-swap to a backup channel if the playing stream is dead.
  - **Search source configuration** - Configure which sources and categories are used when searching for match streams, either globally or per league for a more scoped match.
  - **Automatic stream search when games go live** - Stream searches now run in the background as games kick off, so that clicking `List Streams Here` returns results instantly and for the Search button in the Live Games sidebar.
  - **Linked channels in media bar** - When multiple channels are linked to a team, a team logo icon appears in the media bar. Clicking it shows all linked channels for quick switching.
- **Local Library for Movies and Series** - Add local folders to VOD Movies and Series via the new Local tab. Titles are automatically matched with TMDB metadata (requires a TMDB key), and integrate with Trakt/Simkl scrobbling and subtitle fetching.
- **Reworked search results** - Search results are now organized into three tabs: `Channels`, `Live Now EPG`, and `Upcoming EPG`. EPG matches display time remaining, start/end times, and a progress bar. Upcoming EPG entries show start and end times. Channel matches are now displayed in the same style as the Live TV view.
- **Automated backups** - Export files are now backed up automatically. Enabled by default, can be disabled under `Settings → Export / Import`. The backup interval, save location, and maximum number of backups to retain are configurable.
- **Per-source favorites** - Favorites can now be organized into each source, globally, or both. Configure under `Settings → Live TV → Favorites`.
- **VOD metadata editing** - Manually correct the TMDb ID for VOD titles where the source-provided ID is incorrect.
- **VOD drag-to-reorder** - VOD categories and sources can be reordered by holding `Ctrl` (configurable under `Settings → Shortcuts`).
- **Automatically Hide disabled source VOD playlist items** - Disabled sources in VOD playlists are now automatically hidden with a quick way to delete.
- **Separate download subfolders** - Movies and Series are now saved into separate `Movies` and `Series` subfolders within the download location. Enabled by default; can be turned off under `DVR → Settings`.
- **VOD Series - download all seasons** - A new button allows all seasons of a series to be downloaded at once. A new prompt also lets you choose between saving seasons into organized `Name/Season #` folders or a single series folder.
- **Nuvio Cloud support** - Cloud Library sync has been added for Nuvio.
- **Hungarian (Magyar) localisation** - Hungarian language support has been added.
- **New optimization options** - Two new options are available under the Optimization settings: `Reduce Visual Effects While Scrolling` and `Flat Chrome`, aimed at improving performance on lower-end hardware.
- **OLED black for dark and custom themes** - An OLED black option is now available for dark and custom themes under `Settings → Themes`. Enables true black surfaces and backgrounds while retaining the theme's accent colours.
- **Show/hide disabled sources** - Disabled sources can now be toggled visible or hidden in the Sources tab in Settings.
- **Startup loading screen** - A loading screen is now displayed during startup with an improved error boundary for catching and recovering from startup errors.
- **Scrollbar colour adaptation** - Scrollbars now automatically adjust their colour to match the active theme, including a fallback when the default colour is unreadable.
- **Clear EPG cache only** - A new option allows EPG data to be cleared independently, without wiping channels, VOD content, or settings.

### Fixed

- **Vulkan runtime bundled** - The Vulkan runtime is now bundled with the app to prevent `vulkan-1.dll` errors introduced by the updated MPV build.
- **Settings not persisting** - Resolved a bug where certain settings would revert after being changed.
- **Custom Group Manager missing scrollbar** - A scrollbar is now correctly displayed in the Custom Group Manager.
- **Global EPG falling back when URL is unavailable** - The app now falls back to the last cached EPG when the remote EPG source cannot be reached.
- **Window state not restoring after closing in fullscreen** - The window now restores to the correct state when reopened after being closed while in fullscreen.
- **Light Theme contrast and readability** - Additional contrast and readability fixes have been applied across the Light Theme.
- **Episode skipping when paused near end** - Pausing near the 90% mark no longer incorrectly triggers a skip to the next episode.
- **New VOD episodes not appearing after sync** - New episodes now appear correctly following a sync.
- **Playlist Editor crashing when Show Hidden is selected** - Fixed a crash that occurred when toggling `Show Hidden` in the Playlist Editor.
- **Custom shortcut keys not reapplying on restart** - Custom shortcut key bindings are now correctly restored after a restart.
- **Global EPG sort order** - Fixed an issue with Global EPG entries not sorting correctly.

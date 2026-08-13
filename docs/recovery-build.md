# Database Recovery Build

This documents the **database recovery screen** and how to ship a one-off
"recovery build" to a user whose database is causing the app to fail to start.

## Background

The app window is `transparent: true`, so if the database is huge (multi-GB EPG
cache) or stuck recovering a large WAL, startup can hang or the window can
appear missing (still in the taskbar, but nothing painted). Symptom reports:

- App minimizes (or appears to vanish) after adding a new Xtream portal and
  won't come back until the database is deleted.
- Reported on databases around 5 GB, typically caused by "Cache Entire EPG" on
  a global EPG link re-inserting the whole EPG on every sync.

The recovery screen lets the user, before the main app mounts:

1. **Export settings & user data** — a JSON backup (sources, settings,
   favorites, watchlist, EPG edits, playlist editor, DVR schedules/recordings,
   history). Always works even with a broken database (settings/sources live in
   `.settings.dat`, outside the DB).
2. **Rebuild database** — clears the downloaded channel/EPG/VOD cache, VACUUMs
   the file back to a small size, restarts, and re-syncs sources. User
   customizations (favorites, renames, EPG overrides, DVR metadata) are
   preserved by the rebuild itself.
3. **Import backup** — restores a previously exported JSON (re-import after
   sources finish re-syncing, since imports are keyed on `stream_id`).

## Status: DISABLED by default

The recovery screen is **off** for normal builds. A large-but-healthy database
is not an error, and showing a recovery screen to every user with a big EPG
cache would be an inconvenience. The code remains fully compiled in so it can
be activated at any time with a single flag flip.

## How to enable (ship a recovery build)

1. Edit `packages/ui/src/services/recovery.ts` and flip the flag:

   ```ts
   export const RECOVERY_SCREEN_ENABLED = false;  // → change to true
   ```

   That's the only code change. The startup gate (`packages/ui/src/main.tsx`),
   the Settings → Import/Export → Database Health section, and the recovery UI
   all activate automatically from this one flag.

2. (Optional) Tune the thresholds in the same file if the target user's
   database size is known:

   ```ts
   const DB_SIZE_THRESHOLD = 1_500_000_000; // 1.5 GB
   const WAL_SIZE_THRESHOLD = 250_000_000;  // 250 MB
   ```

3. Build and send the build to the user (normal release build, from the repo
   root — see README.md → Building from Source):

   ```bash
   pnpm tauri build
   ```

   Output: `packages/app/src-tauri/target/release/bundle/`

4. Tell the user the expected flow (see below) and that they don't need to
   delete anything manually.

## To disable again

Set `RECOVERY_SCREEN_ENABLED` back to `false`. No other cleanup needed —
restoring the flag is the entire revert. (The `db_health` Rust command and the
Settings health-check stay in the code either way; they only report sizes.)

## What the user should do when the screen appears

1. **Export settings & user data** — keep the JSON somewhere safe. This is the
   safety net; it always works.
2. **Rebuild database** — this is the fix. It takes a while on a large
   database (clear + VACUUM + full re-sync), then restarts automatically.
3. After restart the app re-syncs all sources (all are "stale"). The DB will
   regrow toward its old size unless **Cache Entire EPG** is disabled on their
   global EPG links — mention that to prevent a repeat.
4. Only import the backup if something looks wrong after re-sync (and wait
   until syncing finishes first). The rebuild already preserves user data.

If the database won't open at all (`Database opens: no`), the rebuild button is
disabled and the screen instructs the user to close the app and delete
`%APPDATA%\com.ynotv.app\ynotv.db` (plus `ynotv.db-wal`/`ynotv.db-shm`)
manually, then relaunch.

## Notes / caveats

- The recovery screen only auto-appears **at startup** when the flag is on and
  the health check flags the database. In Settings, the Database Health check
  always works (flag or not) but only shows the recovery screen when enabled.
- Health thresholds are heuristic. If a user legitimately has a large channel
  list (not EPG bloat), the DB may stay above the threshold after a rebuild;
  they can use **Continue anyway**.
- The underlying cause (unbounded EPG cache growth) is not fixed by this
  screen. The long-term fix is capping/pruning "Cache Entire EPG" data.

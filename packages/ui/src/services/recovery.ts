import { invoke } from '@tauri-apps/api/core';

/**
 * MASTER SWITCH for the database recovery screen.
 *
 * Default OFF: the recovery screen must not appear for normal users. A
 * large-but-healthy database (e.g. 1.5+ GB of EPG cache) is not an error,
 * and showing a recovery screen on every launch would inconvenience those
 * users.
 *
 * To ship a one-off "recovery build" for a specific user, set this to `true`
 * (see docs/recovery-build.md). The Rust `db_health` command, the settings
 * entry point and the recovery UI are all still compiled in, so enabling is
 * a single flag flip — no other code changes needed.
 */
export const RECOVERY_SCREEN_ENABLED = false;

export interface DbHealth {
  db_size: number;
  wal_size: number;
  opens_ok: boolean;
  error: string | null;
}

/** Databases above these sizes are almost certainly EPG/VOD cache bloat. */
const DB_SIZE_THRESHOLD = 1_500_000_000; // 1.5 GB
const WAL_SIZE_THRESHOLD = 250_000_000; // 250 MB

export function isDbUnhealthy(health: DbHealth): boolean {
  if (!health.opens_ok) return true;
  if (health.db_size > DB_SIZE_THRESHOLD) return true;
  if (health.wal_size > WAL_SIZE_THRESHOLD) return true;
  return false;
}

export function getDbHealth(): Promise<DbHealth> {
  return invoke<DbHealth>('db_health');
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${bytes} B`;
}

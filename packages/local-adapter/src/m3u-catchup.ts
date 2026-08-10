/**
 * M3U Catchup URL Builder
 *
 * Constructs catchup/replay URLs for M3U playlist entries using catchup-source
 * template strings or standard catchup mode conventions (append, shift, flussonic).
 */

export interface M3uCatchupOptions {
  catchupSource?: string;
  catchupType?: string;
  directUrl: string;
  startTimeMs: number;
  durationMinutes: number;
  epgChannelId?: string;
}

/**
 * Helper to format date numbers with leading zero
 */
function pad(num: number, len: number = 2): string {
  return String(num).padStart(len, '0');
}

/**
 * Build a resolved M3U catchup stream URL
 */
export function buildM3uCatchupUrl(options: M3uCatchupOptions): string {
  const {
    catchupSource,
    catchupType = 'default',
    directUrl,
    startTimeMs,
    durationMinutes,
    epgChannelId = '',
  } = options;

  const startDate = new Date(startTimeMs);
  const durationSeconds = Math.max(1, durationMinutes * 60);
  const endDate = new Date(startTimeMs + durationSeconds * 1000);
  const nowMs = Date.now();
  const offsetSeconds = Math.max(0, Math.floor((nowMs - startTimeMs) / 1000));
  const startUtcSeconds = Math.floor(startTimeMs / 1000);
  const endUtcSeconds = Math.floor(endDate.getTime() / 1000);

  let template = catchupSource?.trim() || '';

  // Fallbacks when template is omitted but a catchup mode is specified
  if (!template) {
    const typeLower = catchupType.toLowerCase();
    if (typeLower === 'append') {
      const sep = directUrl.includes('?') ? '&' : '?';
      return `${directUrl}${sep}utc=${startUtcSeconds}&lutc=${Math.floor(nowMs / 1000)}`;
    } else if (typeLower === 'shift' || typeLower === 'siptv') {
      const sep = directUrl.includes('?') ? '&' : '?';
      return `${directUrl}${sep}utc=${startUtcSeconds}`;
    } else if (typeLower === 'flussonic' || typeLower === 'fs') {
      if (directUrl.includes('/index.m3u8')) {
        return directUrl.replace('/index.m3u8', `/video-${startUtcSeconds}-${durationSeconds}.m3u8`);
      } else {
        const sep = directUrl.includes('?') ? '&' : '?';
        return `${directUrl}${sep}timeshift=${startUtcSeconds}`;
      }
    }
    // Default fallback if no template: append start UTC timestamp
    const sep = directUrl.includes('?') ? '&' : '?';
    return `${directUrl}${sep}start=${startUtcSeconds}`;
  }

  // Replace placeholders in template.
  // NOTE: dollar-prefixed `${...}` forms are replaced BEFORE their bare
  // `{...}` counterparts so the `$` prefix is never left behind.
  let result = template;

  // Program start / end time as Unix epoch seconds (standard catchup format).
  // Playlists that need a date-based value instead can build one from the
  // date component tokens below (e.g. `{Y}{m}{d}T{H}{M}{S}`).
  result = result.replace(/\$\{start\}/gi, String(startUtcSeconds));
  result = result.replace(/\{start\}/gi, String(startUtcSeconds));
  result = result.replace(/\$\{end\}/gi, String(endUtcSeconds));
  result = result.replace(/\{end\}/gi, String(endUtcSeconds));

  // Epoch timestamps
  result = result.replace(/\$\{utc\}/gi, String(startUtcSeconds));
  result = result.replace(/\{utc\}/gi, String(startUtcSeconds));
  result = result.replace(/\$\{utcend\}|\$\{utc_end\}|\$\{end_utc\}/gi, String(endUtcSeconds));
  result = result.replace(/\{utcend\}|\{utc_end\}|\{end_utc\}/gi, String(endUtcSeconds));

  // Program duration
  result = result.replace(/\$\{duration\}/gi, String(durationSeconds));
  result = result.replace(/\{duration\}/gi, String(durationSeconds));
  result = result.replace(/\$\{duration_m\}|\$\{duration_min\}/gi, String(durationMinutes));
  result = result.replace(/\{duration_m\}|\{duration_min\}/gi, String(durationMinutes));

  // Time shift offset
  result = result.replace(/\{offset\}/gi, String(offsetSeconds));

  // EPG / Channel Identifier
  result = result.replace(/\$\{catchup-id\}/gi, encodeURIComponent(epgChannelId));
  result = result.replace(/\{catchup-id\}/gi, encodeURIComponent(epgChannelId));

  // ISO / Formatted Date component Tokens (Start Time)
  result = result.replace(/\{Y\}/g, startDate.getUTCFullYear().toString());
  result = result.replace(/\{m\}/g, pad(startDate.getUTCMonth() + 1));
  result = result.replace(/\{d\}/g, pad(startDate.getUTCDate()));
  result = result.replace(/\{H\}/g, pad(startDate.getUTCHours()));
  result = result.replace(/\{M\}/g, pad(startDate.getUTCMinutes()));
  result = result.replace(/\{S\}/g, pad(startDate.getUTCSeconds()));

  // End Time component Tokens
  result = result.replace(/\{EY\}/g, endDate.getUTCFullYear().toString());
  result = result.replace(/\{Em\}/g, pad(endDate.getUTCMonth() + 1));
  result = result.replace(/\{Ed\}/g, pad(endDate.getUTCDate()));
  result = result.replace(/\{EH\}/g, pad(endDate.getUTCHours()));
  result = result.replace(/\{EM\}/g, pad(endDate.getUTCMinutes()));
  result = result.replace(/\{ES\}/g, pad(endDate.getUTCSeconds()));

  return result;
}

import type { StoredMovie, StoredSeries } from '../../db';

/**
 * Parse a year value into an integer, tolerating the JSON-encoded quoted
 * strings that older native syncs wrote to the `year` column (e.g. "\"2021\""
 * with literal quote characters) and values like "1962-05-15" or 1962.0.
 * Returns null when no valid year can be parsed.
 */
function parseYearValue(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const s = typeof value === 'number' ? String(value) : String(value).replace(/"/g, '').trim();
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}

/**
 * Extract a trailing 4-digit year from a raw display name, e.g.
 * "Movie Name (2020)", "Movie Name - 2020", "Movie Name [2020]", "Movie Name 2020".
 * Returns null when no year pattern is found.
 */
function extractYearFromName(name: string | undefined | null): number | null {
  if (!name) return null;
  const m = name.match(/(?:[-–—]\s*)?[\(\[ ]?(\d{4})[\)\]]?\s*$/);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Resolve the best available 4-digit year for a movie/series.
 *
 * Checks, in order:
 *  1. the `year` column (may be JSON-quoted from older native syncs)
 *  2. `release_date` (movies) / `releaseDate` (series) — the date's leading year
 *  3. a trailing year embedded in the display name, e.g. "Movie Name (2020)"
 *
 * Returns null when no year can be derived from any source.
 */
export function resolveVodYear(item: StoredMovie | StoredSeries, type: 'movie' | 'series'): number | null {
  const yearNum = parseYearValue((item as any).year);
  if (yearNum !== null) return yearNum;

  // Movies store snake_case release_date; series store camelCase releaseDate.
  const releaseDate = (item as any).release_date ?? (item as any).releaseDate;
  if (releaseDate !== null && releaseDate !== undefined && releaseDate !== '') {
    const relYear = typeof releaseDate === 'string'
      ? parseYearValue(releaseDate.slice(0, 4))
      : parseYearValue(releaseDate);
    if (relYear !== null) return relYear;
  }

  const nameYear = extractYearFromName(item.name);
  if (nameYear !== null) return nameYear;

  return null;
}

/** Display-friendly year string for the card meta row. */
export function getVodDisplayYear(item: StoredMovie | StoredSeries, type: 'movie' | 'series'): string | null {
  const year = resolveVodYear(item, type);
  return year !== null ? String(year) : null;
}

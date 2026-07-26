/**
 * Multi-Language and Cyrillic Search Normalization Utilities
 */

const CYRILLIC_TO_LATIN_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  і: 'i', ї: 'yi', є: 'ye', ґ: 'g', ђ: 'dj', ј: 'j', љ: 'lj', њ: 'nj', ћ: 'c', џ: 'dz',
  А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Е: 'E', Ё: 'E', Ж: 'Zh', З: 'Z',
  И: 'I', Й: 'Y', К: 'K', Л: 'L', М: 'M', Н: 'N', О: 'O', П: 'P', Р: 'R',
  С: 'S', Т: 'T', У: 'U', Ф: 'F', Х: 'Kh', Ц: 'Ts', Ч: 'Ch', Ш: 'Sh', Щ: 'Shch',
  Ъ: '', Ы: 'Y', Ь: '', Э: 'E', Ю: 'Yu', Я: 'Ya',
  І: 'I', Ї: 'Yi', Є: 'Ye', Ґ: 'G', Ђ: 'Dj', Ј: 'J', Љ: 'Lj', Њ: 'Nj', Ћ: 'C', Џ: 'Dz'
};

const LATIN_MULTI_TO_CYRILLIC: [RegExp, string][] = [
  [/shch/gi, 'щ'],
  [/sh/gi, 'ш'],
  [/ch/gi, 'ч'],
  [/zh/gi, 'ж'],
  [/yu/gi, 'ю'],
  [/ya/gi, 'я'],
  [/kh/gi, 'х'],
  [/ts/gi, 'ц'],
  [/yi/gi, 'ї'],
  [/ye/gi, 'є']
];

const LATIN_SINGLE_TO_CYRILLIC: Record<string, string> = {
  a: 'а', b: 'б', v: 'в', g: 'г', d: 'д', e: 'е', z: 'з', i: 'и', y: 'й',
  k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', r: 'р', s: 'с', t: 'т',
  u: 'у', f: 'ф', h: 'х'
};

/**
 * Transliterate Cyrillic string to Latin/Romanized characters
 */
export function cyrillicToLatin(text: string): string {
  if (!text) return '';
  return text.split('').map(char => CYRILLIC_TO_LATIN_MAP[char] ?? char).join('');
}

/**
 * Transliterate Latin string to Cyrillic characters (best-effort)
 */
export function latinToCyrillic(text: string): string {
  if (!text) return '';
  let result = text;
  for (const [regex, replacement] of LATIN_MULTI_TO_CYRILLIC) {
    result = result.replace(regex, replacement);
  }
  return result.split('').map(char => {
    const lower = char.toLowerCase();
    const sub = LATIN_SINGLE_TO_CYRILLIC[lower];
    if (!sub) return char;
    return char === char.toUpperCase() ? sub.toUpperCase() : sub;
  }).join('');
}

/**
 * Check if text contains Cyrillic characters
 */
export function hasCyrillic(text: string): boolean {
  return /[\u0400-\u04FF]/.test(text);
}

/**
 * Normalize text for Unicode & case-insensitive matching
 */
export function normalizeText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ё/g, 'е')
    .replace(/Ё/g, 'е')
    .trim();
}

/**
 * Generate search variants for a single term to work around SQLite LIKE limitations
 * for non-ASCII (Cyrillic) characters.
 */
export function getSearchVariants(term: string): string[] {
  if (!term || !term.trim()) return [];
  const cleanTerm = term.trim();
  const variants = new Set<string>();

  const lower = cleanTerm.toLowerCase();
  const upper = cleanTerm.toUpperCase();
  const capitalized = cleanTerm.charAt(0).toUpperCase() + cleanTerm.slice(1).toLowerCase();

  variants.add(cleanTerm);
  variants.add(lower);
  variants.add(upper);
  variants.add(capitalized);

  // Replace ё/е variants for Cyrillic
  if (hasCyrillic(cleanTerm)) {
    const termE = lower.replace(/ё/g, 'е');
    const termYo = lower.replace(/е/g, 'ё');
    variants.add(termE);
    variants.add(termYo);
    variants.add(termE.charAt(0).toUpperCase() + termE.slice(1));
    variants.add(termE.toUpperCase());

    // Add Latin transliterations
    const lat = cyrillicToLatin(lower);
    if (lat && lat !== lower) {
      variants.add(lat);
      variants.add(lat.charAt(0).toUpperCase() + lat.slice(1));
      variants.add(lat.toUpperCase());
    }
  } else if (/[a-zA-Z]/.test(cleanTerm)) {
    // Add Cyrillic transliteration for Latin search query
    const cyr = latinToCyrillic(lower);
    if (cyr && cyr !== lower) {
      variants.add(cyr);
      variants.add(cyr.charAt(0).toUpperCase() + cyr.slice(1));
      variants.add(cyr.toUpperCase());
    }
  }

  return Array.from(variants).filter(v => v.length > 0);
}

/**
 * Build multi-word SQLite WHERE clause snippet for Cyrillic and multi-language search.
 * Returns SQL fragment and param list.
 * Example for field 'c.name':
 *   sql: "(c.name LIKE ? OR c.name LIKE ?) AND (c.name LIKE ? OR c.name LIKE ?)"
 */
export function buildSearchQueryClauses(fieldName: string, query: string): { sql: string; params: string[] } {
  if (!query || !query.trim()) {
    return { sql: '', params: [] };
  }

  const queryWords = query.trim().split(/\s+/).filter(w => w.length > 0);
  if (queryWords.length === 0) {
    return { sql: '', params: [] };
  }

  const wordSqlClauses: string[] = [];
  const params: string[] = [];

  for (const word of queryWords) {
    const variants = getSearchVariants(word);
    const variantClauses = variants.map(() => `${fieldName} LIKE ?`).join(' OR ');
    wordSqlClauses.push(`(${variantClauses})`);
    for (const v of variants) {
      params.push(`%${v}%`);
    }
  }

  return {
    sql: wordSqlClauses.join(' AND '),
    params
  };
}

/**
 * JavaScript multi-language array filter matcher.
 * Matches targetText against query words supporting Unicode case-folding, diacritics, and transliteration.
 */
export function matchesSearch(targetText: string | null | undefined, query: string): boolean {
  if (!query || !query.trim()) return true;
  if (!targetText) return false;

  const normTarget = normalizeText(targetText);
  const latTarget = cyrillicToLatin(normTarget);
  const cyrTarget = latinToCyrillic(normTarget);

  const queryWords = query.trim().split(/\s+/).filter(w => w.length > 0);

  return queryWords.every(word => {
    const normWord = normalizeText(word);
    if (normTarget.includes(normWord)) return true;
    if (latTarget.includes(normWord)) return true;
    if (cyrTarget.includes(normWord)) return true;

    // Transliterated word check
    const latWord = cyrillicToLatin(normWord);
    if (normTarget.includes(latWord) || latTarget.includes(latWord)) return true;

    const cyrWord = latinToCyrillic(normWord);
    if (normTarget.includes(cyrWord) || cyrTarget.includes(cyrWord)) return true;

    return false;
  });
}

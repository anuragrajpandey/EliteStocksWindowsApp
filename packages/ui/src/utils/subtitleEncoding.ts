/**
 * Charset-safe decoding for subtitle file bytes.
 *
 * Subtitle files from providers are not always UTF-8: Arabic subtitles are
 * frequently windows-1256, and western European ones windows-1252/Latin-1.
 * Browsers default to UTF-8 and garble those files, so we detect the encoding
 * and normalize to a clean JS string (which is written back to disk as UTF-8)
 * before handing the file to mpv.
 */

export function decodeSubtitleBytes(bytes: Uint8Array | ArrayBuffer | null | undefined): string {
  if (!bytes) return '';
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (data.length === 0) return '';

  // 1. UTF-8 (strict — no replacement chars)
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(data);
  } catch {
    // not valid UTF-8, fall through
  }

  // 2. UTF-16 with a BOM
  if (data.length >= 2) {
    if (data[0] === 0xff && data[1] === 0xfe) {
      return new TextDecoder('utf-16le').decode(data);
    }
    if (data[0] === 0xfe && data[1] === 0xff) {
      return new TextDecoder('utf-16be').decode(data);
    }
  }

  // 3. windows-1256 (Arabic) — prefer it only if decoding actually yields Arabic script
  try {
    const arabic = new TextDecoder('windows-1256').decode(data);
    if (/[\u0600-\u06FF]/.test(arabic)) {
      return arabic;
    }
  } catch {
    // label unsupported in this runtime
  }

  // 4. Generic single-byte fallback (covers most western CP1252 / Latin-1)
  return new TextDecoder('windows-1252').decode(data);
}

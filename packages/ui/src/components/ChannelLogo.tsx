import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { classifyLogo } from '../utils/logoLuminance';
import { getLogoContentBox, getCachedLogoContentBox, LogoContentBox } from '../utils/logoContentBox';
import { getCachedLogoUrl } from '../services/logoCache';
import { useAppSettings } from '../hooks/useAppSettings';

interface ChannelLogoProps {
  src?: string | null;
  name?: string;
  className?: string;
  placeholderClass?: string;
  lazy?: boolean;
  /** Manual tile background override from the EPG editor. 'auto' (or undefined) uses luminance detection. */
  background?: 'auto' | 'light' | 'dark';
  /** Manual logo padding override. 'default' (or undefined) uses normal tile padding, 'none' removes padding. */
  padding?: 'default' | 'none';
  /** Display shape override: 'square' or 'rectangle' */
  shape?: 'square' | 'rectangle';
}

/**
 * Channel logo with automatic luminance-based background and configurable padding.
 *
 * Renders the logo image inside a tile. On load, samples the logo's average
 * luminance once (cached) and adds the `logo-on-light` modifier class when the
 * logo is dark, so it gets a light tile background and stays visible on the
 * dark UI. Falls back to a letter placeholder when no image exists.
 *
 * Pass `background="light"` to always force a light tile (for dark logos the
 * auto-detection gets wrong) or `background="dark"` to always keep the default
 * dark tile. Pass `padding="none"` to remove padding around the image.
 */
export const ChannelLogo = memo(function ChannelLogo({
  src,
  name = '',
  className = 'guide-channel-logo',
  placeholderClass = 'logo-placeholder',
  lazy = true,
  background = 'auto',
  padding = 'default',
  shape,
}: ChannelLogoProps) {
  const { logoCacheEnabled, logoLightBackgroundDetection = true, logoSmartTrim = false } = useAppSettings();
  const [autoLight, setAutoLight] = useState(false);
  const [failed, setFailed] = useState(false);
  const [effectiveSrc, setEffectiveSrc] = useState<string | undefined>(src || undefined);
  const [contentBox, setContentBox] = useState<LogoContentBox | null>(
    () => (logoSmartTrim && src ? (getCachedLogoContentBox(src) ?? null) : null)
  );
  const [trimVars, setTrimVars] = useState<Record<string, string> | null>(null);
  const [loadedTick, setLoadedTick] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastVarsRef = useRef<string>('');

  // Reset state and resolve cached logo URL whenever the logo URL or setting changes
  useEffect(() => {
    setAutoLight(false);
    setFailed(false);
    // Seed synchronously from cache so already-corrected logos don't flash
    // untrimmed before the async analysis resolves.
    setContentBox(logoSmartTrim && src ? (getCachedLogoContentBox(src) ?? null) : null);

    if (!src) {
      setEffectiveSrc(undefined);
      return;
    }

    let isMounted = true;
    getCachedLogoUrl(src, logoCacheEnabled).then((resolved) => {
      if (isMounted) {
        setEffectiveSrc(resolved);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [src, logoCacheEnabled, logoSmartTrim]);

  // Resolve the content box and bump a load tick so trim is recomputed from the
  // loaded image. The tick matters because the cached box is a stable object
  // reference — a bare setContentBox(cached) would be a no-op and skip render.
  const analyzeAndReapply = useCallback((img: HTMLImageElement, url: string) => {
    if (!logoSmartTrim || !url) return;
    getLogoContentBox(url, img)
      .then((box) => {
        if (box) setContentBox(box);
        setLoadedTick((t) => t + 1);
      })
      .catch(() => {});
  }, [logoSmartTrim]);

  const handleLoad = useCallback(() => {
    if (!src || !effectiveSrc) return;
    const img = imgRef.current;
    if (background === 'auto' && logoLightBackgroundDetection && img) {
      classifyLogo(src, img)
        .then((verdict) => {
          if (verdict === 'dark') setAutoLight(true);
        })
        .catch(() => {});
    }
    if (img) analyzeAndReapply(img, src);
  }, [src, effectiveSrc, background, logoLightBackgroundDetection, analyzeAndReapply]);

  useEffect(() => {
    if (!logoSmartTrim || contentBox !== null || failed) return;
    const img = imgRef.current;
    if (!img || !img.complete || !img.naturalWidth || !src) return;
    analyzeAndReapply(img, src);
  }, [logoSmartTrim, src, contentBox, failed, analyzeAndReapply]);

  // Compute the zoomed size/position so the opaque content fills the tile
  // edge-to-edge without cropping, and keep it in sync with tile resizes.
  // Clears any stale trim when the image isn't ready yet so we never render a
  // wrongly-zoomed logo.
  const applyTrim = useCallback(() => {
    const img = imgRef.current;
    const box = contentBox;
    const container = containerRef.current;
    if (!img || !box || !container || !img.naturalWidth || !img.naturalHeight) {
      lastVarsRef.current = '';
      setTrimVars(null);
      return;
    }
    const nW = img.naturalWidth;
    const nH = img.naturalHeight;
    const cw = (box.r - box.l) * nW;
    const ch = (box.b - box.t) * nH;
    if (!cw || !ch) return;
    const tw = container.clientWidth;
    const th = container.clientHeight;
    if (!tw || !th) return;
    const s = Math.min(tw / cw, th / ch);
    const dw = nW * s;
    const dh = nH * s;
    const x = (tw - cw * s) / 2 - box.l * nW * s;
    const y = (th - ch * s) / 2 - box.t * nH * s;
    const next: Record<string, string> = {
      '--smart-trim-x': `${x}px`,
      '--smart-trim-y': `${y}px`,
      '--smart-trim-w': `${dw}px`,
      '--smart-trim-h': `${dh}px`,
    };
    const key = JSON.stringify(next);
    if (key !== lastVarsRef.current) {
      lastVarsRef.current = key;
      setTrimVars(next);
    }
  }, [contentBox]);

  useLayoutEffect(() => {
    if (!logoSmartTrim || !effectiveSrc || !contentBox) {
      lastVarsRef.current = '';
      setTrimVars(null);
      return;
    }
    applyTrim();
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(applyTrim);
    ro.observe(container);
    return () => ro.disconnect();
  }, [logoSmartTrim, effectiveSrc, contentBox, loadedTick, applyTrim]);

  const needsLight = background === 'light' ? true : background === 'dark' ? false : (logoLightBackgroundDetection ? autoLight : false);

  const smartTrimActive = logoSmartTrim && trimVars !== null;

  const containerClass = [
    needsLight ? `${className} logo-on-light` : className,
    padding === 'none' && !smartTrimActive ? 'no-padding' : '',
    shape === 'rectangle' ? 'logo-shape-rectangle' : '',
    shape === 'square' ? 'logo-shape-square' : '',
    smartTrimActive ? 'logo-smart-trim' : '',
  ].filter(Boolean).join(' ');

  const containerStyle = smartTrimActive && trimVars ? (trimVars as CSSProperties) : undefined;

  if (!src || !effectiveSrc || failed) {
    return (
      <div className={containerClass}>
        <span className={placeholderClass}>{(name || '?').charAt(0)}</span>
      </div>
    );
  }

  return (
    <div className={containerClass} ref={containerRef} style={containerStyle}>
      <img
        ref={imgRef}
        key={effectiveSrc}
        src={effectiveSrc}
        alt=""
        loading={lazy ? 'lazy' : undefined}
        decoding="async"
        onLoad={handleLoad}
        onError={() => setFailed(true)}
      />
    </div>
  );
});

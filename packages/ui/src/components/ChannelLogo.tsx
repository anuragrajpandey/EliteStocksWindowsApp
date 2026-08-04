import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { classifyLogo } from '../utils/logoLuminance';
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
  const { logoCacheEnabled, logoLightBackgroundDetection = true } = useAppSettings();
  const [autoLight, setAutoLight] = useState(false);
  const [failed, setFailed] = useState(false);
  const [effectiveSrc, setEffectiveSrc] = useState<string | undefined>(src || undefined);
  const imgRef = useRef<HTMLImageElement>(null);
  const handledSrc = useRef<string | null>(null);

  // Reset state and resolve cached logo URL whenever the logo URL or setting changes
  useEffect(() => {
    setAutoLight(false);
    setFailed(false);
    handledSrc.current = null;

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
  }, [src, logoCacheEnabled]);

  const handleLoad = useCallback(() => {
    if (background !== 'auto' || !logoLightBackgroundDetection) return;
    const img = imgRef.current;
    if (!img || !src || handledSrc.current === src) return;
    handledSrc.current = src;
    classifyLogo(src, img)
      .then((verdict) => {
        if (verdict === 'dark') setAutoLight(true);
      })
      .catch(() => {});
  }, [src, background, logoLightBackgroundDetection]);

  const needsLight = background === 'light' ? true : background === 'dark' ? false : (logoLightBackgroundDetection ? autoLight : false);

  const containerClass = [
    needsLight ? `${className} logo-on-light` : className,
    padding === 'none' ? 'no-padding' : '',
    shape === 'rectangle' ? 'logo-shape-rectangle' : '',
  ].filter(Boolean).join(' ');

  if (!src || !effectiveSrc || failed) {
    return (
      <div className={containerClass}>
        <span className={placeholderClass}>{(name || '?').charAt(0)}</span>
      </div>
    );
  }

  return (
    <div className={containerClass}>
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

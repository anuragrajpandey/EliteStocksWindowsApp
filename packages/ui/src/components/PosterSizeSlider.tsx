import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import './PosterSizeSlider.css';

export interface PosterSizePreset {
  value: number;
  label: string;
}

export const POSTER_SIZE_PRESETS = [
  { value: 100, label: 'XS' },
  { value: 120, label: 'S' },
  { value: 150, label: 'M' }, // matches default 150px
  { value: 180, label: 'L' },
  { value: 210, label: 'XL' },
  { value: 240, label: '2XL' },
  { value: 270, label: '3XL' },
] as const;

export type PosterSizeValue = typeof POSTER_SIZE_PRESETS[number]['value'];

interface PosterSizeSliderProps {
  value: number;
  onChange: (value: number) => void;
  /** Optional preset list — defaults to the shared list. Pass a component's
   *  historical presets so its saved/default sizes keep working unchanged. */
  presets?: readonly PosterSizePreset[];
}

export const PosterSizeSlider = memo(function PosterSizeSlider({ value, onChange, presets }: PosterSizeSliderProps) {
  const { t } = useTranslation('vod');
  const list = presets ?? POSTER_SIZE_PRESETS;
  // Find the closest preset value to the current value
  const currentIndex = list.reduce((bestIndex, current, index) => {
    const currentDiff = Math.abs(current.value - value);
    const bestDiff = Math.abs(list[bestIndex].value - value);
    return currentDiff < bestDiff ? index : bestIndex;
  }, 0);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(e.target.value, 10);
    onChange(list[index].value);
  }, [list, onChange]);

  const handleDecrease = useCallback(() => {
    if (currentIndex > 0) {
      onChange(list[currentIndex - 1].value);
    }
  }, [currentIndex, list, onChange]);

  const handleIncrease = useCallback(() => {
    if (currentIndex < list.length - 1) {
      onChange(list[currentIndex + 1].value);
    }
  }, [currentIndex, list, onChange]);

  const canDecrease = currentIndex > 0;
  const canIncrease = currentIndex < list.length - 1;

  return (
    <div className="poster-size-slider">
      <button
        className={`poster-size-slider__icon poster-size-slider__icon--small ${!canDecrease ? 'disabled' : ''}`}
        onClick={handleDecrease}
        disabled={!canDecrease}
        aria-label={t('posterSizeDecrease')}
        title={t('posterSizeSmaller')}
        type="button"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <rect x="2" y="2" width="20" height="20" rx="2" />
        </svg>
      </button>
      <div className="poster-size-slider__track">
        <input
          type="range"
          min={0}
          max={list.length - 1}
          step={1}
          value={currentIndex}
          onChange={handleChange}
          className="poster-size-slider__input"
          aria-label={t('posterSize')}
          title={t('posterSizeTitle', { label: list[currentIndex]?.label || t('posterSizeDefault') })}
        />
        <div className="poster-size-slider__marks">
          {list.map((_, index) => (
            <div
              key={index}
              className={`poster-size-slider__mark ${index === currentIndex ? 'active' : ''}`}
            />
          ))}
        </div>
      </div>
      <button
        className={`poster-size-slider__icon poster-size-slider__icon--large ${!canIncrease ? 'disabled' : ''}`}
        onClick={handleIncrease}
        disabled={!canIncrease}
        aria-label={t('posterSizeIncrease')}
        title={t('posterSizeLarger')}
        type="button"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <rect x="2" y="2" width="20" height="20" rx="2" />
        </svg>
      </button>
    </div>
  );
});

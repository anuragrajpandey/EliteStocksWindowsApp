import React, { useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { StoredChannel } from '../db';
import { parseCategoryIds } from '../hooks/useChannels';
import './AudioVisualizer.css';

export type VisualizerMode = 'spectrum' | 'wave' | 'vinyl' | 'circular' | 'off';

interface AudioSpectrumPayload {
  bins: number[];     // 64 logarithmic frequency magnitude bins [0.0..1.0]
  wave: number[];     // 64 time-domain waveform points [-1.0..1.0]
  stereo_l: number[]; // 64 left channel samples [-1.0..1.0]
  stereo_r: number[]; // 64 right channel samples [-1.0..1.0]
}

interface AudioVisualizerProps {
  mode: VisualizerMode;
  channel: StoredChannel | null;
  playing: boolean;
  compact?: boolean;
  programTitle?: string;
  categoryName?: string;
  onModeChange?: (mode: VisualizerMode) => void;
  className?: string;
}

export function AudioVisualizer({
  mode,
  channel,
  playing,
  compact = false,
  programTitle,
  categoryName,
  onModeChange,
  className = '',
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Real audio spectrum data from Rust WASAPI capture
  const audioDataRef = useRef<AudioSpectrumPayload | null>(null);
  const lastAudioDataTimeRef = useRef<number>(0);

  // Smooth fallback clock
  const localClockRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(performance.now());

  // Physics state refs for smooth attack/decay & peak gravity (up to 120 bins)
  const currentBarsRef = useRef<number[]>(new Array(120).fill(0));
  const peakYRef = useRef<number[]>(new Array(120).fill(0));
  const peakVelRef = useRef<number[]>(new Array(120).fill(0));
  const peakHoldRef = useRef<number[]>(new Array(120).fill(0));

  // Reset clock on play
  const prevPlayingRef = useRef(false);
  useEffect(() => {
    if (playing && !prevPlayingRef.current) {
      localClockRef.current = 0;
    }
    prevPlayingRef.current = playing;
  }, [playing]);

  // Subscribe to real audio spectrum data from Rust backend
  useEffect(() => {
    let unlistenFn: (() => void) | undefined;
    const setupListener = async () => {
      try {
        unlistenFn = await listen<AudioSpectrumPayload>('audio-spectrum-data', (event) => {
          audioDataRef.current = event.payload;
          lastAudioDataTimeRef.current = performance.now();
        });
      } catch (err) {
        console.warn('[AudioVisualizer] Could not setup audio-spectrum-data listener:', err);
      }
    };
    setupListener();
    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, []);

  useEffect(() => {
    if (mode === 'off' || mode === 'vinyl' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    lastFrameTimeRef.current = performance.now();

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      if (width === 0 || height === 0) return;

      const now = performance.now();
      const dt = (now - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = now;

      if (playing) {
        localClockRef.current += dt;
      }
      const audioTime = localClockRef.current;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Check if real WASAPI FFT audio data is fresh (received within last 500ms)
      const hasRealAudio =
        playing &&
        audioDataRef.current !== null &&
        now - lastAudioDataTimeRef.current < 500 &&
        audioDataRef.current.bins.length > 0;

      const realData = hasRealAudio ? audioDataRef.current! : null;

      // Rhythm fallback simulation signals
      const beatPhase = (audioTime % 0.46875) / 0.46875;
      const kickPulse = Math.pow(Math.max(0, 1 - beatPhase), 4);
      const snarePhase = (audioTime % 0.9375) / 0.9375;
      const snarePulse = Math.pow(Math.max(0, Math.sin(snarePhase * Math.PI)), 5);
      const phraseSwell = 0.55 + 0.45 * Math.sin((audioTime * Math.PI) / 8.0);

      if (mode === 'spectrum') {
        const barCount = compact ? 20 : 32;
        const gap = compact ? 3 : 6;
        const totalGap = gap * (barCount - 1);
        const barWidth = Math.max(3, (width - totalGap) / barCount);

        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, '#2563eb');   // Deep blue
        gradient.addColorStop(0.35, '#8b5cf6'); // Purple
        gradient.addColorStop(0.75, '#ec4899'); // Pink
        gradient.addColorStop(1, '#06b6d4');   // Bright cyan

        for (let i = 0; i < barCount; i++) {
          let targetHeight = 0;

          if (realData) {
            const binIdx = Math.floor((i / barCount) * realData.bins.length);
            const val = realData.bins[binIdx] || 0;
            targetHeight = Math.max(height * 0.03, val * (height * 0.88));
          } else if (playing) {
            const normIndex = i / barCount;
            let bandAmp = 0;
            if (normIndex < 0.30) {
              const bass = Math.abs(Math.sin(audioTime * 6.28 * 2.2 + i * 0.4));
              bandAmp = (bass * 0.35 + kickPulse * 0.65) * phraseSwell;
            } else if (normIndex < 0.70) {
              const vocal1 = Math.sin(audioTime * 6.28 * 3.4 + i * 0.65);
              const vocal2 = Math.cos(audioTime * 6.28 * 4.8 - i * 0.35);
              bandAmp = ((vocal1 + vocal2 + 2) / 4) * (0.4 + snarePulse * 0.6) * phraseSwell;
            } else {
              const hiHat = Math.abs(Math.sin(audioTime * 6.28 * 12.5 + i * 1.2));
              bandAmp = hiHat * (0.3 + kickPulse * 0.5) * phraseSwell;
            }
            targetHeight = Math.max(height * 0.04, Math.min(1, bandAmp) * (height * 0.85));
          } else {
            targetHeight = height * 0.03;
          }

          // Physics: Fast Attack (~15ms), Exponential Decay
          const curH = currentBarsRef.current[i] || 0;
          let newH = curH;
          if (targetHeight > curH) {
            newH = curH + (targetHeight - curH) * 0.65;
          } else {
            newH = Math.max(targetHeight, curH * 0.85);
          }
          currentBarsRef.current[i] = newH;

          const x = i * (barWidth + gap);
          const y = height - newH;

          // Draw spectrum bar
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, newH, [compact ? 2 : 4, compact ? 2 : 4, 0, 0]);
          ctx.fill();

          // Peak holding caps with gravity drop physics
          const curPeak = peakYRef.current[i] || 0;
          const curHold = peakHoldRef.current[i] || 0;
          const curVel = peakVelRef.current[i] || 0;

          if (newH >= curPeak) {
            peakYRef.current[i] = newH;
            peakHoldRef.current[i] = 12;
            peakVelRef.current[i] = 0;
          } else if (curHold > 0) {
            peakHoldRef.current[i] = curHold - 1;
          } else {
            const nextVel = curVel + (compact ? 0.45 : 0.7);
            const nextPeak = Math.max(newH, curPeak - nextVel);
            peakYRef.current[i] = nextPeak;
            peakVelRef.current[i] = nextVel;
          }

          const peakYPos = Math.max(2, height - (peakYRef.current[i] || 0) - (compact ? 2 : 4));
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, peakYPos, barWidth, compact ? 2 : 3);
        }
      } else if (mode === 'circular') {
        const centerX = width / 2;
        const centerY = height / 2;
        const baseRadius = Math.min(width, height) * (compact ? 0.14 : 0.19);
        const maxRadius = Math.min(width, height) * (compact ? 0.36 : 0.43);
        const numBars = compact ? 64 : 96;

        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius - 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = compact ? 8 : 16;
        ctx.fill();
        ctx.restore();

        for (let i = 0; i < numBars; i++) {
          const angle = (i / numBars) * Math.PI * 2 - Math.PI / 2;
          const normIndex = i / numBars;

          let targetLength = 0;
          if (realData) {
            const symIndex = normIndex < 0.5 ? normIndex * 2 : (1 - normIndex) * 2;
            const binIdx = Math.floor(symIndex * realData.bins.length);
            const val = realData.bins[binIdx] || 0;
            targetLength = Math.max(4, val * (maxRadius - baseRadius));
          } else if (playing) {
            let bandAmp = 0;
            const symIndex = normIndex < 0.5 ? normIndex * 2 : (1 - normIndex) * 2;
            if (symIndex < 0.30) {
              const bass = Math.abs(Math.sin(audioTime * 6.28 * 2.2 + i * 0.4));
              bandAmp = (bass * 0.3 + kickPulse * 0.7) * phraseSwell;
            } else if (symIndex < 0.70) {
              const vocal1 = Math.sin(audioTime * 6.28 * 3.4 + i * 0.65);
              const vocal2 = Math.cos(audioTime * 6.28 * 4.8 - i * 0.35);
              bandAmp = ((vocal1 + vocal2 + 2) / 4) * (0.4 + snarePulse * 0.6) * phraseSwell;
            } else {
              const hiHat = Math.abs(Math.sin(audioTime * 6.28 * 12.5 + i * 1.2));
              bandAmp = hiHat * (0.35 + kickPulse * 0.45) * phraseSwell;
            }
            targetLength = Math.max(4, bandAmp * (maxRadius - baseRadius));
          } else {
            targetLength = 3;
          }

          const curL = currentBarsRef.current[i] || 0;
          let newL = curL;
          if (targetLength > curL) {
            newL = curL + (targetLength - curL) * 0.55;
          } else {
            newL = Math.max(targetLength, curL * 0.86);
          }
          currentBarsRef.current[i] = newL;

          const hue = (i / numBars) * 320;
          const saturation = 85 + (newL / (maxRadius - baseRadius)) * 15;
          const lightness = 50 + (newL / (maxRadius - baseRadius)) * 25;

          ctx.strokeStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
          ctx.lineWidth = compact ? 2.5 : 3.5;
          ctx.lineCap = 'round';

          const startX = centerX + Math.cos(angle) * baseRadius;
          const startY = centerY + Math.sin(angle) * baseRadius;
          const endX = centerX + Math.cos(angle) * (baseRadius + newL);
          const endY = centerY + Math.sin(angle) * (baseRadius + newL);

          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();

          const curPeak = peakYRef.current[i] || 0;
          const curHold = peakHoldRef.current[i] || 0;
          const curVel = peakVelRef.current[i] || 0;

          if (newL >= curPeak) {
            peakYRef.current[i] = newL;
            peakHoldRef.current[i] = 10;
            peakVelRef.current[i] = 0;
          } else if (curHold > 0) {
            peakHoldRef.current[i] = curHold - 1;
          } else {
            const nextVel = curVel + (compact ? 0.35 : 0.55);
            const nextPeak = Math.max(newL, curPeak - nextVel);
            peakYRef.current[i] = nextPeak;
            peakVelRef.current[i] = nextVel;
          }

          const peakRadius = baseRadius + (peakYRef.current[i] || 0) + (compact ? 2 : 4);
          const peakX = centerX + Math.cos(angle) * peakRadius;
          const peakY = centerY + Math.sin(angle) * peakRadius;

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(peakX, peakY, compact ? 1.2 : 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (mode === 'wave') {
        const centerY = height / 2;

        if (realData && realData.wave.length > 0) {
          // Real PCM Waveform rendering
          const wavePoints = realData.wave;
          ctx.beginPath();
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = compact ? 2.5 : 4;
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = compact ? 8 : 14;

          const sliceW = width / (wavePoints.length - 1);
          for (let i = 0; i < wavePoints.length; i++) {
            const x = i * sliceW;
            const y = centerY + wavePoints[i] * (height * 0.42);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();

          // Second ambient glow layer
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
          ctx.lineWidth = compact ? 1.5 : 2;
          ctx.shadowBlur = 0;
          for (let i = 0; i < wavePoints.length; i++) {
            const x = i * sliceW;
            const y = centerY + wavePoints[i] * (height * 0.35);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        } else {
          // Synthetic wave fallback
          const waveConfigs = [
            { color: 'rgba(6, 182, 212, 0.95)', ampMult: 0.32, freq: 0.016, speed: 3.5 },
            { color: 'rgba(168, 85, 247, 0.75)', ampMult: 0.22, freq: 0.024, speed: -2.8 },
            { color: 'rgba(236, 72, 153, 0.55)', ampMult: 0.15, freq: 0.035, speed: 5.2 },
          ];

          const rhythmAmp = playing ? (0.65 + 0.45 * Math.pow(Math.max(0, 1 - beatPhase), 3)) : 0.06;

          waveConfigs.forEach((cfg) => {
            ctx.beginPath();
            ctx.strokeStyle = cfg.color;
            ctx.lineWidth = compact ? 2 : 3.5;

            const baseAmp = height * cfg.ampMult * rhythmAmp;
            for (let x = 0; x <= width; x += compact ? 4 : 2) {
              const yMod =
                Math.sin(x * cfg.freq + audioTime * cfg.speed) *
                Math.cos(x * cfg.freq * 0.5 + audioTime * (cfg.speed * 0.5));

              const y = centerY + yMod * baseAmp;
              if (x === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
          });
        }
      }

      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [mode, playing, compact]);

  // Handle canvas High-DPI resolution scaling with ResizeObserver
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateDimensions = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    window.addEventListener('resize', updateDimensions);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, [compact, mode]);

  if (mode === 'off') return null;

  const channelName = channel?.name || 'Radio Station';
  const logoUrl = channel?.stream_icon;

  const getCleanCategoryText = (): string => {
    if (
      categoryName &&
      !categoryName.includes('[') &&
      !categoryName.includes(']') &&
      !categoryName.includes('{') &&
      !categoryName.includes('-') &&
      !categoryName.includes('_') &&
      categoryName.length < 35 &&
      categoryName.trim().length > 1
    ) {
      return categoryName.trim();
    }
    const catIds = parseCategoryIds(channel?.category_ids);
    const cat = catIds[0];
    if (
      cat &&
      typeof cat === 'string' &&
      !cat.includes('[') &&
      !cat.includes(']') &&
      !cat.includes('{') &&
      !cat.includes('-') &&
      !cat.includes('_') &&
      cat.length < 35 &&
      cat.trim().length > 1
    ) {
      return cat.trim();
    }
    return '';
  };

  const displayCategory = getCleanCategoryText();

  return (
    <div className={`ynotv-audio-visualizer ${compact ? 'compact-visualizer' : ''} mode-${mode} ${className}`}>
      {/* Background ambient glow */}
      <div className="visualizer-backdrop-glow" />

      {/* Mode Quick Switcher Overlay — ONLY rendered in compact preview pane mode to keep Hero screen clean */}
      {compact && onModeChange && (
        <div className="visualizer-quick-picker" onClick={(e) => e.stopPropagation()}>
          <button
            className={`visualizer-picker-btn ${mode === 'spectrum' ? 'active' : ''}`}
            onClick={() => onModeChange('spectrum')}
            title="Spectrum Bars"
          >
            <span className="picker-icon">📊</span>
            {!compact && <span className="picker-label">Bars</span>}
          </button>
          <button
            className={`visualizer-picker-btn ${mode === 'circular' ? 'active' : ''}`}
            onClick={() => onModeChange('circular')}
            title="Circular Spectrum"
          >
            <span className="picker-icon">⭕</span>
            {!compact && <span className="picker-label">Circular</span>}
          </button>
          <button
            className={`visualizer-picker-btn ${mode === 'wave' ? 'active' : ''}`}
            onClick={() => onModeChange('wave')}
            title="Audio Wave"
          >
            <span className="picker-icon">🌊</span>
            {!compact && <span className="picker-label">Wave</span>}
          </button>
          <button
            className={`visualizer-picker-btn ${mode === 'vinyl' ? 'active' : ''}`}
            onClick={() => onModeChange('vinyl')}
            title="Vinyl Disc"
          >
            <span className="picker-icon">💿</span>
            {!compact && <span className="picker-label">Vinyl</span>}
          </button>
          <button
            className={`visualizer-picker-btn ${(mode as string) === 'off' ? 'active' : ''}`}
            onClick={() => onModeChange('off')}
            title="Off"
          >
            <span className="picker-icon">🚫</span>
            {!compact && <span className="picker-label">Off</span>}
          </button>
        </div>
      )}

      {/* Mode Canvas (Spectrum / Circular / Wave) */}
      {(mode === 'spectrum' || mode === 'circular' || mode === 'wave') && (
        <canvas ref={canvasRef} className="visualizer-canvas" />
      )}

      {/* Mode Vinyl */}
      {mode === 'vinyl' && (
        <div className="vinyl-container">
          <div className={`vinyl-disc ${playing ? 'spinning' : 'paused'}`}>
            <div className="vinyl-ring ring-1" />
            <div className="vinyl-ring ring-2" />
            <div className="vinyl-ring ring-3" />
            <div className="vinyl-center-hub">
              {logoUrl ? (
                <img src={logoUrl} alt={channelName} className="vinyl-logo-img" />
              ) : (
                <div className="vinyl-music-icon">🎵</div>
              )}
            </div>
          </div>
          <div className="vinyl-tonearm">
            <div className="tonearm-head" />
          </div>
        </div>
      )}

      {/* Station Details Card Overlay */}
      <div className="visualizer-info-card">
        {logoUrl && mode !== 'vinyl' && (
          <img src={logoUrl} alt={channelName} className="visualizer-channel-logo" />
        )}
        <div className="visualizer-text-info">
          {displayCategory && (
            <div className="visualizer-channel-group">{displayCategory}</div>
          )}
          <div className="visualizer-channel-title">{channelName}</div>
          {programTitle && (
            <div className="visualizer-program-title">
              <span className="visualizer-live-badge">LIVE AUDIO</span> {programTitle}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { VodPage } from './VodPage';
import type { VodPlayInfo } from '../types/media';
import type { VodPlayerMode } from './vod/SplitPlayButton';

interface SeriesPageProps {
  onPlay?: (info: VodPlayInfo, targetMode?: VodPlayerMode) => void;
  onClose?: () => void;
  vodPlayerMode?: VodPlayerMode;
  onSelectVodPlayerMode?: (mode: VodPlayerMode) => void;
}

export function SeriesPage({ onPlay, onClose, vodPlayerMode, onSelectVodPlayerMode }: SeriesPageProps) {
  return (
    <VodPage
      type="series"
      onPlay={onPlay}
      onClose={onClose}
      vodPlayerMode={vodPlayerMode}
      onSelectVodPlayerMode={onSelectVodPlayerMode}
    />
  );
}

export default SeriesPage;

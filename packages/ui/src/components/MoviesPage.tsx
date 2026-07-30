import { VodPage } from './VodPage';
import type { VodPlayInfo } from '../types/media';
import type { VodPlayerMode } from './vod/SplitPlayButton';

interface MoviesPageProps {
  onPlay?: (info: VodPlayInfo, targetMode?: VodPlayerMode) => void;
  onClose?: () => void;
  vodPlayerMode?: VodPlayerMode;
  onSelectVodPlayerMode?: (mode: VodPlayerMode) => void;
}

export function MoviesPage({ onPlay, onClose, vodPlayerMode, onSelectVodPlayerMode }: MoviesPageProps) {
  return (
    <VodPage
      type="movie"
      onPlay={onPlay}
      onClose={onClose}
      vodPlayerMode={vodPlayerMode}
      onSelectVodPlayerMode={onSelectVodPlayerMode}
    />
  );
}

export default MoviesPage;

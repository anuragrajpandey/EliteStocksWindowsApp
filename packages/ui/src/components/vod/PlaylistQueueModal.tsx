import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragCancelEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import i18n from '../../i18n';
import { useActivePlaylistStore } from '../../stores/activePlaylistStore';
import { useVodPlaylistStore, type PlaylistItem } from '../../stores/vodPlaylistStore';
import { usePlaylistItemsProgress, type PlaylistItemProgress } from '../../hooks/usePlaylistProgress';
import './PlaylistQueueModal.css';

/** Format seconds as m:ss for resume hints. */
function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface PlaylistQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayItem: (index: number) => void;
}

/**
 * One queue row. The whole card surface is draggable (full-surface sortable,
 * no handle); a quick click jumps playback, a 5px+ drag reorders the queue.
 */
function SortableQueueItem({
  item,
  index,
  currentIndex,
  progress,
  dropEdge,
  onPlayItem,
  onRemove,
}: {
  item: PlaylistItem;
  index: number;
  currentIndex: number;
  /** Saved playback progress (resume hint / progress bar / completed state). */
  progress?: PlaylistItemProgress | null;
  /** Side of this row where the dragged item will land ('before'|'after'), if any. */
  dropEdge?: 'before' | 'after' | null;
  onPlayItem: (index: number) => void;
  onRemove: (index: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const sortableStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 99 : 1,
    touchAction: 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={sortableStyle}
      className={`playlist-queue-item ${index === currentIndex ? 'is-current' : ''} ${index === currentIndex + 1 ? 'is-next' : ''} ${isDragging ? 'dragging' : ''} ${dropEdge === 'before' ? 'drop-before' : ''} ${dropEdge === 'after' ? 'drop-after' : ''}`}
      {...attributes}
      {...listeners}
    >
      <button
        type="button"
        className="playlist-queue-item__main"
        onClick={() => onPlayItem(index)}
        title={i18n.t('player:clickToJump')}
      >
        {item.poster ? (
          <img src={item.poster} alt="" className="playlist-queue-item__poster" />
        ) : (
          <div className="playlist-queue-item__poster playlist-queue-item__poster--placeholder">
            {item.title.charAt(0)}
          </div>
        )}                    <div className="playlist-queue-item__details">
                      <span className="playlist-queue-item__title">
                        {item.title}
                        {progress?.completed && (
                          <span className="playlist-queue-item__watched" title={i18n.t('vod:watched')}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            {i18n.t('vod:watched')}
                          </span>
                        )}
                      </span>
                      <span className="playlist-queue-item__sub">
                        {item.itemType === 'movie' ? i18n.t('vod:movie') : i18n.t('vod:series')}
                        {item.sourceName ? ` · ${item.sourceName}` : ''}
                      </span>
                      {progress && progress.percent > 0 && !progress.completed && (
                        <div className="playlist-queue-item__progress" title={`${Math.round(progress.percent)}%`}>
                          <div className="playlist-queue-item__progress-fill" style={{ width: `${progress.percent}%` }} />
                        </div>
                      )}
                      {progress && progress.progressSeconds > 10 && !progress.completed && (
                        <span
                          role="button"
                          tabIndex={0}
                          className="playlist-queue-item__resume"
                          title={i18n.t('vod:resumeFrom', { time: formatSeconds(progress.progressSeconds) })}
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlayItem(index);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              onPlayItem(index);
                            }
                          }}
                        >
                          {i18n.t('vod:resumeFrom', { time: formatSeconds(progress.progressSeconds) })}
                        </span>
                      )}
                    </div>
        {index === currentIndex && (
          <span className="playlist-queue-item__now">{i18n.t('player:currentlyPlaying')}</span>
        )}
        {index === currentIndex + 1 && (
          <span className="playlist-queue-item__next">{i18n.t('player:nextUp')}</span>
        )}
      </button>
      <div className="playlist-queue-item__actions">
        <span className="playlist-queue-item__num">{index + 1}</span>
        {index === currentIndex ? (
          <span className="playlist-queue-item__playing-dot" title={i18n.t('player:currentlyPlaying')} />
        ) : (
          <>
            <button
              type="button"
              className="playlist-queue-item__icon-btn"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onPlayItem(index)}
              title={i18n.t('player:jumpToItem')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
            <button
              type="button"
              className="playlist-queue-item__icon-btn playlist-queue-item__remove"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onRemove(index)}
              title={i18n.t('player:removeFromQueue')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Overlay showing the full active playlist queue. The current item is
 * highlighted, the next-up item is marked, and rows can be reordered by
 * dragging anywhere on the card (the playing item stays aligned).
 */
export function PlaylistQueueModal({ isOpen, onClose, onPlayItem }: PlaylistQueueModalProps) {
  useTranslation();
  const { activePlaylistId, activePlaylistName, items, currentIndex, isShuffle, removeItem, moveItem } = useActivePlaylistStore();
  const itemProgress = usePlaylistItemsProgress(items);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Drag state for the insertion-line drop indicator.
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [overDragId, setOverDragId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleRemove = (index: number) => {
    const item = items[index];
    if (!item || index === currentIndex) return;
    // Remove from the persisted playlist first, then from the live queue.
    if (activePlaylistId) {
      useVodPlaylistStore.getState().removeItemFromPlaylist(activePlaylistId, item.id);
    }
    removeItem(index);
  };

  const handleSortableDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
    setOverDragId(String(event.active.id));
  };

  const handleSortableDragOver = (event: DragOverEvent) => {
    setOverDragId(event.over ? String(event.over.id) : null);
  };

  const handleSortableDragCancel = (event: DragCancelEvent) => {
    setActiveDragId(null);
    setOverDragId(null);
  };

  const handleSortableDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    setOverDragId(null);

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const { items: queueItems } = useActivePlaylistStore.getState();
    const oldIndex = queueItems.findIndex((i) => i.id === active.id);
    const newIndex = queueItems.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder the live queue (the store keeps the playing item aligned), then
    // mirror it into the persisted playlist so the next session matches.
    if (activePlaylistId) {
      useVodPlaylistStore.getState().reorderPlaylistItems(activePlaylistId, oldIndex, newIndex);
    }
    moveItem(oldIndex, newIndex);
  };

  // Side of the hovered row where the dragged item will land. Dragging from
  // above lands the item after the row (arrayMove semantics); from below it
  // lands before the row.
  const activeIndex = activeDragId ? items.findIndex((i) => i.id === activeDragId) : -1;
  const overIndex = overDragId ? items.findIndex((i) => i.id === overDragId) : -1;
  const dropEdgeFor = (id: string): 'before' | 'after' | null => {
    if (!activeDragId || !overDragId || activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) {
      return null;
    }
    if (id !== overDragId) return null;
    return activeIndex < overIndex ? 'after' : 'before';
  };

  return createPortal(
    <div className="playlist-queue-overlay" onClick={onClose}>
      <div className="playlist-queue-modal" onClick={(e) => e.stopPropagation()}>
        <div className="playlist-queue-modal__header">
          <h3 className="playlist-queue-modal__title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            {activePlaylistName || i18n.t('player:playlistQueue')}
            <span className="playlist-queue-modal__count">{items.length}</span>
          </h3>
          {isShuffle && (
            <span className="playlist-queue-modal__shuffle">· {i18n.t('player:shuffle')}</span>
          )}
          {currentIndex >= 0 && currentIndex < items.length && (
            <span className="playlist-queue-modal__position" title={i18n.t('player:currentlyPlaying')}>
              {i18n.t('player:playingXofY', { current: currentIndex + 1, total: items.length })}
            </span>
          )}
          <button
            className="playlist-queue-modal__close"
            onClick={onClose}
            aria-label={i18n.t('common:close')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="playlist-queue-modal__body">
          {items.length === 0 ? (
            <p className="playlist-queue-modal__empty">{i18n.t('vod:noContent')}</p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              autoScroll={{
                enabled: true,
                // Wider band + faster speed than the 20%/10 defaults so long
                // queues scroll responsively while dragging near the edges.
                threshold: { x: 0.2, y: 0.3 },
                acceleration: 12,
                interval: 5,
                // Only auto-scroll the queue body itself — never the app
                // containers behind the overlay.
                canScroll: (element) =>
                  element.classList.contains('playlist-queue-modal__body') &&
                  element.scrollHeight > element.clientHeight,
              }}
              onDragStart={handleSortableDragStart}
              onDragOver={handleSortableDragOver}
              onDragCancel={handleSortableDragCancel}
              onDragEnd={handleSortableDragEnd}
            >
              <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <div className="playlist-queue-modal__list">
                  {items.map((item, idx) => (
                    <SortableQueueItem
                      key={item.id}
                      item={item}
                      index={idx}
                      currentIndex={currentIndex}
                      progress={itemProgress.get(item.id) ?? null}
                      dropEdge={dropEdgeFor(item.id)}
                      onPlayItem={onPlayItem}
                      onRemove={handleRemove}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        <div className="playlist-queue-modal__footer">{i18n.t('player:clickToJump')}</div>
      </div>
    </div>,
    document.body
  );
}

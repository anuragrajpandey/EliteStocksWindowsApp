import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { db, type StoredChannel, type EpgChannelOverride } from '../db';
import { ChannelLogo } from './ChannelLogo';
import { batchUpsertLogoBackground } from '../services/epg-overrides';
import './LogoEditorModal.css';

export interface LogoEditorModalProps {
  categoryId: string;
  categoryName: string;
  sourceId: string;
  onClose: () => void;
}

export function LogoEditorModal({
  categoryId,
  categoryName,
  sourceId,
  onClose,
}: LogoEditorModalProps) {
  const [channels, setChannels] = useState<StoredChannel[]>([]);
  const [existingOverrides, setExistingOverrides] = useState<Map<string, EpgChannelOverride>>(new Map());
  const [logoBgMap, setLogoBgMap] = useState<Record<string, 'auto' | 'light' | 'dark'>>({});
  const [initialBgMap, setInitialBgMap] = useState<Record<string, 'auto' | 'light' | 'dark'>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'auto' | 'light' | 'dark'>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Load category channels and existing logo_background overrides
  useEffect(() => {
    let isMounted = true;
    async function loadCategoryChannels() {
      setLoading(true);
      try {
        let channelList: StoredChannel[] = [];

        if (categoryId.startsWith('link:')) {
          const linkId = parseInt(categoryId.replace('link:', ''), 10);
          if (!isNaN(linkId)) {
            const link = await db.playlistCategoryLinks.get(linkId);
            if (link) {
              channelList = await db.channels.whereRaw(
                `source_id = ? AND EXISTS (SELECT 1 FROM json_each(category_ids) WHERE value = ?) AND (enabled IS NULL OR enabled NOT IN (0, '0', 'false'))`,
                [link.source_id, link.category_id]
              ).toArray();

              let manualMappings = await db.playlistIndividualChannels
                .whereRaw('playlist_id = ? AND parent_category_id = ?', [link.playlist_id, `link:${link.id}`])
                .toArray();
              if (manualMappings.length === 0) {
                manualMappings = await db.playlistIndividualChannels
                  .whereRaw('playlist_id = ? AND parent_category_id = ?', [link.source_id, link.category_id])
                  .toArray();
              }
              if (manualMappings.length > 0) {
                const streamIds = manualMappings.map(m => m.stream_id);
                const manualChannels = await db.channels.where('stream_id').anyOf(streamIds).toArray();
                const manualMap = new Map(manualChannels.map(ch => [ch.stream_id, ch]));
                const orderedManual = manualMappings
                  .sort((a, b) => a.display_order - b.display_order)
                  .map(m => manualMap.get(m.stream_id))
                  .filter((ch): ch is StoredChannel => ch !== undefined);

                const manualStreamIds = new Set(manualMappings.map(m => m.stream_id));
                const remainingDynamic = channelList.filter(ch => !manualStreamIds.has(ch.stream_id));
                channelList = [...orderedManual, ...remainingDynamic];
              }
            }
          }
        } else {
          // Standard category
          if (sourceId) {
            channelList = await db.channels.whereRaw(
              `source_id = ? AND EXISTS (SELECT 1 FROM json_each(category_ids) WHERE value = ?) AND (enabled IS NULL OR enabled NOT IN (0, '0', 'false'))`,
              [sourceId, categoryId]
            ).toArray();
          } else {
            channelList = await db.channels.where('category_ids').equals(categoryId).toArray();
          }

          // Check manual playlist individual channel additions
          const manualMappings = await db.playlistIndividualChannels
            .whereRaw('playlist_id = ? AND parent_category_id = ?', [sourceId, categoryId])
            .toArray();
          if (manualMappings.length > 0) {
            const streamIds = manualMappings.map(m => m.stream_id);
            const manualChannels = await db.channels.where('stream_id').anyOf(streamIds).toArray();
            const manualMap = new Map(manualChannels.map(ch => [ch.stream_id, ch]));
            const orderedManual = manualMappings
              .sort((a, b) => a.display_order - b.display_order)
              .map(m => manualMap.get(m.stream_id))
              .filter((ch): ch is StoredChannel => ch !== undefined);

            const manualStreamIds = new Set(manualMappings.map(m => m.stream_id));
            const remainingDynamic = channelList.filter(ch => !manualStreamIds.has(ch.stream_id));
            channelList = [...orderedManual, ...remainingDynamic];
          }
        }

        // Fetch logo_background overrides for these channels
        const streamIds = channelList.map(ch => ch.stream_id);
        const overridesMap = new Map<string, EpgChannelOverride>();
        const bgMap: Record<string, 'auto' | 'light' | 'dark'> = {};

        if (streamIds.length > 0) {
          const overrides = await db.epgChannelOverrides.where('stream_id').anyOf(streamIds).toArray();
          for (const ov of overrides) {
            overridesMap.set(ov.stream_id, ov);
            if (ov.logo_background) {
              bgMap[ov.stream_id] = ov.logo_background as 'auto' | 'light' | 'dark';
            }
          }
        }

        for (const ch of channelList) {
          if (!bgMap[ch.stream_id]) {
            bgMap[ch.stream_id] = 'auto';
          }
        }

        if (isMounted) {
          setChannels(channelList);
          setExistingOverrides(overridesMap);
          setLogoBgMap(bgMap);
          setInitialBgMap(bgMap);
          setLoading(false);
        }
      } catch (err) {
        console.error('[LogoEditorModal] Failed to load category channels:', err);
        if (isMounted) setLoading(false);
      }
    }

    loadCategoryChannels();
    return () => { isMounted = false; };
  }, [categoryId, sourceId]);

  // Filter channels based on search and status filter
  const filteredChannels = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return channels.filter(ch => {
      const matchesSearch = !query || ch.name.toLowerCase().includes(query) || ch.stream_id.toLowerCase().includes(query);
      const bg = logoBgMap[ch.stream_id] || 'auto';
      const matchesFilter = filterMode === 'all' || bg === filterMode;
      return matchesSearch && matchesFilter;
    });
  }, [channels, searchQuery, filterMode, logoBgMap]);

  // Count summary by background type
  const counts = useMemo(() => {
    let autoCount = 0;
    let lightCount = 0;
    let darkCount = 0;
    for (const ch of channels) {
      const bg = logoBgMap[ch.stream_id] || 'auto';
      if (bg === 'light') lightCount++;
      else if (bg === 'dark') darkCount++;
      else autoCount++;
    }
    return { total: channels.length, auto: autoCount, light: lightCount, dark: darkCount };
  }, [channels, logoBgMap]);

  // Handle select all / deselect all for filtered channels
  const allFilteredSelected = useMemo(() => {
    if (filteredChannels.length === 0) return false;
    return filteredChannels.every(ch => selectedIds.has(ch.stream_id));
  }, [filteredChannels, selectedIds]);

  const toggleSelectAllFiltered = useCallback(() => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const ch of filteredChannels) {
          next.delete(ch.stream_id);
        }
      } else {
        for (const ch of filteredChannels) {
          next.add(ch.stream_id);
        }
      }
      return next;
    });
  }, [allFilteredSelected, filteredChannels]);

  const toggleSelectChannel = useCallback((streamId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(streamId)) {
        next.delete(streamId);
      } else {
        next.add(streamId);
      }
      return next;
    });
  }, []);

  // Individual background update
  const setChannelBg = useCallback((streamId: string, bg: 'auto' | 'light' | 'dark') => {
    setLogoBgMap(prev => ({
      ...prev,
      [streamId]: bg,
    }));
  }, []);

  // Bulk background update
  const applyBulkBg = useCallback((bg: 'auto' | 'light' | 'dark') => {
    const targetIds = selectedIds.size > 0 ? Array.from(selectedIds) : filteredChannels.map(ch => ch.stream_id);
    if (targetIds.length === 0) return;

    setLogoBgMap(prev => {
      const next = { ...prev };
      for (const id of targetIds) {
        next[id] = bg;
      }
      return next;
    });
  }, [selectedIds, filteredChannels]);

  // Calculate if there are unsaved changes
  const hasChanges = useMemo(() => {
    for (const ch of channels) {
      const current = logoBgMap[ch.stream_id] || 'auto';
      const initial = initialBgMap[ch.stream_id] || 'auto';
      if (current !== initial) return true;
    }
    return false;
  }, [channels, logoBgMap, initialBgMap]);

  // Save changes to database
  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      const updates: Array<{ streamId: string; logoBackground: 'auto' | 'light' | 'dark' }> = [];
      for (const ch of channels) {
        const current = logoBgMap[ch.stream_id] || 'auto';
        const initial = initialBgMap[ch.stream_id] || 'auto';
        if (current !== initial) {
          updates.push({ streamId: ch.stream_id, logoBackground: current });
        }
      }

      if (updates.length > 0) {
        await batchUpsertLogoBackground(updates);
        setInitialBgMap({ ...logoBgMap });
        setSaveSuccess(`✓ Updated ${updates.length} channel logo background${updates.length > 1 ? 's' : ''}`);
        setTimeout(() => setSaveSuccess(null), 3000);
      }
    } catch (err) {
      console.error('[LogoEditorModal] Error saving logo backgrounds:', err);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="logo-editor-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="logo-editor-modal" role="dialog" aria-modal="true" aria-labelledby="logo-editor-title">
        
        {/* Header */}
        <div className="logo-editor-header">
          <div className="logo-editor-title-group">
            <h2 id="logo-editor-title" className="logo-editor-title">
              🖼️ Logo Editor — <span>{categoryName}</span>
            </h2>
            <div className="logo-editor-subtitle">
              Preview and set light or dark EPG tile backgrounds for channels in this category.
            </div>
          </div>
          <button className="logo-editor-close-btn" onClick={onClose} title="Close (Esc)">✕</button>
        </div>

        {/* Toolbar & Filters */}
        <div className="logo-editor-toolbar">
          <div className="logo-editor-search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="logo-editor-search-input"
              placeholder="Search channels in category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')}>✕</button>
            )}
          </div>

          <div className="logo-editor-filter-tabs">
            <button
              className={`filter-tab ${filterMode === 'all' ? 'active' : ''}`}
              onClick={() => setFilterMode('all')}
            >
              All ({counts.total})
            </button>
            <button
              className={`filter-tab ${filterMode === 'auto' ? 'active' : ''}`}
              onClick={() => setFilterMode('auto')}
            >
              Auto ({counts.auto})
            </button>
            <button
              className={`filter-tab ${filterMode === 'light' ? 'active' : ''}`}
              onClick={() => setFilterMode('light')}
            >
              ☀️ Light ({counts.light})
            </button>
            <button
              className={`filter-tab ${filterMode === 'dark' ? 'active' : ''}`}
              onClick={() => setFilterMode('dark')}
            >
              🌙 Dark ({counts.dark})
            </button>
          </div>
        </div>

        {/* Selection & Bulk Actions Bar */}
        <div className="logo-editor-selection-bar">
          <label className="logo-editor-select-all-label">
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={toggleSelectAllFiltered}
              disabled={filteredChannels.length === 0}
            />
            <span>
              {selectedIds.size > 0
                ? `${selectedIds.size} Selected`
                : `Select All (${filteredChannels.length})`}
            </span>
          </label>

          <div className="logo-editor-bulk-actions">
            <span className="bulk-action-label">Bulk Apply:</span>
            <button
              className="bulk-btn bulk-btn-light"
              onClick={() => applyBulkBg('light')}
              title={selectedIds.size > 0 ? "Apply Light background to selected channels" : "Apply Light background to all filtered channels"}
            >
              ☀️ Set Light
            </button>
            <button
              className="bulk-btn bulk-btn-dark"
              onClick={() => applyBulkBg('dark')}
              title={selectedIds.size > 0 ? "Apply Dark background to selected channels" : "Apply Dark background to all filtered channels"}
            >
              🌙 Set Dark
            </button>
            <button
              className="bulk-btn bulk-btn-auto"
              onClick={() => applyBulkBg('auto')}
              title={selectedIds.size > 0 ? "Reset background to Auto for selected channels" : "Reset background to Auto for all filtered channels"}
            >
              🔄 Reset Auto
            </button>
          </div>
        </div>

        {/* Channel Grid */}
        <div className="logo-editor-content">
          {loading ? (
            <div className="logo-editor-loading">
              <div className="spinner" />
              <span>Loading category channels...</span>
            </div>
          ) : filteredChannels.length === 0 ? (
            <div className="logo-editor-empty">
              {channels.length === 0 ? 'No channels found in this category.' : 'No channels match your current search/filter.'}
            </div>
          ) : (
            <div className="logo-editor-grid">
              {filteredChannels.map(channel => {
                const isSelected = selectedIds.has(channel.stream_id);
                const bg = logoBgMap[channel.stream_id] || 'auto';

                return (
                  <div
                    key={channel.stream_id}
                    className={`logo-editor-card ${isSelected ? 'is-selected' : ''}`}
                    onClick={(e) => {
                      // Prevent toggling checkbox when clicking interactive pill buttons
                      const target = e.target as HTMLElement;
                      if (!target.closest('.segmented-btn') && !target.closest('input[type="checkbox"]')) {
                        toggleSelectChannel(channel.stream_id);
                      }
                    }}
                  >
                    {/* Card Top: Checkbox & Name */}
                    <div className="card-header-row">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectChannel(channel.stream_id)}
                      />
                      <span className="channel-title" title={channel.name}>
                        {channel.name}
                      </span>
                    </div>

                    {/* Preview Box */}
                    <div className="card-preview-area">
                      <div className="preview-logo-wrapper">
                        <ChannelLogo
                          src={channel.stream_icon}
                          name={channel.name}
                          background={bg}
                        />
                      </div>
                      <div className={`status-badge status-${bg}`}>
                        {bg === 'light' ? '☀️ Light' : bg === 'dark' ? '🌙 Dark' : 'Auto'}
                      </div>
                    </div>

                    {/* Segmented Control Pills */}
                    <div className="card-segmented-control">
                      <button
                        className={`segmented-btn ${bg === 'auto' ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); setChannelBg(channel.stream_id, 'auto'); }}
                        title="Auto background luminance detection"
                      >
                        Auto
                      </button>
                      <button
                        className={`segmented-btn ${bg === 'light' ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); setChannelBg(channel.stream_id, 'light'); }}
                        title="Force light background tile"
                      >
                        Light
                      </button>
                      <button
                        className={`segmented-btn ${bg === 'dark' ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); setChannelBg(channel.stream_id, 'dark'); }}
                        title="Force dark background tile"
                      >
                        Dark
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="logo-editor-footer">
          <div className="footer-status-left">
            {saveSuccess && <span className="save-success-msg">{saveSuccess}</span>}
            {!saveSuccess && hasChanges && <span className="unsaved-msg">● Unsaved changes</span>}
          </div>
          <div className="footer-actions-right">
            <button className="logo-editor-btn logo-editor-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              className="logo-editor-btn logo-editor-btn-primary"
              onClick={handleSaveChanges}
              disabled={saving || !hasChanges}
            >
              {saving ? 'Saving…' : '💾 Save Changes'}
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}

import React, { useState } from 'react';
import { useLiveQuery } from '../../hooks/useSqliteLiveQuery';
import { db, type CustomPlaylist } from '../../db';
import {
  createPlaylist,
  deletePlaylist,
  renamePlaylist,
} from '../../services/playlist-editor';
import { PlaylistEditorModal } from '../PlaylistEditorModal';
import { useModal } from '../Modal';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { formatDate } from '../../utils/dateTime';

export function PlaylistsTab() {
  useTranslation();
  const { showPrompt, showConfirm, ModalComponent } = useModal();
  const [editingPlaylist, setEditingPlaylist] = useState<{ id: string; name: string } | null>(null);

  // Live Query playlists
  const playlists = useLiveQuery<CustomPlaylist[]>(
    () => db.customPlaylists.orderBy('display_order').toArray(),
    [],
    []
  ) || [];

  // Live query count of category links per playlist
  const categoryLinkCounts = useLiveQuery(
    async () => {
      const all = await db.playlistCategoryLinks.toArray();
      const counts = new Map<string, number>();
      for (const item of all) {
        counts.set(item.playlist_id, (counts.get(item.playlist_id) || 0) + 1);
      }
      return counts;
    },
    [],
    new Map<string, number>()
  );

  // Live query count of individual channels per playlist
  const individualCounts = useLiveQuery(
    async () => {
      const all = await db.playlistIndividualChannels.toArray();
      const counts = new Map<string, number>();
      for (const item of all) {
        counts.set(item.playlist_id, (counts.get(item.playlist_id) || 0) + 1);
      }
      return counts;
    },
    [],
    new Map<string, number>()
  );

  const handleCreate = () => {
    showPrompt(
      i18n.t('settings:playlists.createTitle'),
      i18n.t('settings:playlists.createSub'),
      async (name) => {
        if (name.trim()) {
          const id = await createPlaylist(name.trim());
          setEditingPlaylist({ id, name: name.trim() });
        }
      },
      undefined,
      i18n.t('settings:playlists.namePlaceholder'),
      '',
      i18n.t('common:create'),
      i18n.t('common:cancel')
    );
  };

  const handleRename = (playlist: CustomPlaylist) => {
    showPrompt(
      i18n.t('settings:playlists.renameTitle'),
      i18n.t('settings:playlists.renameSub'),
      async (newName) => {
        if (newName.trim() && newName.trim() !== playlist.name) {
          await renamePlaylist(playlist.playlist_id, newName.trim());
        }
      },
      undefined,
      i18n.t('settings:playlists.namePlaceholder'),
      playlist.name,
      i18n.t('settings:playlists.rename'),
      i18n.t('common:cancel')
    );
  };

  const handleDelete = (playlistId: string) => {
    showConfirm(
      i18n.t('settings:playlists.deleteTitle'),
      i18n.t('settings:playlists.deleteSub'),
      async () => {
        await deletePlaylist(playlistId);
      }
    );
  };

  const handleExport = async (playlist: CustomPlaylist) => {
    try {
      const { generateM3uForPlaylist } = await import('../../services/playlist-export');
      const content = await generateM3uForPlaylist(playlist.playlist_id);
      const result = await window.storage.saveM3UFile(content, playlist.name);
      if (result.success) {
        alert(i18n.t('settings:playlists.exportSuccess'));
      }
    } catch (e) {
      console.error('Failed to export playlist:', e);
      alert(i18n.t('settings:playlists.exportFailed', { error: String(e) }));
    }
  };

  return (
    <div style={{ padding: '20px 24px', color: 'var(--text-primary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{i18n.t('settings:playlists.title')}</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary, #aaa)' }}>
            {i18n.t('settings:playlists.titleSub')}
          </p>
        </div>
        <button
          onClick={handleCreate}
          style={{
            padding: '8px 16px',
            background: 'var(--accent-primary, #00d4ff)',
            color: '#000',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ＋ {i18n.t('settings:playlists.newPlaylist')}
        </button>
      </div>

      {playlists.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', background: 'var(--surface-color)', border: '1px dashed var(--surface-border)', borderRadius: '8px', color: 'var(--text-secondary, #aaa)' }}>
          <span style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>📋</span>
          <h4 style={{ margin: '0 0 6px 0', color: 'var(--text-primary)' }}>{i18n.t('settings:playlists.noPlaylists')}</h4>
          <p style={{ margin: 0, fontSize: '0.8rem' }}>{i18n.t('settings:playlists.noPlaylistsSub')}</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid var(--surface-border)', borderRadius: '8px', background: 'var(--bg-tertiary)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-color)', color: 'var(--text-secondary, #aaa)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>{i18n.t('settings:playlists.colName')}</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>{i18n.t('settings:playlists.colLinkedCategories')}</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>{i18n.t('settings:playlists.colIndividualChannels')}</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>{i18n.t('settings:playlists.colCreatedDate')}</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>{i18n.t('settings:playlists.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {playlists.map(playlist => {
                const catCount = categoryLinkCounts?.get(playlist.playlist_id) || 0;
                const indivCount = individualCounts?.get(playlist.playlist_id) || 0;
                const dateStr = formatDate(new Date(playlist.created_at));

                return (
                  <tr key={playlist.playlist_id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{playlist.name}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary, #aaa)' }}>{i18n.t('settings:playlists.categoriesCount', { count: catCount })}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary, #aaa)' }}>{i18n.t('settings:playlists.channelsCount', { count: indivCount })}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary, #aaa)' }}>{dateStr}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setEditingPlaylist({ id: playlist.playlist_id, name: playlist.name })}
                          style={{ padding: '5px 10px', background: 'var(--surface-color)', color: 'var(--text-primary)', border: '1px solid var(--surface-border)', borderRadius: '4px', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          ✏️ {i18n.t('settings:playlists.editContents')}
                        </button>
                        <button
                          onClick={() => handleRename(playlist)}
                          style={{ padding: '5px 10px', background: 'var(--surface-color)', color: 'var(--text-primary)', border: '1px solid var(--surface-border)', borderRadius: '4px', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          📝 {i18n.t('settings:playlists.rename')}
                        </button>
                        <button
                          onClick={() => handleExport(playlist)}
                          style={{ padding: '5px 10px', background: 'var(--surface-color)', color: 'var(--text-primary)', border: '1px solid var(--surface-border)', borderRadius: '4px', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          📤 {i18n.t('settings:playlists.exportM3u')}
                        </button>
                        <button
                          onClick={() => handleDelete(playlist.playlist_id)}
                          style={{ padding: '5px 10px', background: 'rgba(255, 75, 75, 0.1)', color: '#ff4b4b', border: '1px solid rgba(255, 75, 75, 0.15)', borderRadius: '4px', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          🗑️ {i18n.t('common:delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ModalComponent />

      {editingPlaylist && (
        <PlaylistEditorModal
          playlistId={editingPlaylist.id}
          playlistName={editingPlaylist.name}
          onClose={() => setEditingPlaylist(null)}
        />
      )}
    </div>
  );
}

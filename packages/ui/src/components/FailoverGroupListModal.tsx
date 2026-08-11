import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import {
    listFailoverGroups,
    createFailoverGroup,
    deleteFailoverGroup,
    renameFailoverGroup,
} from '../services/failover-groups';
import { FailoverGroupManager } from './FailoverGroupManager';
import './FailoverGroupListModal.css';

interface FailoverGroupListModalProps {
    onClose: () => void;
}

interface FailoverGroupItem {
    group_id: string;
    name: string;
    memberCount: number;
    created_at: number;
}

export function FailoverGroupListModal({ onClose }: FailoverGroupListModalProps) {
  const { t } = useTranslation('settings');
    const [groups, setGroups] = useState<FailoverGroupItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [managingGroup, setManagingGroup] = useState<{ id: string; name: string } | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const newNameInputRef = useRef<HTMLInputElement>(null);
    const editNameInputRef = useRef<HTMLInputElement>(null);

    const loadGroups = useCallback(async () => {
        setLoading(true);
        try {
            const data = await listFailoverGroups();
            setGroups(data);
        } catch (e) {
            console.error('Failed to load failover groups:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadGroups();
    }, [loadGroups]);

    useEffect(() => {
        if (creating) {
            setTimeout(() => newNameInputRef.current?.focus(), 50);
        }
    }, [creating]);

    useEffect(() => {
        if (editingId) {
            setTimeout(() => editNameInputRef.current?.select(), 50);
        }
    }, [editingId]);

    const handleCreate = async () => {
        const trimmed = newName.trim();
        if (!trimmed) return;
        try {
            await createFailoverGroup(trimmed);
            setNewName('');
            setCreating(false);
            await loadGroups();
        } catch (e) {
            console.error('Failed to create group:', e);
        }
    };

    const handleDelete = async (groupId: string) => {
        try {
            await deleteFailoverGroup(groupId);
            setDeleteConfirmId(null);
            await loadGroups();
        } catch (e) {
            console.error('Failed to delete group:', e);
        }
    };

    const startEdit = (group: FailoverGroupItem) => {
        setEditingId(group.group_id);
        setEditName(group.name);
    };

    const commitEdit = async () => {
        if (!editingId) return;
        const trimmed = editName.trim();
        if (trimmed) {
            try {
                await renameFailoverGroup(editingId, trimmed);
                await loadGroups();
            } catch (e) {
                console.error('Failed to rename group:', e);
            }
        }
        setEditingId(null);
    };

    const handleEditKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') commitEdit();
        if (e.key === 'Escape') setEditingId(null);
    };

    const handleNewNameKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleCreate();
        if (e.key === 'Escape') {
            setCreating(false);
            setNewName('');
        }
    };

    return createPortal(
        <>
            <div className="failover-group-list-overlay" onClick={onClose}>
                <div className="failover-group-list-modal" onClick={e => e.stopPropagation()}>
                    <div className="failover-group-list-header">
                        <h2>{t('failover.groups')}</h2>
                        <button className="close-btn" onClick={onClose}>✕</button>
                    </div>

                    <div className="failover-group-list-content">
                        <div className="failover-group-list-toolbar">
                            {!creating ? (
                                <button className="fgl-create-btn" onClick={() => setCreating(true)}>
                                    <span>＋</span> {t('failover.createGroup')}
                                </button>
                            ) : (
                                <div className="fgl-create-row">
                                    <input
                                        ref={newNameInputRef}
                                        className="fgl-create-input"
                                        placeholder={t('failover.createGroupPlaceholder')}
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        onKeyDown={handleNewNameKey}
                                        onBlur={() => {
                                            if (!newName.trim()) {
                                                setCreating(false);
                                            }
                                        }}
                                    />
                                    <button className="fgl-create-ok" onClick={handleCreate}>{i18n.t('common:create')}</button>
                                    <button className="fgl-create-cancel" onClick={() => { setCreating(false); setNewName(''); }}>{i18n.t('common:cancel')}</button>
                                </div>
                            )}
                        </div>

                        {loading ? (
                            <div className="fgl-empty">{t('failover.loading')}</div>
                        ) : groups.length === 0 ? (
                            <div className="fgl-empty">
                                <p>{t('failover.noGroups')}</p>
                                <p className="fgl-hint">{t('failover.noGroupsHint')}</p>
                            </div>
                        ) : (
                            <div className="fgl-list">
                                {groups.map(group => (
                                    <div key={group.group_id} className="fgl-item">
                                        {editingId === group.group_id ? (
                                            <div className="fgl-edit-row">
                                                <input
                                                    ref={editNameInputRef}
                                                    className="fgl-edit-input"
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                    onKeyDown={handleEditKey}
                                                    onBlur={commitEdit}
                                                />
                                                <button className="fgl-edit-ok" onClick={commitEdit}>✓</button>
                                            </div>
                                        ) : (
                                            <div className="fgl-item-main" onClick={() => setManagingGroup({ id: group.group_id, name: group.name })}>
                                                <div className="fgl-item-info">
                                                    <span className="fgl-item-name">{group.name}</span>
                                                    <span className="fgl-item-count">{t('failover.channelsCount', { count: group.memberCount })}</span>
                                                </div>
                                                <div className="fgl-item-actions" onClick={e => e.stopPropagation()}>
                                                    <button className="fgl-action-btn" onClick={() => startEdit(group)} title={i18n.t('common:rename')}>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                                            <path d="m15 5 4 4" />
                                                        </svg>
                                                    </button>
                                                    {deleteConfirmId === group.group_id ? (
                                                        <>
                                                            <button className="fgl-action-btn fgl-confirm" onClick={() => handleDelete(group.group_id)} title={t('failover.confirmDelete')}>✓</button>
                                                            <button className="fgl-action-btn" onClick={() => setDeleteConfirmId(null)} title={i18n.t('common:cancel')}>✕</button>
                                                        </>
                                                    ) : (
                                                        <button className="fgl-action-btn fgl-danger" onClick={() => setDeleteConfirmId(group.group_id)} title={i18n.t('common:delete')}>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M3 6h18" />
                                                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="failover-group-list-footer">
                        <span className="fgl-footer-hint">{t('failover.footerHint')}</span>
                        <button className="close-done-btn" onClick={onClose}>{i18n.t('common:done')}</button>
                    </div>
                </div>
            </div>

            {managingGroup && (
                <FailoverGroupManager
                    groupId={managingGroup.id}
                    groupName={managingGroup.name}
                    onClose={() => {
                        setManagingGroup(null);
                        loadGroups();
                    }}
                />
            )}
        </>,
        document.body
    );
}

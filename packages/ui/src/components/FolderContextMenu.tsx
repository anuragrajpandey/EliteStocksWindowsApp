import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import './ProgramContextMenu.css';

interface FolderContextMenuProps {
    folderId: string;
    folderName: string;
    sourceId: string;
    sourceName: string;
    position: { x: number; y: number };
    onClose: () => void;
    isPinned?: boolean;
    onPin?: () => void;
    onUnpin?: () => void;
    onManageCategories?: (sourceId: string, sourceName: string) => void;
}

export function FolderContextMenu({
    folderId,
    folderName,
    sourceId,
    sourceName,
    position,
    onClose,
    isPinned,
    onPin,
    onUnpin,
    onManageCategories,
}: FolderContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [adjustedPosition, setAdjustedPosition] = useState(position);

    useLayoutEffect(() => {
        if (menuRef.current) {
            const menu = menuRef.current;
            const menuWidth = menu.offsetWidth;
            const menuHeight = menu.offsetHeight;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let x = position.x;
            let y = position.y;

            const isBottomHalf = position.y > viewportHeight / 2;
            if (isBottomHalf) {
                y = position.y - menuHeight;
            }

            if (x + menuWidth > viewportWidth) x = viewportWidth - menuWidth - 10;
            if (x < 10) x = 10;
            if (y + menuHeight > viewportHeight) y = viewportHeight - menuHeight - 10;
            if (y < 10) y = 10;

            setAdjustedPosition({ x, y });
        }
    }, [position]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    useEffect(() => {
        function handleEscape(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
        }
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    return createPortal(
        <div
            ref={menuRef}
            className="program-context-menu"
            style={{ left: `${adjustedPosition.x}px`, top: `${adjustedPosition.y}px` }}
        >
            <div className="context-menu-header" style={{ padding: '8px 12px 4px', fontSize: '11px', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📁 {folderName}
            </div>
            {isPinned ? (
                onUnpin && (
                    <div className="context-menu-item" onClick={() => { onUnpin(); onClose(); }}>
                        📌 Unpin Folder
                    </div>
                )
            ) : (
                onPin && (
                    <div className="context-menu-item" onClick={() => { onPin(); onClose(); }}>
                        📌 Pin Folder to Top
                    </div>
                )
            )}
            {onManageCategories && (
                <div className="context-menu-item" onClick={() => { onManageCategories(sourceId, sourceName); onClose(); }}>
                    ⚙️ Manage Categories
                </div>
            )}
        </div>,
        document.body
    );
}

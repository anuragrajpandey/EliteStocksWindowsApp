import React from 'react';
import { useTranslation } from 'react-i18next';
import { toggleChannelFavorite } from '../db';
import './FavoriteButton.css';

interface FavoriteButtonProps {
    streamId: string;
    isFavorite: boolean;
    onToggle?: () => void;
}

export function FavoriteButton({ streamId, isFavorite, onToggle }: FavoriteButtonProps) {
    const { t } = useTranslation('live');
    async function handleClick(e: React.MouseEvent) {
        e.stopPropagation(); // Prevent triggering channel selection
        try {
            await toggleChannelFavorite(streamId);
            if (onToggle) {
                onToggle();
            }
        } catch (err) {
            console.error('[FavoriteButton] Error toggling favorite:', err);
        }
    }

    return (
        <button
            className={`favorite-btn ${isFavorite ? 'favorited' : ''}`}
            onClick={handleClick}
            title={isFavorite ? t('removeFromFavorites') : t('addToFavorites')}
        >
            {isFavorite ? '★' : '☆'}
        </button>
    );
}

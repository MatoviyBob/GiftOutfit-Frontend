import apiClient from './apiClient';
import type { Gift } from '@/types/gift';

export interface MySettings {
  equipped_gift: Gift | null;
  favorite_palette: string[];
}

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  bio?: string;
  subscription_active?: boolean;
  view_count?: number;
  unique_view_count?: number;
  /** Gift currently worn/equipped by this user (stored on server) */
  equipped_gift?: Gift | null;
}

/**
 * Save the equipped gift to the server (PUT /me/equipped-gift).
 * Pass null to unequip.
 */
export const updateEquippedGift = async (gift: Gift | null) => {
    const res = await apiClient.put(`/me/equipped-gift`, { gift });
    return res.data;
};

export const getMySettings = async (): Promise<MySettings> => {
    const res = await apiClient.get('/me/settings');
    return res.data;
};

export const updateFavoritePalette = async (palette: string[]) => {
    const res = await apiClient.put('/me/favorite-palette', { palette });
    return res.data;
};

export const updateBio = async (bio: string) => {
    const res = await apiClient.put(`/me/bio`, { bio });
    return res.data;
};

export const getUser = async (userId: number): Promise<TelegramUser> => {
    const res = await apiClient.get(`/users/${userId}`);
    return res.data;
};

/**
 * Отправляет событие просмотра профиля пользователя
 * @param userId - ID пользователя, чей профиль был просмотрен
 */
export const trackProfileView = async (userId: number): Promise<void> => {
    await apiClient.post(`/users/${userId}/views`);
};

export interface TelegramGiftItem {
  type: 'unique' | 'regular'
  // unique gift fields
  id: number
  name: string
  model?: string
  pattern?: string
  backdrop_name?: string   // resolved to GiftBackground on the frontend using backgrounds list
  // regular gift fields
  emoji?: string
  star_count?: number
}

export interface TelegramGiftsResponse {
  gifts: TelegramGiftItem[]
  total_count: number
}

export const getMyTelegramGifts = async (): Promise<TelegramGiftsResponse> => {
    const res = await apiClient.get('/me/telegram-gifts');
    return res.data;
};

// ── My Gifts cache ────────────────────────────────────────────────────────

export interface CachedGift {
  id: number
  name: string
  model?: string
  backdrop_name?: string
  pattern?: string
}

export interface MyGiftsResponse {
  gifts: CachedGift[]
  wallet_address: string | null
  synced_at: string | null
}

export interface SyncMyGiftsResponse {
  gifts: CachedGift[]
  synced_at: string
  count: number
}

/** Save (or clear) the connected TON wallet address on the server. */
export const updateTonWallet = async (walletAddress: string | null): Promise<void> => {
    await apiClient.put('/me/ton-wallet', { wallet_address: walletAddress });
};

/** Return the cached gift list (no external API calls). */
export const getMyCachedGifts = async (): Promise<MyGiftsResponse> => {
    const res = await apiClient.get('/me/my-gifts');
    return res.data;
};

/** Re-scan the wallet and update the server-side gift cache. */
export const syncMyGifts = async (): Promise<SyncMyGiftsResponse> => {
    const res = await apiClient.post('/me/my-gifts/sync');
    return res.data;
};


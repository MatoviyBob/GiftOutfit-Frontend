/**
 * TON API utilities for fetching gift NFTs from user wallets.
 * Uses tonapi.io (no auth required for basic usage).
 */

import type { Gift, GiftBackground } from '@/types/gift';

const TON_API_BASE = 'https://tonapi.io/v2';

export interface TonNftItem {
  address: string;
  collection?: {
    address: string;
    name: string;
  };
  metadata?: {
    name?: string;
    attributes?: Array<{
      trait_type: string;
      value: string;
    }>;
  };
  previews?: Array<{
    resolution: string;
    url: string;
  }>;
}

export interface TonNftsResponse {
  nft_items: TonNftItem[];
}

/**
 * Fetch all NFTs from a TON wallet address.
 * Paginates to get all items (max 1000).
 */
export const fetchWalletNfts = async (walletAddress: string): Promise<TonNftItem[]> => {
  const limit = 100;
  let offset = 0;
  const all: TonNftItem[] = [];

  while (true) {
    const res = await fetch(
      `${TON_API_BASE}/accounts/${encodeURIComponent(walletAddress)}/nfts?limit=${limit}&offset=${offset}&indirect_ownership=false`
    );
    if (!res.ok) break;
    const data: TonNftsResponse = await res.json();
    const items = data.nft_items ?? [];
    all.push(...items);
    if (items.length < limit) break;
    offset += limit;
    if (offset >= 1000) break; // safety cap
  }

  return all;
};

/**
 * Convert a TonNftItem to a Gift object (if it matches Telegram gift structure).
 * Returns null if the NFT doesn't look like a Telegram gift.
 */
export const nftToGift = (
  nft: TonNftItem,
  knownCollections: string[],
  backgrounds: GiftBackground[]
): Gift | null => {
  const collectionName = nft.collection?.name;
  if (!collectionName) return null;

  // Normalize and check if it's a known Telegram gift collection
  const normalizeStr = (s: string) => s.replace(/\s+/g, '').toLowerCase();
  const normalizedCollection = normalizeStr(collectionName);
  const matchedCollection = knownCollections.find(
    (c) => normalizeStr(c) === normalizedCollection
  );
  if (!matchedCollection) return null;

  // Parse attributes
  const attrs = nft.metadata?.attributes ?? [];
  const getAttr = (trait: string) =>
    attrs.find((a) => a.trait_type.toLowerCase() === trait.toLowerCase())?.value ?? '';

  const model = getAttr('model') || getAttr('Model') || 'Original';
  const backdropName = getAttr('backdrop') || getAttr('Backdrop') || '';
  const pattern = getAttr('pattern') || getAttr('Pattern') || getAttr('symbol') || '';

  // Extract gift ID from NFT name (e.g., "Durov's Cap #417" → 417)
  const nftName = nft.metadata?.name ?? '';
  const idMatch = nftName.match(/#(\d+)$/);
  const id = idMatch ? parseInt(idMatch[1], 10) : 0;

  const background = backdropName
    ? backgrounds.find((bg) => bg.name.toLowerCase() === backdropName.toLowerCase()) ?? undefined
    : undefined;

  return {
    id,
    name: matchedCollection,
    model: model || undefined,
    background,
    pattern: pattern || undefined,
  };
};

/**
 * Deduplicate gifts: if same gift.name + gift.id appears twice, keep only one.
 */
export const deduplicateGifts = (
  telegramGifts: Gift[],
  walletGifts: Gift[]
): Gift[] => {
  const seen = new Set<string>();
  const result: Gift[] = [];

  const addIfNew = (g: Gift) => {
    const key = `${g.name}:${g.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(g);
    }
  };

  // Telegram gifts take priority
  telegramGifts.forEach(addIfNew);
  walletGifts.forEach(addIfNew);

  return result;
};

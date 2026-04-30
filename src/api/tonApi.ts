/**
 * TON API utilities for fetching gift NFTs from user wallets.
 * Uses tonapi.io (no auth required for basic usage).
 *
 * Detection strategy:
 *   Telegram gift NFTs are identified by their fragment.com image URL
 *   (e.g. "https://nft.fragment.com/gift/lightsword-21945.webp").
 *   This is more reliable than collection name matching because:
 *   - Collection names can vary (singular/plural, apostrophes, etc.)
 *   - The URL slug is a canonical, stable identifier
 *
 * Collection matching:
 *   The slug (e.g. "lightsword") is compared against known constructor
 *   collection names using fuzzy normalization (remove all non-alphanumeric).
 *   "lightsword" matches "Light Swords" → normalised "lightswords" startsWith "lightsword".
 *   New gifts automatically appear as long as constructor API knows them.
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
    image?: string;
    lottie?: string;
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
      `${TON_API_BASE}/accounts/${encodeURIComponent(walletAddress)}/nfts?limit=${limit}&offset=${offset}&indirect_ownership=true`
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
 * Normalise a string for comparison: lowercase + remove all non-alphanumeric.
 * "Light Swords" → "lightswords"
 * "Durov's Cap" → "durovscap"
 * "lightsword"  → "lightsword"
 */
function normalizeStr(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Check if an NFT is a Telegram gift by looking for the fragment.com gift URL.
 */
function isTelegramGift(nft: TonNftItem): boolean {
  const img = nft.metadata?.image ?? nft.metadata?.lottie ?? '';
  return img.includes('nft.fragment.com/gift/');
}

/**
 * Extract the gift slug from the fragment.com image URL.
 * "https://nft.fragment.com/gift/lightsword-21945.webp" → "lightsword"
 */
function getFragmentSlug(nft: TonNftItem): string | null {
  const img = nft.metadata?.image ?? nft.metadata?.lottie ?? '';
  const match = img.match(/nft\.fragment\.com\/gift\/([a-zA-Z0-9]+)-\d+/);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Find the best-matching constructor collection name for a given slug/name.
 * Tries exact match first, then startsWith in either direction.
 */
function findCollection(candidate: string, knownCollections: string[]): string | null {
  const nc = normalizeStr(candidate);
  if (!nc) return null;

  // 1. Exact match
  const exact = knownCollections.find(c => normalizeStr(c) === nc);
  if (exact) return exact;

  // 2. Known collection name starts with our candidate (e.g. "lightsword" vs "lightswords")
  const colStartsWith = knownCollections.find(c => normalizeStr(c).startsWith(nc));
  if (colStartsWith) return colStartsWith;

  // 3. Our candidate starts with the known collection name
  const candStartsWith = knownCollections.find(c => nc.startsWith(normalizeStr(c)));
  if (candStartsWith) return candStartsWith;

  return null;
}

/**
 * Convert a TonNftItem to a Gift object (if it matches Telegram gift structure).
 * Returns null if the NFT doesn't look like a Telegram gift.
 */
export const nftToGift = (
  nft: TonNftItem,
  knownCollections: string[],
  backgrounds: GiftBackground[]
): Gift | null => {
  // Must be a Telegram gift (verified via fragment.com URL)
  if (!isTelegramGift(nft)) return null;

  // Try slug-based matching first (most reliable)
  const slug = getFragmentSlug(nft);
  let matchedCollection: string | null = null;

  if (slug) {
    matchedCollection = findCollection(slug, knownCollections);
  }

  // Fallback: match by collection.name (handles edge cases)
  if (!matchedCollection && nft.collection?.name) {
    matchedCollection = findCollection(nft.collection.name, knownCollections);
  }

  // Final fallback: use NFT collection name directly.
  // This covers brand-new gift types that the constructor API hasn't indexed yet —
  // the CDN (cdn.changes.tg) and NFT metadata share the same source, so the name works.
  const giftName = matchedCollection ?? nft.collection?.name ?? null;
  if (!giftName) return null;

  // Parse attributes (Telegram gifts use Model / Backdrop / Symbol)
  const attrs = nft.metadata?.attributes ?? [];
  const getAttr = (trait: string) =>
    attrs.find((a) => a.trait_type.toLowerCase() === trait.toLowerCase())?.value ?? '';

  const model = getAttr('model') || 'Original';
  const backdropName = getAttr('backdrop');
  const pattern = getAttr('symbol') || getAttr('pattern') || '';

  // Extract gift ID from NFT name: "Light Sword #21945" → 21945
  const nftName = nft.metadata?.name ?? '';
  const idMatch = nftName.match(/#(\d+)$/);
  const id = idMatch ? parseInt(idMatch[1], 10) : 0;

  const background = backdropName
    ? backgrounds.find((bg) => bg.name.toLowerCase() === backdropName.toLowerCase()) ?? undefined
    : undefined;

  return {
    id,
    name: giftName,
    model: model || undefined,
    background,
    pattern: pattern || undefined,
  };
};

/**
 * Deduplicate gifts: if same gift.name + gift.id appears twice, keep only one.
 * Telegram gifts take priority over wallet-derived gifts.
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

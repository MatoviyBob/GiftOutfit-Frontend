import { useCallback } from 'react'
import { useGiftStore, MAX_FAVORITES } from '@/stores/giftStore'

export { MAX_FAVORITES }

/**
 * Favourite palette hook — backed by Zustand store (localStorage + server sync).
 * All instances share the same store state — no TanStack Query race conditions.
 */
export const useFavoritePalette = () => {
  const favorites = useGiftStore((s) => s.favoritePalette)
  const toggleFavorite = useGiftStore((s) => s.toggleFavorite)

  const isFavorite = useCallback(
    (name: string) => favorites.includes(name),
    [favorites],
  )

  return { favorites, toggle: toggleFavorite, isFavorite }
}

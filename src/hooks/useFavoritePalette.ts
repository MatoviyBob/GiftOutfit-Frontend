import { useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useGiftStore, MAX_FAVORITES } from '@/stores/giftStore'
import { updateFavoritePalette } from '@/api/user'

export { MAX_FAVORITES }

/**
 * Favourite palette hook.
 *
 * - UI state lives in Zustand store (instant, persisted to localStorage).
 * - toggle() updates the store immediately AND fires a server mutation.
 * - On server success: invalidateQueries(['my-settings']) → triggers IndexPage's
 *   useQuery to refetch, which will see its own fresh data and confirm the save.
 *   This is the same pattern grids use for cross-device sync.
 * - On server error: store keeps the local value (no rollback — localStorage is truth).
 */
export const useFavoritePalette = () => {
  const favorites = useGiftStore((s) => s.favoritePalette)
  const toggleFavoriteStore = useGiftStore((s) => s.toggleFavorite)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: updateFavoritePalette,
    onSuccess: () => {
      // Refresh my-settings from server — confirms save and enables cross-device sync
      queryClient.invalidateQueries({ queryKey: ['my-settings'] })
    },
    // No onError rollback — keep local state even if server call fails
  })

  const toggle = useCallback(
    (name: string) => {
      // Compute next value based on current store state (avoids stale closure)
      const current = useGiftStore.getState().favoritePalette
      const isSelected = current.includes(name)
      if (!isSelected && current.length >= MAX_FAVORITES) return

      toggleFavoriteStore(name)   // update store + localStorage immediately
      const next = isSelected
        ? current.filter((n) => n !== name)
        : [...current, name]
      mutation.mutate(next)       // persist to server
    },
    [toggleFavoriteStore, mutation],
  )

  const isFavorite = useCallback(
    (name: string) => favorites.includes(name),
    [favorites],
  )

  return { favorites, toggle, isFavorite }
}

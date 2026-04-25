import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getMySettings, updateFavoritePalette, type MySettings } from '@/api/user'

export const MAX_FAVORITES = 3
const LOCAL_KEY = 'favorite-palette'

function loadLocalFavorites(): string[] {
  try {
    const stored = localStorage.getItem(LOCAL_KEY)
    const parsed = stored ? JSON.parse(stored) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveLocalFavorites(favorites: string[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(favorites))
}

/**
 * Favorite palette hook — persists server-side in UserSettings.
 * Falls back to localStorage while the server response is loading.
 * Multiple component instances share the same TanStack Query cache.
 *
 * Race-condition-free design:
 * - toggle() reads directly from the query cache (not from stale closure)
 * - Optimistic update is applied directly to the cache (no useMutation)
 * - No invalidateQueries after toggle → no refetch that could overwrite optimistic state
 * - Rollback on network error only
 */
export const useFavoritePalette = () => {
  const queryClient = useQueryClient()

  // placeholderData (not initialData) so it doesn't interfere with staleTime
  const { data: settings } = useQuery({
    queryKey: ['my-settings'],
    queryFn: getMySettings,
    staleTime: 1000 * 60 * 5,
    placeholderData: (): MySettings => ({
      equipped_gift: null,
      favorite_palette: loadLocalFavorites(),
    }),
  })

  const favorites: string[] = settings?.favorite_palette ?? loadLocalFavorites()

  const toggle = useCallback(
    (name: string) => {
      // Always read from cache — avoids stale-closure issue
      const cached = queryClient.getQueryData<MySettings>(['my-settings'])
      const current: string[] = cached?.favorite_palette ?? loadLocalFavorites()

      const isSelected = current.includes(name)
      let next: string[]
      if (isSelected) {
        next = current.filter((n) => n !== name)
      } else {
        if (current.length >= MAX_FAVORITES) return
        next = [...current, name]
      }

      // Immediate optimistic update in cache (no refetch triggered)
      queryClient.setQueryData<MySettings>(['my-settings'], (old) => ({
        ...(old ?? { equipped_gift: null, favorite_palette: [] }),
        favorite_palette: next,
      }))
      saveLocalFavorites(next)

      // Persist to server; rollback on failure
      updateFavoritePalette(next).catch(() => {
        queryClient.setQueryData<MySettings>(['my-settings'], (old) => ({
          ...(old ?? { equipped_gift: null, favorite_palette: [] }),
          favorite_palette: current,
        }))
        saveLocalFavorites(current)
      })
    },
    [queryClient], // stable ref — does NOT depend on `favorites`
  )

  const isFavorite = useCallback((name: string) => favorites.includes(name), [favorites])

  return { favorites, toggle, isFavorite }
}

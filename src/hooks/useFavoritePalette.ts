import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMySettings, updateFavoritePalette } from '@/api/user'

export const MAX_FAVORITES = 3
const LOCAL_KEY = 'favorite-palette'

/** Load favorites from localStorage as fallback while server responds */
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
 */
export const useFavoritePalette = () => {
  const queryClient = useQueryClient()

  // Load from server; use localStorage as initialData so UI is instant
  const { data: settings } = useQuery({
    queryKey: ['my-settings'],
    queryFn: getMySettings,
    initialData: () => ({
      equipped_gift: null,
      favorite_palette: loadLocalFavorites(),
    }),
    staleTime: 1000 * 60 * 5, // 5 min
  })

  const favorites: string[] = settings?.favorite_palette ?? loadLocalFavorites()

  const mutation = useMutation({
    mutationFn: updateFavoritePalette,
    onMutate: async (newPalette) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['my-settings'] })
      const prev = queryClient.getQueryData(['my-settings'])
      queryClient.setQueryData(['my-settings'], (old: typeof settings) => ({
        ...old,
        favorite_palette: newPalette,
      }))
      saveLocalFavorites(newPalette)
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['my-settings'], ctx.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['my-settings'] })
    },
  })

  const toggle = useCallback((name: string) => {
    const isSelected = favorites.includes(name)
    let next: string[]
    if (isSelected) {
      next = favorites.filter((n) => n !== name)
    } else {
      if (favorites.length >= MAX_FAVORITES) return
      next = [...favorites, name]
    }
    mutation.mutate(next)
  }, [favorites, mutation])

  const isFavorite = useCallback((name: string) => favorites.includes(name), [favorites])

  return { favorites, toggle, isFavorite }
}

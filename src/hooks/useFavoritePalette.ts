import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMySettings, updateFavoritePalette, type MySettings } from '@/api/user'

export const MAX_FAVORITES = 3

/**
 * Favourite palette hook — same sync pattern as grids.
 *
 * - Reads favorites from ['my-settings'] query (single source of truth).
 * - toggle() updates query cache immediately (optimistic) AND fires server mutation.
 * - On server success: invalidateQueries(['my-settings']) → refetch confirms save.
 * - Cross-device sync: query refetches on every mount and window focus (no staleTime).
 */
export const useFavoritePalette = () => {
  const queryClient = useQueryClient()

  const { data: mySettings } = useQuery({
    queryKey: ['my-settings'],
    queryFn: getMySettings,
  })
  const favorites = mySettings?.favorite_palette ?? []

  const mutation = useMutation({
    mutationFn: updateFavoritePalette,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-settings'] })
    },
  })

  const toggle = useCallback(
    (name: string) => {
      const current = queryClient.getQueryData<MySettings>(['my-settings'])?.favorite_palette ?? []
      const isSelected = current.includes(name)
      if (!isSelected && current.length >= MAX_FAVORITES) return

      const next = isSelected
        ? current.filter((n) => n !== name)
        : [...current, name]

      // Optimistic update — immediate UI response
      queryClient.setQueryData<MySettings>(['my-settings'], (old) =>
        old
          ? { ...old, favorite_palette: next }
          : { equipped_gift: null, favorite_palette: next }
      )

      mutation.mutate(next)
    },
    [queryClient, mutation],
  )

  const isFavorite = useCallback(
    (name: string) => favorites.includes(name),
    [favorites],
  )

  return { favorites, toggle, isFavorite }
}

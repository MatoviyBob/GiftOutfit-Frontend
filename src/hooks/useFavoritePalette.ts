import { useState, useEffect } from 'react'

const FAVORITE_PALETTE_KEY = 'favorite-palette'
export const MAX_FAVORITES = 3

/**
 * Persists up to MAX_FAVORITES favorite background names in localStorage.
 * Toggling a name that is already selected removes it; adding a new one
 * appends it (up to the limit). The order is preserved (insertion order).
 */
export const useFavoritePalette = () => {
  const [favorites, setFavorites] = useState<string[]>(() => {
    const stored = localStorage.getItem(FAVORITE_PALETTE_KEY)
    try {
      const parsed = stored ? JSON.parse(stored) : []
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(FAVORITE_PALETTE_KEY, JSON.stringify(favorites))
  }, [favorites])

  const toggle = (name: string) => {
    setFavorites((prev) => {
      const isSelected = prev.includes(name)
      if (isSelected) {
        // Remove
        return prev.filter((n) => n !== name)
      }
      if (prev.length >= MAX_FAVORITES) {
        // Limit reached, cannot add
        return prev
      }
      return [...prev, name]
    })
  }

  const isFavorite = (name: string) => favorites.includes(name)

  return { favorites, toggle, isFavorite }
}

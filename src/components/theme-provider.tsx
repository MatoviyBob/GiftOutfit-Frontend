import { useSignal, isMiniAppDark } from "@telegram-apps/sdk-react"
import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  isManual: boolean
  clearManual: () => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  isManual: false,
  clearManual: () => null,
}

const MANUAL_KEY = "vite-ui-theme-manual"

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  // Check if user has a manually chosen theme (overrides Telegram system theme)
  const [manualTheme, setManualTheme] = useState<Theme | null>(
    () => (localStorage.getItem(MANUAL_KEY) as Theme | null)
  )

  const [theme, setThemeState] = useState<Theme>(() => {
    const manual = localStorage.getItem(MANUAL_KEY) as Theme | null
    if (manual) return manual
    return (localStorage.getItem(storageKey) as Theme) || defaultTheme
  })

  const isDark = useSignal(isMiniAppDark)

  // Sync with Telegram system theme ONLY if user hasn't manually chosen
  useEffect(() => {
    if (manualTheme) return // respect user's manual choice
    if (isDark !== undefined) {
      const newTheme = isDark ? "dark" : "light"
      localStorage.setItem(storageKey, newTheme)
      setThemeState(newTheme)
    }
  }, [isDark, storageKey, manualTheme])

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  const setTheme = (next: Theme) => {
    // Saving as manual — persists across Telegram theme changes
    localStorage.setItem(MANUAL_KEY, next)
    localStorage.setItem(storageKey, next)
    setManualTheme(next)
    setThemeState(next)
  }

  const clearManual = () => {
    localStorage.removeItem(MANUAL_KEY)
    setManualTheme(null)
    // Restore Telegram system theme
    if (isDark !== undefined) {
      const sys = isDark ? "dark" : "light"
      localStorage.setItem(storageKey, sys)
      setThemeState(sys)
    }
  }

  const value = {
    theme,
    setTheme,
    isManual: !!manualTheme,
    clearManual,
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)
  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")
  return context
}

import { type FC, useState, useMemo } from 'react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon } from '@/components/ui/input-group'
import { Search, Check } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { useBackgrounds } from '@/hooks/useGiftQueries'
import { useFavoritePalette, MAX_FAVORITES } from '@/hooks/useFavoritePalette'
import { useTranslation } from '@/i18n'
import type { GiftBackground } from '@/types/gift'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const FavoritePaletteDrawer: FC<Props> = ({ open, onOpenChange }) => {
  const { t } = useTranslation()
  const { data: backgrounds, isLoading } = useBackgrounds({ enabled: open })
  const { favorites, toggle, isFavorite } = useFavoritePalette()
  const [query, setQuery] = useState('')

  const limitReached = favorites.length >= MAX_FAVORITES

  // Separate favorites and rest, each sorted alphabetically
  const sortedBackgrounds = useMemo(() => {
    if (!backgrounds) return []
    const filtered = query
      ? backgrounds.filter((bg: GiftBackground) => bg.name.toLowerCase().includes(query.toLowerCase()))
      : backgrounds

    const favs = filtered
      .filter((bg: GiftBackground) => isFavorite(bg.name))
      .sort((a: GiftBackground, b: GiftBackground) => a.name.localeCompare(b.name))

    const rest = filtered
      .filter((bg: GiftBackground) => !isFavorite(bg.name))
      .sort((a: GiftBackground, b: GiftBackground) => a.name.localeCompare(b.name))

    return [...favs, ...rest]
  }, [backgrounds, query, favorites]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    setQuery('')
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={(v) => { if (!v) handleClose() }} repositionInputs={false}>
      <DrawerContent className="z-[10000] p-4 bg-neutral-950 text-foreground bg-background border-none rounded-t-3xl h-[100vh] [&>div:first-child]:hidden">
        <DrawerHeader className="px-2 pb-0 pt-2">
          <DrawerTitle className="text-2xl text-left">{t('settings.favoritePalette')}</DrawerTitle>
          <p className="text-sm text-foreground/50 text-left mt-1">
            {t('settings.favoritePaletteDesc')}
          </p>
        </DrawerHeader>

        <InputGroup className="py-6 mt-3 rounded-xl bg-card border-0 text-foreground">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <Input
            placeholder={t('search.placeholder')}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none !bg-transparent"
          />
        </InputGroup>

        {isLoading ? (
          <div className="w-full h-full flex justify-center items-center">
            <Spinner className="size-8" />
          </div>
        ) : sortedBackgrounds.length === 0 ? (
          <div className="w-full h-full flex justify-center items-center">
            <p className="text-sm text-foreground/70">{t('search.noResults')}</p>
          </div>
        ) : (
          <div className="mt-4 overflow-y-auto space-y-2">
            {sortedBackgrounds.map((bg) => {
              const selected = isFavorite(bg.name)
              const disabled = !selected && limitReached

              return (
                <div
                  key={bg.name}
                  className={`flex items-center gap-3 p-3 bg-card rounded-2xl border border-border transition-all ${
                    disabled
                      ? 'opacity-40 cursor-not-allowed'
                      : 'active:scale-95 cursor-pointer'
                  }`}
                  onClick={() => {
                    if (!disabled) toggle(bg.name)
                  }}
                >
                  {/* Color swatch */}
                  <div
                    className="w-[44px] h-[44px] rounded-md shrink-0 overflow-hidden"
                    style={{
                      background: `radial-gradient(circle, ${bg.hex?.centerColor ?? '#000000'} 0%, ${bg.hex?.edgeColor ?? '#000000'} 100%)`,
                    }}
                  />

                  {/* Name */}
                  <span className="flex-1 min-w-0 truncate">{bg.name}</span>

                  {/* Checkmark */}
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      selected
                        ? 'bg-primary border-primary'
                        : 'border-border'
                    }`}
                  >
                    {selected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  )
}

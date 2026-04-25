import { useState, useEffect, type FC } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import type { GiftBackground } from "@/types/gift";
import { Spinner } from "../ui/spinner";
import { InputGroup, InputGroupAddon } from "../ui/input-group";
import { Search } from "lucide-react";
import { ProxiedImage } from "@/components/ui/ProxiedImage"
import { useTranslation } from '@/i18n'

type Item = {
  id: string
  title: string
  image?: string
  background?: GiftBackground
  pattern?: string
  /** Gift number shown next to pattern name so duplicates are distinguishable. */
  gift_number?: number
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  items: Item[]
  /** Pass true while the item list is being fetched so a spinner is shown.
   *  When false and items is empty an "no results" message is shown instead
   *  of a spinner, preventing the infinite dark-screen issue. */
  isLoading?: boolean
  handleSelect: (item: Item) => void
  query?: string
  onQueryChange?: (query: string) => void
}

export const SearchDrawer: FC<Props> = ({ open, onOpenChange, title, items, isLoading = false, handleSelect, query: externalQuery, onQueryChange }) => {
  const { t } = useTranslation()
  const [internalQuery, setInternalQuery] = useState("");
  const query = externalQuery !== undefined ? externalQuery : internalQuery
  
  const setQuery = (value: string) => {
    if (externalQuery !== undefined && onQueryChange) {
      onQueryChange(value)
    } else {
      setInternalQuery(value)
    }
  }

  // Сбрасываем query при закрытии drawer
  useEffect(() => {
    if (!open) {
      if (externalQuery !== undefined && onQueryChange) {
        onQueryChange('')
      } else {
        setInternalQuery('')
      }
    }
  }, [open, externalQuery, onQueryChange])

  const filtered = items.filter((item) => {
    if (!item.title) return false
    return item.title.toLowerCase().includes(query.toLowerCase())
  });

  return (
    <Drawer open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <DrawerContent className="z-[10000] p-4 bg-neutral-950 text-foreground bg-background border-none rounded-t-3xl h-[100vh] [&>div:first-child]:hidden">
        <div className="bg-foreground/8 mx-auto hidden h-1 w-[80px] shrink-0 rounded-full group-data-[vaul-drawer-direction=bottom]/drawer-content:block"></div>
        <DrawerHeader className="px-2 pb-0 pt-2">
          <DrawerTitle className="text-2xl text-left">{title}</DrawerTitle>
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
        ) : items.length === 0 ? (
          <div className="w-full h-full flex justify-center items-center">
            <p className="text-sm text-foreground/70">{t('search.noResults')}</p>
          </div>
        ) : (
          <div className="mt-4 overflow-y-auto space-y-2">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 bg-card rounded-2xl border border-border active:scale-95 transition-transform"
                onClick={() => handleSelect(item)}
              >
                {item.image && <ProxiedImage width={44} height={44} src={item.image} />}
                {item.pattern && <ProxiedImage width={44} height={44} src={item.pattern} className="dark:brightness-0 dark:invert box-border p-2" />}
                {item.background && (
                  <div
                    className="w-[44px] h-[44px] rounded-md text-white overflow-hidden"
                    style={{
                      background: `radial-gradient(circle, ${item.background?.hex.centerColor} 0%, ${item.background?.hex.edgeColor} 100%)`
                    }}
                  />
                )}
                <span className="flex-1 min-w-0">
                  <span className="truncate">{item.title}</span>
                  {item.gift_number != null && item.gift_number > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                      #{item.gift_number}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
import { type FC, useState } from 'react'
import { Page } from '@/components/Page'
import { Item, ItemActions, ItemContent, ItemGroup, ItemMedia, ItemTitle } from '@/components/ui/item'
import { ChevronRightIcon, Megaphone, CreditCardIcon, MessageSquare, ImageIcon, Languages, Palette } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { useSubscription } from '@/hooks/useSubscription'
import { useImageProxySetting } from '@/hooks/useImageProxySetting'
import { useTranslation, type Locale } from '@/i18n'
import { FavoritePaletteDrawer } from '@/components/settings/FavoritePaletteDrawer'
import { useFavoritePalette } from '@/hooks/useFavoritePalette'

import { Link } from 'react-router-dom'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const SettingsPage: FC = () => {
  const { t, locale, setLocale } = useTranslation()
  const { data: subscription, isLoading, error } = useSubscription()
  const [isProxyEnabled, setIsProxyEnabled] = useImageProxySetting()
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  const { favorites } = useFavoritePalette()

  const settingsButtonGroups = [
    {
      title: t('settings.account'),
      items: [
        {
          title: t('settings.subscription'),
          icon: <CreditCardIcon className="p-1 size-6 bg-[#72aee6] rounded-sm text-white" />,
          link: '/subscription',
          external: false,
        },
        {
          title: t('settings.favoritePalette'),
          icon: <Palette className="p-1 size-6 bg-[#a78bfa] rounded-sm text-white" />,
          link: null,
          external: false,
          badge: favorites.length > 0 ? `${favorites.length}/3` : undefined,
          onClick: () => setIsPaletteOpen(true),
        },
      ],
    },
    {
      title: t('settings.links'),
      items: [
        {
          title: t('settings.contactSupport'),
          icon: <MessageSquare className="p-1 size-6 bg-[orange] rounded-sm text-white" />,
          link: 'https://t.me/GiftOutfit',
          external: true,
        },
        {
          title: t('settings.telegramChannel'),
          icon: <Megaphone className="p-1 size-6 bg-[#72aee6] rounded-sm text-white" />,
          link: 'https://t.me/GiftOutfit',
          external: true,
        },
      ],
    },
  ]

  return (
    <Page back={true}>
      <div className="w-full">
        <h1 className="m-4 mx-6 bold text-2xl font-semibold">{t('settings.title')}</h1>
        <div className="flex flex-col mx-4">
          {/* Language */}
          <div className="mb-4">
            <div className="ml-4 mb-2 text-sm text-foreground/50">{t('settings.language')}</div>
            <ItemGroup className="bg-card rounded-xl overflow-hidden mt-0">
              <Item size="sm">
                <ItemMedia>
                  <Languages className="p-1 size-6 bg-[#72aee6] rounded-sm text-white" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{t('settings.languageDesc')}</ItemTitle>
                </ItemContent>
                <ItemActions>
                  <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
                    <SelectTrigger className="w-[120px] border-0 bg-transparent shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ru">Русский</SelectItem>
                    </SelectContent>
                  </Select>
                </ItemActions>
              </Item>
            </ItemGroup>
          </div>

          {settingsButtonGroups.map((group) => (
            <div className="mb-4" key={group.title}>
              <div className="ml-4 mb-2 text-sm text-foreground/50">{group.title}</div>
              <ItemGroup className="bg-card rounded-xl overflow-hidden mt-0">
                {group.items.map((item, index) => (
                  <>
                    {item.link !== null ? (
                      <Item size="sm" asChild key={item.title}>
                        <Link to={item.link!}>
                          <ItemMedia>
                            {item.icon}
                          </ItemMedia>
                          <ItemContent>
                            <ItemTitle>{item.title}</ItemTitle>
                          </ItemContent>
                          <ItemActions>
                            <ChevronRightIcon className="size-4" />
                          </ItemActions>
                        </Link>
                      </Item>
                    ) : (
                      <Item size="sm" key={item.title} onClick={item.onClick} className="cursor-pointer">
                        <ItemMedia>
                          {item.icon}
                        </ItemMedia>
                        <ItemContent>
                          <ItemTitle>{item.title}</ItemTitle>
                        </ItemContent>
                        <ItemActions>
                          {item.badge && (
                            <span className="text-xs text-foreground/50 mr-1">{item.badge}</span>
                          )}
                          <ChevronRightIcon className="size-4" />
                        </ItemActions>
                      </Item>
                    )}
                    {index < group.items.length - 1 && <Separator />}
                  </>
                ))}
              </ItemGroup>
            </div>
          ))}

          {/* Development Settings */}
          <div className="mb-4">
            <div className="ml-4 mb-2 text-sm text-foreground/50">{t('settings.development')}</div>
            <ItemGroup className="bg-card rounded-xl overflow-hidden mt-0">
              <Item size="sm">
                <ItemMedia>
                  <ImageIcon className="p-1 size-6 bg-[#72aee6] rounded-sm text-white" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{t('settings.imageProxy')}</ItemTitle>
                </ItemContent>
                <ItemActions>
                  <button
                    onClick={() => setIsProxyEnabled(!isProxyEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isProxyEnabled ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isProxyEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </ItemActions>
              </Item>
            </ItemGroup>
          </div>
        </div>
      </div>

      <FavoritePaletteDrawer
        open={isPaletteOpen}
        onOpenChange={setIsPaletteOpen}
      />
    </Page>
  )
}
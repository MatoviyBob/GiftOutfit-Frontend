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
import { useTheme } from '@/components/theme-provider'

import { Link } from 'react-router-dom'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ── Animated Sun/Moon theme toggle ──────────────────────────────────────────
const ThemeToggle: FC<{ isDark: boolean; onToggle: () => void }> = ({ isDark, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="relative w-16 h-8 rounded-full transition-all duration-500 overflow-hidden focus:outline-none cursor-pointer active:scale-95"
      style={{
        background: isDark
          ? 'linear-gradient(135deg, #0f0c29, #1a1a4e, #302b63)'
          : 'linear-gradient(135deg, #56ccf2, #2f80ed)',
      }}
    >
      {/* Stars (dark mode only) */}
      <span
        className="absolute inset-0 transition-opacity duration-500"
        style={{ opacity: isDark ? 1 : 0 }}
      >
        {[
          { top: '15%', left: '12%', size: 1.5 },
          { top: '30%', left: '22%', size: 1 },
          { top: '55%', left: '15%', size: 1.2 },
          { top: '20%', left: '35%', size: 1 },
          { top: '65%', left: '28%', size: 0.8 },
        ].map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              top: s.top,
              left: s.left,
              width: s.size * 2,
              height: s.size * 2,
              opacity: 0.8,
            }}
          />
        ))}
      </span>

      {/* Thumb — sun or moon */}
      <span
        className="absolute top-1 w-6 h-6 rounded-full transition-all duration-500 flex items-center justify-center shadow-md"
        style={{
          left: isDark ? 'calc(100% - 28px)' : '4px',
          background: isDark
            ? 'linear-gradient(135deg, #d4d4d4, #f0f0f0)'
            : 'linear-gradient(135deg, #f6d365, #fda085)',
        }}
      >
        {isDark ? (
          // Moon shape via box-shadow inset
          <span
            className="absolute w-4 h-4 rounded-full"
            style={{
              background: 'transparent',
              boxShadow: '-2px -1px 0 2px #1a1a4e inset',
            }}
          />
        ) : (
          // Sun rays
          <span className="relative flex items-center justify-center w-full h-full">
            <span className="absolute w-2 h-2 rounded-full bg-amber-200 opacity-80" />
            {[0, 45, 90, 135].map((deg) => (
              <span
                key={deg}
                className="absolute rounded-full"
                style={{
                  width: 1.5,
                  height: 4,
                  background: '#fda085',
                  transformOrigin: 'center 10px',
                  transform: `rotate(${deg}deg) translateY(-8px)`,
                }}
              />
            ))}
          </span>
        )}
      </span>
    </button>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export const SettingsPage: FC = () => {
  const { t, locale, setLocale } = useTranslation()
  const { data: subscription, isLoading, error } = useSubscription()
  const [isProxyEnabled, setIsProxyEnabled] = useImageProxySetting()
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  const { favorites } = useFavoritePalette()
  const { theme, setTheme } = useTheme()

  const isDark = theme === 'dark'

  const handleThemeToggle = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

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

  void subscription; void isLoading; void error

  return (
    <Page back={true}>
      <div className="w-full">
        <h1 className="m-4 mx-6 bold text-2xl font-semibold">{t('settings.title')}</h1>
        <div className="flex flex-col mx-4">

          {/* Interface — Language + Theme */}
          <div className="mb-4">
            <div className="ml-4 mb-2 text-sm text-foreground/50">{t('settings.interface')}</div>
            <ItemGroup className="bg-card rounded-xl overflow-hidden mt-0">
              {/* Language */}
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
                      <SelectItem value="zh">中文</SelectItem>
                    </SelectContent>
                  </Select>
                </ItemActions>
              </Item>

              <Separator />

              {/* Theme toggle */}
              <Item size="sm">
                <ItemMedia>
                  <span className="p-1 size-6 rounded-sm flex items-center justify-center text-sm"
                    style={{ background: isDark ? '#1a1a4e' : '#56ccf2' }}>
                    {isDark ? '🌙' : '☀️'}
                  </span>
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{t('settings.theme')}</ItemTitle>
                </ItemContent>
                <ItemActions>
                  <span className="text-xs text-foreground/40 mr-2">
                    {isDark ? t('settings.themeDark') : t('settings.themeLight')}
                  </span>
                  <ThemeToggle isDark={isDark} onToggle={handleThemeToggle} />
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

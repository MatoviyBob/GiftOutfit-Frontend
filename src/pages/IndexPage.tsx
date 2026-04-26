import type { FC } from 'react'
import { useMemo, useEffect, useRef } from 'react'
import { Page } from '@/components/Page'
import { GiftDrawer } from '@/components/gifts/GiftDrawer'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { retrieveLaunchParams } from '@telegram-apps/sdk-react'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { ProfileCard } from '@/components/profile/ProfileCard'
import ProfileTabs from '@/components/profile/ProfileTabs'
import { Settings, Share2 } from "lucide-react"
import { Link } from 'react-router-dom';
import { SubscriptionItem } from '@/components/subscription/SubscriptionItem'
import { generateProfileShareLink } from '@/lib/shareProfile'
import { trackProfileView, getUser, getMySettings, type TelegramUser } from '@/api/user'
import { toast } from 'sonner'
import { useTranslation } from '@/i18n'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Spinner } from '@/components/ui/spinner'
import { useGiftStore } from '@/stores/giftStore'

export const IndexPage: FC = () => {
  const { t } = useTranslation()
  const lp = useMemo(() => retrieveLaunchParams(), []);
  const telegramUser = lp.tgWebAppData?.user
  const hasTrackedView = useRef(false)
  const equipGift = useGiftStore((s) => s.equipGift)
  const unequipGift = useGiftStore((s) => s.unequipGift)
  const setFavoritePalette = useGiftStore((s) => s.setFavoritePalette)
  const queryClient = useQueryClient()

  // Загружаем данные пользователя с сервера для получения bio + equipped_gift
  const { data: user, isLoading: isLoadingUser } = useQuery<TelegramUser>({
    queryKey: ['user', telegramUser?.id],
    queryFn: () => getUser(telegramUser!.id),
    enabled: !!telegramUser?.id,
  })

  // Fetch settings from server — same pattern as grids (no staleTime = refetch on mount
  // and window refocus, enabling cross-device sync).
  const { data: serverSettings } = useQuery({
    queryKey: ['my-settings'],
    queryFn: getMySettings,
    enabled: !!telegramUser?.id,
  })

  // Sync server settings to Zustand store.
  // Guard: skip if the user made a local change within the last 8 seconds
  // (prevents server response from overwriting an in-flight optimistic update).
  useEffect(() => {
    if (!serverSettings) return
    const sinceLocalChange = Date.now() - useGiftStore.getState().lastSettingsChange
    if (sinceLocalChange < 8_000) return   // local change too recent — skip

    if (serverSettings.equipped_gift) equipGift(serverSettings.equipped_gift)
    else if (serverSettings.equipped_gift === null) unequipGift()
    if (Array.isArray(serverSettings.favorite_palette)) {
      setFavoritePalette(serverSettings.favorite_palette)
    }
  }, [serverSettings])

  // Отслеживаем просмотр своего профиля при загрузке
  useEffect(() => {
    // Отслеживаем только если пользователь загружен и еще не отслеживали просмотр
    if (telegramUser?.id && !hasTrackedView.current) {
      hasTrackedView.current = true
      trackProfileView(telegramUser.id).catch((error) => {
        // Тихая обработка ошибок - не критично, если не удалось зарегистрировать просмотр
        console.warn('Failed to track profile view:', error)
      })
    }
  }, [telegramUser?.id])

  const handleShareProfile = async () => {
    if (!telegramUser?.id) return

    const shareLink = generateProfileShareLink(telegramUser.id)
    
    // Пытаемся использовать Telegram WebApp API для шейринга
    const win = window as unknown as Record<string, unknown>
    const telegram = win.Telegram as Record<string, unknown> | undefined
    const webApp = telegram?.WebApp as Record<string, unknown> | undefined
    const openTelegramLink = webApp?.openTelegramLink as ((url: string) => void) | undefined
    
    if (openTelegramLink && typeof openTelegramLink === 'function') {
        try {
            openTelegramLink(shareLink)
            toast(t('toast.openingShare'))
        } catch {
            // Fallback: копируем в буфер обмена
            navigator.clipboard.writeText(shareLink)
            toast(t('toast.profileLinkCopied'), {
                description: t('toast.profileLinkCopiedDesc')
            })
        }
    } else {
        // Fallback: копируем в буфер обмена
        navigator.clipboard.writeText(shareLink)
        toast(t('toast.profileLinkCopied'), {
            description: t('toast.profileLinkCopiedDesc')
        })
    }
  }

  // Показываем спиннер пока загружаются данные пользователя
  if (isLoadingUser) {
    return (
      <Page back={false}>
        <div className="flex w-full justify-center items-center min-h-[50vh]">
          <Spinner className="size-8" />
        </div>
      </Page>
    )
  }

  // Используем данные с сервера, если они загружены, иначе данные из Telegram
  const displayUser = user || telegramUser

  const topActions = (
    <div className="flex items-center w-full pt-2 pb-1 px-2">
      <button
        aria-label={t('profile.shareProfile')}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-black/25 backdrop-blur-sm border border-white/20 text-white active:scale-95 transition-transform cursor-pointer"
        onClick={handleShareProfile}
      >
        <Share2 className="size-5" />
      </button>
      <Link
        to="/settings"
        aria-label={t('profile.settingsAria')}
        className="ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/25 backdrop-blur-sm border border-white/20 text-white active:scale-95 transition-transform cursor-pointer"
      >
        <Settings className="size-5" />
      </Link>
    </div>
  )

  return (
    <Page back={false}>
      <div className="w-full">

        <ProfileHeader user={displayUser} isOwnProfile={true} topActions={topActions} />

        <div className="mt-3" />

        <SubscriptionItem />

        <ProfileCard user={displayUser} isOwnProfile={true} />

        <ProfileTabs user={displayUser} isOwnProfile={true} />

        <div className="py-5 px-4 text-foreground/50 text-center text-sm space-y-1">
          <div>
            {t('footer.thanks')} <a href="https://t.me/giftchanges" className="text-primary">@giftchanges</a> {t('footer.and')} <a href="https://t.me/proTON_priTON" className="text-primary">@proTON_priTON</a> {t('footer.forApi')}
          </div>
          <div>
            {t('footer.developer')}: <a href="https://t.me/dnevnik_ton" className="text-primary">@dnevnik_ton</a>
          </div>
        </div>

        <ErrorBoundary>
          <GiftDrawer />
        </ErrorBoundary>
      </div>
    </Page>
  )
}
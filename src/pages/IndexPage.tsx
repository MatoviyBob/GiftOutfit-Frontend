import type { FC } from 'react'
import { useMemo, useEffect, useRef } from 'react'
import { Page } from '@/components/Page'
import { GiftDrawer } from '@/components/gifts/GiftDrawer'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { retrieveLaunchParams } from '@telegram-apps/sdk-react'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { ProfileCard } from '@/components/profile/ProfileCard'
import ProfileTabs from '@/components/profile/ProfileTabs'
import { Button } from '@/components/ui/button'
import { Settings, Share2 } from "lucide-react"
import { Link } from 'react-router-dom';
import { SubscriptionItem } from '@/components/subscription/SubscriptionItem'
import { generateProfileShareLink } from '@/lib/shareProfile'
import { trackProfileView, getUser, getMySettings, type TelegramUser } from '@/api/user'
import { toast } from 'sonner'
import { useTranslation } from '@/i18n'
import { useQuery } from '@tanstack/react-query'
import { Spinner } from '@/components/ui/spinner'
import { useGiftStore } from '@/stores/giftStore'

export const IndexPage: FC = () => {
  const { t } = useTranslation()
  const lp = useMemo(() => retrieveLaunchParams(), []);
  const telegramUser = lp.tgWebAppData?.user
  const hasTrackedView = useRef(false)
  const equipGift = useGiftStore((s) => s.equipGift)
  const unequipGift = useGiftStore((s) => s.unequipGift)

  // Загружаем данные пользователя с сервера для получения bio + equipped_gift
  const { data: user, isLoading: isLoadingUser } = useQuery<TelegramUser>({
    queryKey: ['user', telegramUser?.id],
    queryFn: () => getUser(telegramUser!.id),
    enabled: !!telegramUser?.id,
  })

  // Load settings (equipped_gift + favorite_palette) from server
  const { data: mySettings } = useQuery({
    queryKey: ['my-settings'],
    queryFn: getMySettings,
    enabled: !!telegramUser?.id,
    staleTime: 1000 * 60 * 5,
  })

  // Sync equipped_gift from server settings into the Zustand store
  useEffect(() => {
    if (!mySettings) return
    if (mySettings.equipped_gift) {
      equipGift(mySettings.equipped_gift)
    } else if (mySettings.equipped_gift === null) {
      unequipGift()
    }
  }, [mySettings?.equipped_gift])

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
    <div className="flex items-center gap-2 w-full pt-2 pb-1">
      <Button
        size="lg"
        variant="ghost"
        aria-label={t('profile.shareProfile')}
        className="ml-2 text-foreground/80 hover:text-foreground hover:bg-white/10"
        onClick={handleShareProfile}
      >
        <Share2 className="size-5" />
      </Button>
      <Button size="lg" variant="ghost" aria-label={t('profile.settingsAria')} className="ml-auto mr-2 text-foreground/80 hover:text-foreground hover:bg-white/10">
        <Link to="/settings">
          <Settings className="size-5" />
        </Link>
      </Button>
    </div>
  )

  return (
    <Page back={false}>
      <div className="w-full">

        <ProfileHeader user={displayUser} isOwnProfile={true} topActions={topActions} />

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